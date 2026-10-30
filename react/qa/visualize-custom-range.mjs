import { chromium } from 'playwright';

// Checks the Visualize custom range dialog rules from legacy modal/visualize_custom.js.
// Setting writes are captured and never sent, so the account's range is untouched.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const writes = [];
await context.route('**/api/**', async (route) => {
  const body = route.request().postData() ?? '';
  if (body.includes('update_setting')) {
    const call = JSON.parse(body);
    const args = JSON.parse(call.arguments ?? '{}');
    writes.push(`${args.key}=${JSON.stringify(args.value)}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  }
  return route.continue();
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Visualize Settings').first().waitFor({ timeout: 90_000 });
await page.getByRole('button', { name: /Custom/ }).first().click();
const dialog = page.getByRole('dialog');
await dialog.getByText('Visualize - Custom Range').waitFor();
await dialog.getByLabel('Begin').fill('2026-10-01');
await dialog.getByLabel('End').fill('2026-10-11');
const tooLong = { error: await dialog.getByText('Max range is seven days').isVisible(), saveDisabled: await dialog.getByRole('button', { name: 'Save' }).isDisabled() };
await dialog.getByLabel('Begin').fill('2026-10-20');
await dialog.getByLabel('End').fill('2026-10-17');
const reversed = { error: await dialog.getByText('Max range is seven days').isVisible(), saveDisabled: await dialog.getByRole('button', { name: 'Save' }).isDisabled() };
await dialog.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(1_000);
console.log(JSON.stringify({ tooLong, reversed, writes }, null, 2));
await browser.close();
