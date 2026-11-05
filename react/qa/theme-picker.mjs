import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const writes = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    calls = Array.isArray(batch) ? batch : Object.values(batch);
  } catch { return route.continue(); }
  const themeWrites = calls.filter((call) => call.resource === 'user' && call.method === 'update_setting').map((call) => {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    return args?.key === 'ui.theme' ? args.value : undefined;
  }).filter(Boolean);
  if (!themeWrites.length) return route.continue();
  writes.push(...themeWrites);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('radiogroup', { name: 'Theme' }).waitFor({ timeout: 90_000 });
const colors = async () => page.evaluate(() => ({
  body: getComputedStyle(document.body).backgroundColor,
  appBar: getComputedStyle(document.querySelector('.MuiAppBar-root')).backgroundColor,
  card: getComputedStyle(document.querySelector('.MuiCard-root')).backgroundColor,
  apiLink: getComputedStyle([...document.querySelectorAll('a')].find((item) => item.textContent === 'API Documentation')).color,
}));

await page.getByRole('radio', { name: /Midnight/ }).click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(17, 21, 27)');
const midnight = await colors();
await page.screenshot({ path: 'test-results/theme-midnight.png', fullPage: true });
await page.getByRole('radio', { name: /Daylight/ }).click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(238, 242, 246)');
const daylight = await colors();
await page.screenshot({ path: 'test-results/theme-daylight.png', fullPage: true });
await page.getByRole('radio', { name: /^Beestat/ }).click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(55, 71, 79)');
const beestat = await colors();

if (JSON.stringify(writes) !== JSON.stringify(['midnight', 'daylight', 'beestat'])) throw new Error(`Theme settings were not persisted in order: ${JSON.stringify(writes)}`);
if (new Set([midnight.body, daylight.body, beestat.body]).size !== 3) throw new Error('Theme backgrounds did not change immediately.');
if (midnight.apiLink !== 'rgb(75, 168, 232)' || daylight.apiLink !== 'rgb(40, 127, 185)' || beestat.apiLink !== 'rgb(35, 138, 201)') throw new Error(`Legacy link CSS leaked into themed MUI buttons: ${JSON.stringify({ midnight: midnight.apiLink, daylight: daylight.apiLink, beestat: beestat.apiLink })}`);
console.log(JSON.stringify({ writes, midnight, daylight, beestat }, null, 2));
await browser.close();
