# Lextria Business Suite — Synthetic Demo Data (v1)

Everything here is fictional: clients, inventors, addresses, phone numbers (all start "+91 0", an invalid Indian format), GSTINs, application numbers, amounts and staff. Email domains end in `.test` and cannot receive mail. Staff are role-named ("Paralegal A", "Finance Lead"), not real people.

**Demo date: Monday 5 October 2026.** Every "today", "overdue" and "due in N days" in the data is relative to this date. The app's demo clock must default to `demo_settings.demo_today`.

## What's in this package

| Path | What it is |
|---|---|
| `seed/*.json` | 85 tables, one JSON array per table. Load these into the mock adapter. |
| `SCHEMA.md` | Every table with its row count and field names. This is the naming contract for Prompt 01. |
| `expected_results.md` | Numbers and states the app must show (finance KPIs, petty cash balance, Today board, overdue items, client-portal visibility, reimbursements). Use it to verify each prompt. |
| `import_samples/` | Deliberately messy post-tracker, petty-cash and LR-sheet files, plus `EXPECTED_IMPORT_RESULTS.md`, for testing Prompt 17. |
| `tools/gen.py` | The generator. Edit and re-run to change the data. |
| `tools/validate.py` | Checks every foreign key, duplicate IDs, and that quotation stages sum correctly. Run after any edit. |
| `tools/expected.py` | Regenerates `expected_results.md` from the seed. |

Regenerate: `python3 tools/gen.py && python3 tools/validate.py && python3 tools/expected.py` (paths inside the scripts point to `/home/claude/seed`; change `out`/`S` at the top to your folder).

## Conventions
- snake_case field names; dates ISO `YYYY-MM-DD`; timestamps ISO with `+05:30`; money in whole rupees (integers).
- IDs are readable strings (`pc_TBI01`, `u_pa1`, `cli_1003`) so the demo is easy to follow. Engineers will switch to UUIDs in Postgres; nothing in the UI should depend on the ID format.
- Statutory periods and govt fees are **illustrative and flagged `verify: true`**. They are there to make the screens work, not as legal reference.

## The seven clients and what each one demonstrates

| Client | Type | What it exercises |
|---|---|---|
| CLI-1001 Tungabhadra Institute of Technology | Educational institution | Institution prefix (TBI), rate card, PS→CS, FER response with chain override, **TBI04 inventor-order conflict blocking a CS filing**, escalation to founder, active portal account with view/download log |
| CLI-1002 Kaveri Vidya University | Educational institution | **KVU02 CS due today** (cleared via superadmin override), Form 18 waiting on finance approval, Form 13 on hold behind Form 26, 10 copyrights incl. a batch dispatch, govt-fee reconciliation, partial payment aged 90+ |
| CLI-1003 Nimbus Agritech | Startup | Patent at hearing stage with overdue co-lead review, pending change of registered portal email, linked infringement suit (LIT5001) with internal notes hidden from client, TM objection, completed NDA, advance payment, aged receivable |
| CLI-1004 Dr. Meera Kulkarni | Individual | **Duplicate project code** AR5010 ↔ AR5002 (status DUPLICATE_REVIEW, hidden from portal), orphaned deadline (owner left firm), portal account invited but not yet activated |
| CLI-1005 Coastal Spice Traders | Small entity | TM opposition, design filed & paid, **legal notice with full proof-of-dispatch scans**, ethical wall on LIT5002, e-sign declined then re-signed on amended quote, vendor GST job |
| CLI-1006 Hemadri Biotech | Large entity | **Post-grant**: renewal schedule with arrears-on-grant, renewal due in 28 days with no instruction (escalate), one in grace period, Form 27 periods (new 3-year rule + legacy patents), licence agreement at counterparty review, vendor ROC job |
| CLI-1007 Orbitron Robotics | Startup | New client: quotation e-sign pending (reminder), partially-signed engagement letter, ₹50,000 advance not yet allocated, returned-then-reposted courier, overdue vendor KYC job |

## Feature → where to see it in the data

