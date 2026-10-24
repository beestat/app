import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1000 },
  storageState: 'test-results/auth-state.json',
});
const page = await context.newPage();
const errors = [];
const failedResponses = [];
const blockedVisualizerMutations = [];
await context.route('**/api/', async (route) => {
  const body = route.request().postData();
  let calls = [];
  try {
    const payload = JSON.parse(body ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { /* Continue non-JSON API traffic. */ }
  const mutation = calls.find((call) => call?.resource === 'floor_plan' && !['read', 'read_id'].includes(call?.method));
  if (!mutation) return route.continue();
  blockedVisualizerMutations.push(`${mutation.resource}.${mutation.method}`);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => { if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() }); });

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'networkidle', timeout: 90_000 });
await page.getByText(/System - /).waitFor({ timeout: 30_000 });
const authenticatedThermostat = await page.getByText(/System - /).first().textContent();
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
await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 90_000 });
await page.waitForTimeout(15_000);
await page.screenshot({ path: 'test-results/react-visualize-settled.png', fullPage: false });
const visualizer = await page.evaluate(() => ({
  iframeCount: document.querySelectorAll('iframe').length,
  canvasCount: document.querySelectorAll('canvas').length,
  text: document.body.innerText.slice(0, 500),
}));
if (visualizer.iframeCount !== 0 || visualizer.canvasCount < 1) throw new Error(`Visualizer host regression: ${JSON.stringify(visualizer)}`);

console.log(JSON.stringify({ authenticatedThermostat, performanceMetrics, airQualityText, visualizer, blockedVisualizerMutations, failedResponses, errors }, null, 2));
await browser.close();
