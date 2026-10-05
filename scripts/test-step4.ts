// scripts/test-step4.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env.local');
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

const supabaseUrl = process.env.SUPABASE_URL || 'https://eafciegebhuhoneypsqy.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY!;

// Read credentials from local git-ignored test-logins.txt
const loginsPath = path.resolve(__dirname, '..', 'test-logins.txt');
const logins: Record<string, string> = {};
const lines = fs.readFileSync(loginsPath, 'utf8').split('\n');
for (const l of lines) {
  const match = l.match(/Email:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
  if (match) logins[match[1].toLowerCase()] = match[2];
}

async function runStep4Check() {
  console.log('=== Running Step 4 Verification ===');

  const oeEmail = 'oe@lextria-demo.test';
  const feEmail = 'fe1@lextria-demo.test';
  const staffEmail = 'pa1@lextria-demo.test';

  // 1. Office Executive client
  console.log('\n1. Logging in as Office Executive (oe@lextria-demo.test)...');
  const oeClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-lextria-app': 'OFFICE' } }
  });

  const { data: oeAuth, error: oeAuthErr } = await oeClient.auth.signInWithPassword({
    email: oeEmail,
    password: logins[oeEmail]
  });
  if (oeAuthErr) throw new Error(`OE Login failed: ${oeAuthErr.message}`);
  console.log(`✓ Office Executive authenticated. UID: ${oeAuth.user.id}`);

  // Fetch project codes
  const { data: projectCodes, error: pcErr } = await oeClient
    .schema('core')
    .from('project_codes')
    .select('id, code, title')
    .limit(2);
  if (pcErr) throw new Error(`Failed to fetch project codes: ${pcErr.message}`);
  if (!projectCodes || projectCodes.length < 2) throw new Error('Need at least 2 project codes');

  const pc1 = projectCodes[0];
  const pc2 = projectCodes[1];
  console.log(`Selected project codes: ${pc1.code} (${pc1.id}) and ${pc2.code} (${pc2.id})`);

  // Insert Expense
  const expenseId = crypto.randomUUID();
  const entryDate = '2026-10-05';
  const totalAmount = 500.00;
  const splitAmount = 250.00;

  console.log('Adding expense allocated to 2 project codes...');
  const { data: newEntry, error: insertExpErr } = await oeClient
    .schema('office')
    .from('cash_entries')
    .insert({
      id: expenseId,
      entry_date: entryDate,
      type: 'EXPENSE',
      category: 'NOTARY',
      description: 'Notary & True Copy verification for legal filings',
      amount: totalAmount,
      payment_mode: 'CASH',
      paid_by: oeAuth.user.id,
      recoverable: true,
      affects_petty_cash_balance: true,
      status: 'ACTIVE'
    })
    .select()
    .single();

  if (insertExpErr) throw new Error(`OE Insert Expense failed: ${insertExpErr.message}`);
  console.log(`✓ Expense inserted in office.cash_entries: ID ${expenseId}`);

  // Insert Allocations
  const alloc1Id = crypto.randomUUID();
  const alloc2Id = crypto.randomUUID();

  const { error: allocErr } = await oeClient
    .schema('office')
    .from('cash_allocations')
    .insert([
      { id: alloc1Id, cash_entry_id: expenseId, project_code_id: pc1.id, amount: splitAmount },
      { id: alloc2Id, cash_entry_id: expenseId, project_code_id: pc2.id, amount: splitAmount }
    ]);

  if (allocErr) throw new Error(`OE Insert Allocations failed: ${allocErr.message}`);
  console.log(`✓ 2 Allocations inserted: ₹${splitAmount} to ${pc1.code}, ₹${splitAmount} to ${pc2.code}`);

  // 2. Finance client in a separate session
  console.log('\n2. Logging in as Finance (fe1@lextria-demo.test) in separate session...');
  const feClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-lextria-app': 'FINANCE' } }
  });

  const { data: feAuth, error: feAuthErr } = await feClient.auth.signInWithPassword({
    email: feEmail,
    password: logins[feEmail]
  });
  if (feAuthErr) throw new Error(`Finance Login failed: ${feAuthErr.message}`);
  console.log(`✓ Finance authenticated. UID: ${feAuth.user.id}`);

  // Finance queries cash entries
  const { data: feCashEntries, error: feQueryErr } = await feClient
    .schema('office')
    .from('cash_entries')
    .select('*, cash_allocations(*)')
    .eq('id', expenseId);

  if (feQueryErr) throw new Error(`Finance query failed: ${feQueryErr.message}`);
  if (!feCashEntries || feCashEntries.length === 0) {
    throw new Error('Expense is NOT visible to Finance!');
  }

  const foundEntry = feCashEntries[0];
  console.log(`✓ Finance confirmed visibility of Expense: ₹${foundEntry.amount} "${foundEntry.description}"`);
  console.log(`✓ Finance verified ${foundEntry.cash_allocations?.length} allocations visible.`);

  // 3. Staff client (paralegal/associate)
  console.log('\n3. Logging in as Staff (pa1@lextria-demo.test)...');
  const staffClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'x-lextria-app': 'OFFICE' } }
  });

  const { data: staffAuth, error: staffAuthErr } = await staffClient.auth.signInWithPassword({
    email: staffEmail,
    password: logins[staffEmail]
  });
  if (staffAuthErr) throw new Error(`Staff Login failed: ${staffAuthErr.message}`);
  console.log(`✓ Staff authenticated. UID: ${staffAuth.user.id}`);

  // Staff tries to query petty cash book
  const { data: staffCashEntries, error: staffQueryErr } = await staffClient
    .schema('office')
    .from('cash_entries')
    .select('*');

  if (staffCashEntries && staffCashEntries.length > 0) {
    throw new Error(`SECURITY LEAK: Staff was able to read ${staffCashEntries.length} petty cash entries!`);
  }

  console.log(`✓ Confirmed: Staff received 0 rows from office.cash_entries (RLS blocked). Error if any: ${staffQueryErr?.message || 'none (empty set)'}`);

  console.log('\n=============================================');
  console.log('RESULT OF STEP 4: ALL CHECKS PASSED SUCCESSFULLY');
  console.log('=============================================');
}

runStep4Check().catch(err => {
  console.error('Step 4 check FAILED:', err);
  process.exit(1);
});
