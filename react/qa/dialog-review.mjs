import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/dialog-review', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
await context.route('**/api/', async (route) => {
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    const calls = Array.isArray(batch) ? batch : Object.values(batch);
    if (calls.some((call) => call.resource === 'user' && ['update_setting', 'update'].includes(call.method))) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  } catch { /* Continue non-JSON requests. */ }
  return route.continue();
});

const errors = [];
let screenshots = 0;
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const open = async (route, heading) => {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(heading, { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const incidentalDialog = page.getByRole('dialog').last();
    if (!await incidentalDialog.isVisible().catch(() => false)) break;
    await incidentalDialog.press('Escape');
    await page.waitForTimeout(150);
  }
};
const capture = async (name) => {
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor({ state: 'visible', timeout: 30_000 });
  const dialogHandle = await dialog.elementHandle();
  await page.waitForTimeout(200);
  await dialog.screenshot({ path: `test-results/dialog-review/${name}.png`, animations: 'disabled' });
  screenshots += 1;
  const box = await dialog.boundingBox();
  if (!box || box.x < 0 || box.y < 0 || box.x + box.width > await page.evaluate(() => innerWidth) || box.y + box.height > await page.evaluate(() => innerHeight)) throw new Error(`${name} dialog is outside the viewport: ${JSON.stringify(box)}`);
  await dialog.press('Escape');
  await page.waitForFunction((element) => !element?.isConnected || getComputedStyle(element).visibility === 'hidden', dialogHandle, { timeout: 10_000 });
};

await open('detail', 'Thermostat Detail');
for (const [item, name] of [['Thermostat Info', 'thermostat-info'], ['Filter Info', 'filter-info']]) {
  await page.getByRole('button', { name: 'System menu' }).click();
  const menuItem = page.getByRole('menuitem', { name: item });
  if (!await menuItem.count()) { await page.getByRole('menu').press('Escape'); continue; }
  await menuItem.click();
  await capture(name);
}
await page.getByRole('button', { name: 'Weather details' }).click();
await capture('weather');
await page.getByRole('button', { name: 'Chart menu' }).first().click();
await page.getByRole('menuitem', { name: 'Custom' }).click();
await capture('chart-custom-range');

await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: 'Download Data' }).click();
await page.getByText('Date Range', { exact: true }).waitFor({ timeout: 30_000 });
await capture('download-data');

await open('analyze', 'Thermostat Summary');
await page.getByRole('button', { name: 'Thermostat summary menu' }).click();
await page.getByRole('menuitem', { name: 'Custom' }).click();
await capture('summary-custom-range');
await page.getByRole('button', { name: 'Temperature profiles menu' }).click();
await page.getByRole('menuitem', { name: 'More Info' }).click();
await capture('temperature-profile-info');

await open('compare', 'Comparison Settings');
await page.getByRole('button', { name: 'My Home options' }).click();
await page.getByRole('menuitem', { name: 'Change System Type' }).click();
await capture('change-system-type');

await open('visualize', 'Visualize Settings');
await page.getByRole('button', { name: 'Custom' }).click();
await capture('visualize-custom-range');

await page.setViewportSize({ width: 390, height: 844 });
await open('compare', 'Comparison Settings');
await page.getByRole('button', { name: 'My Home options' }).click();
await page.getByRole('menuitem', { name: 'Change System Type' }).click();
await capture('change-system-type-mobile');

if (errors.length) throw new Error(`Dialog review found browser errors: ${errors.join('\n')}`);
console.log(JSON.stringify({ screenshots, errors }, null, 2));
await browser.close();
