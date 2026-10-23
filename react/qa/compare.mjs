import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
const iterator = lines[Symbol.asyncIterator]();
process.stdout.write('Force-login URL: ');
const { value: loginUrl } = await iterator.next();
lines.close();
if (!/^https?:\/\/dev\.app\.beestat\.io\/api\//.test(loginUrl ?? '')) throw new Error('A valid dev force-login URL is required.');

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(loginUrl, { waitUntil: 'networkidle' });
await page.goto('https://dev.app.beestat.io/', { waitUntil: 'networkidle', timeout: 90_000 });
await page.screenshot({ path: 'test-results/legacy-desktop.png', fullPage: true });
const legacy = { title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 500) };

await page.goto('https://dev.app.beestat.io/react/index.php', { waitUntil: 'networkidle', timeout: 90_000 });
await page.getByText(/System - /).waitFor({ timeout: 30_000 });
await page.screenshot({ path: 'test-results/react-desktop.png', fullPage: true });
const modern = { title: await page.title(), text: (await page.locator('body').innerText()).slice(0, 500) };

const routes = [
  ['analyze', 'Thermostat Summary'],
  ['compare', 'Comparison Settings'],
  ['air-quality', 'Air Quality'],
  ['visualize', 'Floor plan editor and 3D environmental visualization'],
  ['settings', 'Manage Thermostats'],
];
const routeResults = {};
for (const [route, expected] of routes) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 45_000 });
  routeResults[route] = { url: page.url(), text: (await page.locator('main, body').first().innerText()).slice(0, 240) };
  await page.screenshot({ path: `test-results/react-${route}.png`, fullPage: route !== 'visualize' });
}

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto('https://dev.app.beestat.io/react/index.php', { waitUntil: 'networkidle', timeout: 90_000 });
await mobile.getByText(/System - /).waitFor({ timeout: 30_000 });
await mobile.screenshot({ path: 'test-results/react-mobile.png', fullPage: true });

await context.storageState({ path: 'test-results/auth-state.json' });
console.log(JSON.stringify({ legacy, modern, routeResults, errors }, null, 2));
await browser.close();
