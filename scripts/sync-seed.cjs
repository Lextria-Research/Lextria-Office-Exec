// scripts/sync-seed.cjs
// Loads shared synthetic seed package from docs/seed-data/seed/ and writes typed src/lib/seedData.ts.
// Field names must match SCHEMA.md exactly (the naming contract).
// DO NOT invent or rename fields here — the seed JSON is the source of truth.

const fs = require('fs');
const path = require('path');

const SEED_DIR = path.resolve(__dirname, '../docs/seed-data/seed');
const OUT_FILE = path.resolve(__dirname, '../src/lib/seedData.ts');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(SEED_DIR, name), 'utf8'));
}

const addressBook      = loadJson('address_book.json');
const dispatches       = loadJson('dispatches.json');
const dispatchLinks    = loadJson('dispatch_project_links.json');
const cashEntries      = loadJson('cash_entries.json');
const cashAllocations  = loadJson('cash_allocations.json');
const topupRequests    = loadJson('topup_requests.json');
const cashCounts       = loadJson('cash_counts.json');
const physicalDocs     = loadJson('physical_documents.json');
const custodyItems     = loadJson('custody_items.json');
const custodyLog       = loadJson('custody_log.json');
const officeRequests   = loadJson('office_requests.json');
const documents        = loadJson('documents.json');
const projectCodes     = loadJson('project_codes.json');
const clients          = loadJson('clients.json');
const users            = loadJson('users.json');
const demoSettings     = loadJson('demo_settings.json');

// Lookup maps
const userMap        = new Map(users.map(u => [u.id, u]));
const projectCodeMap = new Map(projectCodes.map(p => [p.id, p]));
const clientMap      = new Map(clients.map(c => [c.id, c]));

// Extract scans from documents linked to dispatches
const mappedScans = documents
  .filter(d => d.dispatch_id)
  .map(d => ({
    id:          `scan_${d.id}`,
    dispatch_id: d.dispatch_id,
    kind:        d.scan_kind,
    document_id: d.id,
    file_name:   d.file_name,
    created_at:  d.uploaded_at,
  }));

// ── Validation helpers ──────────────────────────────────────────────────────

const VALID_DOC_TYPES = new Set([
  'LEGAL_NOTICE','POA','COVER_LETTER','RTI','OFFICE_ACTION_REPLY',
  'FORMS_FOR_SIGNATURE','CERTIFICATE','ORIGINALS','OTHER'
]);
const VALID_CASH_CATEGORIES = new Set([
  'TOP_UP','NOTARY','TRUE_COPY_XEROX','STAMP_PAPER','INDIA_POST',
  'PRIVATE_COURIER','BUS_PARCEL','POSTAL_ORDER','PRINTING_STATIONERY',
  'PRINTING','LOCAL_CONVEYANCE','OFFICE_SUPPLIES','MISC'
]);
const VALID_CUSTODY_TYPES = new Set(['DSC', 'PHONE', 'OTHER']);

const warnings = [];

function warn(msg) {
  warnings.push('⚠  ' + msg);
}

// ── 1. Address Book ─────────────────────────────────────────────────────────
// Pass-through: SCHEMA.md fields are: id, name, organization, address, pin, phone, email, type
const mappedAddressBook = addressBook.map(ab => ({
  id:           ab.id,
  name:         ab.name,
  organization: ab.organization ?? null,   // SCHEMA.md: "organization"
  organisation: ab.organization ?? null,   // UI compatibility
  address:      ab.address,               // SCHEMA.md: "address"
  full_address: ab.address,               // UI compatibility
  pin:          ab.pin ?? null,
  phone:        ab.phone ?? null,
  email:        ab.email ?? null,
  type:         ab.type,
  // Operational extras
  times_used:   dispatches.filter(d => d.recipient_address_id === ab.id).length,
  last_used:    dispatches
    .filter(d => d.recipient_address_id === ab.id)
    .map(d => d.booking_date)
    .sort()
    .reverse()[0] ?? null,
}));

// ── 2. Project Codes ────────────────────────────────────────────────────────
const mappedProjectCodes = projectCodes.map(pc => {
  const client = clientMap.get(pc.client_id);
  return {
    id:          pc.id,
    code:        pc.code,
    client_id:   pc.client_id,
    client_code: client ? client.client_code : '',
    client_name: client ? client.client_name : '',
    title:       pc.title,
    department:  pc.department,
  };
});

