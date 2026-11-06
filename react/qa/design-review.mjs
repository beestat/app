import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/design-review', { recursive: true });
const browser = await chromium.launch({ headless: true });
const routes = [
  ['detail', 'Thermostat Detail'],
  ['analyze', 'Thermostat Summary'],
  ['visualize', 'Visualize Settings'],
  ['compare', 'Comparison Settings'],
  ['air-quality', 'Air Quality Summary'],
  ['settings', 'Settings'],
  ['contribute', 'Contribute'],
];
const errors = [];

for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height } });
  await context.route('**/api/', async (route) => {
    try {
      const payload = JSON.parse(route.request().postData() ?? '{}');
      const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
      const calls = Array.isArray(batch) ? batch : Object.values(batch);
      if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    } catch { /* Continue non-JSON requests. */ }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name}: ${message.text()}`); });
  for (const [route, heading] of routes) {
    await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText(heading, { exact: true }).first().waitFor({ timeout: 90_000 });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('[data-beestat-loader]'), undefined, { timeout: 90_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/design-review/${name}-${route}.png`, fullPage: true, animations: 'disabled' });
    const overflow = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    if (overflow.scrollWidth > overflow.innerWidth) throw new Error(`${name} ${route} overflows horizontally: ${JSON.stringify(overflow)}`);
  }
  await context.close();
}

if (errors.length) throw new Error(`Design review found browser errors:\n${errors.join('\n')}`);
console.log(JSON.stringify({ screenshots: routes.length * 2, errors }, null, 2));
await browser.close();
