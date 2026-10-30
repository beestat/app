import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const results = {};
for (const route of ['detail', 'compare']) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
  await context.route('**/api/', (request) => request.abort('timedout'));
  const page = await context.newPage();
  const assets = [];
  page.on('request', (request) => { if (request.url().includes('/react/dist/assets/')) assets.push(request.url().split('/').at(-1)); });
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_000);
  results[route] = assets;
  await context.close();
}

const detailPreloaded = results.detail.some((asset) => asset.startsWith('DetailPage-'));
const comparePreloadedDetail = results.compare.some((asset) => asset.startsWith('DetailPage-'));
if (!detailPreloaded || comparePreloadedDetail) throw new Error(`Route-aware Detail preload regression: ${JSON.stringify(results)}`);
console.log(JSON.stringify({ detailPreloaded, comparePreloadedDetail, detailAssets: results.detail.length, compareAssets: results.compare.length }, null, 2));
await browser.close();