// ── 3. Dispatches ───────────────────────────────────────────────────────────
// SCHEMA.md fields: sender_address_id, recipient_address_id, document_type, cash_entry_id
const mappedDispatches = dispatches.map(d => {
  if (!VALID_DOC_TYPES.has(d.document_type)) {
    warn(`dispatch ${d.id}: unknown document_type "${d.document_type}"`);
  }
  const linkedProjectIds = dispatchLinks
    .filter(link => link.dispatch_id === d.id)
    .map(link => link.project_code_id);

  // Derive payment_mode from the linked cash entry
  const linkedEntry = cashEntries.find(ce => ce.id === d.cash_entry_id);
  const paymentMode = linkedEntry ? linkedEntry.payment_mode : 'CASH';

  return {
    id:                   d.id,
    serial_no:            d.serial_no,
    direction:            d.direction,
    booking_date:         d.booking_date,
    carrier:              d.carrier,
    tracking_id:          d.tracking_id,
    sender_address_id:    d.sender_address_id ?? null, // SCHEMA.md exact name
    sender_id:            d.sender_address_id ?? null, // UI compatibility
    recipient_address_id: d.recipient_address_id,        // SCHEMA.md exact name
    recipient_id:         d.recipient_address_id,        // UI compatibility
    document_type:        d.document_type,                // SCHEMA.md exact name
    doc_type:             d.document_type,                // UI compatibility
    particulars:          d.particulars ?? null,
    status:               d.status,
    delivered_on:         d.delivered_on ?? null,
    ad_card_received:     d.ad_card_received,
    cost:                 d.cost,
    cash_entry_id:        d.cash_entry_id ?? null,        // SCHEMA.md: "cash_entry_id"
    payment_mode:         paymentMode,
    legal_evidence:       d.legal_evidence,
    batch_id:             d.batch_id ?? null,
    reposted_from_id:     d.reposted_from_id ?? null,
    return_reason:        null,
    project_codes:        linkedProjectIds,
    created_by:           d.created_by,
    created_at:           `${d.booking_date}T10:00:00+05:30`,
  };
});

// ── 4. Dispatch Project Links ────────────────────────────────────────────────
// SCHEMA.md: dispatch_project_links with fields dispatch_id, project_code_id
const mappedDispatchLinks = dispatchLinks.map(dl => ({
  dispatch_id:     dl.dispatch_id,
  project_code_id: dl.project_code_id,
}));

// ── 5. Cash Entries ─────────────────────────────────────────────────────────
// SCHEMA.md fields: type, category, payment_mode, paid_by, recoverable,
//   affects_petty_cash_balance, balance_after
const mappedCashEntries = cashEntries.map((ce, index) => {
  if (!VALID_CASH_CATEGORIES.has(ce.category)) {
    warn(`cash_entry ${ce.id}: unknown category "${ce.category}" — will render as-is`);
  }
  const allocations = cashAllocations
    .filter(ca => ca.cash_entry_id === ce.id)
    .map(ca => {
      const pc = projectCodeMap.get(ca.project_code_id);
      return {
        id:              ca.id,
        cash_entry_id:   ca.cash_entry_id,
        project_code_id: ca.project_code_id,
        project_code:    pc ? pc.code : ca.project_code_id,
        amount:          ca.amount,
      };
    });

  return {
    id:                         ce.id,
    entry_no:                   index + 1,
    entry_date:                 ce.entry_date,
    type:                       ce.type,                 // SCHEMA.md: "type"
    entry_type:                 ce.type,                 // UI compatibility
    category:                   ce.category,
    description:                ce.description,
    amount:                     ce.amount,
    payment_mode:               ce.payment_mode,
    paid_by:                    ce.paid_by ?? null,      // SCHEMA.md: "paid_by"
    receipt_document_id:        ce.receipt_document_id ?? null,
    linked_dispatch_id:         ce.linked_dispatch_id ?? null,
    recoverable:                ce.recoverable ?? null,  // SCHEMA.md: "recoverable"
    is_recoverable:             ce.recoverable ?? null,  // UI compatibility
    affects_petty_cash_balance: ce.affects_petty_cash_balance, // SCHEMA.md exact
    status:                     'ACTIVE',
    balance_after:              ce.balance_after ?? null, // SCHEMA.md exact
    allocations,
    created_at:                 ce.created_at,
  };
});

// ── 6. Cash Allocations ─────────────────────────────────────────────────────
const mappedCashAllocations = cashAllocations.map(ca => {
  const pc = projectCodeMap.get(ca.project_code_id);
  return {
    id:              ca.id,
    cash_entry_id:   ca.cash_entry_id,
    project_code_id: ca.project_code_id,
    project_code:    pc ? pc.code : ca.project_code_id,
    amount:          ca.amount,
  };
});

