import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('test-results/visualize-static-range', { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const width of [1440, 390, 320]) {
  const calls = [];
  const floorPlanWrites = [];
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 844 } });
  await context.route('**/api/', async (route) => {
    let payload;
    try { payload = JSON.parse(route.request().postData() ?? '{}'); } catch { return route.continue(); }
    let batch = [payload];
    try { if (payload.batch) batch = JSON.parse(payload.batch); } catch { /* retain single call */ }
    const planWrites = batch.filter((call) => call.resource === 'floor_plan' && !['read', 'read_id'].includes(call.method));
    if (planWrites.length) {
      floorPlanWrites.push(...planWrites);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }
    const updates = batch.filter((call) => call.resource === 'user' && call.method === 'update_setting');
    if (!updates.length) return route.continue();
    calls.push(...updates);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  });

  const page = await context.newPage();
  await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Heat Map Values', { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Static', exact: true }).click();
  const minimum = page.getByRole('slider', { name: 'Static heat map minimum' });
  const maximum = page.getByRole('slider', { name: 'Static heat map maximum' });
  await minimum.waitFor();
  const before = Number(await minimum.getAttribute('aria-valuenow'));
  const max = Number(await maximum.getAttribute('aria-valuenow'));
  if (!Number.isFinite(before) || !Number.isFinite(max) || before >= max) throw new Error(`Invalid range at ${width}px: ${before} to ${max}`);
  calls.length = 0;
  await minimum.focus();
  await minimum.press('ArrowRight');
  const after = Number(await minimum.getAttribute('aria-valuenow'));
  if (after <= before) throw new Error(`Minimum thumb did not move at ${width}px.`);
  await page.waitForTimeout(100);
  const keys = calls.map((call) => typeof call.arguments === 'string' ? JSON.parse(call.arguments).key : call.arguments?.key);
  if (!keys.some((key) => key?.endsWith('.min')) || !keys.some((key) => key?.endsWith('.max'))) throw new Error(`Range was not persisted together at ${width}px: ${JSON.stringify(keys)}`);
  if (floorPlanWrites.length) throw new Error(`Floor plan write attempted: ${JSON.stringify(floorPlanWrites)}`);

  const card = page.locator('.MuiCard-root').filter({ hasText: 'Visualize Settings' }).first();
  const box = await card.boundingBox();
  if (!box || box.x < 0 || box.x + box.width > width) throw new Error(`Settings card overflows at ${width}px: ${JSON.stringify(box)}`);
  await card.screenshot({ path: `test-results/visualize-static-range/${width}.png` });
  await page.getByRole('button', { name: 'Temperature', exact: true }).click();
  const temperatureMin = Number(await minimum.getAttribute('aria-valuenow'));
  const temperatureMax = Number(await maximum.getAttribute('aria-valuenow'));
  const temperatureText = await minimum.getAttribute('aria-valuetext');
  if (!Number.isFinite(temperatureMin) || temperatureMin >= temperatureMax || !temperatureText?.includes('°')) throw new Error(`Invalid temperature range at ${width}px: ${temperatureMin} to ${temperatureMax} (${temperatureText})`);
  results.push({ width, occupancy: { before, after, max }, temperature: { min: temperatureMin, max: temperatureMax }, cardWidth: box.width, interceptedWrites: calls.length });
  await context.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
