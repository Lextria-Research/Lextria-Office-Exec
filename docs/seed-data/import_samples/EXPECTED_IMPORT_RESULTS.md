# Import samples — expected dry-run results

## post_tracker_sample.csv (8 rows)
| Row | Expected outcome |
|---|---|
| 1 | UNCHANGED — tracking JK000000001IN already exists (CR5001) |
| 2 | UNCHANGED — ditto recipient resolved to Registrar of Copyrights; tracking JK000000002IN exists |
| 3 | NEW but FLAGGED — "09/04/2026" sits between September rows; suggest swap to 04-09-2026; never auto-swap. Ditto (") recipient resolved; "CR5003 " links to CR5003 |
| 4 | UNCHANGED — legal notice RA000000101IN exists |
| 5 | REJECTED — unparseable date "22-09-2-26" |
| 6 | SKIPPED — Jalio Technologies row |
| 7 | NEW — recipient not in address book → address-book review; "CR5011" token linked; status DELIVERED with delivered_on 2026-10-01 (lower-case text parsed) |
| 8 | NEW but FLAGGED — ditto resolves to row 7's recipient; token XYZ999 has an unregistered prefix → no link, kept as particulars |
Second run of the same file → 0 new.

## cash_tracker_sample.csv (10 rows)
| Row | Expected outcome |
|---|---|
| 1 | TOP_UP ₹2,000 |
| 2 | EXPENSE NOTARY ₹250 (category normalized from "NOTARY ") |
| 3 | EXPENSE INDIA_POST ₹62 |
| 4 | EXPENSE STAMP_PAPER ₹100 — **mismatch**: sheet balance 1590, recomputed 1588 (row 5 also mismatches: 1590 vs 1588) |
| 5 | One FIRM_UPI expense ₹220 (equal in/out UPI row) — does not change balance |
| 6 | EXPENSE ₹1,800 — **recomputed balance goes negative (−212)** → listed |
| 7 | Needs review — no description |
| 8 | TOP_UP ₹1,500 |
| 9 | EXPENSE INDIA_POST ₹103 ("FOR POST" normalized) |
| 10 | Needs review — "Notary" category with amount in Cash-In column (likely an expense entered in the wrong column) |
All imported expenses arrive with no project-code allocation → Finance sees them as "not yet allocated" until the office executive allocates them.

## lr_sheet_sample.csv (6 rows)
| Row | Expected outcome |
|---|---|
| tbi 01 | UNCHANGED (normalizes to TBI01) |
| KVU03 | CONFLICT — sheet says "Published", suite says CS_FILED; DEPT_ADMIN picks winner |
| TBI05 | NEW project code + patent matter |
| AR5002␠ | UNCHANGED (trailing space normalized) |
| JT01 | SKIPPED — Jalio |
| XYZ01 | NEEDS DECISION — unknown prefix; DEPT_ADMIN/SUPER_ADMIN must register prefix or reject |
