import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
for (const width of [390, 1440]) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width, height: 1000 } });
  const page = await context.newPage();
  for (const [name, url] of [['legacy', 'https://dev.app.beestat.io/?layer=analyze'], ['react', 'https://dev.app.beestat.io/react/index.php#/analyze']]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText('Thermostat Summary', { exact: true }).first().waitFor({ timeout: 90_000 });
    await page.locator('.highcharts-series').first().waitFor({ timeout: 90_000 });
    await page.waitForTimeout(500);
    const layout = await page.evaluate((pageName) => {
      const bounds = (node) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), bottom: Math.round(rect.bottom) };
      };
      const leaf = (text) => [...document.querySelectorAll('*')].find((node) => node.children.length === 0 && node.textContent?.trim() === text);
      const card = (text) => {
        const title = leaf(text);
        if (pageName === 'react') return title?.closest('.MuiCard-root');
        let node = title;
        while (node && node.parentElement && node.getBoundingClientRect().width < innerWidth - 40) node = node.parentElement;
        return node;
      };
      return {
        cards: ['Thermostat Summary', 'Temperature Profiles'].map((title) => ({ title, ...bounds(card(title)) })),
        charts: [...document.querySelectorAll('.highcharts-container')].map(bounds),
        summaryYAxis: [...document.querySelectorAll('.highcharts-container')][0]
          ? [...document.querySelectorAll('.highcharts-container')[0].querySelectorAll('.highcharts-yaxis-labels text')].map((node) => ({ text: node.textContent, ...bounds(node), fontSize: getComputedStyle(node).fontSize }))
          : [],
        slider: bounds(document.querySelector(pageName === 'react' ? '.MuiSlider-root' : 'input[type="range"]')),
      };
    }, name);
    console.log(JSON.stringify({ width, name, ...layout }));
  }
  await context.close();
}
await browser.close();