// ── 7. Top-up Requests ──────────────────────────────────────────────────────
// SCHEMA.md fields: id, amount, reason, requested_by, requested_at,
//   status, approved_by, approved_at, handed_over_at
const mappedTopupRequests = topupRequests.map(tr => {
  const requester = userMap.get(tr.requested_by);
  return {
    id:             tr.id,
    amount:         tr.amount,
    reason:         tr.reason,
    requested_by:   tr.requested_by,    // SCHEMA.md exact
    requested_by_name: requester ? requester.display_name : tr.requested_by,
    requested_at:   tr.requested_at,
    status:         tr.status,
    decided_by:     tr.approved_by ?? tr.decided_by ?? null,
    decided_at:     tr.approved_at ?? tr.decided_at ?? null,
    approved_by:    tr.approved_by ?? tr.decided_by ?? null,
    approved_at:    tr.approved_at ?? tr.decided_at ?? null,
    handed_over_at: tr.handed_over_at ?? null,
  };
});

// ── 8. Cash Counts ──────────────────────────────────────────────────────────
// SCHEMA.md fields: id, count_date, counted_by, physical_cash, book_balance,
//   variance, note, finance_signoff_by, finance_signoff_at, finance_note
const mappedCashCounts = cashCounts.map(cc => {
  const counter = userMap.get(cc.counted_by);
  return {
    id:                 cc.id,
    count_date:         cc.count_date,
    counted_by:         cc.counted_by,
    counted_by_name:    counter ? counter.display_name : cc.counted_by,
    physical_cash:      cc.physical_cash,
    book_balance:       cc.book_balance,
    variance:           cc.variance,
    note:               cc.note ?? null,
    finance_signoff_by: cc.finance_signoff_by ?? null,
    finance_signoff_at: cc.finance_signoff_at ?? null,
    finance_note:       cc.finance_note ?? null,
  };
});

// ── 9. Physical Documents ───────────────────────────────────────────────────
// SCHEMA.md fields: document, original_or_copy, status, pages,
//   notary_cash_entry_id, scan_document_id, updated_at
const mappedPhysicalDocs = physicalDocs.map(pd => {
  const pc = projectCodeMap.get(pd.project_code_id);
  return {
    id:                   pd.id,
    project_code_id:      pd.project_code_id ?? null,
    project_code:         pc ? pc.code : '',
    document:             pd.document,           // SCHEMA.md: "document"
    doc_name:             pd.document,           // UI compatibility
    original_or_copy:     pd.original_or_copy,   // SCHEMA.md: "original_or_copy"
    doc_nature:           pd.original_or_copy,   // UI compatibility
    status:               pd.status,
    pages:                pd.pages ?? null,      // SCHEMA.md: "pages"
    pages_count:          pd.pages ?? 1,         // UI compatibility
    copies_count:         1,
    current_location:     'Office Cabinet A',
    notary_cost:          0,
    notary_cash_entry_id: pd.notary_cash_entry_id ?? null,
    scan_document_id:     pd.scan_document_id ?? null,
    updated_at:           pd.updated_at,
    created_at:           pd.updated_at,
  };
});

// ── 10. Custody Items ───────────────────────────────────────────────────────
// SCHEMA.md fields: id, item, type (values: DSC / PHONE — NOT DSC_TOKEN)
const mappedCustodyItems = custodyItems.map(ci => {
  if (!VALID_CUSTODY_TYPES.has(ci.type)) {
    warn(`custody_item ${ci.id}: unknown type "${ci.type}"`);
  }
  // Find active checkout (in_at is null)
  const activeLog = custodyLog.find(l => l.custody_item_id === ci.id && !l.in_at);
  const holder    = activeLog ? userMap.get(activeLog.holder_user_id) : null;
  return {
    id:                   ci.id,
    item:                 ci.item,               // SCHEMA.md: "item" (not item_name)
    item_name:            ci.item,               // UI compatibility
    identifier:           ci.id,                 // UI compatibility
    type:                 ci.type,               // SCHEMA.md: "type" (DSC not DSC_TOKEN)
    item_type:            ci.type,               // UI compatibility
    status:               activeLog ? 'CHECKED_OUT' : 'AVAILABLE',
    current_holder_id:    activeLog ? activeLog.holder_user_id : null,
    current_holder_name:  holder ? holder.display_name : null,
    checked_out_at:       activeLog ? activeLog.out_at : null,
    expected_return:      activeLog ? activeLog.expected_return : null,
  };
});

