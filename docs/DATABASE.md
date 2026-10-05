# Lextria Office Executive — Database Documentation

## 1. Overview & Multi-Schema Architecture

Lextria Office Executive operates within two PostgreSQL schemas on the Supabase project `lextria-ip-ledger`:
- **`office`**: Dedicated schema for this app. Holds the postal/courier register, address book, petty cash book, document custody, DSC tracking, and errand requests.
- **`core`**: Shared contract schema across Lextria Litigator, Lextria Finance, and Lextria Office Executive (`docs/core_schema_v2.sql`).

> [!CAUTION]
> Schema `public` (especially `public.lextria_state`) is strictly off-limits. Any migration applied MUST run pre- and post-migration SHA-256 hash checks via `scripts/backup-live-db.ts`.

---

## 2. Shared `core` Tables Referenced by Office Executive

| Core Table | Office Executive Usage | Access Pattern |
| :--- | :--- | :--- |
| `core.users` | Staff directory, authentication roles, reports-to tree | Read-only |
| `core.clients` | Master client directory and billing details for matter pickers | Read-only |
| `core.prefix_registry` | Allowed matter prefixes (`AR`, `TBI`, `KVU`, `TM`, `CR`, `DS`, `LIT`, `AGR`, `MISC`) | Read-only |
| `core.project_codes` | Master project codes linked to dispatches, expenses, and custody | Read-only (pick existing) |
| `core.project_aliases` | Patent application numbers, CNR, case numbers for type-ahead search | Read-only |
| `core.documents` | Central index of files stored in Zoho WorkDrive or Supabase Storage | Insert / Select |
| `core.timeline_events` | Timeline events: `DISPATCH_BOOKED`, `DISPATCH_DELIVERED`, `DISPATCH_RETURNED` | Insert (client-safe labels) |
| `core.disbursements` | Recoverable petty cash allocations passed to Finance ledger | Insert / Select (read-only review) |
| `core.notifications` | In-app user notification alerts (delivery overdue, errand done) | Insert / Select (own rows) |
| `core.audit_log` | Security audit log written automatically by `core.audit_trigger()` | Trigger-driven |

---

## 3. Dedicated `office` Schema Data Dictionary
*Exact naming contract matching `docs/seed-data/SCHEMA.md`.*

### 3.1 `office.address_book`
Centralized directory of frequently used postal and courier recipients and senders.
- `id` (text, PK): Primary key (e.g. `ab_cr`, `ab_tbi`)
- `name` (text, not null): Name of contact or office title
- `organization` (text): Department or organisation name (SCHEMA.md: `organization`)
- `address` (text, not null): Postal address (SCHEMA.md: `address`)
- `pin` (text): Postal PIN code
- `phone` (text): Contact phone number
- `email` (text): Contact email
- `type` (text, not null): Check `type in ('GOVT_OFFICE','CLIENT','INVENTOR','COURT','OPPOSITE_PARTY','VENDOR','OTHER')`
- `seed_ref` (text, unique): Package readable identifier (e.g. `ab_cr`)
- *Operational additions*: `linked_client_id` (uuid references `core.clients(id)`), `times_used` (integer, default 0), `last_used` (timestamptz), `created_by` (uuid references `core.profiles(id)`), `created_at` / `updated_at` (timestamptz)

