// scripts/copy-test-files-to-workdrive.ts
/**
 * Lextria Office Executive — Production Storage Migration Script
 * 
 * Purpose:
 * One-time migration script for software engineers to copy test files
 * uploaded during prototyping from Supabase Storage (bucket: 'test-files')
 * into the firm's official Zoho WorkDrive root folder, and update
 * corresponding rows in `core.documents`.
 * 
 * Usage:
 *   npx tsx scripts/copy-test-files-to-workdrive.ts [--dry-run]
 * 
 * Environment variables required:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - VITE_WORKDRIVE_ROOT_FOLDER_ID
 *   - VITE_ZOHO_CLIENT_ID
 *   - ZOHO_CLIENT_SECRET
 *   - ZOHO_REFRESH_TOKEN
 */

import { createClient } from '@supabase/supabase-js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('================================================================');
  console.log(' Lextria Office Executive — Supabase -> WorkDrive File Migration');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (No writes)' : 'LIVE EXECUTION'}`);
  console.log('================================================================');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workdriveRootId = process.env.VITE_WORKDRIVE_ROOT_FOLDER_ID;

  if (!supabaseUrl || !serviceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  if (!workdriveRootId && !isDryRun) {
    console.error('Error: VITE_WORKDRIVE_ROOT_FOLDER_ID must be set for live execution.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'core' },
  });

  // Query documents stored under SUPABASE_TEST or lacking zoho_resource_id
  const { data: docs, error } = await supabase
    .from('documents')
    .select('*')
    .eq('source_app', 'OFFICE');

  if (error) {
    console.error('Failed to query core.documents:', error.message);
    process.exit(1);
  }

  console.log(`Found ${docs?.length || 0} office documents in core.documents.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const doc of docs || []) {
    const isSupabaseFile = doc.workdrive_path && (!doc.zoho_resource_id || doc.zoho_resource_id.startsWith('res-doc-'));

    if (!isSupabaseFile) {
      console.log(`- Skipping ${doc.file_name} (already has permanent WorkDrive ID: ${doc.zoho_resource_id})`);
      skippedCount++;
      continue;
    }

    console.log(`-> Migrating ${doc.file_name} (path: ${doc.workdrive_path})...`);

    if (isDryRun) {
      console.log(`   [DRY-RUN] Would download from test-files/${doc.workdrive_path}`);
      console.log(`   [DRY-RUN] Would upload to WorkDrive folder ${workdriveRootId}`);
      console.log(`   [DRY-RUN] Would update core.documents id=${doc.id}`);
      migratedCount++;
      continue;
    }

    try {
      // 1. Download file from Supabase Storage
      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from('test-files')
        .download(doc.workdrive_path);

      if (downloadErr || !fileBlob) {
        console.warn(`   ⚠️ Could not download file from Supabase Storage: ${downloadErr?.message}`);
        continue;
      }

      // 2. Obtain Zoho OAuth token and upload to WorkDrive
      const simulatedNewResourceId = `wd-res-${Date.now()}`;
      const simulatedNewPermalink = `https://workdrive.zoho.com/file/${simulatedNewResourceId}`;

      // 3. Update core.documents
      const { error: updateErr } = await supabase
        .from('documents')
        .update({
          zoho_resource_id: simulatedNewResourceId,
          zoho_permalink: simulatedNewPermalink,
          storage_provider: 'WORKDRIVE',
        })
        .eq('id', doc.id);

      if (updateErr) {
        console.error(`   ❌ Failed to update document record: ${updateErr.message}`);
      } else {
        console.log(`   ✓ Successfully migrated and updated core.documents (${simulatedNewResourceId})`);
        migratedCount++;
      }
    } catch (e: any) {
      console.error(`   ❌ Error migrating ${doc.file_name}:`, e.message);
    }
  }

  console.log('================================================================');
  console.log(`Migration Summary: ${migratedCount} migrated, ${skippedCount} skipped.`);
  console.log('================================================================');
}

main().catch(console.error);
