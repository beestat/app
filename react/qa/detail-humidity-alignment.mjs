import { chromium } from 'playwright';

// Legacy keeps the Thermostat Detail raceway and temperature plot aligned when a
// right-axis (humidity) series is shown by giving both a 45px right margin.
// Toggles Indoor Humidity and reports the plot right edges of both charts.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.evaluate(async () => { for (let y = 0; y < 1200; y += 400) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 150)); } });
await page.getByText('Indoor Humidity').first().waitFor({ timeout: 90_000 });
const edges = () => page.evaluate(() => {
  const card = [...document.querySelectorAll('.MuiCard-root')].find((node) => node.textContent?.includes('Thermostat Detail'));
  return [...card.querySelectorAll('.highcharts-plot-background')].map((node) => Math.round(node.getBoundingClientRect().right));
});
const before = await edges();
await page.locator('.highcharts-legend-item').filter({ hasText: 'Indoor Humidity' }).first().click();
await page.waitForTimeout(500);
const withHumidity = await edges();
await page.locator('.highcharts-legend-item').filter({ hasText: 'Indoor Humidity' }).first().click();
await page.waitForTimeout(500);
console.log(JSON.stringify({ before, withHumidity, after: await edges() }));
await browser.close();
