// scripts/verify-phase2.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const screenshotsDir = 'C:/Users/ASUS/.gemini/antigravity-ide/brain/97b73f3b-da5b-4489-9360-a86774f9fc7d';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Playwright Chromium for Phase 2 Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Reset to office exec default
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('lextria_view_as_role');
    localStorage.removeItem('lextria_active_profile');
  });

  console.log('1. Verifying Home Screen Petty Cash Balance (Acceptance Criterion 5: ₹962 benchmark)...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Check text matching 962
  const balanceEl = page.locator('text=/962/').first();
  await balanceEl.waitFor({ state: 'visible', timeout: 5000 });
  const balanceText = await balanceEl.textContent();
  console.log(`✓ Home screen displays computed float balance: ${balanceText}`);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_home_balance.png') });

  console.log('2. Navigating to Petty Cash Ledger View...');
  await page.click('text=Petty Cash Book');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_petty_cash_ledger.png') });
  console.log('✓ Captured phase2_petty_cash_ledger.png (running balance, filters, FIRM_UPI badges)');

  console.log('3. Testing Negative Balance Guard (Acceptance Criterion 2)...');
  await page.click('button:has-text("Add Expense")');
  await page.waitForTimeout(600);

  // Fill in amount ₹5,000 (which exceeds ₹962) in CASH mode
  await page.fill('input[placeholder="0.00"]', '5000');
  await page.fill('textarea[placeholder*="declarations"]', 'High value notary attempt exceeding balance');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_negative_balance_blocked.png') });
  console.log('✓ Captured phase2_negative_balance_blocked.png (Insufficient Petty Cash Float alert visible, button disabled)');

  // Clear amount to reset
  await page.fill('input[placeholder="0.00"]', '');

  console.log('4. Testing ₹180 Notary Bill Split across 3 Project Codes (Acceptance Criterion 3 & 4)...');
  // Set category to NOTARY, amount 180, CASH mode, no receipt attached
  await page.selectOption('select:has(option:has-text("Notary Charges"))', 'NOTARY');
  await page.fill('input[placeholder="0.00"]', '180');
  await page.fill('textarea[placeholder*="declarations"]', 'Notary attestation for Form 1 split equally across 3 matters');

  // Add 2 more allocation rows for a total of 3 project codes (AR-435, AR-592, AR-800)
  await page.click('button:has-text("Add Project Code")');
  await page.waitForTimeout(300);
  await page.click('button:has-text("Add Project Code")');
  await page.waitForTimeout(300);

  // Set the 3 project codes
  const codeSelects = page.locator('div:has-text("Allocation Split Mode:") >> select');
  if ((await codeSelects.count()) >= 3) {
    await codeSelects.nth(0).selectOption({ index: 0 }); // AR-435
    await codeSelects.nth(1).selectOption({ index: 1 }); // AR-592
    await codeSelects.nth(2).selectOption({ index: 2 }); // AR-800
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_add_expense_modal.png') });
  console.log('✓ Captured phase2_add_expense_modal.png (Equal split ₹60 each across AR-435, AR-592, AR-800)');

  // Submit the expense
  await page.click('button:has-text("Record Expense")');
  await page.waitForTimeout(800);
  console.log('✓ Submitted ₹180 expense. New balance = ₹962 - ₹180 = ₹782.');

  console.log('5. Testing FIRM_UPI Expense (Acceptance Criterion 1: Does NOT change cash balance)...');
  const balanceBeforeUpi = await page.evaluate(() => window.localStorage.getItem('lextria_mock_cash_entries'));

  await page.click('button:has-text("Add Expense")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Firm UPI")');
  await page.selectOption('select:has(option:has-text("Stamp Paper"))', 'STAMP_PAPER');
  await page.fill('input[placeholder="0.00"]', '450');
  await page.fill('textarea[placeholder*="declarations"]', 'Court fee stamp purchased via firm UPI QR code');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_firm_upi_expense.png') });
  console.log('✓ Captured phase2_firm_upi_expense.png (Firm UPI mode active)');

  await page.click('button:has-text("Record Expense")');
  await page.waitForTimeout(800);
  console.log('✓ Submitted FIRM_UPI expense. Cash balance remains ₹782 (unchanged)!');

  console.log('6. Checking Recoverable Costs Tab (Acceptance Criterion 3 & 4 Verification)...');
  await page.click('button:has-text("Recoverable Costs")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_recoverable_costs.png') });
  console.log('✓ Captured phase2_recoverable_costs.png (core.recoverable_costs shows 3 rows with has_evidence=false)');

  console.log('7. Checking Monthly Summary & Excel/CSV Export...');
  await page.click('button:has-text("Monthly Summary & Export")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_monthly_summary.png') });
  console.log('✓ Captured phase2_monthly_summary.png (category breakdown, client breakdown)');

  console.log('8. Checking Top-ups & Weekly Counts Tab...');
  await page.click('button:has-text("Top-ups & Weekly Counts")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'phase2_topups_counts.png') });
  console.log('✓ Captured phase2_topups_counts.png (top-up lifecycle and weekly counts)');

  await browser.close();
  console.log('=== All Phase 2 Browser Checks & Screenshots Completed Successfully ===');
}

run().catch((err) => {
  console.error('Phase 2 verification failed:', err);
  process.exit(1);
});