### 3.2 `office.dispatches`
The master post and courier register replacing the spreadsheet.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text, unique): Package readable identifier (e.g. `dsp_0001`)
- `serial_no` (integer, not null): Auto-incrementing business serial number
- `direction` (text, not null, default 'OUTWARD'): Check `direction in ('OUTWARD','INWARD')`
- `booking_date` (date, not null): Date booked with carrier
- `carrier` (text, not null): Check `carrier in ('INDIA_SPEED_POST','INDIA_REGISTERED_POST','POSTAL_AD','PRIVATE_COURIER_SPEED','PRIVATE_COURIER_REGISTERED','PROFESSIONAL_COURIER','BUS_PARCEL','HAND_DELIVERY','OTHER')`
- `tracking_id` (text, not null): Unique barcode / consignment tracking number
- `sender_address_id` (uuid, FK): Senders from `office.address_book(id)`
- `recipient_address_id` (uuid, FK, not null): Recipient from `office.address_book(id)`
- `document_type` (text, not null): Check `document_type in ('LEGAL_NOTICE','POA','COVER_LETTER','RTI','OFFICE_ACTION_REPLY','FORMS_FOR_SIGNATURE','CERTIFICATE','ORIGINALS','OTHER')`
- `particulars` (text): Description of contents
- `status` (text, not null, default 'BOOKED'): Check `status in ('BOOKED','IN_TRANSIT','DELIVERED','RETURNED','LOST','REPOSTED')`
- `delivered_on` (date): Verified delivery date
- `ad_card_received` (boolean, not null, default false): Physical A.D. card returned to office
- `cost` (numeric(12,2), not null, default 0.00): Postage fee
- `cash_entry_id` (uuid, FK): Link to `office.cash_entries(id)`
- `legal_evidence` (boolean, not null, default false): Requires 4 mandatory proofs (booking receipt, document copy, proof of delivery, tracking history)
- `batch_id` (text): Identifier grouping batch filings (e.g. `batch_2026-10-03`)
- `reposted_from_id` (uuid, FK): Self-reference to `office.dispatches(id)`
- `created_by` (uuid, FK): Creator user ID references `core.profiles(id)`
- *Operational additions*: `return_reason` (text), `created_at` / `updated_at` (timestamptz)

### 3.3 `office.dispatch_project_links`
Junction table supporting multiple project codes per dispatch.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text): Package readable identifier
- `dispatch_id` (uuid, not null, FK to `office.dispatches(id)`)
- `project_code_id` (uuid, not null, FK to `core.project_codes(id)`)
- `created_at` (timestamptz)
- Unique constraint: `(dispatch_id, project_code_id)`

### 3.4 `office.dispatch_scans`
Links digital evidence copies in `core.documents` to a dispatch.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text): Package readable identifier
- `dispatch_id` (uuid, not null, FK to `office.dispatches(id)`)
- `kind` (text, not null): Check `kind in ('BOOKING_RECEIPT','DOCUMENT_COPY','PROOF_OF_DELIVERY','AD_CARD','ACKNOWLEDGEMENT','TRACKING_HISTORY','OTHER')`
- `document_id` (uuid, not null, FK to `core.documents(id)`)
- `created_by` (uuid, FK references `core.profiles(id)`)
- `created_at` (timestamptz)

### 3.5 `office.cash_categories`
Configurable expense categories (editable by `SUPER_ADMIN`).
- `code` (text, PK): `TOP_UP`, `NOTARY`, `TRUE_COPY_XEROX`, `STAMP_PAPER`, `INDIA_POST`, `PRIVATE_COURIER`, `BUS_PARCEL`, `POSTAL_ORDER`, `PRINTING_STATIONERY`, `PRINTING`, `LOCAL_CONVEYANCE`, `OFFICE_SUPPLIES`, `MISC`
- `label` (text, not null): Display name
- `is_recoverable_default` (boolean, not null, default true): Default recovery flag
- `display_order` (integer, default 0)
- `active` (boolean, default true)
- `created_at` (timestamptz)

### 3.6 `office.cash_entries`
Master petty cash float book replacing the manual cash tracker.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text, unique): Package readable identifier (e.g. `cash_0001`)
- `entry_date` (date, not null): Date of disbursement or top-up
- `type` (text, not null): Check `type in ('TOP_UP', 'EXPENSE', 'REFUND_IN')`
- `category` (text, not null): Expense category code
- `description` (text, not null): Narrative explanation
- `amount` (numeric(12,2), not null): Amount in INR (> 0)
- `payment_mode` (text, not null, default 'CASH'): Check `payment_mode in ('CASH', 'FIRM_UPI')`
- `paid_by` (uuid, FK references `core.profiles(id)`)
- `receipt_document_id` (uuid, FK references `core.documents(id)`)
- `linked_dispatch_id` (uuid, FK references `office.dispatches(id)`)
- `recoverable` (boolean): Whether costs are billed to clients
- `affects_petty_cash_balance` (boolean, not null, default true): `false` for `FIRM_UPI` entries (never alters cash float balance)
- `balance_after` (numeric(12,2)): Stored running balance snapshot
- `created_by` (uuid, FK references `core.profiles(id)`)
- *Operational additions*: `status` (`ACTIVE`, `CANCELLED`, `REVERSED`), `cancel_reason`, `created_at` / `updated_at` (timestamptz)

