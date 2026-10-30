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
await page.getByText(/Saving…|Saved/, { exact: true }).waitFor({ timeout: 5_000 });
const saveFeedback = await page.evaluate(() => ({ snackbar: document.querySelector('.MuiSnackbar-root') !== null, topAlert: [...document.querySelectorAll('.MuiAlert-root')].some((item) => item.getBoundingClientRect().top < 150) }));
if (!saveFeedback.snackbar || saveFeedback.topAlert) throw new Error(`Settings save feedback is not a toast: ${JSON.stringify(saveFeedback)}`);
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

const serial = page.getByLabel('Serial #');
const addThermostat = page.getByRole('button', { name: 'Add Thermostat' });
if (!await addThermostat.isDisabled()) throw new Error('Incomplete thermostat serial enabled Add Thermostat.');
await serial.fill('abc12345678901234');
if (await serial.inputValue() !== '123456789012') throw new Error(`Thermostat serial filtering differs from legacy: ${await serial.inputValue()}`);
if (await addThermostat.isDisabled()) throw new Error('Valid thermostat serial did not enable Add Thermostat.');
await Promise.all([
  page.waitForRequest((request) => request.url().endsWith('/api/') && request.postData()?.includes('ecobee_thermostat')),
  addThermostat.click(),
]);
await page.waitForFunction(() => document.querySelector('input[aria-label="Serial #"]')?.value === '', undefined, { timeout: 30_000 });
const createMutation = mutations.find((item) => item.resource === 'ecobee_thermostat' && item.method === 'create');
if (createMutation?.arguments?.attributes?.identifier !== '123456789012') throw new Error(`Incorrect thermostat create payload: ${JSON.stringify(createMutation)}`);
const removeButton = page.getByRole('button', { name: 'Remove Ziebee II' });
await removeButton.waitFor({ state: 'visible', timeout: 30_000 });
await Promise.all([
  page.waitForRequest((request) => request.url().endsWith('/api/') && request.postData()?.includes('ecobee_thermostat')),
  removeButton.click(),
]);
await page.waitForTimeout(250);
const removeMutation = mutations.find((item) => item.resource === 'ecobee_thermostat' && item.method === 'update' && item.arguments?.attributes?.inactive === 1);
if (!removeMutation?.arguments?.attributes?.ecobee_thermostat_id) throw new Error(`Incorrect thermostat removal payload: ${JSON.stringify(removeMutation)}`);
if (!await page.getByRole('button', { name: /Regenerate Key|Create API Key/ }).isVisible()) throw new Error('API key management is missing.');
const apiConfirmations = [];
if (await page.getByRole('button', { name: 'Regenerate Key' }).count()) {
  page.once('dialog', async (dialog) => { apiConfirmations.push(dialog.message()); await dialog.dismiss(); });
  await page.getByRole('button', { name: 'Regenerate Key' }).click();
  await page.waitForTimeout(100);
  if (mutations.some((item) => item.method === 'recycle_api_key')) throw new Error('Dismissing API key regeneration still submitted a mutation.');
  page.once('dialog', async (dialog) => { apiConfirmations.push(dialog.message()); await dialog.accept(); });
  await page.getByRole('button', { name: 'Regenerate Key' }).click();
  await page.waitForTimeout(500);
  page.once('dialog', async (dialog) => { apiConfirmations.push(dialog.message()); await dialog.dismiss(); });
  await page.getByRole('button', { name: 'Delete Key' }).click();
  await page.waitForTimeout(100);
  if (mutations.some((item) => item.method === 'delete_api_key')) throw new Error('Dismissing API key deletion still submitted a mutation.');
  const expectedConfirmations = [
    'Regenerating your API key will invalidate the current key. Any applications using the old key will stop working. Continue?',
    'Regenerating your API key will invalidate the current key. Any applications using the old key will stop working. Continue?',
    'Are you sure you want to delete your API key? This cannot be undone.',
  ];
  if (JSON.stringify(apiConfirmations) !== JSON.stringify(expectedConfirmations)) throw new Error(`API key confirmations differ from legacy: ${JSON.stringify(apiConfirmations)}`);
}
const expectedKeys = ['ui.always_dock_tooltips', 'units.temperature', 'units.distance', 'units.area', 'units.currency', 'runtime_thermostat_summary_gap_fill', 'runtime_thermostat_summary_smart_scale'];
const keys = mutations.filter((item) => item.method === 'update_setting').map((item) => item.arguments?.key);
expectedKeys.forEach((key) => { if (!keys.includes(key)) throw new Error(`Missing persistence call for ${key}.`); });

await page.evaluate(() => { location.hash = '#/detail'; });
const sensorDetail = page.locator('.MuiCard-root').filter({ has: page.getByText('Sensor Detail', { exact: true }) });
await sensorDetail.waitFor({ timeout: 30_000 });
await sensorDetail.scrollIntoViewIfNeeded();
await sensorDetail.locator('.highcharts-yaxis-labels text').first().waitFor({ timeout: 90_000 });
const liveUnitLabels = await sensorDetail.locator('.highcharts-yaxis-labels text').allTextContents();
if (!liveUnitLabels.some((label) => label.endsWith('°C')) || liveUnitLabels.some((label) => label.endsWith('°F'))) throw new Error(`Temperature setting did not update the live dashboard: ${JSON.stringify(liveUnitLabels)}`);

const routes = {};
for (const [route, text] of [['download', 'Download Data'], ['contribute', 'Contribute']]) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 30_000 });
  routes[route] = { scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth), innerWidth: await page.evaluate(() => innerWidth) };
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Manage Thermostats', { exact: true }).waitFor({ timeout: 30_000 });
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, thermostat: document.body.innerText.includes('Ziebee II') }));
if (mobile.scrollWidth > mobile.innerWidth) throw new Error(`Settings horizontal overflow: ${JSON.stringify(mobile)}`);

console.log(JSON.stringify({ settingsCards: await page.locator('.MuiCard-root').count(), saveFeedback, keys, liveUnitLabels, apiConfirmations, mutations: mutations.map((item) => `${item.resource}.${item.method}`), routes, mobile, errors }, null, 2));
await browser.close();
