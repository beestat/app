import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/loading-indicator', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 720, height: 520 } });
await context.route('**/api/', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 12_000));
  await route.continue();
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const loader = page.locator('[data-beestat-loader]').first();
await loader.waitFor({ state: 'visible', timeout: 10_000 });
const result = await loader.evaluate((node) => ({
  label: node.getAttribute('aria-label'),
  bars: [...node.querySelectorAll('[data-loader-bar]')].map((bar) => ({
    animationName: getComputedStyle(bar).animationName,
    animationDelay: getComputedStyle(bar).animationDelay,
  })),
}));
await page.screenshot({ path: 'test-results/loading-indicator/app-loading.png', animations: 'allow' });
if (result.bars.length !== 4 || new Set(result.bars.map((bar) => bar.animationDelay)).size !== 4 || result.bars.some((bar) => bar.animationName === 'none')) throw new Error(`Branded loader animation regression: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
