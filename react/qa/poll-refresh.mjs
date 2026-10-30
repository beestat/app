import { chromium } from 'playwright';

// Legacy re-sends runtime.sync on every 5-minute poll and drops chart caches so the
// Detail charts refetch. Fast-forwards the page clock past one poll and counts calls.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const calls = [];
page.on('request', (request) => {
  if (!request.url().includes('/api/')) return;
  const body = request.postData() ?? '';
  if (body.includes('"runtime"') && body.includes('sync')) calls.push('runtime.sync');
  if (body.includes('runtime_thermostat') && body.includes('"read"')) calls.push('runtime_thermostat.read');
  if (body.includes('session_read_id')) calls.push('dashboard');
});
await page.clock.install();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.waitForTimeout(5_000);
const initial = [...calls];
await page.clock.fastForward('05:05');
await page.waitForTimeout(8_000);
console.log(JSON.stringify({ initial, afterPoll: calls.slice(initial.length) }, null, 2));
await browser.close();
