import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Air Quality Detail', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('.highcharts-container').first().waitFor({ timeout: 90_000 });
await page.getByRole('button', { name: 'Chart menu' }).click();
const items = await page.getByRole('menuitem').allTextContents();
const expected = ['Past 1 Day', 'Past 3 Days', 'Past 7 Days', 'Custom', 'Reset Zoom', 'Help'];
if (JSON.stringify(items) !== JSON.stringify(expected)) throw new Error(`Air Quality Detail menu differs from legacy: ${JSON.stringify({ expected, items })}`);
await page.close();

await context.route('**/api/', async (route) => {
  let batch = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    batch = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return route.continue(); }
  if (!batch.some((call) => ['runtime_sensor', 'runtime_thermostat'].includes(call?.resource) && call?.method === 'read')) return route.continue();
  const data = Object.fromEntries(batch.map((call) => [call.alias, []]));
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
});
const emptyPage = await context.newPage();
await emptyPage.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await emptyPage.getByText('Air Quality Detail', { exact: true }).waitFor({ timeout: 90_000 });
await emptyPage.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 });
await emptyPage.getByRole('button', { name: 'Chart menu' }).click();
const emptyItems = await emptyPage.getByRole('menuitem').allTextContents();
const emptyExpected = ['Past 1 Day', 'Past 3 Days', 'Past 7 Days', 'Custom', 'Help'];
if (JSON.stringify(emptyItems) !== JSON.stringify(emptyExpected)) throw new Error(`Empty Air Quality Detail menu differs from legacy: ${JSON.stringify({ emptyExpected, emptyItems })}`);

console.log(JSON.stringify({ items, emptyItems, downloadRemoved: !items.includes('Download Chart'), unavailableResetHidden: !emptyItems.includes('Reset Zoom') }, null, 2));
await browser.close();