### 3.7 `office.cash_allocations`
Split lines attributing expense amounts across project codes.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text): Package readable identifier (e.g. `ca_0001`)
- `cash_entry_id` (uuid, not null, FK to `office.cash_entries(id)`)
- `project_code_id` (uuid, not null, FK to `core.project_codes(id)`)
- `amount` (numeric(12,2), not null): Portion allocated to this matter
- `created_at` (timestamptz)

### 3.8 `core.petty_cash_topup_requests` (Cross-App with Finance)
Float top-up requests raised by Office Executive and approved/rejected by Finance in schema `core`.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `amount` (numeric(12,2), not null): Requested float top-up amount
- `reason` (text, not null): Justification note
- `requested_by` (uuid, not null, FK to `core.profiles(id)`): Requester staff ID
- `requested_at` (timestamptz, not null): Request timestamp
- `status` (text, not null, default 'REQUESTED'): Check `status in ('REQUESTED','APPROVED','REJECTED','HANDED_OVER')`
- `decided_by` (uuid, FK to `core.profiles(id)`): Finance user who decided
- `decided_at` (timestamptz): Decision timestamp
- `decision_note` (text): Finance comments
- `handed_over_at` (timestamptz): Physical cash handover timestamp
- `office_cash_entry_id` (uuid, FK to `office.cash_entries(id)`): Linked entry created upon handover

### 3.9 `core.petty_cash_counts` (Cross-App with Finance)
Weekly physical cash count records and variance sign-off in schema `core`.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `count_date` (date, not null): Date of physical count
- `counted_by` (uuid, not null, FK to `core.profiles(id)`): Staff user ID who performed count
- `physical_cash` (numeric(12,2), not null): Cash counted in the box
- `book_balance` (numeric(12,2), not null): Expected ledger balance
- `variance` (numeric(12,2), not null): `physical_cash - book_balance`
- `note` (text): Office executive count explanation
- `finance_signoff_by` (uuid, FK to `core.profiles(id)`): Finance Lead user ID
- `finance_signoff_at` (timestamptz): Sign-off timestamp
- `finance_note` (text): Finance sign-off comments

### 3.10 `office.cash_settings`
Settings for office float balance monitoring.
- `id` (text, PK, default 'default')
- `low_balance_threshold` (numeric(12,2), default 300.00)
- `updated_at` (timestamptz)

### 3.11 `office.physical_documents`
Tracking physical paper custody, original documents, notarization workflows, and safe storage.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text, unique): Package readable identifier (e.g. `phd_0001`)
- `project_code_id` (uuid, FK to `core.project_codes(id)`): Linked project code
- `document` (text, not null): Document title / description (SCHEMA.md: `document`)
- `original_or_copy` (text, not null, default 'ORIGINAL'): Check `original_or_copy in ('ORIGINAL', 'COPY')`
- `status` (text, not null, default 'RECEIVED'): Check `status in ('REQUESTED_FROM_CLIENT', 'RECEIVED', 'SENT_FOR_NOTARY', 'NOTARIZED', 'SCANNED_UPLOADED', 'RETURNED_TO_CLIENT', 'ARCHIVED')`
- `pages` (integer): Page count
- `notary_cash_entry_id` (uuid, FK to `office.cash_entries(id)`): Link to notary cash entry
- `scan_document_id` (uuid, FK to `core.documents(id)`): FK to scanned document
- `updated_at` (timestamptz, not null): Status update timestamp
- `created_by` (uuid, FK to `core.profiles(id)`)
- *Operational additions*: `notes`, `created_at` (timestamptz)

### 3.12 `office.custody_items`
Hardware token and device inventory (DSC cryptographic tokens and office OTP phone).
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text, unique): Package readable identifier (e.g. `cust_dsc1`, `cust_phone`)
- `item` (text, not null): Descriptive label (e.g. `DSC token — Managing Partner`)
- `type` (text, not null): Check `type in ('DSC', 'PHONE', 'OTHER')`
- `created_by` (uuid, FK to `core.profiles(id)`)
- *Operational additions*: `status` (`AVAILABLE`, `CHECKED_OUT`, `MAINTENANCE`, `RETIRED`), `notes`, `created_at` (timestamptz)

