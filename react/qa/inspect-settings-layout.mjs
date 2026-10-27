import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
for (const width of [390, 1440]) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: 'test-results/auth-state.json',
    viewport: { width, height: 1000 },
  });
  const page = await context.newPage();
  for (const [name, url] of [
    ['legacy', 'https://dev.app.beestat.io/?layer=settings'],
    ['react', 'https://dev.app.beestat.io/react/index.php#/settings'],
  ]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText('Manage Thermostats', { exact: true }).first().waitFor({ timeout: 90_000 });
    await page.waitForTimeout(500);
    const layout = await page.evaluate((pageName) => {
      const rect = (node) => {
        if (!node) return null;
        const bounds = node.getBoundingClientRect();
        return { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height), bottom: Math.round(bounds.bottom) };
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
        cards: ['Settings', 'Manage Thermostats', 'Manage API Key'].map((title) => ({ title, ...rect(card(title)) })),
        serial: rect(document.querySelector(pageName === 'react' ? 'input[aria-label="Serial #"]' : 'input[maxlength="12"]')),
        add: rect(leaf('Add Thermostat')?.closest(pageName === 'react' ? 'button' : '.button')),
        manage: rect(leaf('Manage')),
        footer: rect(leaf('Help')),
      };
    }, name);
    console.log(JSON.stringify({ width, name, ...layout }));
  }
  await context.close();
}
await browser.close();
