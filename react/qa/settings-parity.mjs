import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: 'test-results/auth-state.json' });
const mutations = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try { const payload = JSON.parse(route.request().postData() ?? '{}'); const batch = payload.batch ? JSON.parse(payload.batch) : undefined; calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload]; } catch { return route.continue(); }
  const writeMethods = new Set(['update_setting', 'generate_profile', 'update', 'create', 'create_api_key', 'recycle_api_key', 'delete_api_key']);
  const writes = calls.filter((call) => writeMethods.has(call?.method));
  if (!writes.length) return route.continue();
  mutations.push(...writes.map((call) => { let args = call.arguments; try { args = typeof args === 'string' ? JSON.parse(args) : args; } catch { /* retain raw diagnostics */ } return { resource: call.resource, method: call.method, arguments: args }; }));
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});
const page = await context.newPage(); const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'networkidle', timeout: 90_000 });
await page.getByText('Manage Thermostats', { exact: true }).waitFor({ timeout: 30_000 });
if (!await page.getByRole('checkbox', { name: /Always Dock Tooltips/ }).count()) {
  throw new Error(`Settings form missing: ${(await page.locator('body').innerText()).slice(0, 2_000)}`);
}

await page.getByRole('checkbox', { name: /Always Dock Tooltips/ }).click();
await page.getByRole('radio', { name: /°C/ }).click();
await page.getByRole('radio', { name: /m \/ m²/ }).click();
const currency = page.getByRole('combobox', { name: 'Currency' });
if (!await currency.count()) throw new Error(`Currency select missing after unit changes: ${(await page.locator('body').innerText()).slice(0, 1_500)}`);
await currency.click(); await page.getByRole('option', { name: 'CAD' }).click();
await page.getByRole('checkbox', { name: /Enable Gap Fill/ }).click();
await page.getByRole('checkbox', { name: /Enable Smart Scale/ }).click();
await page.getByRole('checkbox', { name: /Ignore Solar Gain/ }).click();
await page.getByLabel('Custom Start Date').fill('2026-01-01');
await page.waitForTimeout(500);

const serial = page.getByLabel('Serial #'); await serial.fill('123456789012');
if (await page.getByRole('button', { name: 'Add Thermostat' }).isDisabled()) throw new Error('Valid thermostat serial did not enable Add Thermostat.');
if (!await page.getByRole('button', { name: /Regenerate Key|Create API Key/ }).isVisible()) throw new Error('API key management is missing.');
const expectedKeys = ['ui.always_dock_tooltips', 'units.temperature', 'units.distance', 'units.area', 'units.currency', 'runtime_thermostat_summary_gap_fill', 'runtime_thermostat_summary_smart_scale'];
const keys = mutations.filter((item) => item.method === 'update_setting').map((item) => item.arguments?.key);
expectedKeys.forEach((key) => { if (!keys.includes(key)) throw new Error(`Missing persistence call for ${key}.`); });

const routes = {};
for (const [route, text] of [['announcements', 'Announcements'], ['download', 'Download Data'], ['contribute', 'Contribute']]) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 30_000 });
  routes[route] = { scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), innerWidth: await page.evaluate(() => innerWidth) };
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Manage Thermostats', { exact: true }).waitFor({ timeout: 30_000 });
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, thermostat: document.body.innerText.includes('Ziebee II') }));
if (mobile.scrollWidth > mobile.innerWidth) throw new Error(`Settings horizontal overflow: ${JSON.stringify(mobile)}`);

console.log(JSON.stringify({ settingsCards: await page.locator('.MuiCard-root').count(), keys, mutations: mutations.map((item) => `${item.resource}.${item.method}`), routes, mobile, errors }, null, 2));
await browser.close();
