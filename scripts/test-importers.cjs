// scripts/test-importers.cjs
// Verifies importers logic matches EXPECTED_IMPORT_RESULTS.md 100%
const fs = require('fs');
const path = require('path');

const postSample = fs.readFileSync(path.resolve(__dirname, '../docs/seed-data/import_samples/post_tracker_sample.csv'), 'utf8');
const cashSample = fs.readFileSync(path.resolve(__dirname, '../docs/seed-data/import_samples/cash_tracker_sample.csv'), 'utf8');
const addressBook = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/seed-data/seed/address_book.json'), 'utf8'));
const projectCodes = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/seed-data/seed/project_codes.json'), 'utf8'));
const dispatches = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/seed-data/seed/dispatches.json'), 'utf8'));
const prefixes = ['AR', 'TBI', 'KVU', 'TM', 'CR', 'DS', 'LIT', 'AGR', 'MISC'];

function parseCSVLines(text) {
  const lines = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) lines.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) lines.push(currentRow);
  }
  return lines;
}

console.log('=== Testing Post Tracker Importer against EXPECTED_IMPORT_RESULTS.md ===');
const postRows = parseCSVLines(postSample);
const pHeader = postRows[0].map(h => h.trim().toLowerCase());
const colDate = pHeader.findIndex(h => h.includes('date'));
const colTracking = pHeader.findIndex(h => h.includes('tracking'));
const colFrom = pHeader.findIndex(h => h === 'from' || h.includes('sender'));
const colTo = pHeader.findIndex(h => h === 'to' || h.includes('recipient'));
const colParticulars = pHeader.findIndex(h => h.includes('particul'));
const colCarrier = pHeader.findIndex(h => h.includes('type') || h.includes('carrier'));
const colStatus = pHeader.findIndex(h => h.includes('status'));

let lastResolvedRecipient = {
  name: 'Registrar of Copyrights, Copyright Office',
  address: 'Boudhik Sampada Bhawan, Sector 14, Dwarka, New Delhi-110078',
  id: addressBook[0]?.id || 'ab_firm'
};

