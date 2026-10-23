import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1000 },
  storageState: 'test-results/auth-state.json',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'networkidle', timeout: 90_000 });
await page.getByText(/System - /).waitFor({ timeout: 30_000 });
await page.getByText('Sensor Detail').scrollIntoViewIfNeeded();
await page.getByText('Sensor Detail').waitFor({ timeout: 45_000 });
const performanceMetrics = await page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource');
  return {
    navigationDurationMs: Math.round(navigation?.duration ?? 0),
    transferBytes: resources.reduce((sum, entry) => sum + ((entry).transferSize ?? 0), 0),
    resourceCount: resources.length,
  };
});
await page.screenshot({ path: 'test-results/react-detail-settled.png', fullPage: true });

await page.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'networkidle', timeout: 90_000 });
await page.waitForTimeout(5_000);
await page.screenshot({ path: 'test-results/react-air-quality-settled.png', fullPage: true });
const airQualityText = (await page.locator('body').innerText()).slice(0, 500);

await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'networkidle', timeout: 90_000 });
const frame = page.frameLocator('iframe[title="Beestat visualizer"]');
await frame.locator('body').waitFor({ timeout: 90_000 });
await page.waitForTimeout(15_000);
await page.screenshot({ path: 'test-results/react-visualize-settled.png', fullPage: false });
const visualizeText = (await frame.locator('body').innerText()).slice(0, 500);

console.log(JSON.stringify({ performanceMetrics, airQualityText, visualizeText, errors }, null, 2));
await browser.close();
