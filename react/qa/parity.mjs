import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
const errors = [];
const failedResponses = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('certificate')) {
    const location = message.location();
    errors.push(`${message.text()}${location.url ? ` (${location.url}:${location.lineNumber})` : ''}`);
  }
});
page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
page.on('requestfailed', (request) => failedResponses.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`));

async function revealLazyContent(target) {
  await target.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(300, innerHeight * .7)) {
      scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    scrollTo(0, 0);
  });
  await target.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
  await target.waitForTimeout(1_500);
}

async function gotoReady(target, url) {
  await target.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await target.locator('body').waitFor({ state: 'visible', timeout: 30_000 });
  await target.waitForTimeout(1_500);
}

async function waitForRoute(target, expected) {
  try {
    await target.getByText(expected, { exact: typeof expected === 'string' }).first().waitFor({ timeout: 90_000 });
  } catch (error) {
    // The dev host occasionally drops a script response. A clean reload makes
    // the visual sweep deterministic without hiding persistent route failures.
    await target.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await target.getByText(expected, { exact: typeof expected === 'string' }).first().waitFor({ timeout: 90_000 });
  }
  await target.getByText('Fetching', { exact: true }).first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
  await target.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
}

const allRoutes = [
  ['detail', 'detail', /System - Ziebee II/],
  ['analyze', 'analyze', 'Thermostat Summary'],
  ['compare', 'compare', 'Comparison Settings'],
  ['air_quality', 'air-quality', 'Air Quality Detail'],
  ['settings', 'settings', 'Settings'],
  ['contribute', 'contribute', 'Contribute'],
];
const requested = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const routes = requested.length ? allRoutes.filter(([legacy, react]) => requested.includes(legacy) || requested.includes(react)) : allRoutes;
await gotoReady(page, 'https://dev.app.beestat.io/react/index.php#/detail');
await waitForRoute(page, /System - Ziebee II/);
let authenticatedThermostat = await page.getByText(/System - Ziebee II/).first().textContent() ?? '';
for (const [legacy, react, expected] of routes) {
  await gotoReady(page, `https://dev.app.beestat.io/?layer=${legacy}`);
  await waitForRoute(page, expected);
  await page.screenshot({ path: `test-results/parity/legacy-${legacy}.png`, fullPage: true });
  await gotoReady(page, `https://dev.app.beestat.io/react/index.php#/${react}`);
  await waitForRoute(page, expected);
  await revealLazyContent(page);
  await page.screenshot({ path: `test-results/parity/react-${react}.png`, fullPage: true });
  if (react === 'compare') {
    await page.getByRole('button', { name: 'My Home options' }).click();
    await page.getByRole('menuitem', { name: 'Change System Type' }).click();
    await page.getByRole('dialog', { name: 'Change System Type' }).getByText('[Detected]', { exact: false }).first().waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/parity/react-compare-system-type.png', fullPage: true });
    await page.getByRole('dialog', { name: 'Change System Type' }).getByRole('button', { name: 'Cancel' }).click();
  }
}

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
for (const [legacy, react, expected] of process.argv.includes('--desktop-only') ? [] : routes) {
  await gotoReady(mobile, `https://dev.app.beestat.io/?layer=${legacy}`);
  await waitForRoute(mobile, expected);
  await mobile.screenshot({ path: `test-results/parity/legacy-${legacy}-mobile.png`, fullPage: true });
  await gotoReady(mobile, `https://dev.app.beestat.io/react/index.php#/${react}`);
  await waitForRoute(mobile, expected);
  await revealLazyContent(mobile);
  if (react === 'detail') authenticatedThermostat = await mobile.getByText(/System - Ziebee II/).first().textContent() ?? '';
  await mobile.screenshot({ path: `test-results/parity/react-${react}-mobile.png`, fullPage: true });
}
console.log(JSON.stringify({ authenticatedThermostat, errors, failedResponses }, null, 2));
await browser.close();
