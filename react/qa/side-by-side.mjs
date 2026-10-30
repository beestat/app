import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Usage: node qa/side-by-side.mjs <legacy-layer> <react-route> <ready-text> [width]
// Captures settled full-page legacy and React screenshots for one route.
const [legacyLayer, reactRoute, readyText, width = '1440'] = process.argv.slice(2);
if (!legacyLayer || !reactRoute || !readyText) throw new Error('Usage: node qa/side-by-side.mjs <legacy-layer> <react-route> <ready-text> [width]');

await mkdir('test-results/side-by-side', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: Number(width), height: 1000 }, storageState: 'test-results/auth-state.json' });
const errors = [];

async function capture(kind, url) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${kind}: ${error.message}`));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(readyText, { exact: false }).first().waitFor({ timeout: 90_000 });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 200)); }
    scrollTo(0, 0);
  });
  await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_500);
  const path = `test-results/side-by-side/${kind}-${reactRoute}-${width}.png`;
  await page.screenshot({ path, fullPage: true });
  await page.close();
  return path;
}

const legacy = await capture('legacy', `https://dev.app.beestat.io/?layer=${legacyLayer}`);
const modern = await capture('react', `https://dev.app.beestat.io/react/index.php#/${reactRoute}`);
console.log(JSON.stringify({ legacy, modern, errors }, null, 2));
await browser.close();
