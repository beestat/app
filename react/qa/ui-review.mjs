import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/ui-review', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
await context.route('**/api/', async (route) => {
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    const calls = Array.isArray(batch) ? batch : Object.values(batch);
    if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  } catch { /* Continue non-JSON requests. */ }
  return route.continue();
});

const errors = [];
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const open = async (route, heading) => {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(heading, { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
};
const shot = async (path) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
};

await open('detail', 'Thermostat Detail');
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menu').waitFor();
await shot('test-results/ui-review/header-menu.png');
await page.getByRole('menuitem', { name: /Announcements/ }).click();
await page.getByRole('dialog', { name: 'Announcements' }).waitFor();
await shot('test-results/ui-review/announcements-dialog.png');
await page.getByRole('dialog', { name: 'Announcements' }).press('Escape');
const chartMenu = page.getByRole('button', { name: 'Chart menu' }).first();
await chartMenu.scrollIntoViewIfNeeded();
await chartMenu.click();
await page.getByRole('menuitem', { name: 'Past 3 Days' }).waitFor();
await shot('test-results/ui-review/chart-range-menu.png');
await page.getByRole('menu').press('Escape');

await open('analyze', 'Thermostat Summary');
await page.getByRole('button', { name: 'Thermostat summary menu' }).click();
await page.getByRole('menuitem', { name: 'Past 3 Months' }).waitFor();
await shot('test-results/ui-review/analyze-menu.png');
await page.getByRole('menu').press('Escape');

await open('air-quality', 'Air Quality Detail');
await page.getByRole('button', { name: 'Air Quality summary options' }).click();
await page.getByRole('menuitem', { name: 'Past 4 Weeks' }).waitFor();
await shot('test-results/ui-review/air-quality-menu.png');
await page.getByRole('menu').press('Escape');

await open('compare', 'Comparison Settings');
await page.getByRole('button', { name: 'My Home options' }).click();
await shot('test-results/ui-review/compare-menu.png');
await page.getByRole('menuitem', { name: 'Change System Type' }).click();
await page.getByRole('dialog', { name: 'Change System Type' }).waitFor();
await shot('test-results/ui-review/system-type-dialog.png');
await page.getByRole('dialog', { name: 'Change System Type' }).press('Escape');

await open('settings', 'Settings');
await shot('test-results/ui-review/settings.png');

await page.setViewportSize({ width: 390, height: 844 });
await open('compare', 'Metrics');
await page.getByText('Metrics', { exact: true }).scrollIntoViewIfNeeded();
await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
await shot('test-results/ui-review/mobile-metrics.png');
await open('settings', 'Settings');
await shot('test-results/ui-review/settings-mobile.png');
await page.getByRole('button', { name: 'Open menu' }).click();
await shot('test-results/ui-review/mobile-menu.png');
const mobile = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
if (mobile.width !== mobile.scrollWidth) throw new Error(`Mobile UI overflows horizontally: ${JSON.stringify(mobile)}`);
if (errors.length) throw new Error(`UI review found browser errors: ${errors.join('\n')}`);

console.log(JSON.stringify({ screenshots: 11, mobile, errors }, null, 2));
await browser.close();
