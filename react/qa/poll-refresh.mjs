import { chromium } from 'playwright';

// Legacy re-sends runtime.sync on every 5-minute poll and drops chart caches so the
// Detail charts refetch. Fast-forwards the page clock past one poll and counts calls.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const calls = [];
page.on('request', (request) => {
  if (!request.url().includes('/api/')) return;
  try {
    const payload = JSON.parse(request.postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    const apiCalls = Array.isArray(batch) ? batch : Object.values(batch);
    if (apiCalls.some((call) => call.resource === 'runtime' && call.method === 'sync')) calls.push('runtime.sync');
    if (apiCalls.some((call) => call.resource === 'runtime_thermostat' && call.method === 'read')) calls.push('runtime_thermostat.read');
    if (apiCalls.some((call) => call.resource === 'user' && call.method === 'session_read_id')) calls.push('dashboard');
  } catch { /* Ignore unrelated requests. */ }
});
await page.clock.install();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.waitForTimeout(5_000);
const initial = [...calls];
await page.clock.fastForward('05:05');
await page.waitForTimeout(8_000);
const afterPoll = calls.slice(initial.length);
const expected = ['dashboard', 'runtime.sync', 'runtime_thermostat.read'];
let cursor = -1;
for (const call of expected) {
  cursor = afterPoll.indexOf(call, cursor + 1);
  if (cursor < 0) throw new Error(`Poll did not preserve ${expected.join(' -> ')}: ${JSON.stringify({ initial, afterPoll })}`);
}
console.log(JSON.stringify({ initial, afterPoll }, null, 2));
await browser.close();
