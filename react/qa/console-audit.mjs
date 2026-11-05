import { chromium } from 'playwright';

// Visits every React route at desktop and phone widths and collects console
// warnings/errors, page errors and failed requests.
const routes = [
  ['detail', 'Thermostat Detail'],
  ['analyze', 'Temperature Profiles'],
  ['visualize', 'Visualize Settings'],
  ['compare', 'Metrics'],
  ['air-quality', 'Air Quality Summary'],
  ['settings', 'Manage API Key'],
  ['contribute', 'Benefits'],
];
const browser = await chromium.launch({ headless: true });
const results = [];
for (const width of [1440, 390]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 900 } });
  for (const [route, ready] of routes) {
    const page = await context.newPage();
    const messages = [];
    page.on('console', (message) => { if (['warning', 'error'].includes(message.type()) && !message.text().includes('certificate')) messages.push(`${message.type()}: ${message.text().slice(0, 200)}`); });
    page.on('pageerror', (error) => messages.push(`pageerror: ${error.message.slice(0, 200)}`));
    page.on('response', (response) => { if (response.status() >= 400) messages.push(`http ${response.status()}: ${response.url()}`); });
    await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText(ready, { exact: false }).first().waitFor({ timeout: 90_000 }).catch(() => messages.push(`missing: ${ready}`));
    // Snapshot and cap the height. Reading scrollHeight in the loop can chase
    // lazy content forever when a route grows as each section mounts.
    const scrollHeight = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), 30_000);
    for (let y = 0; y < scrollHeight; y += 600) {
      await page.evaluate((top) => scrollTo(0, top), y);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(2_500);
    results.push({ width, route, messages: [...new Set(messages)] });
    process.stderr.write(`checked ${route} at ${width}px\n`);
    await page.close();
  }
  await context.close();
}
console.log(JSON.stringify(results.filter((result) => result.messages.length), null, 2) || '[]');
console.log(`checked ${results.length} route/width combinations`);
await browser.close();
