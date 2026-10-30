import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Injects a second, fake thermostat into the dashboard batch response so the
// multi-thermostat header switcher can be checked on a single-thermostat account.
// Setting writes are aborted so nothing is persisted for the fake thermostat.
await mkdir('test-results/side-by-side', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const injected = [];

await context.route('**/api/**', async (route) => {
  const body = route.request().postData() ?? '';
  if (body.includes('update_setting')) return route.abort();
  const response = await route.fetch();
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { return route.fulfill({ response, body: text }); }
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.thermostat && typeof node.thermostat === 'object' && !Array.isArray(node.thermostat)) {
      const first = Object.values(node.thermostat)[0];
      if (first?.thermostat_id && !node.thermostat['999999']) {
        node.thermostat['999999'] = { ...first, thermostat_id: 999999, name: 'Basement', temperature: 68.4 };
        injected.push(route.request().url());
      }
    }
    for (const value of Object.values(node)) visit(value);
  };
  visit(json);
  return route.fulfill({ response, body: JSON.stringify(json) });
});

for (const width of [1440, 900, 600, 390]) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 700 });
  await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(/System - /).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1_000);
  const switcher = await page.getByRole('button', { name: /Basement • / }).count();
  await page.screenshot({ path: `test-results/side-by-side/header-switcher-${width}.png`, clip: { x: 0, y: 0, width, height: 64 } });
  console.log(JSON.stringify({ width, switcherButtons: switcher }));
  await page.close();
}
console.log(JSON.stringify({ injectedResponses: injected.length }));
await browser.close();
