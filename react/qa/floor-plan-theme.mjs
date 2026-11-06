import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/floor-plan-theme', { recursive: true });
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
const page = await context.newPage();

async function settings() {
  await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByRole('radiogroup', { name: 'Theme' }).waitFor({ timeout: 90_000 });
}

async function capture(name, theme, highContrast) {
  await settings();
  await page.getByRole('radio', { name: theme }).click();
  const contrast = page.getByRole('checkbox', { name: /High Contrast/ });
  if (await contrast.isChecked() !== highContrast) await contrast.click();
  await page.evaluate(() => { window.location.hash = '#/visualize'; });
  await page.getByText('Floor Plan', { exact: true }).waitFor({ timeout: 90_000 });
  const editor = page.locator('[data-editor-engine="beestat-exact"]');
  await editor.waitFor({ timeout: 90_000 });
  if (!await page.getByText('Floor Name', { exact: true }).isVisible()) await editor.getByText('Home', { exact: true }).first().click();
  await page.getByText('Floor Name', { exact: true }).waitFor();
  await editor.scrollIntoViewIfNeeded();
  await editor.screenshot({ path: `test-results/floor-plan-theme/${name}.png`, animations: 'disabled' });
  return editor.evaluate((host) => {
    const nodes = [...host.querySelectorAll('[style]')];
    return {
      paper: nodes.find((node) => node.getAttribute('style')?.includes('background: rgb(47, 61, 68)')) ? getComputedStyle(nodes.find((node) => node.getAttribute('style')?.includes('background: rgb(47, 61, 68)'))).backgroundColor : null,
      primary: nodes.find((node) => node.getAttribute('style')?.includes('background: rgb(35, 138, 201)')) ? getComputedStyle(nodes.find((node) => node.getAttribute('style')?.includes('background: rgb(35, 138, 201)'))).backgroundColor : null,
    };
  });
}

const results = {
  beestat: await capture('beestat', 'OG Beestat', false),
  beestatHighContrast: await capture('beestat-high-contrast', 'OG Beestat', true),
  midnight: await capture('midnight', 'Midnight', false),
  midnightHighContrast: await capture('midnight-high-contrast', 'Midnight', true),
};
await settings();
await page.getByRole('radio', { name: 'OG Beestat' }).click();
const contrast = page.getByRole('checkbox', { name: /High Contrast/ });
if (await contrast.isChecked()) await contrast.click();
if (new Set(Object.values(results).map((result) => `${result.paper}|${result.primary}`)).size !== 4) throw new Error(`Floor plan chrome did not follow all four theme combinations: ${JSON.stringify(results)}`);
console.log(JSON.stringify(results, null, 2));
await browser.close();
