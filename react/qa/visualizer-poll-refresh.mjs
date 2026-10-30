import { chromium } from 'playwright';

// Fast-forward one dashboard poll while Visualize is open. The exact scene must
// fetch fresh raw runtime rows only after runtime.sync, without rebuilding or
// covering the existing canvas with a loader.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const calls = [];
page.on('request', (request) => {
  if (!request.url().includes('/api/')) return;
  let batch = [];
  try {
    const payload = JSON.parse(request.postData() ?? '{}');
    batch = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return; }
  if (batch.some((call) => call?.resource === 'user' && call?.method === 'session_read_id')) calls.push('dashboard');
  if (batch.some((call) => call?.resource === 'runtime' && call?.method === 'sync')) calls.push('runtime.sync');
  if (batch.some((call) => call?.resource === 'runtime_sensor' && call?.method === 'read')) calls.push('visualize.runtime');
});

await page.clock.install();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-lazy-mount]').last().evaluate((node) => node.scrollIntoView());
const stage = page.locator('[data-visualizer-stage]');
await stage.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 180_000 });
await stage.filter({ has: page.locator('canvas[data-native-three="true"]') }).waitFor({ state: 'visible' });
await page.locator('[data-visualizer-stage][aria-busy="false"]').waitFor({ timeout: 180_000 });
// Let the initial 160ms reveal transition finish before measuring the poll.
await page.waitForTimeout(250);
await page.evaluate(() => {
  const stage = document.querySelector('[data-visualizer-stage]');
  const canvas = stage?.querySelector('canvas[data-native-three="true"]');
  window.__pollCanvas = canvas;
  window.__pollHost = stage?.firstElementChild;
  window.__pollBusyTransitions = [];
  window.__pollLowestOpacity = 1;
  window.__pollObserver = new MutationObserver(() => {
    window.__pollBusyTransitions.push(stage?.getAttribute('aria-busy'));
    window.__pollLowestOpacity = Math.min(window.__pollLowestOpacity, Number.parseFloat(getComputedStyle(window.__pollHost).opacity));
  });
  window.__pollObserver.observe(stage, { attributes: true, childList: true, subtree: true });
});

const initialCallCount = calls.length;
await page.clock.fastForward('05:05');
// Request events live in Node; wait until both ordered calls arrive.
for (let attempt = 0; attempt < 180; attempt++) {
  const afterPoll = calls.slice(initialCallCount);
  if (afterPoll.includes('runtime.sync') && afterPoll.includes('visualize.runtime')) break;
  await page.waitForTimeout(500);
}
await page.waitForTimeout(2_000);

const afterPoll = calls.slice(initialCallCount);
const runtimeSyncIndex = afterPoll.indexOf('runtime.sync');
const runtimeReadIndex = afterPoll.indexOf('visualize.runtime');
const visual = await page.evaluate(() => ({
  sameCanvas: window.__pollCanvas === document.querySelector('[data-visualizer-stage] canvas[data-native-three="true"]'),
  busyTransitions: window.__pollBusyTransitions,
  lowestOpacity: window.__pollLowestOpacity,
  hostOpacity: getComputedStyle(window.__pollHost).opacity,
  hostClass: window.__pollHost?.className,
  busy: document.querySelector('[data-visualizer-stage]')?.getAttribute('aria-busy'),
  loaderVisible: Boolean(document.querySelector('[data-visualizer-stage] [role="status"]')),
}));
if (runtimeSyncIndex < 0 || runtimeReadIndex <= runtimeSyncIndex || !visual.sameCanvas || visual.busyTransitions.includes('true') || visual.lowestOpacity < 1 || visual.busy !== 'false' || visual.loaderVisible) {
  throw new Error(`Visualizer poll refresh regression: ${JSON.stringify({ afterPoll, visual })}`);
}
console.log(JSON.stringify({ afterPoll, visual }, null, 2));
await browser.close();
