import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

async function resetItem(menuButton) {
  await menuButton.click();
  const item = page.getByRole('menuitem', { name: 'Reset Zoom' });
  await item.waitFor();
  return item;
}

async function dragZoom(card) {
  const chart = card.locator('.highcharts-container').last();
  const plot = chart.locator('.highcharts-plot-background');
  const box = await plot.boundingBox();
  if (!box) throw new Error('Chart plot was not measurable.');
  const y = box.y + box.height * .5;
  await page.mouse.move(box.x + box.width * .25, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .65, y, { steps: 12 });
  await page.mouse.up();
}

await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const detailCard = page.locator('.MuiCard-root').filter({ has: page.getByText('Thermostat Detail', { exact: true }) }).first();
await detailCard.getByText('Past 7 days', { exact: true }).waitFor({ timeout: 30_000 });
const detailMenu = detailCard.getByRole('button', { name: 'Chart menu' });
let item = await resetItem(detailMenu);
if (await item.getAttribute('aria-disabled') !== 'true') throw new Error('Detail Reset Zoom is enabled before zooming.');
await page.keyboard.press('Escape');
await dragZoom(detailCard);
item = await resetItem(detailMenu);
if (await item.getAttribute('aria-disabled') === 'true') throw new Error('Detail Reset Zoom did not enable after zooming.');
await item.click();
item = await resetItem(detailMenu);
if (await item.getAttribute('aria-disabled') !== 'true') throw new Error('Detail Reset Zoom did not disable after resetting.');
await page.keyboard.press('Escape');

await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
const summaryCard = page.locator('.MuiCard-root').filter({ has: page.getByText('Thermostat Summary', { exact: true }) }).first();
await summaryCard.locator('.highcharts-container').waitFor({ timeout: 30_000 });
const summaryMenu = summaryCard.getByRole('button', { name: 'Thermostat summary menu' });
item = await resetItem(summaryMenu);
if (await item.getAttribute('aria-disabled') !== 'true') throw new Error('Analyze Reset Zoom is enabled before zooming.');
await page.keyboard.press('Escape');

console.log(JSON.stringify({ detail: 'disabled → enabled → disabled', analyze: 'disabled before zoom' }, null, 2));
await browser.close();
