// scripts/seed-test.ts
// Idempotently loads ONLY from docs/seed-data/seed/*.json into schema 'office' and required 'core' tables.
// CRITICAL: NEVER touches schema 'public' or alters live state.
// All tables use UUID primary keys and UUID foreign keys.
// seed_ref stores the readable synthetic seed identifier for traceability.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { snapshotLiveState } from './backup-live-db.ts';
import { createClient } from '@supabase/supabase-js';
import { provisionLogins } from './provision-auth-logins.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_DIR = path.join(__dirname, '..', 'docs', 'seed-data', 'seed');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function readSeed(filename: string) {
  const filePath = path.join(SEED_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Seed file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function deterministicUuid(seedRef: string, namespace = 'lextria'): string {
  const hash = crypto.createHash('sha256').update(`${namespace}:${seedRef}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16), // version 4
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

export async function runSeedTest() {
  const supabaseUrl = (process.env.SUPABASE_URL || 'https://eafciegebhuhoneypsqy.supabase.co')
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('=== Starting Synthetic Seed Run (docs/seed-data/seed/) ===');
  console.log('Connecting to:', supabaseUrl);

  if (!serviceKey) {
    console.log('Notice: SUPABASE_SERVICE_ROLE_KEY not supplied. Skipping remote Postgres execution.');
    console.log('App will operate seamlessly using local mock store with identical seed records.');
    return;
  }

  // Pre-seed snapshot of public.lextria_state
  let preCheck: { hash: string } | null = null;
  try {
    preCheck = await snapshotLiveState(supabaseUrl, serviceKey, 'pre-seed');
    console.log(`✓ Pre-seed hash verified: ${preCheck.hash}`);
  } catch (e) {
    console.error('Snapshot failed:', e);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-lextria-app': 'OFFICE' } }
  });

  // 1. Ensure private storage bucket 'test-files' exists
  console.log('1. Checking storage bucket test-files...');
  const { data: buckets, error: bucketListErr } = await supabase.storage.listBuckets();
  if (bucketListErr) {
    console.warn('Warning: Could not list storage buckets:', bucketListErr.message);
  } else {
    const hasBucket = buckets?.some(b => b.name === 'test-files');
    if (!hasBucket) {
      console.log('Creating private bucket test-files...');
      const { error: createBucketErr } = await supabase.storage.createBucket('test-files', { public: false });
      if (createBucketErr) console.warn('Bucket creation notice:', createBucketErr.message);
      else console.log('✓ Bucket test-files created.');
    } else {
      console.log('✓ Bucket test-files already exists.');
    }
  }

  // 2. Load seed files
  const users = readSeed('users.json');
  const clients = readSeed('clients.json');
  const prefixes = readSeed('prefix_registry.json');
  const projectCodes = readSeed('project_codes.json');
  const addressBook = readSeed('address_book.json');
  const dispatches = readSeed('dispatches.json');
  const dispatchLinks = readSeed('dispatch_project_links.json');
  const cashEntries = readSeed('cash_entries.json');
  const cashAllocations = readSeed('cash_allocations.json');
  const topupRequests = readSeed('topup_requests.json');
  const cashCounts = readSeed('cash_counts.json');
  const physicalDocuments = readSeed('physical_documents.json');
  const custodyItems = readSeed('custody_items.json');
  const custodyLog = readSeed('custody_log.json');
  const officeRequests = readSeed('office_requests.json');
  const documents = readSeed('documents.json');

  // 3. Map Seed Users to Supabase Auth Accounts
  console.log('2. Provisioning test auth accounts and building ID map...');
  await provisionLogins(supabaseUrl, serviceKey);

  const { data: authList, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.warn('Warning: Could not list auth users:', authErr.message);
  }
  const existingUsers = new Map<string, string>();
  for (const u of authList?.users || []) {
    if (u.email) existingUsers.set(u.email.toLowerCase(), u.id);
  }

  const idMap = new Map<string, string>();
  const defaultPassword = process.env.TEST_AUTH_PASSWORD || 'LextriaTest2026!';

  // Provision test accounts for key roles if they don't exist
  for (const u of users) {
    const email = u.email.toLowerCase();
    let authId = existingUsers.get(email);
    if (!authId) {
      try {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { display_name: u.display_name, role: u.role, department: u.department }
        });
        if (created?.user) {
          authId = created.user.id;
          existingUsers.set(email, authId);
        } else if (createErr) {
          // If already exists or creation failed, use deterministic fallback
          authId = deterministicUuid(u.id, 'user');
        }
      } catch {
        authId = deterministicUuid(u.id, 'user');
      }
    }
    idMap.set(u.id, authId || deterministicUuid(u.id, 'user'));
  }

  // Populate idMap for all entities
  for (const c of clients) idMap.set(c.id, deterministicUuid(c.id, 'client'));
  for (const pc of projectCodes) idMap.set(pc.id, deterministicUuid(pc.id, 'project_code'));
  for (const doc of documents) idMap.set(doc.id, deterministicUuid(doc.id, 'document'));
  for (const ab of addressBook) idMap.set(ab.id, deterministicUuid(ab.id, 'address_book'));
  for (const d of dispatches) idMap.set(d.id, deterministicUuid(d.id, 'dispatch'));
  for (const ce of cashEntries) idMap.set(ce.id, deterministicUuid(ce.id, 'cash_entry'));
  for (const tr of topupRequests) idMap.set(tr.id, deterministicUuid(tr.id, 'topup_request'));
  for (const cc of cashCounts) idMap.set(cc.id, deterministicUuid(cc.id, 'cash_count'));
  for (const pd of physicalDocuments) idMap.set(pd.id, deterministicUuid(pd.id, 'physical_doc'));
  for (const ci of custodyItems) idMap.set(ci.id, deterministicUuid(ci.id, 'custody_item'));
  for (const cl of custodyLog) idMap.set(cl.id, deterministicUuid(cl.id, 'custody_log'));
  for (const req of officeRequests) idMap.set(req.id, deterministicUuid(req.id, 'office_request'));

  const mapFk = (ref: string | null | undefined): string | null => {
    if (!ref) return null;
    return idMap.get(ref) || ref;
  };

  // 4. Clear existing records in schema office
  console.log('3. Clearing existing office tables in reverse dependency order...');
  try {
    // Break circular references first
    await supabase.schema('office').from('cash_entries').update({ linked_dispatch_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('dispatches').update({ cash_entry_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');

    await supabase.schema('office').from('office_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('custody_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('custody_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('physical_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('cash_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('dispatch_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('dispatch_project_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('dispatches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('cash_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.schema('office').from('address_book').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err: any) {
    console.warn('Notice while clearing office tables (schemas may need exposure in Dashboard):', err.message);
  }

  // 5. Upsert core masters
  console.log('4. Upserting core schema masters...');
  const mappedProfiles = users.map((u: any) => ({
    id: idMap.get(u.id)!,
    display_name: u.display_name,
    email: u.email,
    role: u.role === 'EXTERNAL_REVIEWER' ? 'STAFF' : u.role,
    department: u.department,
    reports_to: mapFk(u.reports_to),
    is_finance_lead: u.role === 'FINANCE' && u.email.startsWith('fl@'),
    active: u.active !== false,
  }));
  const { error: profErr } = await supabase.schema('core').from('profiles').upsert(mappedProfiles);
  if (profErr) console.warn('Notice: core.profiles upsert:', profErr.message);

  const mappedClients = clients.map((c: any) => ({
    id: idMap.get(c.id)!,
    client_code: c.client_code,
    client_name: c.client_name,
    entity_type: c.entity_type || 'LARGE_ENTITY',
    email: c.email || null,
    phone: c.phone || null,
    gstin: c.gstin || null,
    pan: c.pan || null,
    billing_address: c.billing_address || null,
    state_code: c.state_code || null,
    created_by: mapFk(c.created_by),
  }));
  const { error: cliErr } = await supabase.schema('core').from('clients').upsert(mappedClients);
  if (cliErr) console.warn('Notice: core.clients upsert:', cliErr.message);

  const mappedPrefixes = prefixes.map((p: any) => ({
    prefix: p.prefix,
    department: p.department,
    client_id: mapFk(p.client_id),
    description: p.description || null,
    example: p.example || null,
    active: p.active !== false,
  }));
  const { error: preErr } = await supabase.schema('core').from('prefix_registry').upsert(mappedPrefixes);
  if (preErr) console.warn('Notice: core.prefix_registry upsert:', preErr.message);

  const mappedProjects = projectCodes.map((pc: any) => ({
    id: idMap.get(pc.id)!,
    code: pc.code,
    prefix: pc.prefix || null,
    department: pc.department,
    client_id: mapFk(pc.client_id)!,
    title: pc.title,
    status: pc.status || 'ACTIVE',
    spoc_user_id: mapFk(pc.spoc_user_id),
    lead_assignee_id: mapFk(pc.lead_assignee_id),
    owning_app: pc.owning_app || 'OFFICE',
    created_by: mapFk(pc.created_by),
  }));
  const { error: pcErr } = await supabase.schema('core').from('project_codes').upsert(mappedProjects);
  if (pcErr) console.warn('Notice: core.project_codes upsert:', pcErr.message);

  const mappedDocs = documents.map((d: any) => ({
    id: idMap.get(d.id)!,
    project_code_id: mapFk(d.project_code_id),
    category: d.category || 'POSTAL_COURIER',
    file_name: d.file_name,
    mime_type: d.mime_type || 'application/pdf',
    size_bytes: d.size_bytes || 1024,
    source_app: d.source_app || 'OFFICE',
    uploaded_by: mapFk(d.uploaded_by),
  }));
  const { error: docErr } = await supabase.schema('core').from('documents').upsert(mappedDocs);
  if (docErr) console.warn('Notice: core.documents upsert:', docErr.message);

  // Cross-app core tables: petty cash top-ups and weekly cash counts
  const mappedTopups = topupRequests.map((tr: any) => ({
    id: idMap.get(tr.id)!,
    amount: tr.amount,
    reason: tr.reason || 'Petty cash top-up',
    requested_by: mapFk(tr.requested_by)!,
    requested_at: tr.requested_at,
    status: tr.status,
    decided_by: mapFk(tr.approved_by || tr.decided_by),
    decided_at: tr.approved_at || tr.decided_at || null,
    decision_note: tr.decision_note || null,
    handed_over_at: tr.handed_over_at || null,
    office_cash_entry_id: mapFk(tr.office_cash_entry_id),
  }));
  const { error: trErr } = await supabase.schema('core').from('petty_cash_topup_requests').upsert(mappedTopups);
  if (trErr) console.warn('Notice: core.petty_cash_topup_requests upsert:', trErr.message);

  const mappedCounts = cashCounts.map((cc: any) => ({
    id: idMap.get(cc.id)!,
    count_date: cc.count_date,
    counted_by: mapFk(cc.counted_by)!,
    physical_cash: cc.physical_cash,
    book_balance: cc.book_balance,
    note: cc.note || null,
    finance_signoff_by: mapFk(cc.finance_signoff_by),
    finance_signoff_at: cc.finance_signoff_at || null,
    finance_note: cc.finance_note || null,
  }));
  const { error: ccErr } = await supabase.schema('core').from('petty_cash_counts').upsert(mappedCounts);
  if (ccErr) console.warn('Notice: core.petty_cash_counts upsert:', ccErr.message);

  // 6. Insert schema office records with UUID PKs, UUID FKs, and seed_ref
  console.log('5. Inserting office.address_book...');
  const mappedAddressBook = addressBook.map((ab: any) => ({
    id: idMap.get(ab.id)!,
    seed_ref: ab.id,
    name: ab.name,
    organization: ab.organization || ab.organisation || null,
    address: ab.address || ab.full_address,
    pin: ab.pin || null,
    phone: ab.phone || null,
    email: ab.email || null,
    type: ab.type,
    linked_client_id: mapFk(ab.linked_client_id),
    times_used: ab.times_used || 0,
    last_used: ab.last_used || null,
    created_by: mapFk(ab.created_by),
  }));
  const { error: abErr } = await supabase.schema('office').from('address_book').insert(mappedAddressBook);
  if (abErr) console.warn('Notice: office.address_book insert:', abErr.message);

  console.log('6. Inserting office.cash_entries (pass 1: without linked_dispatch_id)...');
  const mappedCashEntries = cashEntries.map((ce: any) => ({
    id: idMap.get(ce.id)!,
    seed_ref: ce.id,
    entry_date: ce.entry_date,
    type: ce.type || ce.entry_type,
    category: ce.category,
    description: ce.description,
    amount: ce.amount,
    payment_mode: ce.payment_mode || 'CASH',
    paid_by: mapFk(ce.paid_by),
    receipt_document_id: mapFk(ce.receipt_document_id),
    linked_dispatch_id: null, // Linked in pass 2 below
    recoverable: ce.recoverable !== undefined ? ce.recoverable : ce.is_recoverable,
    affects_petty_cash_balance: ce.affects_petty_cash_balance !== false,
    status: ce.status || 'ACTIVE',
    cancel_reason: ce.cancel_reason || null,
    balance_after: ce.balance_after,
    created_by: mapFk(ce.created_by),
  }));
  const { error: ceErr } = await supabase.schema('office').from('cash_entries').insert(mappedCashEntries);
  if (ceErr) console.warn('Notice: office.cash_entries insert:', ceErr.message);

  console.log('7. Inserting office.dispatches...');
  const mappedDispatches = dispatches.map((d: any) => ({
    id: idMap.get(d.id)!,
    seed_ref: d.id,
    serial_no: d.serial_no || 0,
    direction: d.direction || 'OUTWARD',
    booking_date: d.booking_date,
    carrier: d.carrier,
    tracking_id: d.tracking_id,
    sender_address_id: mapFk(d.sender_address_id || d.sender_id),
    recipient_address_id: mapFk(d.recipient_address_id || d.recipient_id)!,
    document_type: d.document_type || d.doc_type,
    particulars: d.particulars || null,
    status: d.status || 'BOOKED',
    delivered_on: d.delivered_on || null,
    ad_card_received: d.ad_card_received === true,
    cost: d.cost || 0.00,
    cash_entry_id: mapFk(d.cash_entry_id),
    legal_evidence: d.legal_evidence === true,
    batch_id: d.batch_id || null,
    reposted_from_id: mapFk(d.reposted_from_id),
    return_reason: d.return_reason || null,
    created_by: mapFk(d.created_by),
  }));
  const { error: dispErr } = await supabase.schema('office').from('dispatches').insert(mappedDispatches);
  if (dispErr) console.warn('Notice: office.dispatches insert:', dispErr.message);

  console.log('8. Inserting office.dispatch_project_links...');
  const mappedLinks = dispatchLinks.map((dl: any) => ({
    id: deterministicUuid(`${dl.dispatch_id}_${dl.project_code_id}`, 'dpl'),
    seed_ref: `${dl.dispatch_id}_${dl.project_code_id}`,
    dispatch_id: mapFk(dl.dispatch_id)!,
    project_code_id: mapFk(dl.project_code_id)!,
  }));
  const { error: dlErr } = await supabase.schema('office').from('dispatch_project_links').insert(mappedLinks);
  if (dlErr) console.warn('Notice: office.dispatch_project_links insert:', dlErr.message);

  console.log('9. Inserting office.cash_allocations...');
  const mappedCashAlloc = cashAllocations.map((ca: any) => ({
    id: deterministicUuid(ca.id || `${ca.cash_entry_id}_${ca.project_code_id}`, 'cash_alloc'),
    seed_ref: ca.id,
    cash_entry_id: mapFk(ca.cash_entry_id)!,
    project_code_id: mapFk(ca.project_code_id)!,
    amount: ca.amount,
  }));
  const { error: caErr } = await supabase.schema('office').from('cash_allocations').insert(mappedCashAlloc);
  if (caErr) console.warn('Notice: office.cash_allocations insert:', caErr.message);

  console.log('10. Linking dispatches back to cash_entries (pass 2)...');
  for (const ce of cashEntries) {
    if (ce.linked_dispatch_id) {
      const { error: updErr } = await supabase.schema('office').from('cash_entries')
        .update({ linked_dispatch_id: mapFk(ce.linked_dispatch_id) })
        .eq('id', idMap.get(ce.id)!);
      if (updErr) console.warn(`Notice updating cash entry ${ce.id}:`, updErr.message);
    }
  }

  console.log('11. Inserting office.physical_documents...');
  const mappedPhd = physicalDocuments.map((pd: any) => ({
    id: idMap.get(pd.id)!,
    seed_ref: pd.id,
    project_code_id: mapFk(pd.project_code_id),
    document: pd.document || pd.doc_name,
    original_or_copy: pd.original_or_copy || pd.doc_nature || 'ORIGINAL',
    status: pd.status || 'RECEIVED',
    pages: pd.pages !== undefined ? pd.pages : pd.pages_count,
    notary_cash_entry_id: mapFk(pd.notary_cash_entry_id),
    scan_document_id: mapFk(pd.scan_document_id),
    notes: pd.notes || null,
    created_by: mapFk(pd.created_by),
  }));
  const { error: phdErr } = await supabase.schema('office').from('physical_documents').insert(mappedPhd);
  if (phdErr) console.warn('Notice: office.physical_documents insert:', phdErr.message);

  console.log('11. Inserting office.custody_items & custody_log...');
  const mappedCustItems = custodyItems.map((ci: any) => ({
    id: idMap.get(ci.id)!,
    seed_ref: ci.id,
    item: ci.item || ci.item_name,
    type: ci.type === 'DSC_TOKEN' ? 'DSC' : ci.type,
    status: ci.status || 'AVAILABLE',
    notes: ci.notes || ci.purpose || null,
    created_by: mapFk(ci.created_by),
  }));
  const { error: ciErr } = await supabase.schema('office').from('custody_items').insert(mappedCustItems);
  if (ciErr) console.warn('Notice: office.custody_items insert:', ciErr.message);

  const mappedCustLog = custodyLog.map((cl: any) => ({
    id: idMap.get(cl.id)!,
    seed_ref: cl.id,
    custody_item_id: mapFk(cl.custody_item_id)!,
    holder_user_id: mapFk(cl.holder_user_id || cl.holder_id)!,
    out_at: cl.out_at || cl.action_at || new Date().toISOString(),
    expected_return: cl.expected_return || null,
    in_at: cl.in_at || null,
    purpose: cl.purpose || null,
    notes: cl.notes || null,
    created_by: mapFk(cl.created_by),
  }));
  const { error: clErr } = await supabase.schema('office').from('custody_log').insert(mappedCustLog);
  if (clErr) console.warn('Notice: office.custody_log insert:', clErr.message);

  console.log('12. Inserting office.office_requests...');
  const mappedRequests = officeRequests.map((req: any) => ({
    id: idMap.get(req.id)!,
    seed_ref: req.id,
    project_code_id: mapFk(req.project_code_id),
    requested_by: mapFk(req.requested_by || req.requested_by_id)!,
    description: req.description || req.title,
    priority: req.priority || 'NORMAL',
    due_date: req.due_date || req.needed_by || null,
    status: req.status || 'OPEN',
    accepted_by: mapFk(req.accepted_by),
    completed_links: req.completed_links || null,
    request_type: req.request_type || 'ERRAND',
    created_by: mapFk(req.created_by),
  }));
  const { error: reqErr } = await supabase.schema('office').from('office_requests').insert(mappedRequests);
  if (reqErr) console.warn('Notice: office.office_requests insert:', reqErr.message);

  // 7. Verify post-seed SHA-256 hash of public.lextria_state
  console.log('13. Verifying public.lextria_state hash integrity post-seed...');
  const postCheck = await snapshotLiveState(supabaseUrl, serviceKey, 'post-seed');
  if (preCheck && preCheck.hash !== postCheck.hash) {
    console.error('CRITICAL: SHA-256 hash changed on public.lextria_state during seeding! Aborting!');
    process.exit(2);
  }

  console.log('✓ Public schema completely untampered.');
  console.log('=== Synthetic Seeding Complete ===');

  // Summary Row Counts - queried directly from the database
  console.log('\n--- Real Database Row Counts (select count(*)) vs Seed Package ---');
  const tables = [
    { schema: 'core', table: 'profiles', pkgCount: users.length },
    { schema: 'core', table: 'clients', pkgCount: clients.length },
    { schema: 'core', table: 'project_codes', pkgCount: projectCodes.length },
    { schema: 'core', table: 'documents', pkgCount: documents.length },
    { schema: 'core', table: 'petty_cash_topup_requests', pkgCount: topupRequests.length },
    { schema: 'core', table: 'petty_cash_counts', pkgCount: cashCounts.length },
    { schema: 'office', table: 'address_book', pkgCount: addressBook.length },
    { schema: 'office', table: 'cash_entries', pkgCount: cashEntries.length },
    { schema: 'office', table: 'cash_allocations', pkgCount: cashAllocations.length },
    { schema: 'office', table: 'dispatches', pkgCount: dispatches.length },
    { schema: 'office', table: 'dispatch_project_links', pkgCount: dispatchLinks.length },
    { schema: 'office', table: 'physical_documents', pkgCount: physicalDocuments.length },
    { schema: 'office', table: 'custody_items', pkgCount: custodyItems.length },
    { schema: 'office', table: 'custody_log', pkgCount: custodyLog.length },
    { schema: 'office', table: 'office_requests', pkgCount: officeRequests.length },
  ];

  for (const t of tables) {
    const { count, error } = await supabase.schema(t.schema).from(t.table).select('*', { count: 'exact', head: true });
    console.log(`${t.schema}.${t.table.padEnd(28)} | Live DB: ${count ?? 'ERR'} | Seed Package: ${t.pkgCount} ${error ? '(' + error.message + ')' : ''}`);
  }
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  runSeedTest().catch(console.error);
}
