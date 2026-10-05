#!/usr/bin/env node
// scripts/verify-seed.cjs
// Machine-checks every Office Executive line in docs/seed-data/expected_results.md § 2.
// Loads seed data through the SAME code path sync-seed.cjs uses (direct JSON reads).
// Exits non-zero if any check fails.

'use strict';

const fs   = require('fs');
const path = require('path');

const SEED = path.resolve(__dirname, '../docs/seed-data/seed');
const load = n => JSON.parse(fs.readFileSync(path.join(SEED, n), 'utf8'));

// Demo date
const DEMO_DATE = '2026-10-05';

// ── Load seed tables ─────────────────────────────────────────────────────────
const cashEntries      = load('cash_entries.json');
const cashAllocations  = load('cash_allocations.json');
const topupRequests    = load('topup_requests.json');
const cashCounts       = load('cash_counts.json');
const dispatches       = load('dispatches.json');
const dispatchLinks    = load('dispatch_project_links.json');
const addressBook      = load('address_book.json');
const custodyItems     = load('custody_items.json');
const custodyLog       = load('custody_log.json');
const users            = load('users.json');
const projectCodes     = load('project_codes.json');
const documents        = load('documents.json');

const userMap    = new Map(users.map(u  => [u.id,  u]));
const abMap      = new Map(addressBook.map(ab => [ab.id, ab]));
const pcMap      = new Map(projectCodes.map(pc => [pc.id, pc]));

// ── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function check(label, actual, expected, detail) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✓  ${label}`);
  } else {
    failed++;
    const msg = `  ✗  ${label}\n       EXPECTED: ${JSON.stringify(expected)}\n       ACTUAL  : ${JSON.stringify(actual)}` + (detail ? `\n       ${detail}` : '');
    failures.push(msg);
    console.log(msg);
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function daysBetween(a, b) {
  // a and b are date strings "YYYY-MM-DD"
  const da = new Date(a), db = new Date(b);
  return Math.round((db - da) / 86400000);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Balance computation (entry-by-entry)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 1: Cash balance (entry-by-entry computation)');
console.log('──────────────────────────────────────────────');

let runningBalance = 0;
const entryLog = [];

for (const ce of cashEntries) {
  const before = runningBalance;
  if (ce.type === 'TOP_UP' || ce.type === 'REFUND_IN') {
    runningBalance += ce.amount;
  } else if (ce.type === 'EXPENSE' && ce.affects_petty_cash_balance === true) {
    runningBalance -= ce.amount;
  }
  // FIRM_UPI (affects_petty_cash_balance = false) must NOT change balance
  entryLog.push({
    id:          ce.id,
    date:        ce.entry_date,
    type:        ce.type,
    category:    ce.category,
    amount:      ce.amount,
    mode:        ce.payment_mode,
    affects:     ce.affects_petty_cash_balance,
    balance_before: round2(before),
    balance_after_computed: round2(runningBalance),
    balance_after_stored:   ce.balance_after,
  });
}

console.log('\n  Entry-by-entry ledger:');
for (const e of entryLog) {
  const flag = e.balance_after_computed !== e.balance_after_stored ? ' ← MISMATCH' : '';
  console.log(`    ${e.id}  ${e.date}  ${e.type}/${e.category}  ${e.mode}  amt=${e.amount}`
    + `  affects=${e.affects}  bal_after=${e.balance_after_computed}  stored=${e.balance_after_stored}${flag}`);
}

// 1a. Balance stored vs computed for each entry
let balMismatches = 0;
for (const e of entryLog) {
  if (e.balance_after_stored !== null && e.balance_after_computed !== e.balance_after_stored) {
    balMismatches++;
  }
}
check('No balance_after mismatches between seed and computed', balMismatches, 0,
  `${balMismatches} entry/entries have stored balance_after != computed`);

// 1b. FIRM_UPI entry does not change balance
const firmUpi = cashEntries.find(ce => ce.payment_mode === 'FIRM_UPI');
check(
  'FIRM_UPI courier ₹80 on 01-Oct — affects_petty_cash_balance = false',
  firmUpi ? firmUpi.affects_petty_cash_balance : 'NOT FOUND',
  false,
);

// 1c. Final balance
check(
  'Final computed cash balance = ₹962',
  round2(runningBalance),
  962,
  `Top-ups: ${cashEntries.filter(ce => ce.type === 'TOP_UP').reduce((s, ce) => s + ce.amount, 0)}, `
  + `CASH expenses: ${cashEntries.filter(ce => ce.type === 'EXPENSE' && ce.affects_petty_cash_balance).reduce((s, ce) => s + ce.amount, 0)}, `
  + `FIRM_UPI (excluded): ${cashEntries.filter(ce => ce.type === 'EXPENSE' && !ce.affects_petty_cash_balance).reduce((s, ce) => s + ce.amount, 0)}`
);

// 1d. Top-up breakdown
const topups = cashEntries.filter(ce => ce.type === 'TOP_UP');
console.log(`\n  Top-ups in cash_entries (${topups.length}):`);
topups.forEach(ce => console.log(`    ${ce.id}  ${ce.entry_date}  ₹${ce.amount}`));
check(
  'Two top-up entries: ₹2,000 (01-Sep) and ₹1,000 (01-Oct)',
  topups.map(t => ({ date: t.entry_date, amount: t.amount })),
  [{ date: '2026-09-01', amount: 2000 }, { date: '2026-10-01', amount: 1000 }]
);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Pending top-up request
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 2: Pending top-up request');
console.log('──────────────────────────────────────────────');

const pendingTopup = topupRequests.filter(tr => tr.status === 'REQUESTED');
check('Exactly 1 pending (REQUESTED) top-up', pendingTopup.length, 1);

if (pendingTopup.length > 0) {
  const ptr = pendingTopup[0];
  check('Pending top-up amount = ₹1,500', ptr.amount, 1500);
  check('Pending top-up requested_by = u_oe', ptr.requested_by, 'u_oe',
    `expected u_oe (Office Executive), got "${ptr.requested_by}"`);
  const requester = userMap.get(ptr.requested_by);
  check('Pending top-up requester display_name = "Office Executive"',
    requester ? requester.display_name : null, 'Office Executive');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Weekly cash count (03-Oct)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 3: Weekly count 03-Oct');
console.log('──────────────────────────────────────────────');

const oct3Count = cashCounts.find(cc => cc.count_date === '2026-10-03');
check('Cash count for 03-Oct exists', !!oct3Count, true);
if (oct3Count) {
  check('Weekly count variance = −₹20', oct3Count.variance, -20);
  check('Weekly count book_balance = ₹962 (same as computed)', oct3Count.book_balance, 962);
  check('Weekly count finance_signoff_by = u_fl (Finance Lead)', oct3Count.finance_signoff_by, 'u_fl');
  const signer = userMap.get(oct3Count.finance_signoff_by);
  check('Finance signoff display_name = "Finance Lead"',
    signer ? signer.display_name : null, 'Finance Lead');
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Pending deliveries > 7 days
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 4: Pending deliveries > 7 days');
console.log('──────────────────────────────────────────────');

// "Pending" = status IN ('BOOKED', 'IN_TRANSIT')
const pending = dispatches.filter(d =>
  ['BOOKED', 'IN_TRANSIT'].includes(d.status)
);
const pendingOver7 = pending.filter(d => {
  const days = daysBetween(d.booking_date, DEMO_DATE);
  return days > 7;
});

console.log(`\n  All pending dispatches on ${DEMO_DATE}:`);
pending.forEach(d => {
  const days = daysBetween(d.booking_date, DEMO_DATE);
  const ab   = abMap.get(d.recipient_address_id);
  console.log(`    ${d.tracking_id}  status=${d.status}  booked=${d.booking_date}  days=${days}  recipient=${ab ? ab.name + (ab.organization ? ' @ ' + ab.organization : '') : d.recipient_address_id}`);
});

check(
  'Exactly 1 pending dispatch older than 7 days',
  pendingOver7.length, 1,
  pendingOver7.map(d => d.tracking_id).join(', ')
);

if (pendingOver7.length > 0) {
  const d = pendingOver7[0];
  const days = daysBetween(d.booking_date, DEMO_DATE);
  check('Overdue tracking_id = RK000000202IN', d.tracking_id, 'RK000000202IN');
  check('RK000000202IN booked 2026-09-22', d.booking_date, '2026-09-22');
  check('RK000000202IN age = 13 days', days, 13);
  const ab = abMap.get(d.recipient_address_id);
  check(
    'RK000000202IN recipient = Kaveri Vidya University IPR Office',
    ab ? `${ab.name} @ ${ab.organization}` : d.recipient_address_id,
    'IPR Office @ Kaveri Vidya University',
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: 03-Oct batch (5 copyright dispatches)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 5: Batch 03-Oct — 5 copyright dispatches');
console.log('──────────────────────────────────────────────');

const oct3Batch = dispatches.filter(d => d.batch_id === 'batch_2026-10-03');
check('Batch 2026-10-03 has 5 dispatches', oct3Batch.length, 5);

const batchRecipients = [...new Set(oct3Batch.map(d => d.recipient_address_id))];
check('All batch dispatches go to same recipient (ab_cr)', batchRecipients, ['ab_cr']);

const batchCashEntry = cashEntries.find(ce => ce.id === 'cash_0017');
check('Batch cash entry cash_0017 exists', !!batchCashEntry, true);
if (batchCashEntry) {
  check('Batch cash entry amount = ₹235', batchCashEntry.amount, 235);
}

const batchAllocations = cashAllocations.filter(ca => ca.cash_entry_id === 'cash_0017');
check('Batch has 5 allocations of ₹47 each', batchAllocations.length, 5);
const allAmounts = batchAllocations.map(a => a.amount);
check('Each allocation = ₹47', allAmounts, [47, 47, 47, 47, 47]);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Legal-evidence dispatch scans
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 6: Legal-evidence dispatch (LIT5002)');
console.log('──────────────────────────────────────────────');

const litDispatch = dispatches.find(d => d.legal_evidence === true);
check('Legal-evidence dispatch exists', !!litDispatch, true);

if (litDispatch) {
  check('Legal dispatch tracking_id = RA000000101IN', litDispatch.tracking_id, 'RA000000101IN');
  // Check linked project code
  const litLinks = dispatchLinks.filter(dl => dl.dispatch_id === litDispatch.id);
  const litPcIds = litLinks.map(l => l.project_code_id);
  check('Legal dispatch linked to pc_LIT5002', litPcIds, ['pc_LIT5002']);
  check('Legal dispatch status = DELIVERED', litDispatch.status, 'DELIVERED');
  check('Legal dispatch delivered_on = 2026-09-18', litDispatch.delivered_on, '2026-09-18');
  check('Legal dispatch ad_card_received = true', litDispatch.ad_card_received, true);

  // Check 4 scans linked in documents.json
  const litScans = documents.filter(d => d.dispatch_id === litDispatch.id);
  check('Legal dispatch dsp_0011 has exactly 4 scan documents', litScans.length, 4);

  const scanKinds = litScans.map(s => s.scan_kind).sort();
  const expectedKinds = ['BOOKING_RECEIPT', 'DOCUMENT_COPY', 'PROOF_OF_DELIVERY', 'TRACKING_HISTORY'].sort();
  check('All 4 legal evidence scan kinds present (BOOKING_RECEIPT, DOCUMENT_COPY, PROOF_OF_DELIVERY, TRACKING_HISTORY)', scanKinds, expectedKinds);

  console.log(`\n  Scans linked to ${litDispatch.id}:`);
  litScans.forEach(s => console.log(`    ${s.id}  kind=${s.scan_kind}  file=${s.file_name}`));
}

check(
  'LIT legal notice flagged legal_evidence=true',
  litDispatch ? litDispatch.legal_evidence : false,
  true,
);

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Current custody holders
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n──────────────────────────────────────────────');
console.log('CHECK 7: Current custody holders');
console.log('──────────────────────────────────────────────');

// Active log entries: in_at is null
const activeCheckouts = custodyLog.filter(cl => !cl.in_at);

console.log('\n  All custody_log entries:');
custodyLog.forEach(cl => {
  const item   = custodyItems.find(ci => ci.id === cl.custody_item_id);
  const holder = userMap.get(cl.holder_user_id);
  console.log(`    ${cl.id}  item=${item ? item.item : cl.custody_item_id}  holder=${holder ? holder.display_name : cl.holder_user_id}  in_at=${cl.in_at ?? 'null (ACTIVE)'}`);
});

check('Exactly 2 items currently checked out', activeCheckouts.length, 2);

// DSC — Managing Partner token → Ops & Systems Admin
const dscItem   = custodyItems.find(ci => ci.id === 'cust_dsc1');
const dscActive = activeCheckouts.find(cl => cl.custody_item_id === 'cust_dsc1');
check(
  'DSC token — Managing Partner currently checked out to Ops & Systems Admin',
  dscActive ? dscActive.holder_user_id : null,
  'u_ops',
);
if (dscActive) {
  const holder = userMap.get(dscActive.holder_user_id);
  check(
    'DSC holder display_name = "Ops & Systems Admin"',
    holder ? holder.display_name : null,
    'Ops & Systems Admin',
  );
}

// Office phone → Paralegal B
const phoneItem   = custodyItems.find(ci => ci.id === 'cust_phone');
const phoneActive = activeCheckouts.find(cl => cl.custody_item_id === 'cust_phone');
check(
  'Office phone (OTP) currently checked out to Paralegal B',
  phoneActive ? phoneActive.holder_user_id : null,
  'u_pa2',
);
if (phoneActive) {
  const holder = userMap.get(phoneActive.holder_user_id);
  check(
    'Phone holder display_name = "Paralegal B"',
    holder ? holder.display_name : null,
    'Paralegal B',
  );
}

// DSC2 (Operations Partner) should be available (last log entry has in_at set)
const dsc2Active = activeCheckouts.find(cl => cl.custody_item_id === 'cust_dsc2');
check(
  'DSC token — Operations Partner is NOT checked out (returned)',
  dsc2Active,
  undefined,
);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log(`VERIFY-SEED RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');

if (failed > 0) {
  console.error(`\n${failed} check(s) FAILED. Seed data or sync-seed.cjs has problems.\n`);
  process.exit(1);
} else {
  console.log('All checks passed. Seed data matches expected_results.md §2.\n');
  process.exit(0);
}