### 3.13 `office.custody_log`
Complete check-out and check-in custody chain audit trail.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text): Package readable identifier (e.g. `cl_0001`)
- `custody_item_id` (uuid, not null, FK to `office.custody_items(id)`)
- `holder_user_id` (uuid, not null, FK to `core.profiles(id)`): Staff user ID holding the item
- `out_at` (timestamptz, not null): Check-out timestamp
- `expected_return` (timestamptz): Estimated return time
- `in_at` (timestamptz): Check-in return timestamp (null = currently out)
- `created_by` (uuid, FK to `core.profiles(id)`)
- *Operational additions*: `purpose`, `notes`, `created_at` (timestamptz)

### 3.14 `office.office_requests`
Firm-wide errand and tasks pipeline raised by staff and fulfilled by the office executive.
- `id` (uuid, PK): Primary key (`default gen_random_uuid()`)
- `seed_ref` (text, unique): Package readable identifier (e.g. `or_0001`)
- `project_code_id` (uuid, FK to `core.project_codes(id)`): Optional matter linkage
- `requested_by` (uuid, not null, FK to `core.profiles(id)`): Staff user ID who raised request
- `description` (text, not null): Detailed execution instructions and vendor specifics
- `priority` (text, not null, default 'NORMAL'): Check `priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')`
- `due_date` (date): Deadline for completion
- `status` (text, not null, default 'OPEN'): Check `status in ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED')`
- `accepted_by` (uuid, FK to `core.profiles(id)`): Office Executive user ID who accepted the request
- `completed_links` (jsonb): Structured links to created records (e.g. `dispatch_id`, `cash_entry_id`)
- `request_type` (text, not null, default 'ERRAND'): Check `request_type in ('ERRAND', 'PURCHASE', 'FACILITY', 'OTHER')`
- `created_at` (timestamptz, not null): Creation timestamp
- `created_by` (uuid, FK to `core.profiles(id)`)

---

## 4. Row-Level Security (RLS) Matrix

Every table has RLS enabled with the following security policy model:

| Table | SELECT Policy | INSERT Policy | UPDATE / DELETE Policy |
| :--- | :--- | :--- | :--- |
| `office.address_book` | All staff (`core.is_staff()`) | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN`, `DEPT_ADMIN` |
| `office.dispatches` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.dispatch_project_links` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.dispatch_scans` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.cash_categories` | All staff (`core.is_staff()`) | `SUPER_ADMIN` | `SUPER_ADMIN` |
| `office.cash_entries` | `OFFICE_EXEC`, `FINANCE`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.cash_allocations` | `OFFICE_EXEC`, `FINANCE`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.cash_settings` | `OFFICE_EXEC`, `FINANCE`, `SUPER_ADMIN` | `SUPER_ADMIN` | `SUPER_ADMIN` |
| `office.physical_documents` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.custody_items` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.custody_log` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | Read-only audit log |
| `office.office_requests` | All staff (`core.is_staff()`) | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` (or requester own cancel) |
| `office.physical_documents` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.custody_items` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | `OFFICE_EXEC`, `SUPER_ADMIN` |
| `office.custody_log` | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` | Read-only audit log |
| `office.office_requests` | All staff (`core.is_staff()`) | All staff (`core.is_staff()`) | `OFFICE_EXEC`, `SUPER_ADMIN` (Requester can cancel own) |

> [!NOTE]
> General staff (e.g. Associates, Paralegals, Drafters) cannot see `office.cash_entries` or `office.cash_allocations`. Finance users have read-only access to audit cash book transactions and approve top-up requests. Physical documents, custody holders, and errand requests are visible across the firm to eliminate back-and-forth status calls.

---

## 5. Audit Logging Trigger

Attached to every business table in `office`:
```sql
create trigger trg_audit_<table_name>
  after insert or update or delete on office.<table_name>
  for each row execute function core.audit_trigger();
```
Captures `actor`, `app` (from header `x-lextria-app: OFFICE`), `action`, `before`, and `after` JSON snapshots into `core.audit_log`.
