// Verifies the Nov 10 cleanup requests on live dev data without changing the account:
// setting writes are answered locally, alert dismissal is never clicked.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'test-results/cleanup-round-3';
await mkdir(out, { recursive: true });
const base = 'https://dev.app.beestat.io/react/index.php#';
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (condition, message, detail) => { if (!condition) failures.push(`${message}: ${JSON.stringify(detail)}`); };

function callsOf(route) {
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    return Array.isArray(batch) ? batch : Object.values(batch);
  } catch { return []; }
}

async function open(width, height, { delayRuntime = () => false } = {}) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height } });
  const writes = [];
  await context.route('**/api/', async (route) => {
    const calls = callsOf(route);
    if (calls.some((call) => call.resource === 'user' && call.method === 'update_setting')) {
      writes.push(...calls.map((call) => typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    }
    if (calls.some((call) => ['dismiss_alert', 'restore_alert'].includes(call.method))) throw new Error('QA must not change alerts');
    if (delayRuntime(calls)) await new Promise((resolve) => setTimeout(resolve, 4000));
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  return { context, page, writes };
}

const card = (page, title) => page.getByText(title, { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"MuiCard-root")][1]');

// 1. Alerts: icon size and text position are identical before and after opening an alert.
{
  const { context, page } = await open(1440, 1000);
  await page.goto(`${base}/detail`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const alerts = card(page, 'Alerts');
  await alerts.waitFor({ timeout: 90_000 });
  const row = alerts.locator('[role="button"]').first();
  if (await row.count()) {
    const measure = () => alerts.evaluate((element) => {
      const svg = element.querySelector('.MuiCardContent-root svg');
      const text = svg?.nextElementSibling;
      const icon = svg?.getBoundingClientRect();
      const label = text?.getBoundingClientRect();
      return { iconWidth: icon?.width, iconHeight: icon?.height, iconX: icon?.x, textX: label?.x, textY: label?.y };
    });
    const before = await measure();
    await alerts.screenshot({ path: `${out}/alerts-list.png` });
    await row.click();
    await alerts.getByText('Details', { exact: true }).waitFor();
    const after = await measure();
    await alerts.screenshot({ path: `${out}/alerts-open.png` });
    check(before.iconWidth === 22 && after.iconWidth === 22, 'Alert icon changed size', { before, after });
    check(Math.abs(before.textX - after.textX) < .5 && Math.abs(before.textY - after.textY) < .5, 'Alert text moved when opened', { before, after });
  } else console.log('No active alert on this account; alert geometry skipped.');
  await context.close();
}

// 2. Range dialogs: a days slider replaces the number field (30-day and 7-day variants).
{
  const { context, page, writes } = await open(1440, 1000);
  await page.goto(`${base}/detail`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  for (const [title, max] of [['Thermostat Detail', 30], ['Sensor Detail', 7]]) {
    const target = card(page, title);
    await target.scrollIntoViewIfNeeded();
    await target.getByRole('button', { name: 'Chart menu' }).click();
    await page.getByRole('menuitem', { name: 'Custom' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Dynamic' }).click();
    const slider = dialog.getByRole('slider');
    await slider.waitFor();
    check(await dialog.locator('input[type="number"]').count() === 0, `${title} still has a number field`, {});
    check(await slider.getAttribute('aria-valuemax') === String(max), `${title} slider max`, await slider.getAttribute('aria-valuemax'));
    await slider.focus();
    await page.keyboard.press('Home');
    for (let step = 1; step < 5; step++) await page.keyboard.press('ArrowRight');
    const label = await dialog.locator('[data-chart-range-days]').innerText();
    check(label === 'Past 5 days', `${title} slider label`, label);
    await dialog.screenshot({ path: `${out}/range-slider-${max}.png` });
    await dialog.getByRole('button', { name: 'Save' }).click();
    await target.getByText('Past 5 days').waitFor({ timeout: 90_000 });
  }
  check(writes.some((write) => write.key === 'runtime_thermostat_detail_range_dynamic' && write.value === 5), 'Thermostat 5-day range not saved', writes);
  await context.close();
}

// 3. Changing range keeps the chart under an overlay while new data loads.
{
  let delay = false;
  const { context, page } = await open(1440, 1000, { delayRuntime: (calls) => delay && calls.some((call) => call.resource === 'runtime_thermostat' && call.method === 'read') });
  await page.goto(`${base}/detail`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const target = card(page, 'Thermostat Detail');
  await target.locator('.highcharts-container').nth(1).waitFor({ timeout: 90_000 });
  delay = true;
  await target.getByRole('button', { name: 'Chart menu' }).click();
  const current = await target.locator('.MuiCardHeader-subheader').innerText();
  await page.getByRole('menuitem', { name: current.includes('Past 1 day') ? 'Past 3 Days' : 'Past 1 Day' }).click();
  const overlay = target.locator('[data-refresh-overlay="active"]');
  await overlay.waitFor({ timeout: 3000 });
  await page.waitForTimeout(700);
  check(await target.locator('.highcharts-container').count() >= 2, 'Charts disappeared during range change', {});
  await target.screenshot({ path: `${out}/detail-range-overlay.png` });
  await target.locator('[data-refresh-overlay="idle"]').waitFor({ timeout: 90_000 });
  await context.close();
}

// 4. Compare metrics: one dot per metric, centred on the user's marker line.
{
  const { context, page } = await open(1440, 1000);
  await page.goto(`${base}/compare`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  // Compare renders desktop and phone metric layouts and hides one, so only measure drawn dots.
  await page.waitForFunction(() => [...document.querySelectorAll('[data-metric-point]')].some((dot) => dot.getBoundingClientRect().width > 0), undefined, { timeout: 90_000 });
  const geometry = await page.evaluate(() => [...document.querySelectorAll('[data-metric-point]')].filter((dot) => dot.getBoundingClientRect().width > 0).map((dot) => {
    const line = dot.parentElement.querySelector('[data-metric-marker]').getBoundingClientRect();
    const point = dot.getBoundingClientRect();
    return { dx: Math.abs(point.x + point.width / 2 - (line.x + line.width / 2)), dy: Math.abs(point.y + point.height / 2 - line.y), round: Math.abs(point.width - point.height) };
  }));
  check(geometry.length > 0 && geometry.every((item) => item.dx < 1.5 && item.dy < 1.5 && item.round < .5), 'Metric dot is off its marker', geometry);
  await card(page, 'Metrics').screenshot({ path: `${out}/compare-metrics.png` });
  await context.close();
}

// 5. Air Quality: motion lanes share the plot edge, carry the hover guide, and appear in the readout.
{
  const { context, page } = await open(1440, 1000);
  await page.goto(`${base}/air-quality`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const target = card(page, 'Air Quality Detail');
  await target.locator('.highcharts-container').nth(3).waitFor({ timeout: 90_000 });
  const plotLefts = await target.evaluate((element) => [...element.querySelectorAll('.highcharts-plot-background, .highcharts-plot-border')].slice(0, 4).map((plot) => Math.round(plot.getBoundingClientRect().x)));
  check(new Set(plotLefts).size === 1, 'Air Quality plots start at different x positions', plotLefts);
  const lanes = target.locator('.highcharts-container').first();
  const box = await lanes.boundingBox();
  let readout;
  for (const fraction of [.3, .45, .6, .75, .9]) {
    for (const nudge of [0, 2]) await page.mouse.move(box.x + box.width * fraction + nudge, box.y + box.height / 2);
    await page.waitForTimeout(150);
    readout = await page.evaluate(() => [...document.querySelectorAll('.highcharts-tooltip-container')].map((item) => item.innerText).find((text) => text.includes('Air Quality')) ?? '');
    if (readout.includes('Motion')) break;
  }
  const guides = await target.evaluate((element) => [...element.querySelectorAll('.beestat-synchronized-crosshair')].filter((path) => path.getAttribute('visibility') !== 'hidden').length);
  check(guides === 4, 'Hover guide not on all four Air Quality charts', guides);
  check(readout.includes('Air Quality') && readout.includes('TVOC'), 'Hovering motion lanes did not show the readout', readout);
  if (!readout.includes('Motion')) console.log('No motion found at the sampled positions; readout:', readout);
  await page.screenshot({ path: `${out}/air-quality-hover.png`, clip: { x: 0, y: Math.max(0, box.y - 80), width: 1440, height: 520 } });
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('cleanup-round-3: all checks passed');
