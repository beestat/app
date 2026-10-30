import { chromium } from 'playwright';

// Hovers each Air Quality Detail chart at phone width and reports the docked panels.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: Number(process.argv[2] ?? 390), height: 900 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Air Quality Detail').first().waitFor({ timeout: 90_000 });
await page.waitForFunction(() => document.querySelectorAll('.highcharts-container').length >= 4, null, { timeout: 90_000 });
await page.waitForTimeout(1_500);
const charts = page.locator('.highcharts-container');
const panels = [];
for (let index = 1; index <= 3; index += 1) {
  const chart = charts.nth(index);
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  // Highcharts needs a move within the chart to start tracking, then a second to refresh.
  await page.mouse.move(box.x + box.width * .5, box.y + 30);
  await page.waitForTimeout(150);
  await page.mouse.move(box.x + box.width * .6, box.y + 30);
  await page.waitForTimeout(300);
  panels.push(await page.evaluate(() => [...document.querySelectorAll('[data-docked-tooltip]')].map((node) => node.textContent.replace(/\s+/g, ' ').trim().slice(0, 60))));
}
const floating = await page.evaluate(() => [...document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container')].filter((node) => getComputedStyle(node).visibility !== 'hidden' && node.textContent?.trim()).map((node) => node.textContent.replace(/s+/g, ' ').trim().slice(0, 60)));
console.log(JSON.stringify({ panels, floating }, null, 2));
await browser.close();
