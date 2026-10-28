import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1000 },
  storageState: 'test-results/auth-state.json',
});
const writes = [];

await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : undefined;
    calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload];
  } catch {
    return route.continue();
  }
  const settingWrites = calls.filter((call) => call?.resource === 'user' && call?.method === 'update_setting');
  if (!settingWrites.length) return route.continue();
  for (const call of settingWrites) {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    writes.push({ key: args.key, value: args.value });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
const chooseRange = async (title, option) => {
  const card = page.locator('.MuiCard-root').filter({ has: page.getByText(title, { exact: true }) });
  await card.getByRole('button', { name: 'Chart menu' }).click();
  await page.getByRole('menuitem', { name: option, exact: true }).click();
};
const expectWrite = (key, value) => {
  if (!writes.some((write) => write.key === key && String(write.value) === String(value))) {
    throw new Error(`Missing intercepted setting write ${key}=${value}: ${JSON.stringify(writes)}`);
  }
};

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Sensor Detail', { exact: true }).waitFor({ timeout: 90_000 });
await chooseRange('Thermostat Detail', 'Past 1 Day');
expectWrite('runtime_thermostat_detail_range_dynamic', 1);
expectWrite('runtime_thermostat_detail_range_type', 'dynamic');
await chooseRange('Sensor Detail', 'Past 7 Days');
expectWrite('runtime_sensor_detail_range_dynamic', 7);
expectWrite('runtime_sensor_detail_range_type', 'dynamic');

const thermostatCard = page.locator('.MuiCard-root').filter({ has: page.getByText('Thermostat Detail', { exact: true }) });
await thermostatCard.getByRole('button', { name: 'Chart menu' }).click();
const thermostatHelp = await page.getByRole('menuitem', { name: 'Help' }).getAttribute('href');
if (thermostatHelp !== 'https://doc.beestat.io/e499fb13fd4441f4b3f096baca1cb138') {
  throw new Error(`Thermostat Detail help URL differs from legacy: ${thermostatHelp}`);
}
await page.keyboard.press('Escape');

await page.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Air Quality Detail', { exact: true }).waitFor({ timeout: 90_000 });
await chooseRange('Air Quality Detail', 'Past 1 Day');
expectWrite('air_quality_detail_range_dynamic', 1);
expectWrite('air_quality_detail_range_type', 'dynamic');

console.log(JSON.stringify({ writes, thermostatHelp }, null, 2));
await browser.close();
