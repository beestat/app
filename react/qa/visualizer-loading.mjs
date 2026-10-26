import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.evaluate(() => { window.requestIdleCallback = () => 1; });
const threeLoader = page.locator('[data-lazy-mount]').last();
await threeLoader.scrollIntoViewIfNeeded();
await page.getByText('Preparing 3D view', { exact: true }).waitFor({ state: 'visible' });
await page.screenshot({ path: 'test-results/parity/react-visualizer-loading.png', fullPage: false });
const loader = await threeLoader.evaluate((node) => ({
  busy: node.getAttribute('aria-busy'),
  height: Math.round(node.getBoundingClientRect().height),
  status: node.querySelector('[role="status"]')?.textContent?.replace(/\s+/g, ' ').trim(),
}));
if (loader.busy !== 'true' || loader.height !== 548 || !loader.status?.includes('Building your home')) throw new Error(`Visualizer loading state regression: ${JSON.stringify(loader)}`);
console.log(JSON.stringify(loader, null, 2));
await browser.close();
