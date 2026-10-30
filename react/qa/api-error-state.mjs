import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 390, height: 844 } });
let requests = 0;
await context.route('**/api/', async (route) => {
  requests += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, data: { error_message: 'Temporary test outage.' } }),
  });
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.getByText('Temporary test outage.', { exact: true }).waitFor({ timeout: 10_000 });
const retry = page.getByRole('button', { name: 'Retry' });
await retry.waitFor();
const geometry = await page.locator('.MuiAlert-root').evaluate((node) => { const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, viewport: innerWidth }; });
const beforeRetry = requests;
await Promise.all([page.waitForRequest('**/api/'), retry.click()]);
if (requests <= beforeRetry || geometry.left < 0 || geometry.right > geometry.viewport) throw new Error(`API error state regression: ${JSON.stringify({ requests, beforeRetry, geometry })}`);
console.log(JSON.stringify({ message: true, retry: true, requests, geometry }, null, 2));
await browser.close();
