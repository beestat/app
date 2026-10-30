import { chromium } from 'playwright';

// Compares the Filter Info dialog text between legacy and React.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });

const legacy = await context.newPage();
await legacy.goto('https://dev.app.beestat.io/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await legacy.getByText(/System - /).first().waitFor({ timeout: 90_000 });
await legacy.evaluate(() => new beestat.component.modal.filter_info().render());
await legacy.getByText('Replace In').first().waitFor({ timeout: 30_000 });
const legacyBody = await legacy.locator('body').innerText();
const legacyText = legacyBody.slice(legacyBody.lastIndexOf('Filter Info'));

const modern = await context.newPage();
await modern.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await modern.getByRole('button', { name: 'System menu' }).click();
await modern.getByRole('menuitem', { name: /Filter Info/ }).click();
const reactText = await modern.getByRole('dialog').innerText();

const values = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);
console.log(JSON.stringify({ legacy: values(legacyText), react: values(reactText) }, null, 2));
await browser.close();
