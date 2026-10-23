import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('certificate')) errors.push(message.text()); });

const routes = [
  ['detail', 'detail'], ['analyze', 'analyze'], ['compare', 'compare'], ['air_quality', 'air-quality'], ['settings', 'settings'],
];
for (const [legacy, react] of routes) {
  await page.goto(`https://dev.app.beestat.io/?layer=${legacy}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `test-results/parity/legacy-${legacy}.png`, fullPage: true });
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${react}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `test-results/parity/react-${react}.png`, fullPage: true });
}

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
for (const [legacy, react] of routes) {
  await mobile.goto(`https://dev.app.beestat.io/?layer=${legacy}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await mobile.screenshot({ path: `test-results/parity/legacy-${legacy}-mobile.png`, fullPage: true });
  await mobile.goto(`https://dev.app.beestat.io/react/index.php#/${react}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await mobile.screenshot({ path: `test-results/parity/react-${react}-mobile.png`, fullPage: true });
}
console.log(JSON.stringify({ authenticatedThermostat: await mobile.getByText(/Ziebee II/).first().textContent(), errors }, null, 2));
await browser.close();
