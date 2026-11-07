import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const results = [];

for (const route of ['detail', 'analyze', 'visualize', 'compare', 'air-quality', 'settings', 'contribute', 'download']) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('main, .MuiContainer-root').first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(500);
  results.push(...await page.locator('.MuiButton-root, .MuiToggleButton-root, .MuiIconButton-root').evaluateAll((buttons, currentRoute) => buttons.flatMap((button) => {
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    return [{ route: currentRoute, label: (button.textContent ?? '').replace(/\s+/g, ' ').trim(), height: Math.round(rect.height * 10) / 10, classes: [...button.classList].filter((name) => /Size|size/.test(name)) }];
  }), route));
}

const medium = results.filter((button) => button.classes.some((name) => name.includes('SizeMedium') || name.includes('sizeMedium')));
const mediumHeights = [...new Set(medium.map((button) => button.height))].sort((a, b) => a - b);
if (mediumHeights.some((height) => height !== 32)) throw new Error(`Medium buttons are inconsistent: ${JSON.stringify(medium.filter((button) => button.height !== 32), null, 2)}`);
const smallIcons = results.filter((button) => button.classes.includes('MuiIconButton-sizeSmall'));
const smallIconHeights = [...new Set(smallIcons.map((button) => button.height))].sort((a, b) => a - b);
if (smallIconHeights.some((height) => height !== 32)) throw new Error(`Small icon buttons are inconsistent: ${JSON.stringify(smallIcons.filter((button) => button.height !== 32), null, 2)}`);
console.log(JSON.stringify({ medium: { count: medium.length, heights: mediumHeights }, smallIcons: { count: smallIcons.length, heights: smallIconHeights }, intentionalLarge: results.filter((button) => button.classes.some((name) => name.includes('SizeLarge') || name.includes('sizeLarge'))) }, null, 2));
await browser.close();
