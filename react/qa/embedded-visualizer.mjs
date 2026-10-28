import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1200, height: 900 }, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php?embedded=1#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('canvas').first().waitFor({ timeout: 90_000 });
const result = await page.evaluate(() => ({
  appBar: document.querySelector('.MuiAppBar-root') !== null,
  openMenu: document.querySelector('[aria-label="Open menu"]') !== null,
  canvasCount: document.querySelectorAll('canvas').length,
  iframeCount: document.querySelectorAll('iframe').length,
  floorPlan: document.body.innerText.includes('Floor Plan'),
}));
if (result.appBar || result.openMenu) throw new Error(`Embedded visualizer includes application navigation: ${JSON.stringify(result)}`);
if (!result.floorPlan || result.canvasCount !== 1 || result.iframeCount !== 0) throw new Error(`Embedded exact visualizer failed: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