// ── 11. Custody Log ─────────────────────────────────────────────────────────
// SCHEMA.md fields: id, custody_item_id, holder_user_id, out_at, expected_return, in_at
const mappedCustodyLog = custodyLog.map(cl => {
  const holder = userMap.get(cl.holder_user_id);
  return {
    id:              cl.id,
    custody_item_id: cl.custody_item_id,
    holder_user_id:  cl.holder_user_id,          // SCHEMA.md exact
    holder_id:       cl.holder_user_id,          // UI compatibility
    holder_name:     holder ? holder.display_name : cl.holder_user_id,
    out_at:          cl.out_at,                  // SCHEMA.md exact
    expected_return: cl.expected_return ?? null,
    in_at:           cl.in_at ?? null,           // SCHEMA.md exact (null = still out)
  };
});

// ── 12. Office Requests ─────────────────────────────────────────────────────
// SCHEMA.md fields: id, project_code_id, requested_by, description,
//   priority, due_date, status, accepted_by, created_at, completed_links
const mappedOfficeRequests = officeRequests.map(req => {
  const requester = userMap.get(req.requested_by);
  const acceptor  = userMap.get(req.accepted_by);
  const pc        = projectCodeMap.get(req.project_code_id);
  return {
    id:               req.id,
    project_code_id:  req.project_code_id ?? null,
    project_code:     pc ? pc.code : null,
    requested_by:     req.requested_by,          // SCHEMA.md exact (not requested_by_id)
    requested_by_id:  req.requested_by,          // UI compatibility
    requested_by_name: requester ? requester.display_name : req.requested_by,
    requested_by_role: requester ? requester.role : 'STAFF',
    title:            req.description ? (req.description.length > 50 ? req.description.slice(0, 47) + '...' : req.description) : 'Errand Request',
    category:         'GENERAL',
    description:      req.description,           // SCHEMA.md exact (no separate title)
    priority:         req.priority,
    due_date:         req.due_date ?? null,
    needed_by:        req.due_date ?? null,      // UI compatibility
    status:           req.status,
    accepted_by:      req.accepted_by ?? null,   // SCHEMA.md exact
    accepted_by_name: acceptor ? acceptor.display_name : null,
    completed_links:  req.completed_links ?? null,
    request_type:     req.request_type || 'ERRAND', // documented extra column
    created_at:       req.created_at,
  };
});

// ── Emit warnings ────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.warn('\nSYNC-SEED WARNINGS:');
  warnings.forEach(w => console.warn(w));
  console.warn('');
}

// ── Write output ─────────────────────────────────────────────────────────────
const content = `// src/lib/seedData.ts
// Generated automatically from docs/seed-data/seed/*.json
// DO NOT EDIT MANUALLY. Run: node scripts/sync-seed.cjs

export const SEED_DEMO_SETTINGS    = ${JSON.stringify(demoSettings[0], null, 2)};
export const SEED_USERS            = ${JSON.stringify(users, null, 2)};
export const SEED_PROJECT_CODES    = ${JSON.stringify(mappedProjectCodes, null, 2)};
export const SEED_ADDRESS_BOOK     = ${JSON.stringify(mappedAddressBook, null, 2)};
export const SEED_DISPATCHES       = ${JSON.stringify(mappedDispatches, null, 2)};
export const SEED_DISPATCH_LINKS   = ${JSON.stringify(mappedDispatchLinks, null, 2)};
export const SEED_CASH_ENTRIES     = ${JSON.stringify(mappedCashEntries, null, 2)};
export const SEED_CASH_ALLOCATIONS = ${JSON.stringify(mappedCashAllocations, null, 2)};
export const SEED_TOPUP_REQUESTS   = ${JSON.stringify(mappedTopupRequests, null, 2)};
export const SEED_CASH_COUNTS      = ${JSON.stringify(mappedCashCounts, null, 2)};
export const SEED_PHYSICAL_DOCS    = ${JSON.stringify(mappedPhysicalDocs, null, 2)};
export const SEED_CUSTODY_ITEMS    = ${JSON.stringify(mappedCustodyItems, null, 2)};
export const SEED_CUSTODY_LOG      = ${JSON.stringify(mappedCustodyLog, null, 2)};
export const SEED_OFFICE_REQUESTS  = ${JSON.stringify(mappedOfficeRequests, null, 2)};
export const SEED_SCANS            = ${JSON.stringify(mappedScans, null, 2)};
`;

fs.writeFileSync(OUT_FILE, content, 'utf8');
console.log('✓ src/lib/seedData.ts generated from docs/seed-data/seed/');
console.log(`  ${warnings.length} warning(s)`);
