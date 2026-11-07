import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
const results = [];

for (const width of [1440, 390, 320]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Sensors', { exact: true }).waitFor({ timeout: 90_000 });
  const rows = await page.locator('[data-sensor-status]').evaluateAll((groups) => groups.flatMap((group) => {
    const icons = [...group.querySelectorAll('svg')];
    if (icons.length < 2) return [];
    const first = icons[0].getBoundingClientRect();
    const second = icons[1].getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    return [{ gap: second.left - first.right, inside: first.left >= groupRect.left && second.right <= groupRect.right }];
  }));
  results.push({ width, rows });
}

if (results.some(({ rows }) => !rows.length || rows.some((row) => row.gap < 5.5 || !row.inside))) throw new Error(`Sensor status spacing regression: ${JSON.stringify(results)}`);
console.log(JSON.stringify(results, null, 2));
await browser.close();
