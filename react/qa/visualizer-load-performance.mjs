import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
const writes = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return route.continue(); }
  const floorPlanWrites = calls.filter((call) => call?.resource === 'floor_plan' && !['read', 'read_id'].includes(call?.method));
  if (!floorPlanWrites.length) return route.continue();
  writes.push(...floorPlanWrites.map((call) => `${call.resource}.${call.method}`));
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.addInitScript(() => {
  window.__beestatLongTasks = [];
  new PerformanceObserver((list) => {
    window.__beestatLongTasks.push(...list.getEntries().map((entry) => ({ start: entry.startTime, duration: entry.duration })));
  }).observe({ type: 'longtask', buffered: true });
});
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('link', { name: 'Visualize' }).hover();
await page.waitForTimeout(100);
const started = Date.now();
await page.evaluate(() => { performance.mark('visualizer-navigation-start'); });
await page.getByRole('link', { name: 'Visualize' }).click();
const firstPaintMs = await page.evaluate(() => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const start = performance.getEntriesByName('visualizer-navigation-start').at(-1).startTime;
    resolve(performance.now() - start);
  }));
}));
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
const editorReadyMs = Date.now() - started;
const threeStartedBeforeEditorPaint = await page.locator('[data-scene-card-engine="beestat-exact"]').count() > 0;
await page.locator('[data-lazy-mount]').last().scrollIntoViewIfNeeded();
await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
const threeReadyMs = Date.now() - started;
const longTasks = await page.evaluate(() => {
  const start = performance.getEntriesByName('visualizer-navigation-start').at(-1).startTime;
  return window.__beestatLongTasks.filter((entry) => entry.start >= start);
});
const result = {
  editorReadyMs,
  firstPaintMs: Math.round(firstPaintMs),
  threeReadyMs,
  threeStartedBeforeEditorPaint,
  longTaskCount: longTasks.length,
  longestTaskMs: Math.round(Math.max(0, ...longTasks.map((entry) => entry.duration))),
  totalLongTaskMs: Math.round(longTasks.reduce((total, entry) => total + entry.duration, 0)),
  writes,
};
if (threeStartedBeforeEditorPaint) throw new Error(`3D initialized before the editor paint settled: ${JSON.stringify(result)}`);
if (writes.length) throw new Error(`Read-only load test attempted floor-plan writes: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
