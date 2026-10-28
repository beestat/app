import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
const floorPlanMount = page.locator('[data-lazy-mount]').first();
const editorMap = page.locator('[data-editor-engine="beestat-exact"] svg').first();
if (await editorMap.isVisible()) {
  await page.getByText('Home', { exact: true }).first().click();
  await editorMap.waitFor({ state: 'hidden', timeout: 30_000 });
}
const collapsedEditor = await floorPlanMount.evaluate((node) => ({
  height: Math.round(node.getBoundingClientRect().height),
  minHeight: getComputedStyle(node).minHeight,
  visible: node.getAttribute('data-lazy-visible'),
}));
const threeLoader = page.locator('[data-lazy-mount]').last();
await threeLoader.scrollIntoViewIfNeeded();
await page.getByText('Preparing 3D view', { exact: true }).waitFor({ state: 'visible' });
await page.screenshot({ path: 'test-results/parity/react-visualizer-loading.png', fullPage: false });
const loader = await page.locator('[data-visualizer-stage]').evaluate((node) => ({
  busy: node.getAttribute('aria-busy'),
  height: Math.round(node.getBoundingClientRect().height),
  status: node.querySelector('[role="status"]')?.textContent?.replace(/\s+/g, ' ').trim(),
  visibleLegacyLoader: [...node.querySelectorAll('*')].some((item) => item.textContent?.trim() === 'Rendering' && getComputedStyle(item).display !== 'none'),
}));
if (collapsedEditor.visible !== 'true' || collapsedEditor.minHeight !== '0px' || collapsedEditor.height > 250) throw new Error(`Collapsed floor-plan wrapper regression: ${JSON.stringify(collapsedEditor)}`);
if (loader.busy !== 'true' || loader.height !== 500 || !loader.status?.includes('Preparing 3D view') || loader.visibleLegacyLoader) throw new Error(`Visualizer loading state regression: ${JSON.stringify(loader)}`);
console.log(JSON.stringify({ collapsedEditor, loader }, null, 2));
await browser.close();
