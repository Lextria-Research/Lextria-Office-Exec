// scripts/provision-auth-logins.ts
// Creates test auth accounts and writes credentials to test-logins.txt (git-ignored).
// NEVER logs or prints passwords to stdout.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const TEST_LOGINS_PATH = path.resolve('test-logins.txt');

function generateSecurePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%*+';
  let pwd = 'Lx!';
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export const TEST_ROLES = [
  { role: 'Office Executive', email: 'oe@lextria-demo.test', profileRole: 'OFFICE_EXEC', dept: 'OFFICE' },
  { role: 'Finance', email: 'fe1@lextria-demo.test', profileRole: 'FINANCE', dept: 'FINANCE' },
  { role: 'Finance Lead', email: 'fl@lextria-demo.test', profileRole: 'FINANCE', dept: 'FINANCE' },
  { role: 'Staff', email: 'pa1@lextria-demo.test', profileRole: 'PARALEGAL', dept: 'PARALEGAL' },
  { role: 'Department Admin', email: 'pl1@lextria-demo.test', profileRole: 'DEPT_ADMIN', dept: 'IP_PATENT' },
  { role: 'Admin', email: 'sa1@lextria-demo.test', profileRole: 'SUPER_ADMIN', dept: 'MANAGEMENT' }
];

export async function provisionLogins(supabaseUrl: string, serviceKey: string) {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Check if test-logins.txt already exists to preserve passwords across runs
  let logins: Record<string, string> = {};
  if (fs.existsSync(TEST_LOGINS_PATH)) {
    const lines = fs.readFileSync(TEST_LOGINS_PATH, 'utf8').split('\n');
    for (const l of lines) {
      const match = l.match(/Email:\s*(\S+)\s*\|\s*Password:\s*(\S+)/);
      if (match) logins[match[1].toLowerCase()] = match[2];
    }
  }

  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUsers = new Map<string, string>();
  for (const u of userList?.users || []) {
    if (u.email) existingUsers.set(u.email.toLowerCase(), u.id);
  }

  const outputLines: string[] = ['# Lextria Office Executive - Test Logins', '# DO NOT COMMIT TO GIT', ''];

  for (const acc of TEST_ROLES) {
    const email = acc.email.toLowerCase();
    const password = logins[email] || generateSecurePassword();
    logins[email] = password;

    const existingId = existingUsers.get(email);
    if (!existingId) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: acc.profileRole, department: acc.dept }
      });
      if (error) console.error(`Error creating auth for ${email}:`, error.message);
    } else {
      const { error } = await supabase.auth.admin.updateUserById(existingId, {
        password,
        email_confirm: true,
        user_metadata: { role: acc.profileRole, department: acc.dept }
      });
      if (error) console.error(`Error updating auth for ${email}:`, error.message);
    }

    outputLines.push(`Role: ${acc.role.padEnd(18)} | Email: ${email.padEnd(25)} | Password: ${password}`);
  }

  fs.writeFileSync(TEST_LOGINS_PATH, outputLines.join('\n') + '\n', 'utf8');
  console.log(`✓ Test accounts provisioned. Credentials written safely to test-logins.txt.`);
}

if (process.argv[1] && process.argv[1].endsWith('provision-auth-logins.ts')) {
  provisionLogins(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!).catch(console.error);
}
