import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 900, height: 900 }, storageState: 'test-results/auth-state.json' });
const writes = [];
let announcements = [];
await context.route('**/api/', async (route) => {
  let payload;
  try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  let calls = [payload];
  try { if (payload.batch) calls = JSON.parse(payload.batch); } catch { /* retain single call */ }
  if (calls.some((call) => call.resource === 'announcement')) {
    const response = await route.fetch();
    const body = await response.json();
    announcements = Object.values(body.data?.announcement ?? {});
    return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) });
  }
  if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) {
    writes.push(...calls.filter((call) => call.resource === 'user' && call.method === 'update_setting'));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: /Announcements/ }).click();
const dialog = page.getByRole('dialog', { name: 'Announcements' });
await dialog.waitFor({ timeout: 30_000 });
await dialog.getByText(/Environment Visualizer/).waitFor({ timeout: 30_000 });
await page.screenshot({ path: 'test-results/parity/react-announcements.png', fullPage: true });
const geometry = await dialog.evaluate((element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; });
const renderedTitles = await dialog.locator('h6').allTextContents();
await page.waitForTimeout(250);
if (!writes.some((call) => String(call.arguments).includes('last_read_announcement_id'))) throw new Error('Opening announcements did not persist the latest read ID.');
if (!await dialog.locator('svg.lucide-refresh-cw').count()) throw new Error('The announcement source icon was not mapped to its Lucide equivalent.');
if (await page.locator('.MuiBadge-badge').filter({ hasText: /^0$/ }).count()) throw new Error('A zero unread badge remains in the header DOM.');

const autoContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 900, height: 900 }, storageState: 'test-results/auth-state.json' });
let autoWrite = false;
await autoContext.route('**/api/', async (route) => {
  let payload;
  try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  let calls = [payload];
  try { if (payload.batch) calls = JSON.parse(payload.batch); } catch { /* retain single call */ }
  if (calls.some((call) => call.resource === 'announcement')) {
    const response = await route.fetch();
    const body = await response.json();
    const users = body.data?.user?.settings ? [body.data.user] : Object.values(body.data?.user ?? {});
    for (const user of users) { user.settings.last_read_announcement_id = 0; user.settings.first_run = false; }
    return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) });
  }
  if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) {
    autoWrite = true;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  }
  return route.continue();
});
const autoPage = await autoContext.newPage();
await autoPage.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await autoPage.getByRole('dialog', { name: 'Announcements' }).waitFor({ timeout: 30_000 });
await autoPage.waitForTimeout(100);
if (!autoWrite) throw new Error('Automatically opened announcement did not mark itself read.');
await autoContext.close();

console.log(JSON.stringify({ source: announcements.map(({ announcement_id, title, icon, important }) => ({ announcement_id, title, icon, important })), renderedTitles, geometry, writes: writes.length, autoOpenedImportant: true }, null, 2));
await browser.close();
