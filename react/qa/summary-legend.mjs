import { chromium } from 'playwright';

// Legacy shows Outdoor Temp and Degree Days on the Thermostat Summary one at a time.
// Clicks each legend item and reports which series end up visible.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Summary', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.locator('.highcharts-legend-item').first().waitFor({ timeout: 90_000 });
const legend = page.locator('.highcharts-container').first().locator('.highcharts-legend-item');
const hidden = async () => page.locator('.highcharts-container').first().evaluate((container) => [...container.querySelectorAll('.highcharts-legend-item')].filter((item) => item.classList.contains('highcharts-legend-item-hidden')).map((item) => item.textContent));
const states = { initial: await hidden() };
await legend.filter({ hasText: 'Degree Days' }).click();
await page.waitForTimeout(300);
states.afterDegreeDays = await hidden();
await legend.filter({ hasText: 'Outdoor Temp' }).click();
await page.waitForTimeout(300);
states.afterOutdoorTemp = await hidden();
console.log(JSON.stringify(states, null, 2));
await browser.close();
