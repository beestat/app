import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
let rawIndoor;

await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : undefined;
    calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload];
  } catch {
    return route.continue();
  }
  if (!calls.some((call) => call.alias === 'user') || !calls.some((call) => call.alias === 'thermostat')) return route.continue();
  const response = await route.fetch();
  const body = await response.json();
  const users = body.data?.user;
  const user = users?.settings ? users : Object.values(users ?? {})[0];
  user.settings.units ??= {};
  user.settings.units.temperature = '°C';
  const thermostatId = Number(user.settings.thermostat_id);
  rawIndoor = Number(body.data?.thermostat?.[thermostatId]?.temperature);
  await route.fulfill({ response, json: body });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const system = page.locator('.MuiCard-root').filter({ has: page.getByText('System - Ziebee II', { exact: true }) });
await system.waitFor({ timeout: 90_000 });
const expectedIndoor = ((rawIndoor - 32) * 5 / 9).toFixed(1);
if (!(await system.innerText()).includes(expectedIndoor)) throw new Error(`System card did not convert ${rawIndoor}°F to ${expectedIndoor}°C.`);
await page.getByText('Sensor Detail', { exact: true }).waitFor({ timeout: 90_000 });
const sensorDetail = page.locator('.MuiCard-root').filter({ has: page.getByText('Sensor Detail', { exact: true }) });
await sensorDetail.scrollIntoViewIfNeeded();
await sensorDetail.locator('.highcharts-yaxis-labels text').first().waitFor({ timeout: 90_000 });
const detailLabels = await sensorDetail.locator('.highcharts-yaxis-labels text').allTextContents();
if (!detailLabels.some((label) => label.endsWith('°C')) || detailLabels.some((label) => label.endsWith('°F'))) throw new Error(`Detail chart units were not converted: ${JSON.stringify(detailLabels)}`);
await page.getByRole('button', { name: 'Weather details' }).click();
if (!await page.getByRole('dialog', { name: 'Weather' }).getByText(/°C/).first().isVisible()) throw new Error('Weather dialog did not use the selected Celsius unit.');
await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Temperature Profiles', { exact: true }).waitFor({ timeout: 90_000 });
const analyzeLabels = await page.locator('.highcharts-axis-labels text').allTextContents();
if (!analyzeLabels.some((label) => label.endsWith('°C')) || analyzeLabels.some((label) => label.endsWith('°F'))) throw new Error(`Analyze chart units were not converted: ${JSON.stringify(analyzeLabels)}`);
const celsiusTicks = analyzeLabels.filter((label) => label.endsWith('°C')).map((label) => Number.parseFloat(label));
if (Math.max(...celsiusTicks) > 60) throw new Error(`Analyze retained a Fahrenheit-scale value under Celsius labels: ${JSON.stringify(celsiusTicks)}`);

await page.goto('https://dev.app.beestat.io/react/index.php#/compare', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Metrics', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
const metricsText = await page.locator('.MuiCard-root').filter({ has: page.getByText('Metrics', { exact: true }) }).innerText();
if (!metricsText.includes('°C') || metricsText.includes('°F')) throw new Error('Compare metrics did not use the selected Celsius unit.');

console.log(JSON.stringify({ rawIndoor, expectedIndoor, detailUnit: '°C', analyzeUnit: '°C', compareUnit: '°C' }, null, 2));
await browser.close();
