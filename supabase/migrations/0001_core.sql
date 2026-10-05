-- =====================================================================
-- core_schema_v2.sql  (v2: adds TASK_MANAGER and IP_LEDGER as apps, more IP event codes)
-- Shared "core" schema for the three standalone Lextria dashboards:
--   Lextria Task Manager, Lextria IP Ledger, Lextria Litigator,
--   Lextria Office Executive, Lextria Finance.
-- All three apps use ONE Supabase project. Each app keeps its own tables
-- in its own schema and talks to the other
-- apps ONLY through the tables in this file.
--
-- Rules for every app:
--   * Fresh project (no schema core): apply this file as
--     supabase/migrations/0001_core.sql.
--   * Project that already has core v1: apply core_v1_to_v2_upgrade.sql
--     instead. Never re-run this file on a project that has core.
--   * Never ALTER or DROP anything in schema core from an app migration.
--     A change here must be made in this shared file (v2, v3 ...) and
--     applied once for all three apps.
-- =====================================================================

create extension if not exists pgcrypto;
create schema if not exists core;

-- ---------------------------------------------------------------------
-- Staff profiles (one row per Supabase auth user; staff only)
-- ---------------------------------------------------------------------
create table core.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  email         text not null unique,
  role          text not null check (role in
                  ('SUPER_ADMIN','DEPT_ADMIN','FINANCE','PARALEGAL','DRAFTER',
                   'ASSOCIATE','INTERN','OFFICE_EXEC','STAFF')),
  department    text not null check (department in
                  ('MANAGEMENT','IP_PATENT','IP_SOFT','PARALEGAL','LITIGATION',
                   'AGREEMENT','FINANCE','OFFICE')),
  reports_to    uuid references core.profiles(id),
  is_finance_lead boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Helper functions used by every RLS policy in every app
create or replace function core.my_role() returns text
language sql stable security definer set search_path = core as $$
  select role from core.profiles where id = auth.uid() and active
$$;

create or replace function core.my_department() returns text
language sql stable security definer set search_path = core as $$
  select department from core.profiles where id = auth.uid() and active
$$;

create or replace function core.has_role(variadic roles text[]) returns boolean
language sql stable security definer set search_path = core as $$
  select coalesce(core.my_role() = any(roles), false)
$$;

create or replace function core.is_staff() returns boolean
language sql stable security definer set search_path = core as $$
  select core.my_role() is not null
$$;

-- ---------------------------------------------------------------------
-- Clients and project codes (one master shared by all apps)
-- ---------------------------------------------------------------------
create table core.clients (
  id              uuid primary key default gen_random_uuid(),
  client_code     text not null unique,              -- e.g. CLI-1001
  client_name     text not null,
  entity_type     text not null check (entity_type in
                    ('NATURAL_PERSON','STARTUP','SMALL_ENTITY','EDUCATIONAL_INSTITUTION',
                     'LARGE_ENTITY','GOVERNMENT','OTHER')),
  email           text,
  phone           text,
  gstin           text,
  pan             text,
  billing_address text,
  state_code      text,                               -- for GST place of supply
  workdrive_folder_id text,
  created_by      uuid references core.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table core.prefix_registry (
  prefix       text primary key,                      -- e.g. AR, TBI, LIT, AGR
  department   text not null,
  client_id    uuid references core.clients(id),
  description  text,
  example      text,
  active       boolean not null default true
);

create table core.project_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,                     -- as hand-entered
  code_normalized  text generated always as (upper(regexp_replace(code, '\s', '', 'g'))) stored unique,
  prefix           text references core.prefix_registry(prefix),
  department       text not null check (department in
                     ('IP_PATENT','IP_SOFT','LITIGATION','AGREEMENT','MISC_VENDOR','OTHER')),
  client_id        uuid not null references core.clients(id),
  title            text not null,
  status           text not null default 'ACTIVE' check (status in
                     ('ACTIVE','ON_HOLD','COMPLETED','ABANDONED','DUPLICATE_REVIEW')),
  spoc_user_id     uuid references core.profiles(id),
  lead_assignee_id uuid references core.profiles(id),
  workdrive_folder_id text,
  owning_app       text not null check (owning_app in ('TASK_MANAGER','IP_LEDGER','LITIGATOR','OFFICE','FINANCE','IMPORT','OTHER')),
  created_by       uuid references core.profiles(id),
  created_at       timestamptz not null default now()
);

