// Classic <-> new switching at shared URLs. Setting writes are answered locally, so the
// account's ui.version never changes. Until the server rewrites clean paths, run against
// /index.php/<page> (the default); set BEESTAT_PAGE_BASE='' once /analyze is routed.
import { chromium } from 'playwright';

const origin = 'https://dev.app.beestat.io';
const prefix = process.env.BEESTAT_PAGE_BASE ?? '/index.php';
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (condition, message, detail) => { if (!condition) failures.push(`${message}: ${JSON.stringify(detail)}`); };

function callsOf(request) {
  try {
    const payload = JSON.parse(request.postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    return (Array.isArray(batch) ? batch : Object.values(batch)).map((call) => ({ ...call, arguments: typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments }));
  } catch { return []; }
}

async function open({ seedAccountVersion } = {}) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
  const writes = [];
  await context.route('**/api/**', async (route) => {
    const calls = callsOf(route.request());
    if (calls.some((call) => call.method === 'update_setting')) {
      writes.push(...calls.map((call) => call.arguments));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }
    if (seedAccountVersion && calls.some((call) => call.resource === 'user' && call.method === 'read_id')) {
      const response = await route.fetch();
      const body = await response.json();
      for (const user of Object.values(body?.data?.user ?? {})) user.settings = { ...(user.settings ?? {}), ui: { ...(user.settings?.ui ?? {}), version: seedAccountVersion } };
      return route.fulfill({ response, body: JSON.stringify(body) });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  return { context, page, writes };
}

const ui = (page) => page.evaluate(() => window.__BEESTAT_UI__);
const classicLayer = (page) => page.evaluate(() => Object.keys(window.beestat?.layer?.paths ?? {}).find((name) => window.beestat.current_layer?.constructor === window.beestat.layer[name]));
const waitForClassic = (page, layer) => page.waitForFunction((name) => window.beestat?.current_layer?.constructor === window.beestat?.layer?.[name], layer, { timeout: 90_000 });
const pathOf = (page) => new URL(page.url()).pathname + new URL(page.url()).search;

// 1. A device with no choice gets classic at the clean URL, and classic now updates the URL.
{
  const { context, page, writes } = await open();
  await page.goto(`${origin}${prefix}/analyze`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await waitForClassic(page, 'analyze');
  check((await ui(page))?.active === 'classic', 'Default device is not classic', await ui(page));
  check(await page.evaluate(() => !document.getElementById('root') && !window.__BEESTAT_REACT_HOST__), 'React loaded for a classic device', {});
  check(pathOf(page) === `${prefix}/analyze`, 'Classic changed a clean URL on load', pathOf(page));

  await page.getByText('Compare', { exact: true }).first().click();
  await waitForClassic(page, 'compare');
  check(pathOf(page) === `${prefix}/compare`, 'Classic navigation did not update the URL', pathOf(page));
  await page.goBack();
  await waitForClassic(page, 'analyze');
  check(pathOf(page) === `${prefix}/analyze`, 'Classic back button did not restore the page', pathOf(page));
  await page.goForward();
  await waitForClassic(page, 'compare');

  // 2. Switch to the new app from the classic menu: same URL, account + device updated.
  await page.locator('.icon.dots_vertical').first().click(); // The header menu is the first one on the page.
  await page.getByText('Try the New beestat', { exact: true }).click();
  await page.waitForFunction(() => window.__BEESTAT_UI__?.active === 'new', undefined, { timeout: 90_000 });
  await page.getByText('Comparison Settings', { exact: true }).waitFor({ timeout: 90_000 });
  check(pathOf(page) === `${prefix}/compare`, 'Switching versions changed the page', pathOf(page));
  check(writes.some((write) => write.key === 'ui.version' && write.value === 'new'), 'Classic switch did not save the account choice', writes);
  check(await page.evaluate(() => localStorage.getItem('beestat.ui')) === 'new', 'Classic switch did not remember the device choice', {});

  // 3. New app routes on clean paths with working history.
  await page.getByRole('link', { name: 'Analyze' }).first().click();
  await page.getByText('Thermostat Summary', { exact: true }).waitFor({ timeout: 90_000 });
  check(pathOf(page) === `${prefix}/analyze`, 'New app navigation URL', pathOf(page));
  await page.goBack();
  await page.getByText('Comparison Settings', { exact: true }).waitFor({ timeout: 90_000 });
  check(pathOf(page) === `${prefix}/compare`, 'New app back button', pathOf(page));

  // 4. A reload keeps the choice without asking again.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Comparison Settings', { exact: true }).waitFor({ timeout: 90_000 });
  check((await ui(page))?.active === 'new', 'Choice was not kept across reload', await ui(page));

  // 5. Switch back to classic from the new app's menu.
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('menuitem', { name: 'Switch to Classic beestat' }).click();
  await waitForClassic(page, 'compare');
  check(pathOf(page) === `${prefix}/compare`, 'Switching back changed the page', pathOf(page));
  check(writes.some((write) => write.key === 'ui.version' && write.value === 'classic'), 'New app switch did not save the account choice', writes);
  check(await page.evaluate(() => localStorage.getItem('beestat.ui')) === 'classic', 'New app switch did not remember the device choice', {});
  await context.close();
}

// 6. Old links: classic ?layer= and the new app's former #/ routes become clean paths.
{
  const { context, page } = await open();
  await page.goto(`${origin}${prefix}?layer=air_quality`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await waitForClassic(page, 'air_quality');
  check(pathOf(page) === `${prefix}/air-quality`, 'Classic ?layer= link was not rewritten', pathOf(page));
  await page.goto(`${origin}${prefix}/?ui=new#/air-quality`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Air Quality Detail', { exact: true }).waitFor({ timeout: 90_000 });
  check(pathOf(page) === `${prefix}/air-quality`, 'New app #/ link was not rewritten', pathOf(page));
  await context.close();
}

// 7. A new device follows the account's choice with a single automatic reload.
{
  const { context, page } = await open({ seedAccountVersion: 'new' });
  let documents = 0;
  page.on('domcontentloaded', () => { documents += 1; }); // Real page loads, not history-state updates.
  await page.goto(`${origin}${prefix}/settings`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(() => window.__BEESTAT_UI__?.active === 'new', undefined, { timeout: 90_000 });
  await page.getByText('Appearance').first().waitFor({ timeout: 90_000 });
  check(await page.evaluate(() => localStorage.getItem('beestat.ui')) === 'new', 'Seeded choice not remembered on the device', {});
  check(pathOf(page) === `${prefix}/settings`, 'Seeding changed the page', pathOf(page));
  check(documents === 2, 'Seeding should take exactly one reload', documents);
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('version-switching: all checks passed');
