-- =====================================================================
-- 0202_office_phase3.sql
-- Physical Documents, Custody Management, Office Requests
-- Target: Lextria Office Executive
-- All tables use UUID primary keys and UUID foreign keys to core/office.
-- seed_ref stores the readable synthetic seed identifier for traceability.
-- =====================================================================

create schema if not exists office;

-- ---------------------------------------------------------------------
-- Physical Documents (Originals, Notary Workflow, Safe Tracking)
-- ---------------------------------------------------------------------
create table if not exists office.physical_documents (
  id                    uuid primary key default gen_random_uuid(),
  seed_ref              text unique,             -- package readable ID (e.g. "phd_0001")
  project_code_id       uuid references core.project_codes(id),
  document              text not null,           -- SCHEMA.md: "document"
  original_or_copy      text not null default 'ORIGINAL'
                          check (original_or_copy in ('ORIGINAL', 'COPY')),
  status                text not null default 'RECEIVED'
                          check (status in ('REQUESTED_FROM_CLIENT', 'RECEIVED',
                                            'SENT_FOR_NOTARY', 'NOTARIZED',
                                            'SCANNED_UPLOADED', 'RETURNED_TO_CLIENT',
                                            'ARCHIVED')),
  pages                 integer,
  notary_cash_entry_id  uuid references office.cash_entries(id),
  scan_document_id      uuid references core.documents(id),
  updated_at            timestamptz not null default now(),
  -- Extra operational columns
  notes                 text,
  created_by            uuid references core.profiles(id),
  created_at            timestamptz not null default now()
);

create index if not exists idx_physical_docs_project on office.physical_documents(project_code_id);
create index if not exists idx_physical_docs_status  on office.physical_documents(status);
create index if not exists idx_physical_docs_seed    on office.physical_documents(seed_ref);

-- ---------------------------------------------------------------------
-- Custody Items (DSC cryptographic tokens, office OTP phone)
-- ---------------------------------------------------------------------
create table if not exists office.custody_items (
  id                uuid primary key default gen_random_uuid(),
  seed_ref          text unique,                 -- package readable ID (e.g. "cust_dsc1")
  item              text not null,               -- SCHEMA.md: "item"
  type              text not null check (type in ('DSC', 'PHONE', 'OTHER')),
  -- Extra operational columns
  status            text not null default 'AVAILABLE'
                      check (status in ('AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'RETIRED')),
  notes             text,
  created_by        uuid references core.profiles(id),
  created_at        timestamptz not null default now()
);

create index if not exists idx_custody_items_type   on office.custody_items(type);
create index if not exists idx_custody_items_status on office.custody_items(status);
create index if not exists idx_custody_items_seed   on office.custody_items(seed_ref);

-- ---------------------------------------------------------------------
-- Custody Log (Check-out and check-in audit chain)
-- ---------------------------------------------------------------------
create table if not exists office.custody_log (
  id                uuid primary key default gen_random_uuid(),
  seed_ref          text,                        -- package readable ID (e.g. "cl_0001")
  custody_item_id   uuid not null references office.custody_items(id) on delete cascade,
  holder_user_id    uuid not null references core.profiles(id),
  out_at            timestamptz not null,
  expected_return   timestamptz,
  in_at             timestamptz,                 -- null = still checked out
  -- Extra operational columns
  purpose           text,
  notes             text,
  created_by        uuid references core.profiles(id),
  created_at        timestamptz not null default clock_timestamp()
);

create index if not exists idx_custody_log_item   on office.custody_log(custody_item_id);
create index if not exists idx_custody_log_holder on office.custody_log(holder_user_id);
create index if not exists idx_custody_log_seed   on office.custody_log(seed_ref);

-- ---------------------------------------------------------------------
-- Office Requests (Errands)
-- ---------------------------------------------------------------------
create table if not exists office.office_requests (
  id                uuid primary key default gen_random_uuid(),
  seed_ref          text unique,                 -- package readable ID (e.g. "or_0001")
  project_code_id   uuid references core.project_codes(id),
  requested_by      uuid not null references core.profiles(id),
  description       text not null,
  priority          text not null default 'NORMAL'
                      check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  due_date          date,
  status            text not null default 'OPEN'
                      check (status in ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
  accepted_by       uuid references core.profiles(id),
  completed_links   jsonb,
  -- Extra operational column (kept as requested)
  request_type      text not null default 'ERRAND'
                      check (request_type in ('ERRAND', 'PURCHASE', 'FACILITY', 'OTHER')),
  created_at        timestamptz not null default clock_timestamp(),
  created_by        uuid references core.profiles(id)
);

create index if not exists idx_office_requests_status    on office.office_requests(status);
create index if not exists idx_office_requests_requester on office.office_requests(requested_by);
create index if not exists idx_office_requests_project   on office.office_requests(project_code_id);
create index if not exists idx_office_requests_seed      on office.office_requests(seed_ref);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table office.physical_documents enable row level security;
alter table office.custody_items       enable row level security;
alter table office.custody_log         enable row level security;
alter table office.office_requests     enable row level security;

-- Physical documents: all staff read, office exec write
create policy p_phd_read  on office.physical_documents for select using (core.is_staff());
create policy p_phd_write on office.physical_documents
  for all using (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));

-- Custody items: all staff read
create policy p_cust_read  on office.custody_items for select using (core.is_staff());
create policy p_cust_write on office.custody_items
  for all using (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));

-- Custody log: all staff read, office exec insert (read-only audit)
create policy p_cl_read  on office.custody_log for select using (core.is_staff());
create policy p_cl_write on office.custody_log
  for insert with check (core.has_role('OFFICE_EXEC', 'SUPER_ADMIN'));

-- Office requests: all staff read + insert; office exec updates; requester can cancel own
create policy p_oreq_read   on office.office_requests for select using (core.is_staff());
create policy p_oreq_insert on office.office_requests for insert with check (core.is_staff());
create policy p_oreq_update on office.office_requests
  for update using (
    core.has_role('OFFICE_EXEC', 'SUPER_ADMIN') or requested_by = auth.uid()
  );

-- Audit triggers
drop trigger if exists trg_audit_physical_docs on office.physical_documents;
create trigger trg_audit_physical_docs
  after insert or update or delete on office.physical_documents
  for each row execute function core.audit_trigger();

drop trigger if exists trg_audit_custody_items on office.custody_items;
create trigger trg_audit_custody_items
  after insert or update or delete on office.custody_items
  for each row execute function core.audit_trigger();

drop trigger if exists trg_audit_office_requests on office.office_requests;
create trigger trg_audit_office_requests
  after insert or update or delete on office.office_requests
  for each row execute function core.audit_trigger();
