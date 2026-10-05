const { chromium } = require('playwright');

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/petty-cash');
  await page.waitForTimeout(2000);

  const html = await page.content();
  console.log('URL:', page.url());
  console.log('Body length:', html.length);
  
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons);

  await browser.close();
}

debug();
