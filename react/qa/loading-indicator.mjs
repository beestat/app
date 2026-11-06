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
await loader.evaluate(async (node) => Promise.all([...node.querySelectorAll('img')].map((image) => image.decode())));
const motion = await loader.evaluate((node) => {
  const bar = node.querySelector('[data-loader-part="bar-1"]');
  const animation = bar.getAnimations()[0];
  animation.pause();
  animation.currentTime = 0;
  const start = getComputedStyle(bar).transform;
  animation.currentTime = 420;
  const peak = getComputedStyle(bar).transform;
  animation.play();
  return { start, peak };
});
const result = await loader.evaluate((node) => ({
  label: node.getAttribute('aria-label'),
  sourceImages: [...node.querySelectorAll('img')].map((image) => image.getAttribute('src')),
  bars: [...node.querySelectorAll('[data-loader-part^="bar-"]')].map((bar) => ({
    animationName: getComputedStyle(bar).animationName,
    animationDelay: getComputedStyle(bar).animationDelay,
  })),
  beeAnimation: getComputedStyle(node.querySelector('[data-loader-part="bee"]')).animationName,
}));
await page.screenshot({ path: 'test-results/loading-indicator/app-loading.png', animations: 'allow' });
if (result.sourceImages.some((source) => source !== '/favicon.png') || result.bars.length !== 4 || new Set(result.bars.map((bar) => bar.animationDelay)).size !== 4 || result.bars.some((bar) => bar.animationName === 'none') || result.beeAnimation === 'none' || motion.start === motion.peak) throw new Error(`Branded loader animation regression: ${JSON.stringify({ result, motion })}`);
console.log(JSON.stringify({ ...result, motion }, null, 2));
await browser.close();
