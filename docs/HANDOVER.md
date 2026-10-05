# Lextria Office Executive — Engineering Handover Guide

## 1. Overview & Prototype Purpose

This application is the working prototype for the firm's **Office Executive**. It replaces legacy spreadsheets for post/courier dispatches, address records, petty cash management, and token custody. It is designed to share a test database with **Lextria Litigator** and **Lextria Finance**.

---

## 2. Local Setup & Running Instructions

### Prerequisites
- Node.js 20+ (Node 24 recommended)
- npm 10+

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser. The app runs out of the box with `AUTH_MODE=test` and seeded test accounts.

---

## 3. Environment Variables Reference

| Variable Name | Client/Server | Purpose |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client (Vite) | Supabase project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Client (Vite) | Public anonymous key for client requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless (`/api`) | Service role secret for secure serverless endpoints |
| `VITE_AUTH_MODE` | Client | Auth mode: `test` (preset accounts) or `otp` (email OTP) |
| `VITE_WORKDRIVE_ROOT_FOLDER_ID` | Client/Server | Dedicated test root folder in Zoho WorkDrive |
| `VITE_ZOHO_CLIENT_ID` | Client/Server | Zoho OAuth application client ID |
| `ZOHO_CLIENT_SECRET` | Serverless (`/api`) | Zoho OAuth client secret |
| `ZOHO_REFRESH_TOKEN` | Serverless (`/api`) | Zoho OAuth permanent refresh token |
| `ZOHO_CLIQ_WEBHOOK_URL` | Serverless (`/api`) | Zoho Cliq incoming webhook URL |
| `SMTP_HOST` | Supabase Dashboard | Zoho Mail SMTP host (smtppro.zoho.com) |
| `SMTP_PORT` | Supabase Dashboard | Port 465 (SSL) or 587 (TLS) |
| `SMTP_USER` / `SMTP_PASS` | Supabase Dashboard | Zoho Mail credentials for OTP delivery |

---

## 4. Multi-Provider Storage Configuration

Files are managed through `src/lib/files.ts`:
- **`WORKDRIVE`**: Activated automatically when `VITE_WORKDRIVE_ROOT_FOLDER_ID` and `VITE_ZOHO_CLIENT_ID` are set.
- **`SUPABASE_TEST`**: Private bucket `test-files` in Supabase Storage with signed 15-minute URLs. Activated when WorkDrive is unconfigured.
- **`MOCK`**: In-browser blob storage for standalone local experiments.

---

## 5. Petty Cash & Finance Cross-App Architecture

Phase 2 replaces spreadsheets with a real-time computed cash float ledger and cross-app cost recovery pipeline:
- **Computed Balance**: Running float balance is never stored or typed manually; it is dynamically calculated as $\sum \text{Top-ups/Refunds} - \sum \text{Cash Expenses}$.
- **FIRM_UPI Isolation**: Expenses paid via Firm UPI QR code/portal are recorded for matter billing and client recovery, but strictly bypass the physical cash float.
- **Negative Balance Guard**: Client-side and database-level validation prevent expenses that would deplete the float below zero.
- **Top-up Lifecycle**: Office Executive raises requests in `core.petty_cash_topup_requests`. Finance approves, and upon physical cash handover, the Office Executive confirms receipt, creating a linked `TOP_UP` entry in `office.cash_entries`.
- **Cross-App Cost Recovery (`core.recoverable_costs`)**: Multi-matter expenses (e.g. notary attestations across multiple project codes) are split equally, by document count, or custom amounts. Each allocation line inserts into `core.recoverable_costs` with `has_evidence` flag, receipt document ID, and `PENDING_FINANCE` status for billing review in the Finance app.
- **Weekly Physical Count (`core.petty_cash_counts`)**: Regular physical count reconciliation where the app computes the book balance, calculates variance, and prompts for notes before Finance signs off.

---

## 6. Physical Custody, Staff Errands & Spreadsheet Migration Importers

