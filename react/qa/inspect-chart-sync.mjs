import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Sensor Detail', { exact: true }).scrollIntoViewIfNeeded();
await page.locator('.MuiCard-root').filter({ has: page.getByText('Sensor Detail', { exact: true }) }).locator('.highcharts-container').last().waitFor({ timeout: 90_000 });

async function inspectCard(title) {
  const card = page.locator('.MuiCard-root').filter({ has: page.getByText(title, { exact: true }) });
  const charts = card.locator('.highcharts-container');
  const count = await charts.count();
  const target = charts.last();
  const point = await target.locator('.highcharts-series:not(.highcharts-series-inactive) .highcharts-graph').first().evaluate((path) => {
    const svgPath = path;
    const position = svgPath.getPointAtLength(svgPath.getTotalLength() * .55);
    const screen = new DOMPoint(position.x, position.y).matrixTransform(svgPath.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(250);
  const result = await card.evaluate((node) => ({
    charts: node.querySelectorAll('.highcharts-container').length,
    trackers: node.querySelectorAll('.highcharts-tracker').length,
    crosshairs: [...node.querySelectorAll('.highcharts-crosshair')].filter((item) => getComputedStyle(item).visibility !== 'hidden').length,
    tooltipCount: document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container').length,
    tooltip: [...document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container')].map((item) => item.textContent?.trim()).filter(Boolean).join(' | '),
  }));
  await page.screenshot({ path: `test-results/parity/react-${title.toLowerCase().replaceAll(' ', '-')}-sync.png`, fullPage: false });
  return { expectedCharts: count, ...result };
}

const thermostat = await inspectCard('Thermostat Detail');
const sensors = await inspectCard('Sensor Detail');
if (thermostat.crosshairs < 2 || !thermostat.tooltip.includes('System Mode')) throw new Error(`Thermostat synchronization regression: ${JSON.stringify(thermostat)}`);
if (sensors.crosshairs < 3 || !sensors.tooltip.includes('Ziebee II')) throw new Error(`Sensor synchronization regression: ${JSON.stringify(sensors)}`);
console.log(JSON.stringify({ thermostat, sensors, errors }, null, 2));
await browser.close();
