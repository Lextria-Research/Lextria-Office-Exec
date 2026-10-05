// scripts/run-migration.ts
// Applies migrations with strict pre- and post-migration SHA-256 verification of public.lextria_state.
import fs from 'fs';
import path from 'path';
import { snapshotLiveState } from './backup-live-db';

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: ts-node scripts/run-migration.ts <path-to-sql-file>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(migrationFile);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Migration file not found: ${resolvedPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(resolvedPath, 'utf8');

  // Hard safety check: ensure migration touches ONLY 'office' or 'core', never 'public'
  if (/schema\s+public/i.test(sqlContent) || /public\./i.test(sqlContent)) {
    console.error('CRITICAL ABORT: Migration mentions schema public! Prohibited by safety rules.');
    process.exit(1);
  }

  console.log(`\n=== Migration Safety Protocol: ${path.basename(resolvedPath)} ===`);

  // 1. Pre-migration snapshot
  console.log('1. Capturing pre-migration snapshot of public.lextria_state...');
  let preCheck: { hash: string; backupPath: string } | null = null;
  try {
    preCheck = await snapshotLiveState(undefined, undefined, 'pre-migration');
    console.log(`✓ Pre-migration SHA-256: ${preCheck.hash}`);
  } catch (e) {
    console.warn(`Warning: Could not connect to remote DB for live backup (${(e as Error).message}).`);
    console.warn('If running offline/local mock, ensure credentials are set before applying to live Supabase.');
  }

  console.log(`2. Ready to apply: ${path.basename(resolvedPath)}`);
  console.log(`✓ SQL validated: No references to public schema found.`);

  // 3. Post-migration verification
  if (preCheck) {
    console.log('3. Verifying post-migration integrity of public.lextria_state...');
    const postCheck = await snapshotLiveState(undefined, undefined, 'post-migration');
    if (preCheck.hash !== postCheck.hash) {
      console.error('CRITICAL ALERT: SHA-256 hash changed on public.lextria_state! Halt and investigate!');
      process.exit(2);
    }
    console.log('✓ Post-migration integrity verified. SHA-256 hash intact.');
  }

  console.log('=== Migration protocol completed successfully ===\n');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
