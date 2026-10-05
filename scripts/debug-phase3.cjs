// scripts/debug-phase3.cjs
const { chromium } = require('playwright');

async function debugPhase3() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Testing /custody...');
  await page.goto('http://localhost:5173/custody');
  await page.waitForTimeout(1000);
  console.log('Custody URL:', page.url());

  console.log('Testing /errands...');
  await page.goto('http://localhost:5173/errands');
  await page.waitForTimeout(1000);
  console.log('Errands URL:', page.url());

  console.log('Testing /importers...');
  await page.goto('http://localhost:5173/importers');
  await page.waitForTimeout(1000);
  console.log('Importers URL:', page.url());

  console.log('Testing / (HomeScreen)...');
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  console.log('Home URL:', page.url());

  await browser.close();
  console.log('Done testing all routes!');
}

debugPhase3().catch(console.error);
