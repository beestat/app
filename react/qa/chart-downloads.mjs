// Downloads every "Download Chart" export and checks it is a PNG that contains all of the
// card's visible charts. Read-only: setting writes are answered locally.
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const out = 'test-results/chart-downloads';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const targets = [
  { route: 'detail', card: 'Thermostat Detail', menu: 'Chart menu', charts: 2 },
  { route: 'detail', card: 'Sensor Detail', menu: 'Chart menu', charts: 3 },
  { route: 'analyze', card: 'Thermostat Summary', menu: 'Thermostat summary menu', charts: 1 },
  { route: 'analyze', card: 'Temperature Profiles', menu: 'Temperature profiles menu', charts: 1 },
];

for (const width of [1440, 390]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, acceptDownloads: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
  await context.route('**/api/', async (route) => {
    const body = route.request().postData() ?? '';
    if (body.includes('update_setting')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`${width} page error: ${error.message}`));
  let currentRoute;
  for (const target of targets) {
    if (currentRoute !== target.route) {
      await page.goto(`https://dev.app.beestat.io/react/index.php#/${target.route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      currentRoute = target.route;
    }
    const card = page.getByText(target.card, { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"MuiCard-root")][1]');
    // Detail cards mount lazily: the placeholder card is replaced as it scrolls into view.
    for (let attempt = 0; ; attempt++) {
      try {
        await card.scrollIntoViewIfNeeded({ timeout: 10_000 });
        await card.locator('.highcharts-container').nth(target.charts - 1).waitFor({ timeout: 30_000 });
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await page.mouse.wheel(0, 400);
      }
    }
    await page.waitForTimeout(500);
    const onScreen = await card.evaluate((element) => [...element.querySelectorAll('.highcharts-container')].filter((chart) => chart.getClientRects().length).map((chart) => Math.round(chart.getBoundingClientRect().height)));
    const menu = card.getByRole('button', { name: target.menu });
    const fallback = card.locator('.MuiCardHeader-action button').first();
    await ((await menu.count()) ? menu : fallback).click();
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('menuitem', { name: 'Download Chart' }).click();
    const download = await downloadPromise;
    const file = `${out}/${width}-${target.card.replaceAll(' ', '-')}.png`;
    await download.saveAs(file);
    const size = pngSize(await readFile(file));
    const chartHeight = onScreen.reduce((sum, height) => sum + height, 0);
    const name = download.suggestedFilename();
    if (!size) failures.push(`${width} ${target.card}: not a PNG (${name})`);
    else if (!name.endsWith('.png') || !name.startsWith(target.card)) failures.push(`${width} ${target.card}: filename ${name}`);
    // Exported at 2x: the image must be tall enough to hold every on-screen chart plus the title.
    // Phones export at legacy's 980px source width rather than the narrow screen width.
    else if (onScreen.length !== target.charts || size.height / 2 < chartHeight + 40 || size.width / 2 < 980) failures.push(`${width} ${target.card}: ${JSON.stringify({ onScreen, size })}`);
    const widths = () => card.evaluate((element) => [...element.querySelectorAll('.highcharts-container svg')].map((svg) => Math.round(svg.getBoundingClientRect().width)));
    const restored = await widths();
    const cardWidth = await card.evaluate((element) => Math.round(element.getBoundingClientRect().width));
    if (restored.some((chartWidth) => chartWidth > cardWidth)) failures.push(`${width} ${target.card}: on-screen chart not restored ${JSON.stringify({ restored, cardWidth })}`);
    console.log(width, target.card, name, size, 'charts', onScreen, 'restored', restored);
  }
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('chart-downloads: all exports are PNGs with every visible chart');
