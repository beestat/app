import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
for (const [name, url] of [['legacy', 'https://dev.app.beestat.io/?layer=analyze'], ['react', 'https://dev.app.beestat.io/react/index.php#/analyze']]) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Thermostat Summary', { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.locator('.highcharts-series').first().waitFor({ timeout: 90_000 });
  const chart = page.locator('.highcharts-container').first();
  const box = await chart.boundingBox();
  const samples = [];
  for (const fraction of [.2, .5, .8]) {
    await page.mouse.move(box.x + box.width * fraction, box.y + 150);
    await page.waitForTimeout(100);
    samples.push(await page.evaluate(() => {
      const tooltip = [...document.querySelectorAll('.highcharts-tooltip, .highcharts-tooltip-container')].find((node) => getComputedStyle(node).visibility !== 'hidden' && node.textContent?.trim());
      const rect = tooltip?.getBoundingClientRect();
      const markers = [...document.querySelectorAll('.highcharts-markers path, .highcharts-markers image')].filter((node) => {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && bounds.width > 0 && bounds.height > 0;
      });
      return { text: tooltip?.textContent?.replace(/\s+/g, ' ').trim(), y: rect && Math.round(rect.y), markers: markers.length };
    }));
  }
  console.log(JSON.stringify({ name, samples }));
  await page.close();
}
await context.close();
await browser.close();
