import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return route.continue(); }
  if (calls.some((call) => ['runtime_sensor', 'runtime_thermostat'].includes(call?.resource))) {
    const data = Object.fromEntries(calls.map((call) => [call.alias, []]));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  }
  if (calls.some((call) => call?.resource === 'user' && call?.method === 'update_setting')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-lazy-mount]').last().evaluate((node) => node.scrollIntoView());
await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-visualizer-stage][aria-busy="false"]').waitFor({ timeout: 180_000 });
const today = page.getByRole('button', { name: 'Today', exact: true });
const yesterday = page.getByRole('button', { name: 'Yesterday', exact: true });
const todayBackground = await today.evaluate((node) => getComputedStyle(node).backgroundColor);
const yesterdayBackground = await yesterday.evaluate((node) => getComputedStyle(node).backgroundColor);
const targetText = todayBackground === yesterdayBackground || todayBackground.includes('55, 71, 79') ? 'Today' : 'Yesterday';
await page.evaluate(() => {
  window.__rangeLoaderAt = undefined;
  const observer = new MutationObserver(() => {
    const stage = document.querySelector('[data-visualizer-stage]');
    if (stage?.getAttribute('aria-busy') === 'true' && window.__rangeLoaderAt === undefined) window.__rangeLoaderAt = performance.now();
  });
  observer.observe(document.querySelector('[data-visualizer-stage]'), { attributes: true, subtree: true, childList: true });
  window.__rangeLoaderObserver = observer;
});
await page.getByRole('button', { name: targetText, exact: true }).evaluate((node) => node.addEventListener('click', () => { window.__rangeClickStarted = performance.now(); }, { capture: true, once: true }));
const started = Date.now();
await page.getByRole('button', { name: targetText, exact: true }).evaluate((node) => node.click());
const clickReturnedMs = Date.now() - started;
await page.waitForFunction(() => window.__rangeLoaderAt !== undefined, undefined, { timeout: 30_000 });
const loaderVisibleMs = await page.evaluate(() => Math.round(window.__rangeLoaderAt - window.__rangeClickStarted));
const loading = await page.locator('[data-visualizer-stage]').evaluate((node) => ({
  busy: node.getAttribute('aria-busy'),
  status: node.querySelector('[role="status"]')?.textContent?.replace(/\s+/g, ' ').trim(),
  visibleLegacyLoader: [...node.querySelectorAll('*')].some((item) => item.textContent?.trim() === 'Rendering' && getComputedStyle(item).display !== 'none'),
}));
await page.locator('[data-visualizer-stage][aria-busy="false"]').waitFor({ timeout: 180_000 });
await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
const readyMs = Date.now() - started;
if (loaderVisibleMs > 100 || loading.busy !== 'true' || loading.visibleLegacyLoader) throw new Error(`Range loading responsiveness regression: ${JSON.stringify({ clickReturnedMs, loaderVisibleMs, readyMs, loading })}`);
console.log(JSON.stringify({ todayBackground, yesterdayBackground, to: targetText, clickReturnedMs, loaderVisibleMs, readyMs, loading }, null, 2));
await browser.close();