create table core.project_aliases (
  id               uuid primary key default gen_random_uuid(),
  project_code_id  uuid not null references core.project_codes(id) on delete cascade,
  alias_type       text not null check (alias_type in
                     ('TEMP_CODE','PATENT_APP_NO','TM_APP_NO','CR_DIARY_NO','DESIGN_APP_NO',
                      'CNR','CASE_NO','OTHER')),
  alias_value      text not null,
  valid_from       date,
  unique (alias_type, alias_value)
);

-- ---------------------------------------------------------------------
-- Event codes + matter events (timeline + billing triggers for Finance)
-- ---------------------------------------------------------------------
create table core.event_codes (
  code          text primary key,
  domain        text not null,       -- LITIGATION | AGREEMENT | OFFICE | IP | MISC
  description   text not null,
  default_client_label text           -- wording for a future client portal
);

create table core.matter_events (
  id              uuid primary key default gen_random_uuid(),
  project_code_id uuid not null references core.project_codes(id) on delete cascade,
  event_code      text references core.event_codes(code), -- null = free-text event
  title           text not null,
  detail          text,
  occurred_at     timestamptz not null default now(),
  actor_user_id   uuid references core.profiles(id),
  source_app      text not null check (source_app in ('TASK_MANAGER','IP_LEDGER','LITIGATOR','OFFICE','FINANCE','IMPORT','OTHER')),
  client_visible  boolean not null default false,
  client_label    text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index on core.matter_events (project_code_id, occurred_at desc);
create index on core.matter_events (event_code);

-- ---------------------------------------------------------------------
-- Documents (files live in Zoho WorkDrive; this is the index)
-- ---------------------------------------------------------------------
create table core.documents (
  id               uuid primary key default gen_random_uuid(),
  project_code_id  uuid references core.project_codes(id),  -- null = office-level file
  category         text not null,
  file_name        text not null,
  mime_type        text,
  size_bytes       bigint,
  zoho_resource_id text,
  zoho_permalink   text,
  workdrive_path   text,
  client_shared    boolean not null default false,
  finance_only     boolean not null default false,
  source_app       text not null check (source_app in ('TASK_MANAGER','IP_LEDGER','LITIGATOR','OFFICE','FINANCE','IMPORT','OTHER')),
  uploaded_by      uuid references core.profiles(id),
  uploaded_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Recoverable costs: money spent on a client's behalf.
-- Office (expenses) and Finance (reimbursements, govt fees) insert rows.
-- Finance decides posting to the client ledger.
-- ---------------------------------------------------------------------
create table core.recoverable_costs (
  id              uuid primary key default gen_random_uuid(),
  source_app      text not null check (source_app in ('TASK_MANAGER','IP_LEDGER','LITIGATOR','OFFICE','FINANCE','OTHER')),
  source_type     text not null check (source_type in
                    ('OFFICE_EXPENSE','EMPLOYEE_REIMBURSEMENT','GOVT_FEE','OTHER')),
  source_id       uuid,                                 -- row id in the source app's table
  project_code_id uuid not null references core.project_codes(id),
  client_id       uuid references core.clients(id),     -- filled by trigger from project code
  cost_date       date not null,
  category        text not null,
  description     text not null,
  amount          numeric(12,2) not null check (amount > 0),
  has_evidence    boolean not null default false,       -- receipt / bill / transaction ref present
  evidence_document_id uuid references core.documents(id),
  posting_status  text not null default 'PENDING_FINANCE' check (posting_status in
                    ('PENDING_FINANCE','AUTO_POSTED','NEEDS_REVIEW','NOT_RECOVERABLE','REVERSED')),
  posted_at       timestamptz,
  reviewed_by     uuid references core.profiles(id),
  review_note     text,
  reversal_of     uuid references core.recoverable_costs(id),
  recovered_via_invoice_ref_id uuid,                    -- set by Finance
  created_by      uuid references core.profiles(id),
  created_at      timestamptz not null default now()
);

create or replace function core.fill_client_from_project() returns trigger
language plpgsql as $$
begin
  select client_id into new.client_id from core.project_codes where id = new.project_code_id;
  return new;
end $$;
create trigger trg_recoverable_costs_client
  before insert or update of project_code_id on core.recoverable_costs
  for each row execute function core.fill_client_from_project();

-- ---------------------------------------------------------------------
-- Petty cash hand-offs between Office and Finance
-- ---------------------------------------------------------------------
create table core.petty_cash_topup_requests (
  id             uuid primary key default gen_random_uuid(),
  amount         numeric(12,2) not null check (amount > 0),
  reason         text not null,
  requested_by   uuid not null references core.profiles(id),
  requested_at   timestamptz not null default now(),
  status         text not null default 'REQUESTED' check (status in
                   ('REQUESTED','APPROVED','REJECTED','HANDED_OVER')),
  decided_by     uuid references core.profiles(id),
  decided_at     timestamptz,
  decision_note  text,
  handed_over_at timestamptz,
  office_cash_entry_id uuid                               -- set by Office when the TOP_UP entry is created
);

create table core.petty_cash_counts (
  id                 uuid primary key default gen_random_uuid(),
  count_date         date not null,
  counted_by         uuid not null references core.profiles(id),
  physical_cash      numeric(12,2) not null,
  book_balance       numeric(12,2) not null,
  variance           numeric(12,2) generated always as (physical_cash - book_balance) stored,
  note               text,
  finance_signoff_by uuid references core.profiles(id),
  finance_signoff_at timestamptz,
  finance_note       text
);

-- ---------------------------------------------------------------------
-- Notifications, audit, settings
-- ---------------------------------------------------------------------
create table core.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references core.profiles(id),
  title       text not null,
  body        text,
  link        text,                                  -- absolute URL into the owning app
  source_app  text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create table core.audit_log (
  id         bigserial primary key,
  actor      uuid,
  app        text,
  schema_name text not null,
  table_name text not null,
  row_id     text,
  action     text not null,                          -- INSERT | UPDATE | DELETE
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);

create or replace function core.audit_trigger() returns trigger
language plpgsql security definer set search_path = core as $$
begin
  insert into core.audit_log(actor, app, schema_name, table_name, row_id, action, before, after)
  values (auth.uid(), nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-lextria-app',
          tg_table_schema, tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create table core.app_settings (
  app    text not null check (app in ('CORE','TASK_MANAGER','IP_LEDGER','LITIGATOR','OFFICE','FINANCE')),
  key    text not null,
  value  jsonb not null,
  primary key (app, key)
);

-- Audit every core business table
do $$
declare t text;
begin
  foreach t in array array['clients','prefix_registry','project_codes','project_aliases',
                           'documents','recoverable_costs','petty_cash_topup_requests',
                           'petty_cash_counts','profiles']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on core.%1$s
                    for each row execute function core.audit_trigger()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------
alter table core.profiles                  enable row level security;
alter table core.clients                   enable row level security;
alter table core.prefix_registry           enable row level security;
alter table core.project_codes             enable row level security;
alter table core.project_aliases           enable row level security;
alter table core.event_codes               enable row level security;
alter table core.matter_events             enable row level security;
alter table core.documents                 enable row level security;
alter table core.recoverable_costs         enable row level security;
alter table core.petty_cash_topup_requests enable row level security;
alter table core.petty_cash_counts         enable row level security;
alter table core.notifications             enable row level security;
alter table core.audit_log                 enable row level security;
alter table core.app_settings              enable row level security;

-- profiles
create policy p_profiles_read  on core.profiles for select using (core.is_staff());
create policy p_profiles_admin on core.profiles for all using (core.has_role('SUPER_ADMIN')) with check (core.has_role('SUPER_ADMIN'));

-- reference masters: every staff member reads; admins/finance/dept admins write
create policy p_clients_read   on core.clients for select using (core.is_staff());
create policy p_clients_write  on core.clients for insert with check (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE','ASSOCIATE'));
create policy p_clients_update on core.clients for update using (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE'));

create policy p_prefix_read    on core.prefix_registry for select using (core.is_staff());
create policy p_prefix_write   on core.prefix_registry for all using (core.has_role('SUPER_ADMIN','DEPT_ADMIN')) with check (core.has_role('SUPER_ADMIN','DEPT_ADMIN'));

create policy p_pc_read        on core.project_codes for select using (core.is_staff());
create policy p_pc_insert      on core.project_codes for insert with check (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE','ASSOCIATE','PARALEGAL'));
create policy p_pc_update      on core.project_codes for update using (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE'));

create policy p_alias_read     on core.project_aliases for select using (core.is_staff());
create policy p_alias_write    on core.project_aliases for all using (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE','ASSOCIATE','PARALEGAL'))
                                                       with check (core.has_role('SUPER_ADMIN','DEPT_ADMIN','FINANCE','ASSOCIATE','PARALEGAL'));

create policy p_evcodes_read   on core.event_codes for select using (core.is_staff());
create policy p_evcodes_write  on core.event_codes for all using (core.has_role('SUPER_ADMIN')) with check (core.has_role('SUPER_ADMIN'));

-- matter events: append-only for staff; only SUPER_ADMIN may correct
create policy p_me_read        on core.matter_events for select using (core.is_staff());
create policy p_me_insert      on core.matter_events for insert with check (core.is_staff() and actor_user_id = auth.uid());
create policy p_me_admin       on core.matter_events for update using (core.has_role('SUPER_ADMIN'));

-- documents: finance-only files restricted
create policy p_docs_read      on core.documents for select using (core.is_staff() and (not finance_only or core.has_role('FINANCE','SUPER_ADMIN')));
create policy p_docs_insert    on core.documents for insert with check (core.is_staff() and uploaded_by = auth.uid());
create policy p_docs_update    on core.documents for update using (uploaded_by = auth.uid() or core.has_role('SUPER_ADMIN','DEPT_ADMIN'));

-- recoverable costs: creator, office exec and finance read; finance decides
create policy p_rc_read        on core.recoverable_costs for select using (created_by = auth.uid() or core.has_role('FINANCE','SUPER_ADMIN','OFFICE_EXEC'));
create policy p_rc_insert      on core.recoverable_costs for insert with check (core.is_staff() and created_by = auth.uid() and posting_status = 'PENDING_FINANCE');
create policy p_rc_update      on core.recoverable_costs for update using (core.has_role('FINANCE','SUPER_ADMIN'));

-- petty cash hand-offs
create policy p_topup_read     on core.petty_cash_topup_requests for select using (core.has_role('OFFICE_EXEC','FINANCE','SUPER_ADMIN'));
create policy p_topup_insert   on core.petty_cash_topup_requests for insert with check (core.has_role('OFFICE_EXEC','SUPER_ADMIN') and requested_by = auth.uid());
create policy p_topup_update   on core.petty_cash_topup_requests for update using (core.has_role('FINANCE','SUPER_ADMIN'));

-- The office executive confirms receipt of approved cash through this function only
-- (so he can never approve his own top-up).
create or replace function core.confirm_topup_received(p_request_id uuid, p_office_cash_entry_id uuid)
returns void language plpgsql security definer set search_path = core as $$
begin
  if not core.has_role('OFFICE_EXEC','SUPER_ADMIN') then
    raise exception 'Only the office executive can confirm receipt';
  end if;
  update core.petty_cash_topup_requests
     set status = 'HANDED_OVER', handed_over_at = now(), office_cash_entry_id = p_office_cash_entry_id
   where id = p_request_id and status = 'APPROVED';
  if not found then
    raise exception 'Top-up request is not in APPROVED status';
  end if;
end $$;
grant execute on function core.confirm_topup_received(uuid, uuid) to authenticated;

create policy p_count_read     on core.petty_cash_counts for select using (core.has_role('OFFICE_EXEC','FINANCE','SUPER_ADMIN'));
create policy p_count_insert   on core.petty_cash_counts for insert with check (core.has_role('OFFICE_EXEC','SUPER_ADMIN') and counted_by = auth.uid());
create policy p_count_signoff  on core.petty_cash_counts for update using (core.has_role('FINANCE','SUPER_ADMIN'));

-- notifications: own only; any staff may notify anyone
create policy p_notif_read     on core.notifications for select using (user_id = auth.uid());
create policy p_notif_update   on core.notifications for update using (user_id = auth.uid());
create policy p_notif_insert   on core.notifications for insert with check (core.is_staff());

-- audit log: super admins read; rows are written by the security-definer trigger
create policy p_audit_read     on core.audit_log for select using (core.has_role('SUPER_ADMIN'));

-- settings
create policy p_settings_read  on core.app_settings for select using (core.is_staff());
create policy p_settings_write on core.app_settings for all
  using (core.has_role('SUPER_ADMIN') or (app = 'FINANCE' and core.has_role('FINANCE')))
  with check (core.has_role('SUPER_ADMIN') or (app = 'FINANCE' and core.has_role('FINANCE')));

grant usage on schema core to authenticated;
grant select, insert, update on all tables in schema core to authenticated;
grant usage, select on all sequences in schema core to authenticated;

-- ---------------------------------------------------------------------
-- Seed: event codes (Finance billing stages trigger on these)
-- ---------------------------------------------------------------------
insert into core.event_codes(code, domain, description, default_client_label) values
 ('LEGAL_NOTICE_SENT','LITIGATION','Legal notice dispatched','Legal notice sent'),
 ('LEGAL_NOTICE_SERVED','LITIGATION','Legal notice delivered to opposite party','Legal notice served'),
 ('SUIT_FILED','LITIGATION','Suit / petition filed','Case filed'),
 ('IA_FILED','LITIGATION','Interim application filed','Interim application filed'),
 ('IA_ARGUED','LITIGATION','Interim application argued','Interim application argued'),
 ('IA_ORDER','LITIGATION','Order on interim application','Order passed on interim application'),
 ('WRITTEN_STATEMENT_FILED','LITIGATION','Written statement / reply filed','Reply filed'),
 ('EVIDENCE_STAGE','LITIGATION','Case reached evidence stage','Evidence stage'),
 ('FINAL_ARGUMENTS','LITIGATION','Final arguments','Final arguments'),
 ('JUDGMENT','LITIGATION','Judgment / final order','Judgment delivered'),
 ('APPEAL_FILED','LITIGATION','Appeal filed','Appeal filed'),
 ('SETTLED','LITIGATION','Settled / withdrawn','Matter settled'),
 ('HEARING_ATTENDED','LITIGATION','Hearing attended','Hearing held'),
 ('AGR_INTAKE','AGREEMENT','Agreement instructions received','Instructions received'),
 ('AGR_V1_SENT','AGREEMENT','First draft sent to client','First draft shared with you'),
 ('AGR_CLIENT_APPROVED','AGREEMENT','Client approved draft','You approved the draft'),
 ('AGR_COUNTERPARTY_SENT','AGREEMENT','Draft sent to counterparty','Draft sent to the other side'),
 ('AGR_FINALIZED','AGREEMENT','Agreement finalised','Agreement finalised'),
 ('AGR_EXECUTED','AGREEMENT','Agreement signed by all parties','Agreement signed'),
 ('AGR_STAMPED','AGREEMENT','Stamp duty paid / registered','Stamping completed'),
 ('DISPATCH_BOOKED','OFFICE','Post/courier booked','Documents dispatched'),
 ('DISPATCH_DELIVERED','OFFICE','Post/courier delivered','Documents delivered'),
 ('DISPATCH_RETURNED','OFFICE','Post/courier returned','Dispatch returned'),
 ('DOC_RECEIVED','OFFICE','Physical document received','Documents received'),
 ('DOC_NOTARIZED','OFFICE','Document notarised','Documents notarised'),
 ('PS_FILED','IP','Provisional specification filed','Provisional application filed'),
 ('CS_FILED','IP','Complete specification filed','Complete specification filed'),
 ('RFE_FILED','IP','Request for examination filed','Examination requested'),
 ('FER_REPLY_FILED','IP','FER response filed','Response to examination report filed'),
 ('PATENT_HEARING_ATTENDED','IP','Patent hearing attended','Hearing held at the Patent Office'),
 ('PATENT_WS_FILED','IP','Written submission after hearing filed','Written submission filed'),
 ('TM_FILED','IP','Trademark application filed','Trademark application filed'),
 ('TM_REPLY_FILED','IP','Reply to TM examination report filed','Reply filed'),
 ('TM_COUNTER_FILED','IP','Counter-statement filed','Counter-statement filed'),
 ('CR_FILED','IP','Copyright application filed','Copyright application filed'),
 ('DS_FILED','IP','Design application filed','Design application filed'),
 ('RENEWAL_PAID','IP','Renewal fee paid','Renewal fee paid'),
 ('FORM27_FILED','IP','Form 27 working statement filed','Working statement filed'),
 ('TM_EXAM_REPORT_ISSUED','IP','Trademark examination report issued','Examination report received'),
 ('TM_OPPOSITION_RECEIVED','IP','Opposition filed against trademark','Opposition received'),
 ('TM_REGISTERED','IP','Trademark registered','Trademark registered'),
 ('TM_RENEWAL_FILED','IP','Trademark renewal filed','Trademark renewal filed'),
 ('CR_DISCREPANCY_REPLY_FILED','IP','Reply to copyright discrepancy filed','Reply to Copyright Office filed'),
 ('CR_REGISTERED','IP','Copyright registered','Copyright registered'),
 ('DS_REGISTERED','IP','Design registered','Design registered'),
 ('DS_RENEWAL_FILED','IP','Design renewal (extension) filed','Design renewal filed'),
 ('QUERY_RAISED','OTHER','Internal query raised on the matter',null),
 ('QUERY_RESOLVED','OTHER','Internal query resolved',null),
 ('MISC_COMPLETED','MISC','Vendor-handled work completed','Work completed');

insert into core.app_settings(app, key, value) values
 ('CORE','date_display_format','"DD-MM-YYYY"'),
 ('CORE','timezone','"Asia/Kolkata"'),
 ('CORE','workdrive_root_path','"WorkDrive Root"');
