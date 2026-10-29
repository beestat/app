import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 390, height: 844 } });
const mutations = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return route.continue(); }
  const alertCall = calls.find((call) => call.resource === 'thermostat' && ['dismiss_alert', 'restore_alert'].includes(call.method));
  if (!alertCall) return route.continue();
  mutations.push({ method: alertCall.method, arguments: typeof alertCall.arguments === 'string' ? JSON.parse(alertCall.arguments) : alertCall.arguments });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const alertText = page.getByText(/Upstairs sensor is running low on battery/i);
await alertText.waitFor({ timeout: 90_000 });
await alertText.click();
await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
await page.getByRole('button', { name: 'Alerts menu' }).click();
await page.getByRole('menuitem', { name: 'Show dismissed' }).click();
await alertText.click();
await page.getByRole('button', { name: 'Restore' }).click();

if (mutations.map((item) => item.method).join(',') !== 'dismiss_alert,restore_alert') throw new Error(`Alert interaction parity failed: ${JSON.stringify(mutations)}`);
if (mutations.some((item) => Number(item.arguments?.thermostat_id) !== 34012 || !item.arguments?.guid)) throw new Error(`Alert mutation arguments differ from legacy: ${JSON.stringify(mutations)}`);
console.log(JSON.stringify({ alertDetails: true, dismissRestore: true, mutations }, null, 2));
await browser.close();
