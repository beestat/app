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

let page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
async function inspect(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Floor Plan', { exact: true }).first().waitFor({ timeout: 90_000 });
  if (url.includes('/react/')) await page.locator('[data-lazy-mount]').last().scrollIntoViewIfNeeded();
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
console.log('checked legacy visualize');
const legacyMutationBaseline = blockedMutations.length;
const react = await inspect('react', 'https://dev.app.beestat.io/react/index.php#/visualize');
console.log('checked React visualize shell');
if (react.iframeCount !== 0 || react.canvas.length === 0 || react.controls.length !== 8 || react.canvas[0].width !== legacy.canvas[0]?.width || react.canvas[0].height !== legacy.canvas[0]?.height) throw new Error(`Visualizer parity regression: ${JSON.stringify({ legacy, react, url: page.url(), body: (await page.locator('body').innerText()).slice(0, 1000), errors })}`);
if (!await page.getByText('Floor Name', { exact: true }).isVisible()) await page.locator('[data-editor-engine="beestat-exact"]').getByText('Home', { exact: true }).first().click();
await page.locator('[data-editor-engine="beestat-exact"] svg').first().waitFor({ timeout: 30_000 });
const editor = await page.evaluate(() => {
  const host = document.querySelector('[data-editor-engine="beestat-exact"]');
  const map = host?.querySelector('svg')?.getBoundingClientRect();
  const addRoom = host?.querySelector('[title="Add Room [R]"]')?.getBoundingClientRect();
  const undo = host?.querySelector('[title="Undo [Ctrl+Z]"]')?.getBoundingClientRect();
  const sidebar = [...(host?.querySelectorAll('div') ?? [])].map((item) => item.getBoundingClientRect()).find((rect) => Math.round(rect.width) === 250 && Math.round(rect.height) >= 450);
  return {
    map: map && { x: Math.round(map.x), width: Math.round(map.width), height: Math.round(map.height) },
    sidebar: sidebar && { x: Math.round(sidebar.x), width: Math.round(sidebar.width), height: Math.round(sidebar.height) },
    addRoom: addRoom && { x: Math.round(addRoom.x), y: Math.round(addRoom.y) },
    undo: undo && { x: Math.round(undo.x), y: Math.round(undo.y) },
    fields: ['Floor Name', 'Elevation (ft)', 'Ceiling Height (ft)'].filter((label) => document.body.innerText.includes(label)),
    exactEngine: host?.getAttribute('data-editor-engine'),
    canvasCount: document.querySelectorAll('canvas').length,
  };
});
await page.screenshot({ path: 'test-results/parity/react-visualize-editor.png', fullPage: false });
if (editor.exactEngine !== 'beestat-exact' || !editor.map || editor.map.x !== 32 || editor.map.width !== 1376 || editor.map.height !== 500 || !editor.sidebar || editor.sidebar.width !== 250 || editor.sidebar.x < editor.map.x + editor.map.width - 270 || !editor.addRoom || !editor.undo || editor.undo.x <= editor.addRoom.x || editor.fields.length !== 3 || editor.canvasCount === 0) throw new Error(`Floor-plan editor layout regression: ${JSON.stringify(editor)}`);
const nativeEditor = await page.evaluate(() => ({
  polygons: document.querySelectorAll('[data-editor-engine="beestat-exact"] svg polygon').length,
  circles: document.querySelectorAll('[data-editor-engine="beestat-exact"] svg circle').length,
  addTools: ['Add Room [R]', 'Add Opening [O]', 'Add Surface [F]', 'Add Tree [T]', 'Add Light [L]'].filter((title) => document.querySelector(`[data-editor-engine="beestat-exact"] [title="${title}"]`)),
  historyTools: ['Undo [Ctrl+Z]', 'Redo [Ctrl+Y]', 'Zoom In', 'Zoom out'].filter((title) => document.querySelector(`[data-editor-engine="beestat-exact"] [title="${title}"]`)),
  floors: ['Basement', 'First Floor', 'Second Floor'].filter((label) => document.querySelector('[data-editor-engine="beestat-exact"]')?.textContent?.includes(label)),
}));
await page.screenshot({ path: 'test-results/parity/react-native-floor-plan-editor.png', fullPage: false });
if (nativeEditor.polygons === 0 || nativeEditor.circles === 0 || nativeEditor.addTools.length !== 5 || nativeEditor.historyTools.length !== 4 || nativeEditor.floors.length !== 3 || blockedMutations.length !== legacyMutationBaseline) throw new Error(`Exact floor-plan editor regression: ${JSON.stringify({ nativeEditor, blockedMutations, legacyMutationBaseline })}`);
await page.locator('[data-editor-engine="beestat-exact"] .icon.dots_vertical').click();
await page.getByText('Add New', { exact: true }).click();
await page.getByText('Create Floor Plan', { exact: true }).last().waitFor({ timeout: 30_000 });
for (const label of ['Give your floor plan a name', 'How many floors does your home have?', 'How tall are your ceilings (ft)?']) if (!await page.getByText(label, { exact: true }).isVisible()) throw new Error(`Exact floor-plan creation modal is missing ${label}.`);
await page.keyboard.press('Escape');
if (blockedMutations.length !== legacyMutationBaseline) throw new Error('Opening exact floor-plan management attempted a write.');
console.log('checked exact editor without modifying the plan');
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-lazy-mount]').last().evaluate((node) => node.scrollIntoView());
await page.locator('canvas[data-native-three="true"]').waitFor({ timeout: 90_000 });
await page.waitForTimeout(5_000);
console.log('checked exact 3D card readiness');
const nativeScene = await page.evaluate(() => {
  const host = document.querySelector('[data-scene-card-engine="beestat-exact"]');
  const canvasRect = host?.querySelector('canvas')?.getBoundingClientRect();
  const watermarkRect = [...(host?.querySelectorAll('img') ?? [])].find((image) => image.src.includes('/img/logo.png'))?.getBoundingClientRect();
  const dateSliderRect = host?.querySelectorAll('input[type="range"]')[1]?.getBoundingClientRect();
  const titles = ['Toggle View', 'Toggle Auto-Rotate', 'Weather', 'Scene Settings'];
  const layout = Object.fromEntries(titles.map((title) => { const rect = host?.querySelector(`[title="${title}"]`)?.getBoundingClientRect(); return [title, rect && { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }]; }));
  return {
    nativeCanvas: host?.querySelectorAll('canvas[data-native-three="true"]').length ?? 0,
    exactEngine: host?.getAttribute('data-scene-card-engine') === 'beestat-exact' && document.querySelector('canvas[data-scene-engine="beestat-exact"]') !== null && Boolean(window.beestat?.component?.card?.three_d),
    iframeCount: host?.querySelectorAll('iframe').length ?? 0,
    controls: titles.filter((title) => host?.querySelector(`[title="${title}"]`)),
    floors: ['Basement', 'First Floor', 'Second Floor'].filter((title) => host?.querySelector(`[title="${title}"]`)),
    ranges: host?.querySelectorAll('input[type="range"]').length ?? 0,
    currentDate: [...(host?.querySelectorAll('div') ?? [])].some((item) => /^October \d{1,2}$/.test(item.textContent?.trim() ?? '')),
    bottomHudInsideScene: Boolean(
      canvasRect && watermarkRect && dateSliderRect &&
      watermarkRect.top >= canvasRect.top && watermarkRect.bottom <= canvasRect.bottom &&
      dateSliderRect.top >= canvasRect.top && dateSliderRect.bottom <= canvasRect.bottom
    ),
    layout,
  };
});
await page.locator('canvas[data-native-three="true"]').scrollIntoViewIfNeeded();
await page.screenshot({ path: 'test-results/parity/react-native-three.png', fullPage: false });
if (nativeScene.nativeCanvas !== 1 || nativeScene.exactEngine !== true || nativeScene.iframeCount !== 0 || nativeScene.controls.length !== 4 || nativeScene.floors.length !== 3 || nativeScene.ranges !== 2 || nativeScene.currentDate !== true || nativeScene.bottomHudInsideScene !== true) throw new Error(`Exact 3D card regression: ${JSON.stringify(nativeScene)}`);
const vertical = ['Toggle View', 'Toggle Auto-Rotate', 'Weather', 'Scene Settings'].map((label) => nativeScene.layout[label]);
if (vertical.some((rect) => !rect) || vertical.some((rect) => Math.abs(rect.x - vertical[0].x) > 1) || vertical.some((rect, index) => index > 0 && rect.y <= vertical[index - 1].y)) throw new Error(`Exact 3D toolbar no longer follows the legacy left-column layout: ${JSON.stringify(nativeScene.layout)}`);
if (blockedMutations.length !== legacyMutationBaseline) throw new Error(`Read-only React visualizer QA attempted mutations: ${JSON.stringify(blockedMutations.slice(legacyMutationBaseline))}`);
await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 }); await page.locator('[data-lazy-mount]').last().evaluate((node) => node.scrollIntoView()); await page.locator('canvas[data-native-three="true"]').waitFor({ timeout: 90_000 });
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth, canvasWidth: Math.round(document.querySelector('canvas[data-native-three="true"]')?.getBoundingClientRect().width ?? 0) }));
await page.locator('canvas[data-native-three="true"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'test-results/parity/react-visualize-native-mobile.png', fullPage: false });
if (mobile.scrollWidth > mobile.innerWidth || mobile.canvasWidth !== mobile.innerWidth - 32) throw new Error(`Native visualizer mobile overflow: ${JSON.stringify(mobile)}`);
if (!await page.getByText('Floor Name', { exact: true }).isVisible()) await page.locator('[data-editor-engine="beestat-exact"]').getByText('Home', { exact: true }).first().click();
await page.getByText('Floor Name', { exact: true }).waitFor({ timeout: 30_000 });
const mobileEditor = await page.evaluate(() => {
  const host = document.querySelector('[data-editor-engine="beestat-exact"]');
  const map = host?.querySelector('svg')?.getBoundingClientRect();
  const sidebar = [...(host?.querySelectorAll('div') ?? [])].map((item) => item.getBoundingClientRect()).find((rect) => Math.round(rect.width) === 56 && Math.round(rect.height) >= 450);
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, mapWidth: Math.round(map?.width ?? 0), sidebarWidth: Math.round(sidebar?.width ?? 0) };
});
await page.screenshot({ path: 'test-results/parity/react-floor-plan-editor-mobile.png', fullPage: false });
if (mobileEditor.scrollWidth > mobileEditor.innerWidth || mobileEditor.mapWidth < 300 || mobileEditor.sidebarWidth !== 56) throw new Error(`Exact floor-plan editor mobile regression: ${JSON.stringify(mobileEditor)}`);
await page.setViewportSize({ width: 320, height: 800 });
await page.waitForTimeout(250);
const narrowMobile = await page.evaluate(() => {
  const host = document.querySelector('[data-editor-engine="beestat-exact"]');
  const map = host?.querySelector('svg')?.getBoundingClientRect();
  const canvas = document.querySelector('canvas[data-native-three="true"]')?.getBoundingClientRect();
  const sidebar = [...(host?.querySelectorAll('div') ?? [])].map((item) => item.getBoundingClientRect()).find((rect) => Math.round(rect.width) === 56 && Math.round(rect.height) >= 450);
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, mapWidth: Math.round(map?.width ?? 0), canvasWidth: Math.round(canvas?.width ?? 0), sidebarWidth: Math.round(sidebar?.width ?? 0) };
});
if (narrowMobile.scrollWidth > narrowMobile.innerWidth || narrowMobile.canvasWidth !== narrowMobile.innerWidth - 32 || narrowMobile.mapWidth < 230 || narrowMobile.sidebarWidth !== 56) throw new Error(`Exact visualizer 320px regression: ${JSON.stringify(narrowMobile)}`);
if (blockedMutations.length !== legacyMutationBaseline) throw new Error(`Read-only mobile visualizer QA attempted mutations: ${JSON.stringify(blockedMutations.slice(legacyMutationBaseline))}`);
if (errors.length) throw new Error(`Visualizer emitted page errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ legacy, react, editor, nativeEditor, nativeScene, mobile, mobileEditor, narrowMobile, blockedMutations, errors }, null, 2));
await browser.close();
