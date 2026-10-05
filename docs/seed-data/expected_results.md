# Expected results — use these to verify the demo

Demo date: **2026-10-05 (Monday)**. All figures below are computed from the seed files. If the app shows a different number, either the app or the formula is wrong.

## 1. Finance — per client

Rules used: Quoted = CONFIRMED quotations only (v2 amendments are additive scope). Work done = completed stages. Unbilled = completed stages with billing_status UNBILLED_WORK_DONE. Ledger debits = (invoice total − reimbursement lines already AUTO_POSTED) + AUTO_POSTED disbursements. Credits = payments (gross, TDS counts as received). Advances are shown separately and are not netted into receivables until allocated.

| Client | Quoted | Work done | Work to be done | Unbilled | Invoiced (total) | Received (gross) | Posted disbursements | Outstanding receivable | Advance |
|---|---|---|---|---|---|---|---|---|---|
| CLI-1001 Tungabhadra Institute of Technology | ₹1,40,000 | ₹58,000 | ₹82,000 | ₹0 | ₹70,040 | ₹70,040 | ₹1,600 | ₹0 | ₹0 |
| CLI-1002 Kaveri Vidya University | ₹1,15,000 | ₹81,250 | ₹33,750 | ₹32,750 | ₹57,465 | ₹41,240 | ₹5,052 | ₹21,042 | ₹0 |
| CLI-1003 Nimbus Agritech Pvt Ltd | ₹2,48,000 | ₹1,38,000 | ₹1,10,000 | ₹0 | ₹1,62,840 | ₹1,48,680 | ₹1,740 | ₹15,900 | ₹10,000 |
| CLI-1004 Dr. Meera Kulkarni | ₹25,000 | ₹25,000 | ₹0 | ₹0 | ₹29,500 | ₹29,500 | ₹0 | ₹0 | ₹0 |
| CLI-1005 Coastal Spice Traders LLP | ₹48,000 | ₹33,000 | ₹15,000 | ₹25,000 | ₹9,440 | ₹9,440 | ₹62 | ₹62 | ₹0 |
| CLI-1006 Hemadri Biotech Pvt Ltd | ₹43,000 | ₹20,000 | ₹23,000 | ₹0 | ₹23,600 | ₹0 | ₹300 | ₹23,900 | ₹0 |
| CLI-1007 Orbitron Robotics LLP | ₹12,000 | ₹0 | ₹12,000 | ₹0 | ₹2,832 | ₹0 | ₹94 | ₹2,926 | ₹50,000 |
| **Firm total** | ₹6,31,000 | ₹3,55,250 | ₹2,75,750 | ₹57,750 | ₹3,55,717 | ₹2,98,900 | ₹8,848 | ₹63,830 | ₹60,000 |

### Ready-to-invoice queue (stages)

- KVU01 (CLI-1002) — Complete drafting & filing: ₹20,250, completed 2026-09-25
- CR5006 (CLI-1002) — Copyright application filed: ₹2,500, completed 2026-10-03
- CR5007 (CLI-1002) — Copyright application filed: ₹2,500, completed 2026-10-03
- CR5008 (CLI-1002) — Copyright application filed: ₹2,500, completed 2026-10-03
- CR5009 (CLI-1002) — Copyright application filed: ₹2,500, completed 2026-10-03
- CR5010 (CLI-1002) — Copyright application filed: ₹2,500, completed 2026-10-03
- LIT5002 (CLI-1005) — Legal notice drafted & served: ₹25,000, completed 2026-09-18

### Disbursements (govt fees, office expenses, employee reimbursements) by posting status

- **AUTO_POSTED**: CLI-1001 ₹1,600, CLI-1002 ₹5,052, CLI-1003 ₹1,740, CLI-1005 ₹62, CLI-1006 ₹300, CLI-1007 ₹94
- **NEEDS_REVIEW**: CLI-1001 ₹60
- **REVERSED**: CLI-1003 ₹90
- AUTO_POSTED by source: GOVT_FEE ₹5,700, OFFICE_EXPENSE ₹1,288, EMPLOYEE_REIMBURSEMENT ₹1,860

