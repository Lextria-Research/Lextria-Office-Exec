# Lextria Office Executive

## Part A — Foundation

**Context.** Lextria Research is an Indian IP and legal firm of about 30 people. Its Lextria apps are each a separate folder, Antigravity workspace, GitHub repo (in the `Lextria-Research` organisation) and Vercel project. Three new dashboards are being built as working prototypes: **Lextria Office Executive** (this one), **Lextria Litigator** and **Lextria Finance**. They share one test database so the team can test how they connect. **They hold fake (synthetic) data only.** Software engineers will later rebuild them for production on AWS, with real data and full security. Build so that handover is easy: clean code, same conventions across the three apps, a documented database.

**Before you start**
- Read every file in `docs/` (`docs/core_schema_v2.sql`, `docs/reference/upload.js`, and the synthetic data package in `docs/seed-data/`).
- Produce an Implementation Plan and wait for my approval before writing code. Build in the phases below. After each phase, run the app, check every acceptance criterion in the browser, and give me a walkthrough with screenshots. Do not start the next phase until I approve.

**Stack (fixed)**
- React 19 + Vite + TypeScript + Tailwind CSS v4. React Router for routes. TanStack Query for server state.
- Supabase (Postgres + Auth) as the backend.
- This app is its own GitHub repo (public), deployed on Vercel. Server-side code (anything needing a secret) lives in Vercel serverless functions under `/api`. The Supabase service-role key, Zoho credentials and Cliq webhook URLs live only in Vercel environment variables and a local `.env.local` that is git-ignored. Never commit them; the repo is public.

