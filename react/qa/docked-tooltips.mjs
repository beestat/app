import { chromium } from 'playwright';

// Legacy docks chart tooltips under the chart below 600px wide (or when "Always
// Dock Tooltips" is on). Hovers the Thermostat Detail chart at phone and desktop
// widths and reports whether the tooltip was docked or floating.
const browser = await chromium.launch({ headless: true });
const results = [];
for (const width of [390, 1440]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 150)); } });
  await page.waitForFunction(() => [...document.querySelectorAll('.highcharts-container')].some((node) => node.getBoundingClientRect().height > 250), null, { timeout: 90_000 });
  const chart = page.locator('.highcharts-container').filter({ has: page.locator('.highcharts-legend') }).first();
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .4);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const docked = document.querySelector('[data-docked-tooltip]');
    const floating = [...document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container')].some((node) => getComputedStyle(node).visibility !== 'hidden' && node.textContent?.trim());
    return { docked: docked?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? null, floating };
  });
  if (width === 390) await page.screenshot({ path: 'test-results/side-by-side/docked-tooltip-390.png', clip: { x: 0, y: Math.max(0, box.y - 40), width, height: 760 } });
  results.push({ width, ...state });
  await context.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