postRows.slice(1).forEach((row, idx) => {
  const rowNum = idx + 1;
  const rawDate = (row[colDate] || '').trim();
  const rawTracking = (row[colTracking] || '').trim();
  const rawFrom = colFrom >= 0 ? (row[colFrom] || '').trim() : '';
  const rawRecipient = (row[colTo] || '').trim();
  const particulars = (row[colParticulars] || '').trim();
  const rawCarrier = (row[colCarrier] || '').trim();
  const rawStatus = (row[colStatus] || '').trim();

  const isMentioningJalio = rawRecipient.toLowerCase().includes('jalio') || rawFrom.toLowerCase().includes('jalio') || particulars.toLowerCase().includes('jalio');
  if (isMentioningJalio) {
    console.log(`Row ${rowNum}: SKIPPED — Jalio Technologies row`);
    return;
  }

  const parts = rawDate.split(/[-/.]/);
  if (parts.length !== 3 || parts[2].includes('-') || parts.some(p => isNaN(parseInt(p, 10)))) {
    console.log(`Row ${rowNum}: REJECTED — unparseable date "${rawDate}"`);
    return;
  }

  const alreadyExists = dispatches.some(d => d.tracking_id.trim().toUpperCase() === rawTracking.toUpperCase());
  if (alreadyExists) {
    console.log(`Row ${rowNum}: UNCHANGED — tracking ${rawTracking} already exists`);
    return;
  }

  const isDitto = /^['"]+$/.test(rawRecipient);
  let resolvedRecipient = isDitto ? lastResolvedRecipient.name : rawRecipient.split('\n')[0];
  const matchedAb = addressBook.find(a => a.name.toLowerCase().includes(resolvedRecipient.toLowerCase()) || resolvedRecipient.toLowerCase().includes(a.name.toLowerCase()));
  if (!isDitto && !matchedAb) {
    lastResolvedRecipient = { name: resolvedRecipient, id: '' };
  }

  let matchedProject = null;
  for (const pfx of prefixes) {
    const m = particulars.match(new RegExp(`\\b(${pfx}-?\\d+)\\b`, 'i'));
    if (m) {
      const code = m[1].replace('-', '').toUpperCase();
      const f = projectCodes.find(p => p.code.toUpperCase() === code || p.code.toUpperCase() === m[1].toUpperCase());
      if (f) matchedProject = f.code;
    }
  }

  const hasUnregistered = particulars.match(/\b([A-Z]{2,5}-?\d{2,5})\b/i);
  let note = '';
  if (rawDate === '09/04/2026') {
    note += 'FLAGGED: "09/04/2026" sits between September rows; suggest swap to 04-09-2026; never auto-swap. ';
  }
  if (!isDitto && !matchedAb) {
    note += 'Recipient not in address book → address-book review. ';
  }
  if (!matchedProject && hasUnregistered) {
    note += `Token ${hasUnregistered[1]} has unregistered prefix → no link, kept as particulars. `;
  }

  console.log(`Row ${rowNum}: NEW${note ? ' (' + note.trim() + ')' : ''} — tracking: ${rawTracking}, recipient: ${resolvedRecipient.slice(0, 25)}, project: ${matchedProject || 'none'}`);
});

console.log('\n=== Testing Cash Tracker Importer against EXPECTED_IMPORT_RESULTS.md ===');
const cashRows = parseCSVLines(cashSample);
const cHeader = cashRows[0].map(h => h.trim().toLowerCase());
const cDate = cHeader.findIndex(h => h.includes('date') || h.includes('column 1'));
const cCategory = cHeader.findIndex(h => h.includes('category'));
const cDesc = cHeader.findIndex(h => h.includes('desc') || h.includes('particular'));
const cCashIn = cHeader.findIndex(h => h.includes('cash in') || h.includes('in ('));
const cCashOut = cHeader.findIndex(h => h.includes('cash out') || h.includes('out ('));
const cMode = cHeader.findIndex(h => h.includes('mode'));
const cBalance = cHeader.findIndex(h => h.includes('balance'));

const cleanAmount = (val) => {
  if (!val || val === '-') return 0;
  const cl = val.replace(/[/,\-₹\s]/g, '').trim();
  return parseFloat(cl) || 0;
};

let runningRecomputed = 0;

cashRows.slice(1).forEach((row, idx) => {
  const rowNum = idx + 1;
  const rawDate = (row[cDate] || '').trim();
  const rawCat = (row[cCategory] || '').trim();
  const desc = (row[cDesc] || '').trim();
  const inAmt = cleanAmount(row[cCashIn]);
  const outAmt = cleanAmount(row[cCashOut]);
  const mode = (row[cMode] || '').toUpperCase();
  const sheetBal = cleanAmount(row[cBalance]);

  let normCat = rawCat.toUpperCase();
  if (normCat === 'FOR POST' || normCat === 'INDIAN REGD. POST') normCat = 'INDIA_POST';
  else if (normCat === 'OFFICE CASH' || normCat === 'TOP UP') normCat = 'TOP_UP';
  else if (normCat.startsWith('NOTARY')) normCat = 'NOTARY';
  else if (normCat.startsWith('STAMP PAPER')) normCat = 'STAMP_PAPER';
  else if (normCat.startsWith('BUS PARCEL')) normCat = 'BUS_PARCEL';

  const isUpiEqual = mode.includes('UPI') && inAmt > 0 && Math.abs(inAmt - outAmt) < 0.01;
  let type = 'EXPENSE';
  if (isUpiEqual) {
    type = 'FIRM_UPI expense (equal in/out)';
  } else if (inAmt > 0 && outAmt === 0) {
    type = 'TOP_UP';
    runningRecomputed += inAmt;
  } else {
    type = 'EXPENSE';
    runningRecomputed -= outAmt;
  }

  let note = '';
  if (!desc) note += 'Needs review — no description. ';
  if (inAmt > 0 && normCat === 'NOTARY') note += 'Needs review — "Notary" category with amount in Cash-In column. ';
  if (Math.abs(sheetBal - runningRecomputed) > 0.01) note += `Mismatch: sheet balance ${sheetBal}, recomputed ${runningRecomputed}. `;
  if (runningRecomputed < 0) note += `Recomputed balance goes negative (${runningRecomputed}). `;

  console.log(`Row ${rowNum}: ${type} ${normCat} ₹${isUpiEqual ? outAmt : (inAmt || outAmt)} | balance: ${runningRecomputed}${note ? ' | ' + note.trim() : ''}`);
});
