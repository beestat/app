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
  const appearanceWrites = calls.flatMap((call) => {
    if (call.resource !== 'user' || call.method !== 'update_setting') return [];
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    return ['ui.theme', 'ui.high_contrast'].includes(args?.key) ? [{ key: args.key, value: args.value }] : [];
  });
  if (!appearanceWrites.length) return route.continue();
  writes.push(...appearanceWrites);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const picker = page.getByRole('radiogroup', { name: 'Theme' });
await picker.waitFor({ timeout: 90_000 });
const highContrast = page.getByRole('checkbox', { name: /High Contrast/ });
const readColors = async () => page.evaluate(() => ({
  body: getComputedStyle(document.body).backgroundColor,
  card: getComputedStyle(document.querySelector('.MuiCard-root')).backgroundColor,
  cardShadow: getComputedStyle(document.querySelector('.MuiCard-root')).boxShadow,
  appBar: getComputedStyle(document.querySelector('.MuiAppBar-root')).backgroundColor,
}));
const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const capture = async (name) => { await settle(); await page.screenshot({ path: `test-results/theme-${name}.png`, fullPage: true }); return readColors(); };

// Normalize the saved state without modifying the real account (writes are intercepted above).
if (await highContrast.isChecked()) await highContrast.click();
await picker.getByRole('radio', { name: 'OG Beestat' }).click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(57, 75, 83)');
const classic = await capture('classic');

await highContrast.click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(32, 44, 50)');
const classicHighContrast = await capture('classic-high-contrast');

await picker.getByRole('radio', { name: 'Midnight' }).click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)');
const midnightHighContrast = await capture('midnight-high-contrast');

await highContrast.click();
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(16, 21, 27)');
const midnight = await capture('midnight');

if (await picker.getByRole('radio').count() !== 2) throw new Error('Expected exactly two selectable base themes.');
if (new Set([classic.body, classicHighContrast.body, midnight.body, midnightHighContrast.body]).size !== 4) throw new Error('The four internal appearance combinations are not visually distinct.');
if ([classic, classicHighContrast, midnight, midnightHighContrast].some((state) => state.card === state.body)) throw new Error('A card surface does not contrast with its page background.');
if ([classic, classicHighContrast, midnight, midnightHighContrast].some((state) => state.cardShadow.includes('inset'))) throw new Error('Cards still use the hard inset-edge treatment.');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForFunction(() => document.documentElement.scrollWidth <= window.innerWidth);
await page.screenshot({ path: 'test-results/theme-midnight-mobile.png', fullPage: true });
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
if (mobile.scrollWidth !== mobile.innerWidth) throw new Error(`Theme controls overflow on mobile: ${JSON.stringify(mobile)}`);

console.log(JSON.stringify({ writes, classic, classicHighContrast, midnight, midnightHighContrast, mobile }, null, 2));
await browser.close();
