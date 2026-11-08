import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/visualizer-create-plan', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, storageState: 'test-results/auth-state.json' });
let createCall;
await context.route('**/api/', async (route) => {
  let payload;
  try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
  let calls = [payload];
  try { if (payload.batch) calls = JSON.parse(payload.batch); } catch { /* retain single call */ }
  if (calls.some((call) => call.alias === 'floor_plan' && call.method === 'read_id') && calls.some((call) => call.alias === 'thermostat')) {
    const response = await route.fetch();
    const body = await response.json();
    body.data.floor_plan = {};
    body.data.address = { 77: { address_id: 77, normalized: { delivery_line_1: '123 QA Street', components: { country_iso_3: 'USA' } } } };
    const users = body.data?.user?.settings ? [body.data.user] : Object.values(body.data?.user ?? {});
    for (const user of users) { user.settings.visualize ??= {}; user.settings.visualize.floor_plan_id = null; }
    return route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(body) });
  }
  const creating = calls.find((call) => call.resource === 'floor_plan' && call.method === 'create');
  if (creating) {
    createCall = creating;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { new_floor_plan: { floor_plan_id: 999997 }, floor_plan: {} } }) });
  }
  if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('button', { name: /Get started now/ }).click();
const dialog = page.getByRole('dialog', { name: 'Create Floor Plan' });
await dialog.waitFor({ timeout: 30_000 });
if ((await dialog.getByRole('combobox', { name: 'What is the address for this home?' }).textContent())?.trim() !== '123 QA Street') throw new Error('The only valid ecobee address was not selected by default.');
await dialog.getByLabel('Include a basement').check();
const geometry = await dialog.evaluate((element) => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, viewport: innerWidth }; });
if (geometry.left < 0 || geometry.right > geometry.viewport) throw new Error(`Create dialog overflows mobile: ${JSON.stringify(geometry)}`);
await page.screenshot({ path: 'test-results/visualizer-create-plan/mobile-dialog.png' });
await dialog.getByRole('button', { name: 'Create Floor Plan' }).click();
await page.waitForTimeout(100);
if (!createCall) throw new Error('Create Floor Plan did not call floor_plan.create.');
const args = typeof createCall.arguments === 'string' ? JSON.parse(createCall.arguments) : createCall.arguments;
const attributes = args.attributes;
if (attributes.name !== 'Home' || attributes.address_id !== 77) throw new Error(`Wrong plan metadata: ${JSON.stringify(attributes)}`);
if (JSON.stringify(Object.keys(attributes.data).sort()) !== JSON.stringify(['groups'])) throw new Error(`Non-legacy plan data seeded: ${JSON.stringify(attributes.data)}`);
for (const group of attributes.data.groups) {
  const keys = Object.keys(group).sort();
  if (JSON.stringify(keys) !== JSON.stringify(['elevation', 'height', 'name', 'rooms'])) throw new Error(`Non-legacy group data seeded: ${JSON.stringify(group)}`);
}
if (attributes.data.groups[0]?.name !== 'Basement' || attributes.data.groups[0]?.elevation >= 0) throw new Error(`Basement geometry is wrong: ${JSON.stringify(attributes.data.groups)}`);

console.log(JSON.stringify({ intro: true, validAddressDefaulted: true, geometry, attributes }, null, 2));
await browser.close();
