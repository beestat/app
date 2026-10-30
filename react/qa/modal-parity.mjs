import { chromium } from 'playwright';

// Usage: node qa/modal-parity.mjs <filter_info|thermostat_info|weather|temperature_profiles_info>
// Opens a legacy System card modal directly and the matching React dialog, then
// prints both texts line by line.
const kinds = {
  filter_info: { title: 'Filter Info', open: async (page) => { await page.getByRole('button', { name: 'System menu' }).click(); await page.getByRole('menuitem', { name: /Filter Info/ }).click(); } },
  thermostat_info: { title: 'Thermostat Info', open: async (page) => { await page.getByRole('button', { name: 'System menu' }).click(); await page.getByRole('menuitem', { name: /Thermostat Info/ }).click(); } },
  weather: { title: 'Weather', open: async (page) => { await page.getByRole('button', { name: 'Weather details' }).click(); } },
  temperature_profiles_info: { title: 'Temperature Profiles', route: 'analyze', ready: 'Temperature Profiles', profile: true, open: async (page) => { await page.getByRole('button', { name: 'Temperature profiles menu' }).click(); await page.getByRole('menuitem', { name: /Info/ }).click(); } },
};
const kind = process.argv[2];
if (!kinds[kind]) throw new Error(`Usage: node qa/modal-parity.mjs <${Object.keys(kinds).join('|')}>`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });

const legacy = await context.newPage();
await legacy.goto(`https://dev.app.beestat.io/${kinds[kind].route ? `?layer=${kinds[kind].route}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await legacy.getByText(kinds[kind].ready ?? /System - /).first().waitFor({ timeout: 90_000 });
await legacy.evaluate(([name, withProfile]) => new beestat.component.modal[name](withProfile ? beestat.cache.thermostat[beestat.setting('thermostat_id')].profile : undefined).render(), [kind, Boolean(kinds[kind].profile)]);
await legacy.waitForTimeout(1_000);
const legacyBody = await legacy.locator('body').innerText();
const legacyText = legacyBody.slice(legacyBody.lastIndexOf(kinds[kind].title));

const modern = await context.newPage();
await modern.goto(`https://dev.app.beestat.io/react/index.php#/${kinds[kind].route ?? 'detail'}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
await modern.getByText(kinds[kind].ready ?? /System - /).first().waitFor({ timeout: 90_000 });
await kinds[kind].open(modern);
const reactText = await modern.getByRole('dialog').innerText();

const lines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);
console.log(JSON.stringify({ legacy: lines(legacyText), react: lines(reactText) }, null, 2));
await browser.close();
