import { chromium } from 'playwright';

// Legacy Moment subtracts calendar days, preserving local wall-clock time over
// DST. Verify a seven-day Detail request spanning the 2026 fall-back boundary.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  timezoneId: 'America/New_York',
  viewport: { width: 1440, height: 1000 },
});
const requests = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : undefined;
    calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload];
  } catch { return route.continue(); }
  const runtime = calls.map((call) => ({
    ...call,
    arguments: typeof call?.arguments === 'string' ? JSON.parse(call.arguments) : call?.arguments,
  })).find((call) => call?.resource === 'runtime_thermostat' && call?.method === 'read' && call?.arguments?.attributes?.timestamp?.operator === '>=');
  if (runtime) {
    requests.push(runtime.arguments.attributes.timestamp.value);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  }
  const settingWrite = calls.some((call) => call?.resource === 'user' && call?.method === 'update_setting');
  if (settingWrite) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  return route.continue();
});

const page = await context.newPage();
await page.clock.install({ time: new Date('2026-11-05T12:00:00-05:00') });
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
await page.getByRole('button', { name: 'Chart menu' }).first().click();
await page.getByRole('menuitem', { name: 'Past 7 Days' }).click();
await page.waitForFunction(() => document.body.textContent?.includes('Past 7 days'), null, { timeout: 30_000 });
for (let attempt = 0; attempt < 60 && !requests.some((value) => value.startsWith('2026-10-29T16:00:')); attempt++) await page.waitForTimeout(250);

const expected = '2026-10-29T16:00:xx.xxxZ';
const actual = requests.at(-1);
if (!actual?.startsWith('2026-10-29T16:00:')) throw new Error(`Dynamic range did not preserve wall-clock time across DST: ${JSON.stringify({ expected, actual, requests })}`);
console.log(JSON.stringify({ now: '2026-11-05T12:00:00-05:00', expected, actual }, null, 2));
await browser.close();
