-- =====================================================================
-- 0200_office_base.sql
-- Schema 'office' foundation: Address book, Dispatches, Scans, Multi-code links
-- Target: Lextria Office Executive
-- All tables use UUID primary keys and UUID foreign keys to core/office.
-- seed_ref stores the readable synthetic seed identifier for traceability.
-- =====================================================================

create schema if not exists office;

-- ---------------------------------------------------------------------
-- Address Book
-- Field names: id (uuid), seed_ref, name, organization, address, pin, phone, email, type
-- ---------------------------------------------------------------------
create table if not exists office.address_book (
  id              uuid primary key default gen_random_uuid(),
  seed_ref        text unique,                 -- package readable ID (e.g. "ab_cr", "ab_kvu")
  name            text not null,
  organization    text,                        -- SCHEMA.md: "organization"
  address         text not null,               -- SCHEMA.md: "address"
  pin             text,
  phone           text,
  email           text,
  type            text not null check (type in
                    ('GOVT_OFFICE','CLIENT','INVENTOR','COURT','OPPOSITE_PARTY','VENDOR','OTHER')),
  -- Extra operational columns
  linked_client_id uuid references core.clients(id),
  times_used      integer not null default 0,
  last_used       timestamptz,
  created_by      uuid references core.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_address_book_name on office.address_book(name);
create index if not exists idx_address_book_type on office.address_book(type);
create index if not exists idx_address_book_used on office.address_book(times_used desc);
create index if not exists idx_address_book_seed on office.address_book(seed_ref);

-- ---------------------------------------------------------------------
-- Dispatches Register
-- Field names match SCHEMA.md with UUID FKs
-- ---------------------------------------------------------------------
create table if not exists office.dispatches (
  id                    uuid primary key default gen_random_uuid(),
  seed_ref              text unique,           -- package readable ID (e.g. "dsp_0001")
  serial_no             integer not null default 0,
  direction             text not null default 'OUTWARD' check (direction in ('OUTWARD','INWARD')),
  booking_date          date not null default current_date,
  carrier               text not null check (carrier in
                          ('INDIA_SPEED_POST','INDIA_REGISTERED_POST','POSTAL_AD',
                           'PRIVATE_COURIER_SPEED','PRIVATE_COURIER_REGISTERED',
                           'PROFESSIONAL_COURIER','BUS_PARCEL','HAND_DELIVERY','OTHER')),
  tracking_id           text not null,
  sender_address_id     uuid references office.address_book(id),
  recipient_address_id  uuid not null references office.address_book(id),
  document_type         text not null check (document_type in
                          ('LEGAL_NOTICE','POA','COVER_LETTER','RTI','OFFICE_ACTION_REPLY',
                           'FORMS_FOR_SIGNATURE','CERTIFICATE','ORIGINALS','OTHER')),
  particulars           text,
  status                text not null default 'BOOKED' check (status in
                          ('BOOKED','IN_TRANSIT','DELIVERED','RETURNED','LOST','REPOSTED')),
  delivered_on          date,
  ad_card_received      boolean not null default false,
  cost                  numeric(12,2) not null default 0.00 check (cost >= 0),
  cash_entry_id         uuid,                  -- FK linked in 0201
  legal_evidence        boolean not null default false,
  batch_id              text,
  reposted_from_id      uuid references office.dispatches(id),
  return_reason         text,
  created_by            uuid references core.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_dispatches_status       on office.dispatches(status);
create index if not exists idx_dispatches_tracking     on office.dispatches(tracking_id);
create index if not exists idx_dispatches_booking_date on office.dispatches(booking_date desc);
create index if not exists idx_dispatches_batch        on office.dispatches(batch_id);
create index if not exists idx_dispatches_seed         on office.dispatches(seed_ref);

-- ---------------------------------------------------------------------
-- Junction Table: Dispatch <-> Multiple Project Codes
-- ---------------------------------------------------------------------
create table if not exists office.dispatch_project_links (
  id                uuid primary key default gen_random_uuid(),
  seed_ref          text,
  dispatch_id       uuid not null references office.dispatches(id) on delete cascade,
  project_code_id   uuid not null references core.project_codes(id),
  created_at        timestamptz not null default now(),
  unique (dispatch_id, project_code_id)
);

create index if not exists idx_dpl_dispatch on office.dispatch_project_links(dispatch_id);
create index if not exists idx_dpl_project  on office.dispatch_project_links(project_code_id);

-- ---------------------------------------------------------------------
-- Dispatch Scans & Evidence Documents
-- ---------------------------------------------------------------------
create table if not exists office.dispatch_scans (
  id              uuid primary key default gen_random_uuid(),
  seed_ref        text,
  dispatch_id     uuid not null references office.dispatches(id) on delete cascade,
  kind            text not null check (kind in
                    ('BOOKING_RECEIPT','DOCUMENT_COPY','PROOF_OF_DELIVERY',
                     'AD_CARD','ACKNOWLEDGEMENT','TRACKING_HISTORY','OTHER')),
  document_id     uuid not null references core.documents(id),
  created_by      uuid references core.profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists idx_dispatch_scans_dispatch on office.dispatch_scans(dispatch_id);
create index if not exists idx_dispatch_scans_doc      on office.dispatch_scans(document_id);

-- ---------------------------------------------------------------------
-- Audit Triggers
-- ---------------------------------------------------------------------
drop trigger if exists trg_audit_address_book on office.address_book;
create trigger trg_audit_address_book
  after insert or update or delete on office.address_book
  for each row execute function core.audit_trigger();

drop trigger if exists trg_audit_dispatches on office.dispatches;
create trigger trg_audit_dispatches
  after insert or update or delete on office.dispatches
  for each row execute function core.audit_trigger();

drop trigger if exists trg_audit_dispatch_scans on office.dispatch_scans;
create trigger trg_audit_dispatch_scans
  after insert or update or delete on office.dispatch_scans
  for each row execute function core.audit_trigger();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table office.address_book enable row level security;
alter table office.dispatches enable row level security;
alter table office.dispatch_project_links enable row level security;
alter table office.dispatch_scans enable row level security;

-- Address book: all staff read; office exec and admins write
create policy p_ab_read   on office.address_book for select using (core.is_staff());
create policy p_ab_write  on office.address_book for insert with check (core.is_staff());
create policy p_ab_update on office.address_book for update using (core.has_role('OFFICE_EXEC','SUPER_ADMIN','DEPT_ADMIN'));

-- Dispatches: all staff read; office exec and super admin write/update
create policy p_disp_read   on office.dispatches for select using (core.is_staff());
create policy p_disp_insert on office.dispatches for insert with check (core.has_role('OFFICE_EXEC','SUPER_ADMIN'));
create policy p_disp_update on office.dispatches for update using (core.has_role('OFFICE_EXEC','SUPER_ADMIN'));

-- Dispatch project links
create policy p_dpl_read  on office.dispatch_project_links for select using (core.is_staff());
create policy p_dpl_write on office.dispatch_project_links for all
  using (core.has_role('OFFICE_EXEC','SUPER_ADMIN'))
  with check (core.has_role('OFFICE_EXEC','SUPER_ADMIN'));

-- Dispatch scans
create policy p_scans_read  on office.dispatch_scans for select using (core.is_staff());
create policy p_scans_write on office.dispatch_scans for all
  using (core.has_role('OFFICE_EXEC','SUPER_ADMIN'))
  with check (core.has_role('OFFICE_EXEC','SUPER_ADMIN'));

grant usage on schema office to authenticated;
grant select, insert, update on all tables in schema office to authenticated;
grant usage, select on all sequences in schema office to authenticated;