**The test database — read carefully**
- The three new dashboards use the Supabase project `lextria-ip-ledger` (I will give you the URL and keys). **That project also runs the live Lextria IP Ledger, which the team uses every day.** Its data lives in `public.lextria_state`.
- **Never read, write, alter, lock or drop anything in schema `public`, especially `public.lextria_state`.** Never touch `auth` settings beyond what this prompt allows. Never run `supabase db reset`, `db push --include-all`, or any command that applies to the whole database without my approval.
- This app works only in its own schema `office`, plus the shared schema `core`.
- **Before every migration you apply to this project:** take a backup of `public.lextria_state` (save it to `C:\Users\ASUS\Documents\lextria-backups\`) and record its SHA-256 hash. After the migration, check the hash again. If it changed, stop and tell me immediately.
- You may use a local Supabase (CLI + Docker) for experiments, but the shared test database above is where the team tests.
- **Fake data only.** Never load real client, matter, staff-expense or petty-cash data into this database, including Office Executive's real spreadsheets.

**Shared schema `core`**
- `core` is defined in `docs/core_schema_v2.sql` and shared by the three new dashboards (staff profiles, clients, project codes and aliases, documents, matter timeline events, recoverable costs, petty cash hand-offs, notifications, audit log).
- If schema `core` does not exist yet, apply `core_schema_v2.sql` as `0001_core.sql` (with the backup/hash check above). If it exists, do not re-apply it.
- **Never alter, drop or add to anything in `core`.** If you think core needs a change, stop and tell me; core changes are made once, in the shared file, for all three apps.
- This app's migrations are named `NNNN_office_<what>.sql`, starting at 0200 (Litigator uses 0100, Finance 0300), so the apps never collide.
- **This app never reads or writes another app's schema.** All cross-app data flows through the `core` tables named in "Cross-app contract" below.
- Every table: `uuid` primary key, `created_at`, `created_by`. Enable row level security on every table, with policies that use `core.my_role()`, `core.has_role(...)` and `core.is_staff()`. Attach `core.audit_trigger()` to every business table.
- Expose schemas `office` and `core` to the Supabase API (Settings › API › exposed schemas; keep `public` exposed as it is today, since the IP Ledger relies on it) and use `supabase.schema('office')` / `supabase.schema('core')` in the client.
- Send the header `x-lextria-app: OFFICE` on every Supabase request.

**Login (staff testers)**
- Supabase Auth, **invite-only** (public sign-ups disabled). Testers log in with their work email and a 6-digit one-time code sent by email. No passwords.
- A SUPER_ADMIN invites testers and sets their `core.profiles` row (name, role, department, reports-to). After login, if there is no active profile, show "Your account is not set up — contact the admin" and sign out.
- **Test helper:** a SUPER_ADMIN can switch "View as role…" (OFFICE_EXEC, FINANCE, STAFF, etc.) to check what each role sees. Show a coloured banner while active. This only changes the UI view; RLS still uses the real login. Explain in the plan how you test RLS for each role (separate test accounts).
- Login emails: Supabase's built-in email sender is heavily limited, so set up custom SMTP using Zoho Mail (Supabase › Authentication › SMTP settings); I will give you the SMTP account. Guide me through it.
- Keep all auth code in `src/lib/auth.ts`.

**Roles** (from `core.profiles.role`): SUPER_ADMIN, DEPT_ADMIN, FINANCE (plus `is_finance_lead` flag), PARALEGAL, DRAFTER, ASSOCIATE, INTERN, OFFICE_EXEC, STAFF. Hide what a role cannot use, and enforce it again in RLS.

**Clients and project codes (shared, in `core`)**
- Codes are hand-entered in the firm's own syntax. Block duplicates: `code_normalized` (uppercase, spaces removed) is unique.
- Shared **client picker** and **project-code picker**: type-ahead over client name/code, project code and any alias.
- This app does not create project codes; it picks existing ones (seeded fake ones for testing).

**Files: Zoho WorkDrive (test folder)**
- Files go to Zoho WorkDrive, never to Supabase Storage. Copy the upload pattern from `docs/reference/upload.js` (OAuth refresh token → server issues an upload URL → browser uploads directly to WorkDrive).
- Because all data is fake, **use a dedicated test root folder** named in an environment variable `WORKDRIVE_ROOT_FOLDER_ID` (I will create a folder called "Lextria Dashboards — TEST" and give you its ID). Never write anywhere else in the firm's WorkDrive.
- Folder path under that root: `{client_code} - {client_name} / {project_code} / {category} / {file}`; office-level files under `Lextria Office / {area} / {YYYY-MM} /`. Strip `/ \ : * ? " < > |` from folder names. Create folders on first use and store their IDs.
- Every file gets a row in `core.documents` (resource ID, permalink, path, category, `client_shared` default false, `source_app` OFFICE).
- If WorkDrive credentials are missing (e.g. local experiments), fall back to a mock uploader so the app still works.

**Notifications**
- In-app: `core.notifications`, a bell in the top bar with unread count.
- Zoho Cliq: a serverless function `/api/cliq` posts to a **test channel** webhook (environment variable). Cards have a short title and a link back into the app.
- Scheduled reminders: Vercel Cron or a Supabase scheduled function (explain your choice in the plan).

**Conventions**
- Dates stored ISO, shown DD-MM-YYYY, timezone Asia/Kolkata. Money in INR as `numeric(12,2)`, shown with Indian grouping (₹1,00,000).
- One `src/lib/clock.ts` provides "today". No business logic calls `new Date()` directly.
- **Same look across the three apps:** design tokens in `src/styles/tokens.css` — neutral grey surfaces, accent colour teal for this app (Litigator indigo, Finance emerald), Inter font with a system fallback, 8 px spacing, light and dark themes. Layout: left sidebar, top bar with app name, global search (project code / client / alias), notification bell, user menu, and a small "TEST DATA" badge.
- **Phone-first:** most entries happen at the post office, notary or shop. Lists become cards on narrow screens; big tap targets; camera capture wherever a file is needed.
- Every create/update/delete is audited (via the trigger). Financial records are never hard-deleted, only cancelled or reversed with a reason.

**Synthetic data**
- Write `scripts/seed-test.ts` that loads this app's tables from `docs/seed-data/seed/*.json` into the test database, plus the core rows it needs (clients, project codes, aliases), and maps the seed's fake staff to the real test logins I give you. It must be re-runnable: it clears and reloads schema `office` and only the core rows it created (tag them in `metadata` or a seed-run table). It must never touch `public`.
- Use `docs/seed-data/expected_results.md` to check the numbers the app shows.

**Handover documentation (keep updated every phase)**
- `docs/DATABASE.md`: every table, field and RLS policy in `office`, and every `core` table this app uses and how.
- `docs/HANDOVER.md`: how to run, configure and deploy; environment variables (names only); known limitations; what the engineers must add for production (real auth/SSO, backups, monitoring).

---

## Part B — Lextria Office Executive

**What it is.** The working app for the firm's office executive. It replaces two spreadsheets (a post/courier tracker and a petty cash tracker) and a set of chat channels for errands. It handles dispatches, scans, petty cash, document custody, DSC/phone custody and errand requests from the rest of the firm. It must work well on a phone: most entries happen at the post office, notary or shop. Schema: `office`. Accent colour: teal.

**Users and permissions in this app**
- OFFICE_EXEC: everything in this app.
- SUPER_ADMIN: everything, plus settings.
- FINANCE: read petty cash book and dispatch costs; approve top-up requests and sign off weekly counts (those happen through `core` and are also available in the Finance app).
- Every other staff member: raise errand requests; see dispatches, custody items and requests linked to project codes; see who currently holds the DSC tokens and office phone. They cannot see the petty cash book.
- A backup user (setting) can act as office executive when he is on leave.

**Observed problems in the current spreadsheets (the design must solve these)**
- **Post tracker:**
  - Ditto marks (`''''''` or `""""""`) mean "same recipient as above".
  - Recipients are free-text multi-line addresses; the Copyright Office alone appears in hundreds of rows.
  - Status and delivery date are mixed in one cell ("Delivered On 03-10-2026").
  - Date formats are mixed; some dates have day and month swapped; some have typos ("12-08-2-24").
  - Matter codes are buried in a free-text "Particulars" column.
  - Scans are kept in a separate folder, not linked to rows.
- **Cash tracker:**
  - Amounts are text ("1000/-").
  - The running balance is typed by hand and has gone negative several times.
  - Category spellings vary ("NOTARY", "Notary ", "FOR POST", "Indian Regd. Post").
  - Payments made by the firm's UPI are entered as equal cash-in and cash-out on one row to keep the balance unchanged.
  - Notary, post and stamp-paper spend cannot be traced to the client or matter it was for, so it is hard to recover from the client.

### Zoho WorkDrive in this app (applies to every phase)

The office executive both **uploads** and **downloads** files here, mostly from his phone.

**Uploading**
- Every upload goes to WorkDrive through the shared upload method in Part A, with a `core.documents` row.
- Where files go:
  - Postal receipts, acknowledgements, AD cards, proof of delivery and dispatched-document copies → `{client}/{project code}/Postal & Courier/`.
  - Notarised documents and originals' scans → `{client}/{project code}/IDF & Client Docs/` (or the category chosen).
  - Petty cash bills → `Lextria Office/Petty Cash/{YYYY-MM}/`.
  - Files not tied to a matter → `Lextria Office/General/{YYYY-MM}/`.
- **Phone capture:** take one or more photos and the app combines them into a single PDF before upload (multi-page receipts, acknowledgement stamps on several pages). Also allow picking an existing file or PDF.
- File names are generated, not typed: `{project code}_{kind}_{DD-MM-YYYY}_{tracking ID or entry no}.pdf`, so files are findable in WorkDrive without the app.
- One upload linked to several project codes is stored once and listed on every linked matter (no duplicate copies).

**Downloading and viewing**
- On any dispatch, errand or matter, a **Matter files** panel lists every `core.documents` file for that project code, from all connected apps (for example a POA the IP team uploaded that he must print and post). It has preview, download and "Open folder in WorkDrive". Files marked `finance_only` are never listed.
- Errand requests can attach files ("print and courier the attached letter"). The office executive downloads them from the request.
- Downloads go through a serverless function that issues a short-lived WorkDrive download link after checking the user's access. Permalinks are never exposed to users who can't see that file.

**Acceptance criteria (WorkDrive)**
- Three phone photos of a receipt upload as one PDF to the right `Postal & Courier` folder with a generated name.
- A file uploaded by another app on the same project code appears in Matter files and downloads.
- A finance-only file never appears.
- In local dev without WorkDrive keys, upload and download still work through the mock.

### Phase 1 — Dispatch register and address book

**Data (schema `office`)**
- `address_book`: name, organisation, full address, PIN, phone, email, type (`GOVT_OFFICE | CLIENT | INVENTOR | COURT | OPPOSITE_PARTY | VENDOR | OTHER`), linked client (optional), times used, last used. Recipients are picked from here, never retyped.
- `dispatches`:
  - Basics: serial no (auto), direction (`OUTWARD | INWARD`), booking date, carrier (`INDIA_SPEED_POST | INDIA_REGISTERED_POST | POSTAL_AD | PRIVATE_COURIER_SPEED | PRIVATE_COURIER_REGISTERED | PROFESSIONAL_COURIER | BUS_PARCEL | HAND_DELIVERY | OTHER`), tracking ID, sender (address book; default "Lextria office"), recipient (address book).
  - Contents: document type (`LEGAL_NOTICE | POA | COVER_LETTER | RTI | OFFICE_ACTION_REPLY | FORMS_FOR_SIGNATURE | CERTIFICATE | ORIGINALS | OTHER`) and particulars text.
  - Matter link: linked project codes (many; via a join table to `core.project_codes`).
  - Tracking: status (`BOOKED | IN_TRANSIT | DELIVERED | RETURNED | LOST | REPOSTED`), delivered_on (date, separate from status), AD card received.
  - Other: cost, payment mode, `legal_evidence` flag, batch ID, reposted-from link.
- `dispatch_scans`: dispatch, kind (`BOOKING_RECEIPT | DOCUMENT_COPY | PROOF_OF_DELIVERY | AD_CARD | ACKNOWLEDGEMENT | TRACKING_HISTORY | OTHER`), core document. ACKNOWLEDGEMENT covers inward/receipt stamps from the Copyright Office, Patent Office, courts or clients on a hand-delivered or posted copy. One upload is shared across all project codes on the dispatch: stored once in WorkDrive under the first code's `Postal & Courier` folder, and listed on every linked code.

**Screens**
- **New dispatch (phone-first):** pick recipient (type-ahead over address book, most-used first), carrier, tracking ID (allow camera scan of the barcode where the browser supports it; manual entry always works), project codes, document type, cost. Photograph the receipt in the same flow.
- **Batch mode:** pick recipient, carrier and date once, then add rows of tracking ID + project code + cost; one shared receipt photo for the batch. Built for days with many copyright dispatches to the same office.
- **Dispatch list:** filters by status, carrier, recipient, date range, project code; **Pending delivery > 7 days** list for follow-up (days configurable).
- Tracking ID opens the carrier's public tracking page in a new tab. Status is updated manually (no carrier API in this version).
- Mark delivered → delivered date + optional proof-of-delivery photo.
- Mark returned → reason; "Repost" creates a new dispatch linked to the returned one, with corrected address saved back to the address book.

**Rules**
- **Legal-evidence dispatches** (legal notices, infringement notices, anything flagged): cannot be marked complete until booking receipt, document copy, proof of delivery (or AD card) and a tracking-history screenshot are all uploaded.
- **Cross-app contract:** booking, delivery and return each write `core.matter_events` (DISPATCH_BOOKED, DISPATCH_DELIVERED, DISPATCH_RETURNED) for every linked project code. Use a client-safe `client_label` such as "Documents posted to the Copyright Office — Speed Post". Never include recipient addresses in event text. The Litigator and Finance apps show these on the matter timeline.

**Acceptance criteria (Phase 1)**
- Ten dispatches to the same saved recipient can be entered in batch mode with one recipient selection.
- A legal-notice dispatch cannot be completed without its four proofs.
- A delivered dispatch appears on the linked matter's timeline in `core.matter_events`.
- A returned dispatch can be reposted, and both are linked.

### Phase 2 — Petty cash book (connected to Finance)

**Data (schema `office`)**
- `cash_entries`:
  - Basics: date, type (`TOP_UP | EXPENSE | REFUND_IN`), category (fixed list, editable by SUPER_ADMIN: `NOTARY | TRUE_COPY_XEROX | STAMP_PAPER | INDIA_POST | PRIVATE_COURIER | BUS_PARCEL | POSTAL_ORDER | PRINTING_STATIONERY | LOCAL_CONVEYANCE | OFFICE_SUPPLIES | MISC`), description, amount (number).
  - Payment: mode (`CASH | FIRM_UPI`). **FIRM_UPI entries are recorded for cost tracking but do not change the petty cash balance.**
  - Evidence and links: receipt photo (core document), linked dispatch (optional), linked top-up request (for TOP_UP).
  - Recovery: recoverable (default by category), allocation lines.
- `cash_allocations`: entry, project code, amount (or count of documents for split-by-count). The allocation screen splits a bill equally, by document count, or by typed amounts, and must add up to the entry amount.
- Running balance is **always computed**, never typed or stored as editable.

**Rules**
- An expense that would make the cash balance negative is blocked with "Request a top-up first".
- Low-balance alert below a threshold (setting, default ₹300) on the home screen and to Finance.
- **Top-ups:** the office executive raises a request in `core.petty_cash_topup_requests` (amount, reason). Finance approves it there, from the Finance app or from here if the user has the FINANCE role. When the cash is handed over, the office executive confirms receipt: the app creates the TOP_UP cash entry, then calls `core.confirm_topup_received(request_id, cash_entry_id)` (he cannot update the request directly, so he can never approve his own top-up).
- **Weekly count:** the office executive enters the physical cash counted into `core.petty_cash_counts`. The app fills in the book balance, Finance signs off, and any variance needs a note.
- Creating a dispatch with a cost offers to create the linked cash entry in the same step, with the dispatch's project codes pre-filled as the allocation.
- **Connection to Finance (cross-app contract):** for every recoverable, allocated expense, insert one row per allocation into `core.recoverable_costs` (source_app OFFICE, source_type OFFICE_EXPENSE, source_id = cash entry, project code, date, category, description, amount, `has_evidence` = receipt attached, evidence document). Finance decides whether it posts to the client ledger. Show Finance's decision (`posting_status`, review note) back on the entry, read-only. If an entry is edited or deleted after posting, do not change the existing core row; create a reversal request (a new row with `reversal_of` set and a note) and let Finance handle it.
- Expenses with no allocation (toner, office supplies, local conveyance) are office overhead and never go to `core.recoverable_costs`.
- **Not in this app:** the office executive's own money spent for work (for example petrol for his own bike) is an employee reimbursement claimed in the Finance app with bills. Petty cash is only the office float.

**Screens**
- Cash book with running balance, filters by month and category, and a big "Add expense" button.
- Allocation screen showing, per line, which client the amount will be charged to.
- Monthly summary by category and by client; export to Excel.
- Top-up requests and weekly counts with status.

**Acceptance criteria (Phase 2)**
- A FIRM_UPI expense does not change the cash balance.
- An expense that would go negative is blocked.
- A ₹180 notary bill split across three project codes creates three `core.recoverable_costs` rows with the right clients.
- An expense without a receipt still saves, and its core row has `has_evidence = false`.
- The computed balance after loading the seed data matches `docs/seed-data/expected_results.md` (₹962).

### Phase 3 — Custody, errands and importers

**Data (schema `office`)**
- `physical_documents`:
  - Fields: project code, document (signed Form 1, POA, NOC, affidavit, deed, agreement, originals, other), original or copy, pages/copies, current location, notary cost (links to cash entry), scan (core document).
  - Status: `REQUESTED_FROM_CLIENT | RECEIVED | SENT_FOR_NOTARY | NOTARIZED | SCANNED_UPLOADED | RETURNED_TO_CLIENT | ARCHIVED`.
  - RECEIVED and NOTARIZED write `core.matter_events` (DOC_RECEIVED, DOC_NOTARIZED).
- `custody_items` + `custody_log`: DSC tokens and the office phone (OTP phone). Check-out with holder, purpose and expected return; check-in. The current holder is shown on the home screen of every user of this app.
- `office_requests` (errands):
  - Fields: requested by (any staff), project code (optional), what is needed (notarise / buy stamp paper ₹N / courier / collect originals / deliver / other), priority, needed by, attachments.
  - Status: `OPEN | ACCEPTED | IN_PROGRESS | DONE | CANCELLED`.
  - Completion links the resulting dispatch, cash entry or document.
  - Requesters get a notification when it's done.

**Importers (one-time load of the existing spreadsheets, re-runnable safely)**
- Flow: upload xlsx/csv → map columns → **dry run** (mandatory) → report (new / unchanged / flagged / rejected, downloadable rejects) → commit. Re-running the same file must create nothing new: upsert by tracking ID for dispatches, and by date + amount + description for cash.
- **Post tracker rules:**
  - Ditto cells: a cell made only of `'` or `"` characters (any length, with spaces) takes the previous row's resolved value.
  - Recipient: first line = name, the rest = address. Match against the address book; unmatched recipients are queued for review before they are created.
  - Status: parse "Delivered On <date>" in any case, with or without line breaks, into DELIVERED + delivered_on. A bare "Delivered" sets the status only. Blank means BOOKED.
  - Dates: accept DD-MM-YYYY text and Excel dates. For Excel dates with day ≤ 12, if swapping day and month fits the order of neighbouring rows, flag the row with the suggested swap. **Never swap automatically.** Unparseable dates are rejected with the reason.
  - Particulars: link any token matching a registered prefix in `core.prefix_registry` to that project code. Keep the rest as text.
  - Carrier text maps to the carrier list. Rows mentioning Jalio Technologies are skipped and listed.
- **Cash tracker rules:**
  - Amounts: strip "/-", commas and spaces.
  - Categories: normalise (case, trailing spaces, synonyms such as "FOR POST" and "Indian Regd. Post" → INDIA_POST).
  - Ignore the sheet's balance column and recompute. Report every row where the sheet balance differs from the recomputed one, and every point where it went negative.
  - Rows with equal cash-in and cash-out by UPI become one FIRM_UPI expense.
  - Rows with no category or description, or with an expense-like category in the cash-in column, go to review.
  - Imported expenses arrive unallocated. They are listed as "allocate to matters" so recoverable ones can be sent to Finance.
- Test with `docs/seed-data/import_samples/` and match `EXPECTED_IMPORT_RESULTS.md`.
- **Do not import the real post tracker or cash tracker into this test database.** Real data waits for the engineers' production build. The importers are built and proven on the sample files only.

**Home screen (Office executive)**
- Today's errands, dispatches booked today, pending deliveries, cash balance with low-balance warning, documents awaiting notary, current DSC/phone holders, and a quick-add bar (dispatch, expense, document received).

**Acceptance criteria (Phase 3)**
- Importing the sample post tracker twice gives "0 new" the second time.
- Ditto rows resolve to the right recipients.
- The swapped date is flagged, not changed.
- The cash import report lists every negative-balance row and every mismatch.
- A staff member's errand request shows up on the office executive's home screen and notifies the requester when done.

---

## Part C — Integrations left for the engineers (overrides Part A where they differ)

The engineers will configure Zoho WorkDrive, Zoho Mail (SMTP), Zoho Cliq and the real tester accounts later. Build every integration completely, but keep each one switched off until its settings exist, with a working fallback. Nothing may break or block because a setting is missing.

1. **Configuration**
   - All integration settings come from environment variables only. List every one with its purpose in `.env.example` (names, no values) and in `docs/HANDOVER.md`, with step-by-step instructions for setting each up. The engineers must be able to switch an integration on by adding settings and redeploying, with no code changes.
   - Add an Admin › Integrations page (SUPER_ADMIN only) showing each integration as Connected / Not configured / Error, with a "Test connection" button for each.

2. **Files: one interface, three providers**
   - All file code goes through `src/lib/files.ts` (upload, download, list, open folder), with providers:
     - `WORKDRIVE`: the full integration described in Part A. Used automatically when the WorkDrive variables are set.
     - `SUPABASE_TEST`: a private Supabase Storage bucket `test-files` in the same project, with the same folder structure as WorkDrive. Used when WorkDrive is not configured. Access goes through the same server-side check and short-lived download links. Bucket policies must allow only logged-in staff, and never touch any other bucket or schema `public`.
     - `MOCK`: in-browser only, for local experiments.
   - `core.documents` records which provider holds each file. Write a one-time script for the engineers that copies `SUPABASE_TEST` files into WorkDrive and updates the records (optional; the test files are fake).
   - All acceptance criteria about uploads and downloads must pass with the `SUPABASE_TEST` provider.

3. **Login: two modes**
   - `AUTH_MODE=test` (current default): email + password login for seeded test accounts only. Create one account per role (SUPER_ADMIN, OFFICE_EXEC, FINANCE, finance lead, STAFF, DEPT_ADMIN) with addresses like `office.exec@test.lextria.local`, strong generated passwords saved only in `.env.local` and given to me once, and matching `core.profiles` rows. Show a visible "TEST LOGIN" label on the sign-in page.
   - `AUTH_MODE=otp`: the invite-only email one-time-code login from Part A, fully built. Switching modes is only an environment change. SMTP setup instructions (Zoho Mail) go in `docs/HANDOVER.md`.
   - The seed script maps the synthetic staff to these test accounts instead of real people.

4. **Zoho Cliq**
   - If the Cliq webhook variable is not set, write each would-be message to `office.cliq_outbox` (channel, title, link, created_at) and show it on an Admin › Outbox page. When the variable is set, send for real; failed sends stay in the outbox with the error and a Retry button.
