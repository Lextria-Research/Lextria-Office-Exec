-- =====================================================================
-- 0201_office_petty_cash.sql
-- Petty Cash Book: Entries, Allocations, and App Float Settings
-- Target: Lextria Office Executive
-- All tables use UUID primary keys and UUID foreign keys to core/office.
-- seed_ref stores the readable synthetic seed identifier for traceability.
-- NOTE: Petty cash top-up requests and weekly counts belong to CORE schema:
--       core.petty_cash_topup_requests and core.petty_cash_counts (shared with Finance).
-- =====================================================================

create schema if not exists office;

-- ---------------------------------------------------------------------
-- Cash Categories (Lookup table for expense types)
-- ---------------------------------------------------------------------
create table if not exists office.cash_categories (
  code        text primary key,
  label       text not null,
  is_recoverable_default boolean not null default true,
  display_order integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into office.cash_categories (code, label, is_recoverable_default, display_order) values
  ('TOP_UP',               'Float Top-Up',                      false, 0),
  ('NOTARY',               'Notary Charges',                    true,  1),
  ('TRUE_COPY_XEROX',      'True Copy / Xerox',                 true,  2),
  ('STAMP_PAPER',          'Non-Judicial / Judicial Stamp Paper', true, 3),
  ('INDIA_POST',           'Speed Post / Regd Post Postage',    true,  4),
  ('PRIVATE_COURIER',      'Private Courier Charges',           true,  5),
  ('BUS_PARCEL',           'Bus Parcel Freight',                true,  6),
  ('POSTAL_ORDER',         'Indian Postal Order (IPO)',         true,  7),
  ('PRINTING_STATIONERY',  'Printing & Stationery',             false, 8),
  ('PRINTING',             'Printing (legacy alias)',           false, 9),
  ('LOCAL_CONVEYANCE',     'Local Travel / Conveyance',         false, 10),
  ('OFFICE_SUPPLIES',      'Office Supplies / Pantry',          false, 11),
  ('MISC',                 'Miscellaneous Float Spend',         false, 12)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Cash Entries (Master Float Ledger)
-- ---------------------------------------------------------------------
create table if not exists office.cash_entries (
  id                        uuid primary key default gen_random_uuid(),
  seed_ref                  text unique,         -- package readable ID (e.g. "cash_0001")
  entry_date                date not null default current_date,
  type                      text not null check (type in ('TOP_UP', 'EXPENSE', 'REFUND_IN')),
  category                  text not null,
  description               text not null,
  amount                    numeric(12,2) not null check (amount > 0),
  payment_mode              text not null default 'CASH' check (payment_mode in ('CASH', 'FIRM_UPI')),
  paid_by                   uuid references core.profiles(id),
  receipt_document_id       uuid references core.documents(id),
  linked_dispatch_id        uuid references office.dispatches(id),
  recoverable               boolean,
  affects_petty_cash_balance boolean not null default true,
  -- Extra operational columns
  status                    text not null default 'ACTIVE' check (status in ('ACTIVE', 'CANCELLED', 'REVERSED')),
  cancel_reason             text,
  created_by                uuid references core.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  balance_after             numeric(12,2)       -- Stored balance snapshot
);

create index if not exists idx_cash_entries_date   on office.cash_entries(entry_date desc);
create index if not exists idx_cash_entries_type   on office.cash_entries(type);
create index if not exists idx_cash_entries_cat    on office.cash_entries(category);
create index if not exists idx_cash_entries_status on office.cash_entries(status);
create index if not exists idx_cash_entries_seed   on office.cash_entries(seed_ref);

-- Add foreign key constraint from dispatches to cash_entries
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_dispatch_cash_entry'
  ) then
    alter table office.dispatches
      add constraint fk_dispatch_cash_entry
      foreign key (cash_entry_id) references office.cash_entries(id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Cash Allocations (Splits across project codes)
-- ---------------------------------------------------------------------
create table if not exists office.cash_allocations (
  id              uuid primary key default gen_random_uuid(),
  seed_ref        text,
  cash_entry_id   uuid not null references office.cash_entries(id) on delete cascade,
  project_code_id uuid not null references core.project_codes(id),
  amount          numeric(12,2) not null check (amount > 0),
  created_at      timestamptz not null default now()
);

create index if not exists idx_cash_alloc_entry on office.cash_allocations(cash_entry_id);
create index if not exists idx_cash_alloc_pc    on office.cash_allocations(project_code_id);
create index if not exists idx_cash_alloc_seed  on office.cash_allocations(seed_ref);

-- ---------------------------------------------------------------------
-- Petty Cash Float Settings (app-level config)
-- ---------------------------------------------------------------------
create table if not exists office.cash_settings (
  id                     text primary key default 'default',
  low_balance_threshold  numeric(12,2) not null default 300.00,
  updated_at             timestamptz not null default now()
);

insert into office.cash_settings (id, low_balance_threshold)
values ('default', 300.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Computed Float Balance Function
-- FIRM_UPI entries (affects_petty_cash_balance = false) never alter cash balance.
-- ---------------------------------------------------------------------
create or replace function office.current_cash_balance()
returns numeric(12,2)
language sql stable security definer set search_path = office, core as $$
  select coalesce(
    sum(
      case
        when type in ('TOP_UP', 'REFUND_IN') then amount
        when type = 'EXPENSE' and affects_petty_cash_balance = true then -amount
        else 0.00
      end
    ), 0.00
  )
  from office.cash_entries
  where status = 'ACTIVE';
$$;

-- ---------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------
alter table office.cash_categories enable row level security;
alter table office.cash_entries     enable row level security;
alter table office.cash_allocations enable row level security;
alter table office.cash_settings    enable row level security;

-- Categories: all staff can read
create policy p_cash_cat_read on office.cash_categories
  for select using (core.is_staff());
create policy p_cash_cat_admin on office.cash_categories
  for all using (core.has_role('SUPER_ADMIN'))
  with check (core.has_role('SUPER_ADMIN'));

-- Cash Entries: OFFICE_EXEC / FINANCE / SUPER_ADMIN only
create policy p_cash_entries_read on office.cash_entries
  for select using (core.has_role('OFFICE_EXEC', 'FINANCE', 'SUPER_ADMIN'));
create policy p_cash_entries_write on office.cash_entries
  for insert with check (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));
create policy p_cash_entries_update on office.cash_entries
  for update using (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));

-- Allocations
create policy p_cash_alloc_read on office.cash_allocations
  for select using (core.has_role('OFFICE_EXEC', 'FINANCE', 'SUPER_ADMIN'));
create policy p_cash_alloc_write on office.cash_allocations
  for insert with check (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));
create policy p_cash_alloc_update on office.cash_allocations
  for update using (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));

-- Settings
create policy p_cash_settings_read on office.cash_settings
  for select using (core.has_role('OFFICE_EXEC', 'FINANCE', 'SUPER_ADMIN'));
create policy p_cash_settings_admin on office.cash_settings
  for all using (core.has_role('SUPER_ADMIN'))
  with check (core.has_role('SUPER_ADMIN'));

-- Audit triggers
drop trigger if exists trg_audit_cash_entries on office.cash_entries;
create trigger trg_audit_cash_entries
  after insert or update or delete on office.cash_entries
  for each row execute function core.audit_trigger();

drop trigger if exists trg_audit_cash_allocations on office.cash_allocations;
create trigger trg_audit_cash_allocations
  after insert or update or delete on office.cash_allocations
  for each row execute function core.audit_trigger();
