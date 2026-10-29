import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 320, height: 800 },
});
const routes = [
  ['detail', 'System - Ziebee II'],
  ['analyze', 'Thermostat Summary'],
  ['compare', 'Comparison Settings'],
  ['air-quality', 'Air Quality Detail'],
  ['settings', 'Manage Thermostats'],
  ['download', 'Download Data'],
  ['contribute', 'Contribute'],
  ['glenwood-enrollment', 'Enrollment'],
  ['glenwood-report', 'Run Report'],
  ['visualize', 'Floor Plan'],
];
const results = [];

for (const [route, expected] of routes) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(300);
  const geometry = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    navigation: [...document.querySelectorAll('header nav a')].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }).length,
  }));
  if (geometry.scrollWidth > geometry.innerWidth || geometry.navigation !== 5 || errors.length) throw new Error(`${route} mobile regression: ${JSON.stringify({ geometry, errors })}`);
  results.push({ route, ...geometry });
  await page.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