The NEEDS_REVIEW item(s) have no receipt attached: TBI04 ₹60 (Bus Parcel: Bus parcel — originals to TBI)

### Receivables ageing (by invoice date, unpaid invoices)

- INV-DEMO-0120 CLI-1002: total ₹21,240, paid ₹20,000, due ₹1,240, age 289 days → **90+**
- INV-DEMO-0201 CLI-1002: total ₹14,985, paid ₹0, due ₹14,985, age 25 days → **0–30**
- INV-DEMO-0190 CLI-1006: total ₹23,600, paid ₹0, due ₹23,600, age 27 days → **0–30**
- INV-DEMO-0210 CLI-1007: total ₹2,832, paid ₹0, due ₹2,832, age 15 days → **0–30**
- INV-DEMO-0160 CLI-1003: total ₹14,160, paid ₹0, due ₹14,160, age 115 days → **90+**

## 2. Office Executive

- Petty cash book balance: **₹962** (FIRM_UPI courier ₹80 on 01-Oct does NOT reduce it).
- Pending top-up request: ₹1,500 (status REQUESTED, for Finance).
- Weekly count 03-Oct: variance −₹20, signed off by Finance Lead.
- Pending delivery > 7 days: RK000000202IN (13 days)
- Batch 03-Oct: 5 copyright dispatches to one saved recipient (Registrar of Copyrights), one cash entry ₹235 allocated ₹47 × 5.
- Legal-evidence dispatch (LIT5002 legal notice) has all 4 scans: booking receipt, document copy, proof of delivery, tracking history.
- Currently out: DSC token — Managing Partner → Ops & Systems Admin; Office phone (OTP) → Paralegal B

## 3. Filing pipeline — Today board

- TBI04 · CS · due 2026-10-07 · **CORRECTIONS_REQUIRED** — blocked: inventor order conflict (unresolved) + failed check item
- KVU02 · CS · due 2026-10-05 (STATUTORY) · **CLEARED_FOR_ESIGN** — cleared via SUPER_ADMIN override of client approval (deemed approval) — statutory deadline TODAY
- KVU01 · FORM_18 · due 2026-10-10 · **PAYMENT_PENDING** — waiting: govt fee request not yet approved by Finance
- KVU03 · FORM_26 · due 2026-10-15 · **QUEUED** — not started
- KVU03 · FORM_13 · due 2026-10-20 · **ON_HOLD** — depends on Form 26 job (QUEUED); Form 26 POA still in transit
- TM5001 · TM_REPLY · due 2026-10-28 (STATUTORY) · **PREPARED** — awaiting checker
- AR5004 · RENEWAL · due 2026-11-02 (STATUTORY) · **QUEUED** — not started

Corrections by person/month: Filing Intern 2026-10: 1; Paralegal A 2025-11: 2; Paralegal A 2026-10: 1; Paralegal B 2026-09: 3; Paralegal B 2026-10: 2

Govt fee reconciliation (03-Oct portal records):
- 5 copyright portal records match 5 PAID requests by reference → should auto-match.
- Portal record CBR-DEMO-26100311 (₹2,500, 202541000203) → **found on portal, not in dashboard**.
- Request CR-DEMO-26100399 (CR5006 ₹500) → **paid in dashboard, not on portal** and flagged as possible duplicate of CR5006's earlier payment.

## 4. Reviews, approvals, deadlines, checklists