### 6.1 Physical Document Custody
Replaces fragmented cabinet tracking with a digital custody register in `office.physical_documents`:
- **Document Lifecyle**: Tracks original signed patent declarations, POAs, affidavits, and deeds through `REQUESTED_FROM_CLIENT` $\rightarrow$ `RECEIVED` $\rightarrow$ `SENT_FOR_NOTARY` $\rightarrow$ `NOTARIZED` $\rightarrow$ `SCANNED_UPLOADED` $\rightarrow$ `RETURNED_TO_CLIENT` / `ARCHIVED`.
- **Cross-App Matter Timeline**: Receipt and notarization automatically post client-safe milestones (`DOC_RECEIVED`, `DOC_NOTARIZED`) into `core.matter_events` for Litigator and Finance visibility.
- **Notary Attestation Linkage**: Direct linkage to `office.cash_entries` records the notary attestation fee and recovery status.

### 6.2 DSC Tokens & Office Phone Custody
Hardware custody tracking in `office.custody_items` and `office.custody_log`:
- **Inventory**: Tracks cryptographic Class 3 DSC tokens (Senior Partner, Litigator Lead) and the office OTP authentication smartphone.
- **Custody Chain**: Check-out and check-in workflows capture staff custodian, operational purpose (e.g. portal filing), and expected return timestamp.
- **Firm-wide Transparency**: Active holders are prominently surfaced across the entire dashboard to eliminate "Who has the partner's token?" office delays.

### 6.3 Staff Errands Pipeline
Streamlines internal errands (notarization, e-stamp procurement, urgent court delivery) via `office.office_requests`:
- **Staff Submission**: Any staff member can raise errands with priority levels (`NORMAL`, `HIGH`, `URGENT`) and matter links.
- **Reactive Office Executive Dashboard**: Errands immediately populate the Office Executive's home screen widget.
- **Fulfillment & Notification**: Upon completion, the executive links the resulting dispatch, cash expense, or notarized document, which automatically emits an in-app notification to the requester via `core.notifications`.

### 6.4 Spreadsheet Migration Importers
Safe, idempotent migration tools for legacy Excel/CSV records (`Post Tracker` and `Cash Tracker`):
- **Mandatory Dry-Run**: Enforces pre-commit preview, flagging duplicates, warnings, and formatting anomalies before touching the database.
- **Ditto Resolution**: Resolves legacy ditto marks (`''''''`, `""""""`) to the previous row's resolved recipient address.
- **Date Disambiguation**: Flags ambiguous dates (e.g., `09-05-2026` in September context) with recommended swaps without mutating data automatically. Rejects malformed date typos (e.g. `12-08-2-24`).
- **Exclusion Filters**: Automatically skips non-firm entries (e.g. rows mentioning "Jalio Technologies").
- **Cash Tracker Recomputation**: Strips messy text currency formatting (`1000/-`), normalizes irregular categories, recomputes the true running balance, flags historical negative balances (e.g. `-₹38.00`), and consolidates equal cash-in/cash-out UPI offset pairs into a single `FIRM_UPI` expense.
- **Idempotency Guarantee**: Dispatches upsert on `tracking_id`; Cash entries upsert on `(entry_date, amount, description)`. A second import of the identical file commits **0 new records**.

---

## 7. Production Transition Guide for Engineers

When migrating this prototype to production on AWS:
1. **Single Sign-On (SSO)**: Replace OTP / test login with Google Workspace or Microsoft Entra ID SAML/OAuth integration.
2. **Dedicated Schema Isolation & RDS**: If migrating off Supabase to Amazon Aurora PostgreSQL, maintain the `office` and `core` schema boundaries.
3. **S3 Storage Bridge**: Replace `SUPABASE_TEST` with an Amazon S3 private bucket, while preserving direct Zoho WorkDrive client uploads where needed.
4. **Automated Scheduled Tasks**: Migrate `/api/cron` to AWS EventBridge + AWS Lambda.
5. **Observability & APM**: Add AWS CloudWatch and Sentry error monitoring.

---

## 8. Step-by-Step Third-Party Integrations Setup Guide

The app functions with zero errors out-of-the-box using the built-in `MOCK` or `SUPABASE_TEST` storage providers and `office.cliq_outbox`. Follow these step-by-step procedures when enabling production Zoho connections:

