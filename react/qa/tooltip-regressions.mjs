import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Sensor Detail', { exact: true }).waitFor({ timeout: 90_000 });
const sensorCard = page.getByText('Sensor Detail', { exact: true }).locator('xpath=ancestor::*[contains(@class,"MuiCard-root")]');
const occupancy = sensorCard.locator('.highcharts-container').nth(1);
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

await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Temperature Profiles', { exact: true }).waitFor({ timeout: 90_000 });
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
  return Number.parseFloat(getComputedStyle(html ?? tooltip).fontSize);
});
if (profileTooltipFont < 13) throw new Error(`Profile tooltip font is too small: ${profileTooltipFont}px`);

console.log(JSON.stringify({ occupancyTooltip, profileTooltipFont }, null, 2));
await browser.close();