- Open review: TBI01 CS at EXTERNAL_REVIEW (round 2), due 2026-10-10
- Open review: TBI03 FER_RESPONSE at CO_LEAD_REVIEW (round 1), due 2026-10-08
- Open review: AR5001 WRITTEN_SUBMISSION at CO_LEAD_REVIEW (round 1), due 2026-09-28 — **OVERDUE**
- TBI03 FER response chain skips external review — reason logged.
- TBI02 PS: round 1 RETURNED with 2 CRITICAL comments; next upload becomes round 2.
- Approval awaiting: KVU02 (PATENT), 8 days, reminders 2 — **escalate to DEPT_ADMIN** — superadmin override present
- Approval awaiting: TM5004 (TRADEMARK), 8 days, reminders 2 — **escalate to DEPT_ADMIN**
- Approval awaiting: TM5001 (TRADEMARK), 3 days, reminders 0
- Orphaned deadlines (owner inactive): AR5002 'Complete specification due'
- Paralegal A unavailable 05–07 Oct → 4 open deadlines show the backup as acting owner: TBI04, KVU02, AR5004, AR5005
- Checklist 'End-of-day ACK reconciliation' for 03-Oct: **MISSED, escalated** to Paralegal Head. Today's 'Daily priority filings check' is assigned to the backup (Filing Intern) because the owner is on leave.
- Renewal AR5004 year 10 due 02-Nov-2026, no client instruction, 28 days left → **escalate**. AR5005 year 11 IN_GRACE until 01-Feb-2027.
- Possible duplicates: project AR5010 ↔ AR5002; person per_15 ↔ per_03 (same phone).
- e-sign: AR5006 quotation SENT 23-Sep (reminder flag, >5 days); AGR5003 PARTIALLY_SIGNED; LIT5002 v1 DECLINED then v2 SIGNED (quotation amendment).
- Misc: MISC5003 DP KYC statutory due 30-Sep, not COMPLETED → **overdue highlight**; margins MISC5001 ₹2,500, MISC5002 ₹6,000, MISC5003 ₹800.

## 5. Client portal — one login per client

Login is password + one-time code by email or SMS (no Zoho). Each client has exactly one portal account; institutions decide internally who uses it.

- **cpa_1001** CLI-1001 (ACTIVE): matters = TBI01, TBI02, TBI03, TBI04; shared documents visible = 4; internal documents hidden = 7
- **cpa_1002** CLI-1002 (ACTIVE): matters = KVU01, KVU02, KVU03, CR5001, CR5002, CR5003, CR5004, CR5005, CR5006, CR5007, CR5008, CR5009, CR5010; shared documents visible = 3; internal documents hidden = 5
- **cpa_1003** CLI-1003 (ACTIVE): matters = AR5001, TM5001, DS5002, LIT5001, AGR5002; shared documents visible = 5; internal documents hidden = 3
- **cpa_1004** CLI-1004 (INVITED): matters = AR5002, CR5011; shared documents visible = 1; internal documents hidden = 1
- **cpa_1005** CLI-1005 (ACTIVE): matters = TM5002, TM5003, DS5001, LIT5002; shared documents visible = 3; internal documents hidden = 7
- **cpa_1006** CLI-1006 (ACTIVE): matters = AR5003, AR5004, AR5005, AGR5001; shared documents visible = 3; internal documents hidden = 0
- **cpa_1007** CLI-1007 (ACTIVE): matters = AR5006, TM5004, AGR5003; shared documents visible = 1; internal documents hidden = 2

- cpa_1004 (Dr. Meera Kulkarni) is INVITED, not yet activated: login must show 'account not activated — use the invite link'.
- cpa_1003 has a pending change of registered email: old contact verified, new contact not yet verified → login still goes to the OLD email until both are verified and the SPOC approves.
- cpa_1004 must NOT see AR5010 (status DUPLICATE_REVIEW).

Must never appear in any client view: internal notes (LIT5001 strategy note, LIT5002 note), drafts/review comments, filing corrections, checker names, quotations, invoices, ledger, petty cash, reimbursements, govt-fee requests, trust scores, AGR5003 v1 internal draft, MISC (vendor) matters. Litigation hearings and agreement versions only where client_visible = true.

