import { chromium } from 'playwright';

const fakeId = 999998;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 900, height: 900 }, storageState: 'test-results/auth-state.json' });
const calls = [];
await context.route('**/api/', async (route) => {
  let payload;
  try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  let batch = [payload];
  try { if (payload.batch) batch = JSON.parse(payload.batch); } catch { /* retain single call */ }
  if (batch.some((call) => call.alias === 'thermostat')) {
    const response = await route.fetch();
    const body = await response.json();
    const original = Object.values(body.data?.thermostat ?? {})[0];
    const originalEcobee = Object.values(body.data?.ecobee_thermostat ?? {})[0];
    body.data.thermostat[String(fakeId)] = { ...original, thermostat_id: fakeId, ecobee_thermostat_id: fakeId, name: 'QA Upstairs' };
    body.data.ecobee_thermostat[String(fakeId)] = { ...originalEcobee, ecobee_thermostat_id: fakeId, name: 'QA Upstairs', identifier: '000000000000' };
    return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) });
  }
  const intercepted = batch.filter((call) => (call.resource === 'user' && call.method === 'update_setting') || (call.resource === 'runtime' && call.method === 'sync' && JSON.parse(call.arguments ?? '{}').thermostat_id === fakeId));
  if (intercepted.length) {
    calls.push(...intercepted);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 30_000 });
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: 'Switch Thermostat' }).click();
const dialog = page.getByRole('dialog', { name: 'Change Thermostat' });
await dialog.getByText('QA Upstairs', { exact: true }).click();
await page.getByText('System - QA Upstairs', { exact: true }).waitFor({ timeout: 30_000 });
await page.waitForTimeout(200);
const parsed = (call) => typeof call?.arguments === 'string' ? JSON.parse(call.arguments) : call?.arguments;
const persistence = calls.find((call) => call.resource === 'user' && parsed(call)?.key === 'thermostat_id');
const sync = calls.find((call) => call.resource === 'runtime');
if (parsed(persistence)?.value !== fakeId) throw new Error(`Thermostat switch was not persisted: ${JSON.stringify(calls)}`);
if (parsed(sync)?.thermostat_id !== fakeId) throw new Error(`New thermostat was not synced: ${JSON.stringify(calls)}`);

console.log(JSON.stringify({ started: 'Ziebee II', switched: 'QA Upstairs', setting: parsed(persistence), runtimeSync: parsed(sync) }, null, 2));
await browser.close();
