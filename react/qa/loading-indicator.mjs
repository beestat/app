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
  const fill = node.querySelector('[data-loader-part="fill-1"]');
  const animation = fill.getAnimations()[0];
  animation.pause();
  animation.currentTime = 0;
  const start = { opacity: getComputedStyle(fill).opacity, filter: getComputedStyle(fill).filter };
  animation.currentTime = 500;
  const peak = { opacity: getComputedStyle(fill).opacity, filter: getComputedStyle(fill).filter };
  animation.play();
  return { start, peak };
});
const result = await loader.evaluate((node) => ({
  label: node.getAttribute('aria-label'),
  sourceImages: [...node.querySelectorAll('img')].map((image) => image.getAttribute('src')),
  fills: [...node.querySelectorAll('[data-loader-part^="fill-"]')].map((fill) => ({
    animationName: getComputedStyle(fill).animationName,
    animationDelay: getComputedStyle(fill).animationDelay,
  })),
}));
await page.screenshot({ path: 'test-results/loading-indicator/app-loading.png', animations: 'allow' });
if (result.sourceImages.some((source) => source !== '/favicon.png') || result.fills.length !== 4 || new Set(result.fills.map((fill) => fill.animationDelay)).size !== 4 || result.fills.some((fill) => fill.animationName === 'none') || JSON.stringify(motion.start) === JSON.stringify(motion.peak)) throw new Error(`Branded loader animation regression: ${JSON.stringify({ result, motion })}`);
console.log(JSON.stringify({ ...result, motion }, null, 2));
await browser.close();