## 6. Employee reimbursements

Rules: every claim needs a bill (Finance Lead or SUPER_ADMIN can override with a reason); reporting manager approves, then Finance; nobody approves their own claim and the two approvals are by different people; founders' claims go to the other founder for the manager step; claims older than 60 days also need SUPER_ADMIN; payout weekly on Friday.

- rmb_0001 Office Executive · FUEL · ₹780 · **PAID** · manager: Operations Partner · finance: Finance Lead
- rmb_0002 Office Executive · FUEL · ₹300 · **SUBMITTED** · awaiting manager (Operations Partner)
- rmb_0003 Ops & Systems Admin · PURCHASE · ₹640 · **FINANCE_APPROVED** · manager: Operations Partner · finance: Finance Exec 1
- rmb_0004 Ops & Systems Admin · PURCHASE · ₹950 · **MANAGER_APPROVED** · manager: Operations Partner
- rmb_0005 Office Executive · POSTAGE_COURIER · ₹60 · **QUERIED** · awaiting manager (Operations Partner) · Same date, amount and description as a petty cash entry — paid from petty cash or your own money?
- rmb_0006 Paralegal B · TRAVEL · ₹350 · **REJECTED** · manager: Paralegal Head · ₹350 allocated to client matters · Rejected by reporting manager (Paralegal Head): trip was cancelled; client couriered the documents — never reached Finance
- rmb_0007 Managing Partner · TRAVEL · ₹1,240 · **FINANCE_APPROVED** · manager: Operations Partner · finance: Finance Lead · ₹1,240 allocated to client matters
- rmb_0008 Finance Exec 2 · FEE_PAID_PERSONALLY · ₹500 · **FINANCE_APPROVED** · manager: Finance Lead · finance: Finance Exec 1 · ₹500 allocated to client matters · Finance Exec 2's own claim — manager step by Finance Lead, Finance step by Finance Exec 1 (two different people, neither the claimant)
- rmb_0009 Legal Intern · PURCHASE · ₹420 · **SUBMITTED** · awaiting manager (Litigation Associate) · ₹420 allocated to client matters · Older than the 60-day claim window — after the manager step it also needs SUPER_ADMIN approval
- rmb_0010 Office Executive · POSTAGE_COURIER · ₹120 · **FINANCE_APPROVED** · manager: Operations Partner · finance: Finance Lead · ₹120 allocated to client matters · bill override

- Ready for next payout (FINANCE_APPROVED): 4 claims, total ₹2,500
- Awaiting manager (SUBMITTED): 2; awaiting Finance (MANAGER_APPROVED): 1; queried: 1
- Paid on 02-Oct (UTR-DEMO-RMB-0002): Office Executive's September petrol bills, ₹780 — office overhead, not on any client ledger.
- Only FINANCE_APPROVED or PAID claims with allocations reach client ledgers; the REJECTED claim's KVU03 allocation does not.

## 7. Drafter review score (lower is better)

Per counted return (reason DRAFTER_QUALITY): 1 point + 1 per CRITICAL comment + 0.5 per MAJOR comment. Score = average points per draft over drafts with at least one decided review round. First-time-right = drafts with no counted return.

| Drafter | Drafts counted | Counted returns | Points | Score | First-time-right | Not counted (client input etc.) |
|---|---|---|---|---|---|---|
| Drafter A | 2 | 1 | 2.5 | 1.25 | 1/2 | 1 |
| Drafter B | 2 | 1 | 3 | 1.50 | 1/2 | 0 |
| Drafter C | 1 | 1 | 1.5 | 1.50 | 0/1 | 0 |

The KVU01 return (inventors sent a new embodiment) is tagged CLIENT_INPUT_CHANGE and does not count against Drafter A.
Open threads: TBI02 has an unresolved CRITICAL comment with a drafter–reviewer discussion; TBI01 v2 is with the external reviewer with all round-1 comments marked addressed.