| Feature (prompt) | Records to look at |
|---|---|
| Code register (02) | `prefix_registry`; `project_aliases` (temp code → application no.); AR5010 `possible_duplicate_of`; LR import sample row "tbi 01" |
| WorkDrive paths (03) | `clients.workdrive_folder_path`, `project_codes.workdrive_path`, `documents.workdrive_path`; `finance_only` on Engagement & Finance docs |
| Finance ledger (04) | `billing_stages` (UNBILLED → INVOICED → PAID), `invoice_refs` with Zoho Books numbers, `payments` with TDS, `advances`, `disbursements` with `ledger_posting_status` (AUTO_POSTED / NEEDS_REVIEW / REVERSED / NOT_RECOVERABLE) |
| Quotations (05) | v2 amendments: TBI03 (FER), AR5001 (hearing), LIT5002 (v1 rejected → v2); manual stages in `TPL_LIT_PHASE`; client rate cards for TBI and KVU |
| E-sign (06) | `esign_requests`: SIGNED, SENT (>5 days), PARTIALLY_SIGNED, DECLINED; overrides in `quotations.override_reason` |
| Miscellaneous (07) | `vendors`, `misc_jobs` (MISC5003 overdue; margins auto-computed); misc invoice INV-DEMO-0210 |
| Inventor master (08) | `matter_parties` conflict on TBI04; locked parties after filing; `persons.per_15` duplicate candidate |
| Review window & chain (09) | `draft_documents` / `review_rounds` / `review_comments` (anchored, with status) / `review_comment_replies` (drafter–reviewer threads): TBI01 round 2 at external review with round-1 threads answered, TBI02 returned with 2 CRITICAL and an open thread, KVU01 return tagged CLIENT_INPUT_CHANGE (not counted), TBI03 chain override, AR5001 overdue |
| Drafter review score (15) | `review_rounds.return_reason` + `counts_toward_review_score`; weights in `demo_settings.review_score`; expected scores in `expected_results.md` section 7 |
| Client approvals (10) | `approval_requests`: AWAITING with 2 reminders, superadmin override on KVU02, APPROVED_WITH_CHANGES on DS5001 |
| Filing pipeline (11) | `filing_jobs` in every state; `filing_check_results`; `filing_corrections` across months for the per-person report |
| Govt fees (12) | `govt_fee_requests` in REQUESTED / APPROVED / PAID / RECONCILED; duplicate-payment suspect on CR5006; `portal_payment_records` with one portal-only record |
| Post-grant (13) | `renewal_schedule`, `form27_periods` |
| Checklists (14) | `checklist_instances`: one MISSED + escalated, today's instances (one routed to backup); `user_availability` (Paralegal A on leave 5–7 Oct) |
| Performance (15) | `work_events`, `evaluations` (Sept 2026, with trust score and band), `effort_points` |
| Office Executive (16) | `dispatches` (batch, legal-evidence, returned/reposted, pending >7 days, inward), `cash_entries` (FIRM_UPI, no-receipt, non-recoverable), `topup_requests`, `cash_counts`, `physical_documents`, `custody_log`, `office_requests` |
| Employee reimbursements (04A) | `reimbursement_claims` in every status (SUBMITTED, MANAGER_APPROVED, FINANCE_APPROVED, PAID, QUERIED, REJECTED); rejected at manager step; founder's claim approved by the other founder; Finance user's claim with two different approvers; bill override with reason; claim outside the 60-day window; claim queried as a duplicate of a petty cash entry; `reimbursement_payouts`, `reimbursement_policy` |
| Expense → client ledger | Each recoverable office expense or Finance-approved employee-reimbursement allocation creates a `disbursements` row (`source_type` OFFICE_EXPENSE or EMPLOYEE_REIMBURSEMENT) that auto-posts to that client's ledger; the bus-parcel expense without a receipt sits in NEEDS_REVIEW |
| Importer (17) | `import_samples/` |
| Client portal (18) | `client_portal_accounts` (one per client: 6 active, 1 invited, 1 pending email change), `client_portal_settings` (OTP rules), `client_access_log`, `client_status_map`, `timeline_events.client_visible` + `client_label`, `documents.client_shared`, `litigation_hearings.client_visible`, `agreement_versions.client_visible` |
