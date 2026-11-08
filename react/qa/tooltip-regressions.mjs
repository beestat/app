import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Sensor Detail', { exact: true }).waitFor({ timeout: 90_000 });
const sensorCard = page.getByText('Sensor Detail', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiCard-root")]');
// The card body is lazy-mounted. Bring the card into view before waiting for
// a descendant that cannot exist until the intersection observer fires.
await sensorCard.scrollIntoViewIfNeeded();
const occupancy = sensorCard.locator('.highcharts-container').nth(1);
try {
  await occupancy.waitFor({ state: 'visible', timeout: 90_000 });
} catch {
  throw new Error(`Sensor Detail occupancy chart did not render: ${JSON.stringify({ chartCount: await sensorCard.locator('.highcharts-container').count(), text: (await sensorCard.innerText()).slice(0, 500) })}`);
}
await occupancy.scrollIntoViewIfNeeded();
const occupancyBox = await occupancy.boundingBox();
if (!occupancyBox) throw new Error('Occupancy rail was not rendered.');
await page.mouse.move(occupancyBox.x + occupancyBox.width * .6, occupancyBox.y + occupancyBox.height * .5);
await page.waitForTimeout(200);
const occupancyTooltip = await page.evaluate(() => {
  const tooltip = [...document.querySelectorAll('.highcharts-tooltip-container')].find((item) => getComputedStyle(item).visibility !== 'hidden');
  const rect = tooltip?.getBoundingClientRect();
  return { found: Boolean(tooltip), parent: tooltip?.parentElement?.tagName, top: rect?.top, bottom: rect?.bottom, viewportHeight: innerHeight };
});
if (!occupancyTooltip.found || occupancyTooltip.parent !== 'BODY' || occupancyTooltip.top < 0 || occupancyTooltip.bottom > occupancyTooltip.viewportHeight) throw new Error(`Occupancy tooltip is clipped: ${JSON.stringify(occupancyTooltip)}`);

// Analyze's phone tooltips are intentionally docked below the chart like
// legacy. Use desktop here to inspect the floating Profile tooltip font.
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Temperature Profiles', { exact: true }).waitFor({ timeout: 90_000 });
const summaryCard = page.getByText('Thermostat Summary', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiCard-root")]');
const summaryChart = summaryCard.locator('.highcharts-container').first();
await summaryChart.scrollIntoViewIfNeeded();
const summaryBox = await summaryChart.boundingBox();
if (!summaryBox) throw new Error('Summary chart was not rendered.');
await page.mouse.move(summaryBox.x + summaryBox.width * .6, summaryBox.y + summaryBox.height * .45);
await page.waitForTimeout(200);
const summaryCrosshair = await summaryCard.evaluate((card) => {
  const crosshair = card.querySelector('.highcharts-crosshair-category, .highcharts-crosshair');
  const style = crosshair ? getComputedStyle(crosshair) : undefined;
  return { found: Boolean(crosshair), visibility: style?.visibility, opacity: style?.opacity };
});
if (!summaryCrosshair.found || summaryCrosshair.visibility === 'hidden' || summaryCrosshair.opacity === '0') throw new Error(`Summary hover crosshair is missing: ${JSON.stringify(summaryCrosshair)}`);
const profileCard = page.getByText('Temperature Profiles', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiCard-root")]');
const profileChart = profileCard.locator('.highcharts-container').first();
await profileChart.scrollIntoViewIfNeeded();
const profileBox = await profileChart.boundingBox();
if (!profileBox) throw new Error('Profile chart was not rendered.');
for (const fraction of [.25, .4, .55, .7]) {
  await page.mouse.move(profileBox.x + profileBox.width * fraction, profileBox.y + profileBox.height * .45);
  await page.waitForTimeout(100);
}
const profileTooltipFont = await profileCard.evaluate((card) => {
  const tooltip = card.querySelector('.highcharts-tooltip');
  const html = tooltip?.querySelector('div');
  return html || tooltip ? Number.parseFloat(getComputedStyle(html ?? tooltip).fontSize) : null;
});
if (profileTooltipFont == null) throw new Error('Profile tooltip did not appear.');
if (profileTooltipFont < 13) throw new Error(`Profile tooltip font is too small: ${profileTooltipFont}px`);
const profileCrosshair = await profileCard.evaluate((card) => {
  const crosshair = card.querySelector('.highcharts-crosshair');
  const style = crosshair ? getComputedStyle(crosshair) : undefined;
  return { found: Boolean(crosshair), visibility: style?.visibility, opacity: style?.opacity };
});
if (!profileCrosshair.found || profileCrosshair.visibility === 'hidden' || profileCrosshair.opacity === '0') throw new Error(`Profile hover crosshair is missing: ${JSON.stringify(profileCrosshair)}`);

await page.goto('https://dev.app.beestat.io/react/index.php#/air-quality', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const airCard = page.getByText('Air Quality Detail', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiCard-root")]');
await airCard.scrollIntoViewIfNeeded();
await airCard.locator('.highcharts-container').nth(1).waitFor({ state: 'visible', timeout: 90_000 });
const synchronizedSource = airCard.locator('.highcharts-container').nth(2);
const synchronizedBox = await synchronizedSource.boundingBox();
if (!synchronizedBox) throw new Error('Air Quality synchronization source was not rendered.');
await page.mouse.move(synchronizedBox.x + synchronizedBox.width * .55, synchronizedBox.y + synchronizedBox.height * .5);
await page.waitForTimeout(200);
await page.screenshot({ path: 'test-results/air-quality-hover.png', fullPage: false });
const synchronizedTooltips = await airCard.locator('[data-docked-tooltip]').allTextContents();
const synchronizedFloatingTooltips = await Promise.all([1, 2, 3].map((index) => airCard.locator('.highcharts-container').nth(index).evaluate((container) => {
  const tooltip = container.querySelector('.highcharts-tooltip');
  const style = tooltip ? getComputedStyle(tooltip) : undefined;
  return { found: Boolean(tooltip), visibility: style?.visibility, opacity: style?.opacity, text: tooltip?.textContent?.trim() };
})));
const synchronizedReadouts = await page.evaluate(() => [...document.querySelectorAll('.highcharts-tooltip-container')]
  .map((tooltip) => {
    const style = getComputedStyle(tooltip);
    return { visibility: style.visibility, opacity: style.opacity, text: tooltip.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }));
const synchronizedReadout = synchronizedReadouts.find(({ visibility, opacity, text }) => visibility !== 'hidden' && opacity !== '0' && text.includes('Air Quality') && text.includes('TVOC') && text.includes('CO₂'))?.text;
if (!synchronizedReadout) throw new Error(`Air Quality hover did not show all three synchronized values: ${JSON.stringify(synchronizedReadouts)}`);
const airCrosshairs = [];
for (const index of [1, 2, 3]) {
  const chart = airCard.locator('.highcharts-container').nth(index);
  const box = await chart.boundingBox();
  if (!box) throw new Error(`Air Quality chart ${index} was not rendered.`);
  await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5);
  await page.waitForTimeout(120);
  airCrosshairs.push(await chart.evaluate((container) => {
    const crosshair = container.querySelector('.highcharts-crosshair');
    const style = crosshair ? getComputedStyle(crosshair) : undefined;
    return { found: Boolean(crosshair), visibility: style?.visibility, opacity: style?.opacity };
  }));
}
if (airCrosshairs.some((crosshair) => !crosshair.found || crosshair.visibility === 'hidden' || crosshair.opacity === '0')) throw new Error(`Air Quality hover crosshair is missing: ${JSON.stringify(airCrosshairs)}`);

console.log(JSON.stringify({ occupancyTooltip, summaryCrosshair, profileTooltipFont, profileCrosshair, synchronizedTooltips, synchronizedFloatingTooltips, synchronizedReadout, airCrosshairs }, null, 2));
await browser.close();
