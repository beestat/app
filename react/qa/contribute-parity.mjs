import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('test-results/parity', { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport, storageState: 'test-results/auth-state.json' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('certificate')) errors.push(`${name}: ${message.text()}`); });
  await page.goto('https://dev.app.beestat.io/?layer=contribute', { waitUntil: 'networkidle', timeout: 90_000 });
  await page.screenshot({ path: `test-results/parity/legacy-contribute-${name}.png`, fullPage: true });
  await page.goto('https://dev.app.beestat.io/react/index.php#/contribute', { waitUntil: 'networkidle', timeout: 90_000 });
  await page.screenshot({ path: `test-results/parity/react-contribute-${name}.png`, fullPage: true });
  console.log(JSON.stringify({ name, heading: await page.getByText('Contribute', { exact: true }).first().textContent(), supporter: await page.getByText('Supporter', { exact: true }).first().textContent() }));
  await context.close();
}
console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
