import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('certificate')) errors.push(message.text()); });

async function revealLazyContent(target) {
  await target.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(300, innerHeight * .7)) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    scrollTo(0, 0);
  });
  await target.waitForLoadState('networkidle');
  await target.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
  await target.waitForTimeout(1_500);
}

const allRoutes = [
  ['detail', 'detail'], ['analyze', 'analyze'], ['compare', 'compare'], ['air_quality', 'air-quality'], ['settings', 'settings'], ['contribute', 'contribute'],
];
const requested = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const routes = requested.length ? allRoutes.filter(([legacy, react]) => requested.includes(legacy) || requested.includes(react)) : allRoutes;
for (const [legacy, react] of routes) {
  await page.goto(`https://dev.app.beestat.io/?layer=${legacy}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `test-results/parity/legacy-${legacy}.png`, fullPage: true });
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${react}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await revealLazyContent(page);
  await page.screenshot({ path: `test-results/parity/react-${react}.png`, fullPage: true });
}

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
let authenticatedThermostat = '';
for (const [legacy, react] of process.argv.includes('--desktop-only') ? [] : routes) {
  await mobile.goto(`https://dev.app.beestat.io/?layer=${legacy}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await mobile.screenshot({ path: `test-results/parity/legacy-${legacy}-mobile.png`, fullPage: true });
  await mobile.goto(`https://dev.app.beestat.io/react/index.php#/${react}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await revealLazyContent(mobile);
  if (react === 'detail') authenticatedThermostat = await mobile.getByText(/System - Ziebee II/).first().textContent() ?? '';
  await mobile.screenshot({ path: `test-results/parity/react-${react}-mobile.png`, fullPage: true });
}
console.log(JSON.stringify({ authenticatedThermostat, errors }, null, 2));
await browser.close();
