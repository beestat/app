import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, storageState: 'test-results/auth-state.json' });
await context.route('**/api/', async (route) => {
  let request;
  try { request = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  if (!request.batch) return route.continue();
  const calls = JSON.parse(request.batch);
  if (!calls.some((call) => call.alias === 'thermostat')) return route.continue();
  const response = await route.fetch();
  const payload = await response.json();
  payload.data.thermostat = {};
  payload.data.ecobee_thermostat = { 999999: { ecobee_thermostat_id: 999999, name: null, identifier: '123456789012', inactive: 0 } };
  return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(payload) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Manage Thermostats', { exact: true }).waitFor({ timeout: 30_000 });
await page.getByText('(Sync Queued)', { exact: true }).waitFor();
if (await page.getByRole('button', { name: 'Detail' }).count()) throw new Error('Thermostat-only navigation is visible without a thermostat.');
if (!await page.getByRole('button', { name: 'Remove thermostat' }).isVisible()) throw new Error('Queued thermostat cannot be removed.');

await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: 'Settings' }).click();
await page.getByText('Settings', { exact: true }).first().waitFor();
await page.getByText('Manage API Key', { exact: true }).waitFor();
const settingsUrl = page.url();
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: 'Support beestat' }).click();
await page.getByText('Recurring Contribution Status', { exact: true }).waitFor();
const geometry = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
if (geometry.scrollWidth > geometry.innerWidth) throw new Error(`No-thermostat secondary route overflows: ${JSON.stringify(geometry)}`);

console.log(JSON.stringify({ queuedThermostat: true, settingsUrl, contributeAccessible: true, geometry }, null, 2));
await browser.close();