### 8.1 Zoho WorkDrive Cloud Storage Setup
1. Log into the firm's [Zoho WorkDrive Console](https://workdrive.zoho.com).
2. Create a dedicated folder: `Lextria Dashboards — TEST`. Note its Folder ID (e.g. `1234567890abcdef`).
3. Open [Zoho API Console](https://api-console.zoho.com) and create a **Server-based Application**:
   - Authorized Redirect URI: `https://office.lextria.internal/auth/callback` (or your Vercel deployment URL).
   - Scopes required: `WorkDrive.workspace.ALL`, `WorkDrive.files.ALL`.
4. Generate a permanent Refresh Token using the authorization code flow.
5. Set environment variables in Vercel / `.env.local`:
   ```bash
   VITE_WORKDRIVE_ROOT_FOLDER_ID="1234567890abcdef"
   VITE_ZOHO_CLIENT_ID="1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   ZOHO_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ZOHO_REFRESH_TOKEN="1000.yyyyyyyyyyyyyyyyyyyyyyyyyyyy.zzzzzzzzzzzz"
   ```
6. Verify in the app: Go to **Admin › Integrations** and click **Test Connection** under Zoho WorkDrive.

### 8.2 Zoho Mail Custom SMTP (Supabase Auth OTP Relay)
When switching from `AUTH_MODE=test` to `AUTH_MODE=otp`:
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard) for project `lextria-ip-ledger`.
2. Navigate to **Authentication › Email Settings › SMTP Settings**.
3. Toggle **Enable Custom SMTP** to ON.
4. Fill in the Zoho Mail SMTP relay details:
   - **Sender email**: `notifications@lextria.com` (or firm test address)
   - **Sender name**: `Lextria Office Executive`
   - **Host**: `smtppro.zoho.com` (or `smtp.zoho.com`)
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: Your Zoho Mail account address
   - **Password**: An Application-Specific Password generated from Zoho Security settings
5. In Vercel / `.env.local`, set:
   ```bash
   VITE_AUTH_MODE="otp"
   ```

### 8.3 Zoho Cliq Webhook Integration
1. In Zoho Cliq, navigate to the target channel (e.g. `#office-dispatches` or `#office-alerts`).
2. Click channel settings › **Integrations › Incoming Webhook**.
3. Generate a webhook token and copy the generated Webhook URL.
4. Set in Vercel / `.env.local`:
   ```bash
   ZOHO_CLIQ_WEBHOOK_URL="https://cliq.zoho.com/api/v2/channelsbyname/.../incoming?zapikey=..."
   ```
5. If unconfigured or offline, notifications are safely buffered in `office.cliq_outbox`. Visit **Admin › Integrations** to view queued notifications and trigger manual retries.

---

## 9. Seeded Test Login Accounts (`AUTH_MODE=test`)

In `AUTH_MODE=test` (current default for prototype validation), the sign-in page displays a prominent **"TEST LOGIN"** badge with pre-configured role accounts:

| Role | Test Email Address | Display Name & Department | Default Password |
| :--- | :--- | :--- | :--- |
| **OFFICE_EXEC** | `office.exec@test.lextria.local` | Suresh Kumar (Office Desk) | `Lextria#2026!Office` |
| **SUPER_ADMIN** | `super.admin@test.lextria.local` | Ananya Sharma (Managing Partner) | `Lextria#2026!Office` |
| **FINANCE (Lead)** | `finance.lead@test.lextria.local` | Ramesh Patel (Finance Lead) | `Lextria#2026!Office` |
| **FINANCE** | `finance@test.lextria.local` | Pooja Iyer (Finance Executive) | `Lextria#2026!Office` |
| **DEPT_ADMIN** | `dept.admin@test.lextria.local` | Vikram Seth (Litigation Head) | `Lextria#2026!Office` |
| **STAFF (Associate)** | `staff@test.lextria.local` | Meera Rao (IP Patent Associate) | `Lextria#2026!Office` |

> [!NOTE]
> SUPER_ADMIN users can additionally activate the top-bar **"View as role..."** dropdown to simulate the exact UI perspective of any firm role.

---

## 10. Storage Migration Script for Engineers

To migrate documents uploaded during prototype testing from Supabase Storage (`test-files` bucket) into the production Zoho WorkDrive root folder:

```bash
# Preview operations without writing to database or WorkDrive:
npx tsx scripts/copy-test-files-to-workdrive.ts --dry-run

# Execute live migration:
npx tsx scripts/copy-test-files-to-workdrive.ts
```
The script downloads binaries, uploads them preserving the folder structure `{client_code} - {client_name} / {project_code} / {category} / {file_name}`, and updates `core.documents` with the new permanent WorkDrive `zoho_resource_id` and `zoho_permalink`.


