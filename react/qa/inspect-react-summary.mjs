import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Summary', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
await page.waitForTimeout(1_000);
const result = await page.evaluate(() => {
  const chart = window.Highcharts?.charts?.find((item) => item?.series?.some((series) => series.name === 'Cool 1'));
  return {
    browserNow: new Date().toString(),
    subtitle: document.body.innerText.split('\n').find((text) => text.includes('grouped by')),
    chips: [...document.querySelectorAll('span')].map((node) => node.textContent).filter((text) => /Cool\d+h/.test(text ?? '')),
    xLabels: [...document.querySelectorAll('.highcharts-container')[0]?.querySelectorAll('.highcharts-xaxis-labels text') ?? []].map((node) => node.textContent),
    categories: chart?.xAxis[0].categories,
    series: chart?.series.map((series) => ({ name: series.name, points: series.points.length, total: series.yData?.reduce((sum, value) => sum + (Number(value) || 0), 0) })),
  };
});
const api = await page.evaluate(async () => {
  const serialize = (resource, method, alias, args = {}) => ({ resource, method, alias, arguments: JSON.stringify(args) });
  const response = await fetch(window.__BEESTAT_CONFIG__?.apiBase ?? '/api/', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: window.__BEESTAT_CONFIG__?.apiKey ?? '', batch: JSON.stringify([
      serialize('runtime_thermostat_summary', 'read_id', 'summary'),
      serialize('user', 'read_id', 'user'),
      serialize('thermostat', 'read_id', 'thermostat', { attributes: { inactive: 0 } }),
    ]) }),
  });
  return response.json();
});
const payload = api.data ?? {};
const thermostatId = Object.values(payload.thermostat ?? {})[0]?.thermostat_id;
const rows = Object.values(payload.summary ?? {}).filter((row) => row.thermostat_id === thermostatId);
const totalsFrom = (begin) => rows.filter((row) => row.date >= begin).reduce((totals, row) => ({
  cool1: totals.cool1 + Number(row.sum_compressor_cool_1 ?? 0),
  cool2: totals.cool2 + Number(row.sum_compressor_cool_2 ?? 0),
}), { cool1: 0, cool2: 0 });
const settings = payload.user?.settings ?? Object.values(payload.user ?? {})[0]?.settings;
await page.getByRole('button', { name: 'Thermostat summary menu' }).click();
const menuItems = await page.getByRole('menuitem').allTextContents();
await page.getByRole('menuitem', { name: 'Custom' }).click();
await page.waitForTimeout(350);
const customDialog = await page.getByRole('dialog', { name: 'Thermostat Summary - Custom Range' }).innerText();
await page.screenshot({ path: 'test-results/parity/react-analyze-custom.png', fullPage: true });
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(350);
const profileChart = page.locator('.highcharts-container').nth(1);
await profileChart.scrollIntoViewIfNeeded();
const profileBox = await profileChart.locator('.highcharts-plot-background').boundingBox();
const tracker = profileChart.locator('.highcharts-tracker-line').nth(1);
if (await tracker.count()) {
  const point = await tracker.evaluate((path) => {
    const svgPath = path;
    const local = svgPath.getPointAtLength(svgPath.getTotalLength() * .55);
    const screen = new DOMPoint(local.x, local.y).matrixTransform(svgPath.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y, { steps: 12 });
} else if (profileBox) await page.mouse.move(profileBox.x + profileBox.width * .55, profileBox.y + profileBox.height * .5);
await page.waitForTimeout(150);
const profileTooltip = await page.evaluate(() => [...document.querySelectorAll('[class*="tooltip"]')].map((node) => node.textContent ?? '').find((text) => text.includes('Outdoor Temp:')) ?? '');
await page.getByRole('button', { name: 'Temperature profiles menu' }).click();
const profileMenuItems = await page.getByRole('menuitem').allTextContents();
await page.getByRole('menuitem', { name: 'More Info' }).click();
await page.waitForTimeout(350);
const profileInfo = await page.getByRole('dialog', { name: 'Temperature Profiles Info' }).innerText();
await page.screenshot({ path: 'test-results/parity/react-analyze-profile-info.png', fullPage: true });
await page.getByRole('button', { name: 'Close' }).click();
console.log(JSON.stringify({
  ...result,
  thermostatId,
  settings: {
    count: settings.runtime_thermostat_summary_time_count,
    period: settings.runtime_thermostat_summary_time_period,
    group: settings.runtime_thermostat_summary_group_by,
    gapFill: settings.runtime_thermostat_summary_gap_fill,
    smartScale: settings.runtime_thermostat_summary_smart_scale,
  },
  expectedTotalsFromJuly23: totalsFrom('2026-07-23'),
  menuItems,
  customDialog,
  profileTooltip,
  profileMenuItems,
  profileInfo,
  errors,
}, null, 2));
await browser.close();
