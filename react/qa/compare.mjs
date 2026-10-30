import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { access, mkdir } from 'node:fs/promises';

const authStatePath = 'test-results/auth-state.json';
const hasAuthState = await access(authStatePath).then(() => true, () => false);
let loginUrl;
if (!hasAuthState) {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  process.stdout.write('Force-login URL: ');
  ({ value: loginUrl } = await iterator.next());
  lines.close();
  if (!/^https?:\/\/dev\.app\.beestat\.io\/api\//.test(loginUrl ?? '')) throw new Error('A valid dev force-login URL is required when no saved auth state exists.');
}

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 1000 },
  ...(hasAuthState ? { storageState: authStatePath } : {}),
});
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('certificate')) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

if (!hasAuthState) {
  await page.goto(loginUrl.replace(/^http:/, 'https:'), { waitUntil: 'domcontentloaded', timeout: 90_000 });
  const loginCookies = await context.cookies('https://dev.app.beestat.io');
  if (!loginCookies.some((cookie) => cookie.name === 'session_key')) {
    const body = (await page.locator('body').innerText().catch(() => '')).slice(0, 240);
    throw new Error(`Force login did not create a session cookie. Final page: ${page.url().replace(/api_key=[^&]+/, 'api_key=[redacted]')}; body: ${body}`);
  }
  await context.storageState({ path: authStatePath });
}
await page.goto('https://dev.app.beestat.io/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText(/System - Ziebee II/).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/legacy-desktop.png', fullPage: true });
const legacy = { title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 500) };

await page.goto('https://dev.app.beestat.io/react/index.php', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText(/System - /).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/react-desktop.png', fullPage: true });
const modern = { title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 500) };

const routes = [
  ['analyze', 'Thermostat Summary'],
  ['compare', 'Comparison Settings'],
  ['air-quality', 'Air Quality Detail'],
  ['visualize', 'Visualize Settings'],
  ['settings', 'Manage Thermostats'],
];
const routeResults = {};
for (const [route, expected] of routes) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 90_000 });
  await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
  if (route === 'visualize') await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
  routeResults[route] = { url: page.url(), text: (await page.locator('main, body').first().innerText()).slice(0, 240) };
  await page.screenshot({ path: `test-results/react-${route}.png`, fullPage: route !== 'visualize' });
}

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto('https://dev.app.beestat.io/react/index.php', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await mobile.getByText(/System - /).waitFor({ timeout: 90_000 });
await mobile.screenshot({ path: 'test-results/react-mobile.png', fullPage: true });

await context.storageState({ path: authStatePath });
console.log(JSON.stringify({ legacy, modern, routeResults, errors }, null, 2));
await browser.close();
