// scripts/backup-live-db.ts
// Automated safety snapshot of public.lextria_state with SHA-256 integrity verification.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function snapshotLiveState(
  supabaseUrl?: string,
  serviceKey?: string,
  label = 'pre-migration'
): Promise<{ hash: string; backupPath: string; rowCount: number }> {
  const url = (supabaseUrl || process.env.SUPABASE_URL || 'https://eafciegebhuhoneypsqy.supabase.co')
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const key = serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Cannot run live state backup.');
  }

  const endpoint = `${url}/rest/v1/lextria_state`;
  console.log(`[Safety Backup] Fetching live state from: ${endpoint}`);

  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch public.lextria_state: ${res.status} ${errorText}`);
  }

  const rows = await res.json();
  const rawJson = JSON.stringify(rows, null, 2);
  const hash = crypto.createHash('sha256').update(rawJson).digest('hex');

  const backupDir =
    process.env.BACKUP_DIR ||
    path.join(process.env.USERPROFILE || 'C:\\Users\\ASUS', 'Documents', 'lextria-backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(backupDir, `lextria_state_${label}_${timestamp}.json`);
  fs.writeFileSync(jsonPath, rawJson, 'utf8');

  // Also write SQL backup
  let sql = `-- Lextria IP Ledger backup (${label})\n-- Generated at: ${new Date().toISOString()}\n-- SHA-256: ${hash}\n\n`;
  for (const row of rows) {
    const escapedId = String(row.id).replace(/'/g, "''");
    const escapedState = JSON.stringify(row.state).replace(/'/g, "''");
    const escapedUpdatedAt = String(row.updated_at).replace(/'/g, "''");
    sql += `INSERT INTO public.lextria_state (id, state, updated_at) VALUES ('${escapedId}', '${escapedState}'::jsonb, '${escapedUpdatedAt}'::timestamp with time zone) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at;\n`;
  }
  const sqlPath = path.join(backupDir, `lextria_state_${label}_${timestamp}.sql`);
  fs.writeFileSync(sqlPath, sql, 'utf8');

  // Record to audit log
  const auditLine = `[${new Date().toISOString()}] Action: ${label} | SHA-256: ${hash} | Rows: ${rows.length} | File: ${jsonPath}\n`;
  fs.appendFileSync(path.join(backupDir, 'hash_audit.log'), auditLine, 'utf8');

  console.log(`[Safety Backup] Saved ${rows.length} rows to ${jsonPath}`);
  console.log(`[Safety Backup] SHA-256: ${hash}`);

  return { hash, backupPath: jsonPath, rowCount: rows.length };
}

// Direct CLI execution
import { fileURLToPath } from 'url';
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  snapshotLiveState(process.argv[2], process.argv[3], process.argv[4] || 'manual-check')
    .then(({ hash, backupPath }) => {
      console.log(`Backup completed successfully. Hash: ${hash}\nPath: ${backupPath}`);
    })
    .catch((err) => {
      console.error('Snapshot failed:', err);
      process.exit(1);
    });
}
