import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const blockedMutations = [];
const errors = [];
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
await context.route('**/api/', async (route) => {
  const body = route.request().postData();
  let calls = [];
  try {
    const payload = JSON.parse(body ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { /* Let malformed/non-JSON requests reach the application. */ }
  const mutation = calls.find((call) => call?.resource === 'floor_plan' && !['read', 'read_id'].includes(call?.method));
  if (!mutation) return route.continue();
  blockedMutations.push(`${mutation.resource}.${mutation.method}`);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
async function inspect(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Floor Plan', { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 90_000 });
  await page.waitForTimeout(5_000);
  await page.screenshot({ path: `test-results/parity/${name}-visualize.png`, fullPage: false });
  return page.evaluate(() => ({
    thermostat: document.body.innerText.includes('Ziebee II'),
    iframeCount: document.querySelectorAll('iframe').length,
    canvas: [...document.querySelectorAll('canvas')].map((item) => {
      const rect = item.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }),
    headings: [...document.querySelectorAll('*')].filter((item) => item.children.length === 0 && ['Floor Plan', 'Visualize Settings'].includes(item.textContent?.trim() ?? '')).map((item) => item.textContent.trim()),
    controls: ['Temperature', 'Occupancy', 'Dynamic', 'Static', 'Today', 'Yesterday', '7 Day Average', 'Custom'].filter((text) => document.body.innerText.includes(text)),
  }));
}

const legacy = await inspect('legacy', 'https://dev.app.beestat.io/?layer=visualize');
const react = await inspect('react', 'https://dev.app.beestat.io/react/index.php#/visualize');
if (react.iframeCount !== 0 || react.canvas.length === 0 || react.controls.length !== 8) throw new Error(`Visualizer parity regression: ${JSON.stringify(react)}`);
await page.getByText('Home', { exact: true }).first().click();
await page.waitForTimeout(2_000);
const editor = await page.evaluate(() => ({
  svgCount: document.querySelectorAll('svg').length,
  labels: ['Floor', 'Rooms', 'Surfaces', 'Trees', 'Openings', 'Lights'].filter((text) => document.body.innerText.includes(text)),
  canvasCount: document.querySelectorAll('canvas').length,
}));
await page.screenshot({ path: 'test-results/parity/react-visualize-editor.png', fullPage: false });
if (editor.svgCount === 0 || editor.canvasCount === 0) throw new Error(`Floor-plan editor regression: ${JSON.stringify(editor)}`);
console.log(JSON.stringify({ legacy, react, editor, blockedMutations, errors }, null, 2));
await browser.close();
