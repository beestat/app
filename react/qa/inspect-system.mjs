import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const failedResponses = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});

const payload = await page.evaluate(async () => {
  const call = (resource, alias, args = {}) => ({ resource, method: 'read_id', alias, arguments: JSON.stringify(args) });
  const response = await fetch(window.__BEESTAT_CONFIG__?.apiBase ?? '/api/', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: window.__BEESTAT_CONFIG__?.apiKey ?? '', batch: JSON.stringify([
      call('thermostat', 'thermostat', { attributes: { inactive: 0 } }),
      call('ecobee_thermostat', 'ecobee', { attributes: { inactive: 0 } }),
      call('user', 'user'),
    ]) }),
  });
  return response.json();
});
const data = payload.data ?? {};
const settings = data.user?.settings ?? Object.values(data.user ?? {})[0]?.settings ?? {};
const thermostatId = Number(settings.thermostat_id);
const thermostat = data.thermostat?.[thermostatId];
const ecobee = data.ecobee?.[thermostat?.ecobee_thermostat_id];

await page.getByRole('button', { name: 'System menu' }).click();
const menuItems = await page.getByRole('menuitem').allTextContents();
await page.getByRole('menuitem', { name: 'Thermostat Info' }).click();
await page.waitForTimeout(300);
const thermostatInfo = await page.getByRole('dialog', { name: 'Thermostat Info' }).innerText();
await page.screenshot({ path: 'test-results/parity/react-system-thermostat-info.png', fullPage: true });
await page.getByRole('button', { name: 'Close' }).click();
await page.waitForTimeout(300);

let filterInfo;
if (menuItems.includes('Filter Info')) {
  await page.getByRole('button', { name: 'System menu' }).click();
  await page.getByRole('menuitem', { name: 'Filter Info' }).click();
  await page.waitForTimeout(300);
  filterInfo = await page.getByRole('dialog', { name: 'Filter Info' }).innerText();
  await page.screenshot({ path: 'test-results/parity/react-system-filter-info.png', fullPage: true });
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(300);
}

await page.getByRole('button', { name: 'Weather details' }).click();
await page.waitForTimeout(300);
const weatherInfo = await page.getByRole('dialog', { name: 'Weather' }).innerText();
await page.screenshot({ path: 'test-results/parity/react-system-weather.png', fullPage: true });
await page.getByRole('button', { name: 'Close' }).click();

console.log(JSON.stringify({
  thermostatId,
  menuItems,
  thermostatInfo,
  filterInfo,
  weatherInfo,
  raw: {
    filters: thermostat?.filters,
    weather: thermostat?.weather,
    ecobee: ecobee && { model_number: ecobee.model_number, identifier: ecobee.identifier, version: ecobee.version, firstConnected: ecobee.runtime?.firstConnected },
  },
  errors,
  failedResponses,
}, null, 2));
await browser.close();
