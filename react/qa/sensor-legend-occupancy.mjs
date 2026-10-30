import { chromium } from 'playwright';

// Legacy hides a sensor's occupancy lane when its temperature legend item is hidden.
// Toggles one sensor in the Sensor Detail legend and reports the occupancy lane's visibility.
const sensorName = process.argv[2] ?? 'Office';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Sensor Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 150)); } });
const card = page.locator('.MuiCard-root').filter({ hasText: 'Sensor Detail' });
await card.locator('.highcharts-legend-item').filter({ hasText: sensorName }).first().waitFor({ timeout: 90_000 });
// The occupancy chart is the second Highcharts container in the card (after the equipment raceway).
const laneVisible = () => card.locator('.highcharts-container').nth(1).evaluate((container) =>
  // A hidden lane keeps its group but loses its drawn path.
  [...container.querySelectorAll('g.highcharts-series')].filter((group) => group.getAttribute('visibility') !== 'hidden' && group.querySelector('path')?.getAttribute('stroke')).length);
const before = await laneVisible();
await card.locator('.highcharts-legend-item').filter({ hasText: sensorName }).first().click();
await page.waitForTimeout(1500);
const afterHide = await laneVisible();
await card.locator('.highcharts-legend-item').filter({ hasText: sensorName }).first().click();
await page.waitForTimeout(1500);
console.log(JSON.stringify({ sensorName, visibleOccupancyLanes: { before, afterHide, afterShow: await laneVisible() } }));
await browser.close();
