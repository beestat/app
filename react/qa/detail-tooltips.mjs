import { chromium } from 'playwright';

// Hovers the Thermostat Detail chart at the same horizontal positions in legacy
// and React and prints the tooltip text, to compare equipment durations.
const fractions = (process.argv[2] ?? '.15,.3,.45,.6,.75,.9').split(',').map(Number);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });

for (const [name, url] of [['legacy', 'https://dev.app.beestat.io/'], ['react', 'https://dev.app.beestat.io/react/index.php#/detail']]) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Thermostat Detail', { exact: true }).first().waitFor({ timeout: 90_000 });
  // Find the temperature chart: the tallest Highcharts container inside the Thermostat Detail card.
  await page.waitForFunction(() => [...document.querySelectorAll('.highcharts-container')].some((node) => node.getBoundingClientRect().height > 250), null, { timeout: 120_000 });
  await page.waitForTimeout(2_000);
  const box = await page.evaluate(() => {
    const charts = [...document.querySelectorAll('.highcharts-container')].map((node) => node.getBoundingClientRect()).filter((rect) => rect.height > 250).sort((a, b) => a.y - b.y);
    const plot = charts[0];
    return plot && { x: plot.x, y: plot.y + window.scrollY, width: plot.width, height: plot.height };
  });
  await page.evaluate((top) => window.scrollTo(0, top - 100), box.y);
  const offset = await page.evaluate(() => window.scrollY);
  const samples = [];
  for (const fraction of fractions) {
    await page.mouse.move(box.x + 50 + (box.width - 60) * fraction, box.y - offset + box.height / 2);
    await page.waitForTimeout(250);
    samples.push(await page.evaluate(() => {
      const tooltip = [...document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container, [data-chart-tooltip]')].find((node) => getComputedStyle(node).visibility !== 'hidden' && node.textContent?.trim());
      return tooltip?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
    }));
  }
  console.log(JSON.stringify({ name, samples }, null, 2));
  await page.close();
}
await browser.close();
