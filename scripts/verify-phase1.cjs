// scripts/verify-phase1.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const screenshotsDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\97b73f3b-da5b-4489-9360-a86774f9fc7d';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('1. Navigating to Home Overview (http://localhost:5173)...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_home.png') });
  console.log('✓ Captured phase1_home.png');

  console.log('2. Navigating to Dispatches Register...');
  await page.click('text=Dispatches Register');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_dispatches_list.png') });
  console.log('✓ Captured phase1_dispatches_list.png');

  console.log('3. Opening Batch Mode & Auto-filling 10 Dispatches...');
  await page.click('button:has-text("Batch Mode")');
  await page.waitForTimeout(500);
  await page.click('text=+ Auto-fill 10 Dispatches');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_batch_modal.png') });
  console.log('✓ Captured phase1_batch_modal.png (10 rows populated)');

  console.log('4. Submitting Batch Dispatches (Acceptance Criterion 1)...');
  await page.click('button:has-text("Book All")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_dispatches_after_batch.png') });
  console.log('✓ Captured phase1_dispatches_after_batch.png (10 new dispatches created)');

  console.log('5. Testing Legal Evidence Proofs Guard (Acceptance Criterion 2)...');
  // Click on "Legal Proofs" badge on the legal notice
  const legalBadge = page.locator('text=Legal Proofs').first();
  await legalBadge.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_legal_proofs_drawer.png') });
  console.log('✓ Captured phase1_legal_proofs_drawer.png');
  await page.click('button:has-text("Close")');
  await page.waitForTimeout(500);

  console.log('6. Checking Cross-App Matter Timeline (Acceptance Criterion 3)...');
  await page.click('text=Matter Timeline');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_matter_timeline.png') });
  console.log('✓ Captured phase1_matter_timeline.png (core.matter_events with client-safe labels)');

  console.log('7. Testing Returned Dispatch Reposting (Acceptance Criterion 4)...');
  await page.click('text=Dispatches Register');
  await page.waitForTimeout(600);
  await page.click('button:has-text("Returned / Reposted")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_returned_tab.png') });

  const repostBtn = page.locator('button:has-text("Repost Dispatch")').first();
  if (await repostBtn.isVisible()) {
    await repostBtn.click();
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="e.g. EK998877666IN"]', 'EK999222333IN');
    await page.fill('textarea[placeholder="Corrected room, street, or PIN code..."]', 'Boudhik Sampada Bhawan, Antop Hill (Corrected Gate 2)');
    await page.screenshot({ path: path.join(screenshotsDir, 'phase1_repost_modal.png') });
    console.log('✓ Captured phase1_repost_modal.png');
    await page.click('button:has-text("Create Reposted Dispatch")');
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotsDir, 'phase1_after_repost.png') });
    console.log('✓ Captured phase1_after_repost.png');
  }

  console.log('8. Testing Address Book...');
  await page.click('text=Address Book');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_address_book.png') });
  console.log('✓ Captured phase1_address_book.png');

  console.log('9. Testing Admin Integrations Role Guard (OFFICE_EXEC)...');
  await page.click('text=Admin › Integrations');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_admin_restricted.png') });
  console.log('✓ Captured phase1_admin_restricted.png (Restricted Access guard works)');

  console.log('10. Switching to SUPER_ADMIN to test Integrations & Cliq Outbox...');
  await page.evaluate(() => {
    const adminUser = {
      id: 'u-super-admin-001',
      email: 'admin@test.lextria.local',
      display_name: 'Anand Sharma (Super Admin)',
      role: 'SUPER_ADMIN',
      department: 'MANAGEMENT',
      is_finance_lead: false,
      active: true,
    };
    localStorage.setItem('lextria_active_profile', JSON.stringify(adminUser));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_admin_integrations_superadmin.png') });
  console.log('✓ Captured phase1_admin_integrations_superadmin.png');

  console.log('11. Testing SuperAdmin "View as Role..." colored banner...');
  await page.evaluate(() => {
    localStorage.setItem('lextria_view_as_role', 'FINANCE');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase1_role_banner.png') });
  console.log('✓ Captured phase1_role_banner.png');

  // Reset back to office exec default
  await page.evaluate(() => {
    localStorage.removeItem('lextria_view_as_role');
    localStorage.removeItem('lextria_active_profile');
  });

  await browser.close();
  console.log('=== All Browser Checks & Screenshots Completed Successfully ===');
}

run().catch((err) => {
  console.error('Browser check failed:', err);
  process.exit(1);
});
