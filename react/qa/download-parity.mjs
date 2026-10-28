import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, storageState: 'test-results/auth-state.json' });
let downloadRequest;
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url.includes('resource=runtime') && url.includes('method=download')) {
    downloadRequest = url;
    return route.fulfill({ status: 200, contentType: 'text/plain', body: 'download intercepted by parity test' });
  }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('button', { name: 'Open menu' }).click();
await page.getByRole('menuitem', { name: /Download Data/ }).click();
const dialog = page.getByRole('dialog', { name: 'Download Data' });
await dialog.waitFor({ timeout: 30_000 });
await dialog.getByLabel('Begin date').fill('2026-10-28');
await dialog.getByLabel('End date').fill('2026-10-20');
const geometry = await dialog.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth };
});
if (geometry.left < 0 || geometry.right > geometry.viewport) throw new Error(`Download dialog overflows mobile viewport: ${JSON.stringify(geometry)}`);
await dialog.getByRole('button', { name: 'Download' }).click();
await page.waitForTimeout(250);
if (!downloadRequest) throw new Error('Download did not generate a runtime.download request.');
const url = new URL(downloadRequest);
const args = JSON.parse(url.searchParams.get('arguments'));
if (!Number.isInteger(args.thermostat_id) || args.thermostat_id <= 0) throw new Error(`Wrong thermostat: ${JSON.stringify(args)}`);
if (!/^2026-10-20T00:00:00[+-]\d{2}:\d{2}$/.test(args.download_begin)) throw new Error(`Wrong local begin: ${JSON.stringify(args)}`);
if (!/^2026-10-28T23:55:00[+-]\d{2}:\d{2}$/.test(args.download_end)) throw new Error(`Wrong local end: ${JSON.stringify(args)}`);

console.log(JSON.stringify({ dialog: true, geometry, args }, null, 2));
await browser.close();
