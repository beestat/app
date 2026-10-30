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

await page.getByRole('button', { name: 'System menu' }).click();
const systemHelp = page.getByRole('menuitem', { name: 'Help' });
if (await systemHelp.getAttribute('href') !== 'https://doc.beestat.io/System-44b441bdd99b4c3991d6e0ace2dce893') throw new Error('System Help target differs from legacy.');
await page.getByRole('menuitem', { name: 'Thermostat Info' }).click();
const thermostatInfo = page.getByRole('dialog', { name: 'Thermostat Info' });
await thermostatInfo.waitFor();
for (const field of ['Model', 'Serial Number', 'Firmware Revision', 'First Connected']) await thermostatInfo.getByText(field, { exact: true }).waitFor();
const thermostatInfoText = await thermostatInfo.innerText();
if (thermostatInfoText.includes('Unknown') || !/\d{12}/.test(thermostatInfoText)) throw new Error(`Thermostat Info is incomplete: ${thermostatInfoText}`);
const thermostatDialogGeometry = await thermostatInfo.evaluate((node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, viewport: innerWidth }; });
if (thermostatDialogGeometry.left < 0 || thermostatDialogGeometry.right > thermostatDialogGeometry.viewport) throw new Error(`Thermostat Info overflows mobile: ${JSON.stringify(thermostatDialogGeometry)}`);
await thermostatInfo.getByRole('button', { name: 'Close' }).click();

await page.getByRole('button', { name: 'Weather details' }).click();
const weather = page.getByRole('dialog', { name: 'Weather' });
await weather.waitFor();
for (const field of ['Humidity', 'Dew Point', 'Wind', 'Pressure']) await weather.getByText(field, { exact: true }).waitFor();
await weather.getByRole('button', { name: 'Close' }).click();

await page.getByRole('button', { name: 'Sensors menu' }).click();
const sensorsHelp = page.getByRole('menuitem', { name: 'Help' });
if (await sensorsHelp.getAttribute('href') !== 'https://doc.beestat.io/d279d6fb4afc4f199409be2eb323140b') throw new Error('Sensors Help target differs from legacy.');
await page.keyboard.press('Escape');

console.log(JSON.stringify({ alertDetails: true, dismissRestore: true, thermostatInfo: true, weather: true, helpTargets: true, thermostatDialogGeometry, mutations }, null, 2));
await browser.close();
