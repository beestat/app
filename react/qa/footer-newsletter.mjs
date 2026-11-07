import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/footer-newsletter', { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const width of [1440, 390, 320]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 844 } });
  const page = await context.newPage();
  await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const footer = page.getByRole('contentinfo');
  await footer.scrollIntoViewIfNeeded();
  const newsletter = footer.getByRole('button', { name: 'Newsletter' });
  if (await newsletter.getAttribute('href')) throw new Error(`Newsletter still links away at ${width}px.`);
  await newsletter.click();
  const dialog = page.getByRole('dialog', { name: 'Newsletter' });
  await dialog.waitFor();
  await dialog.getByLabel('Email address').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('[data-beestat-loader]').length === 0);
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: innerWidth };
  });
  if (geometry.left < 0 || geometry.right > geometry.viewport) throw new Error(`Newsletter dialog overflows at ${width}px: ${JSON.stringify(geometry)}`);
  await page.screenshot({ path: `test-results/footer-newsletter/${width}.png`, fullPage: false });
  await dialog.getByRole('button', { name: 'No Thanks' }).click();
  results.push({ width, opensDialog: true, geometry });
  await context.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
