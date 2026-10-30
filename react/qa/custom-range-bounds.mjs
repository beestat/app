import { chromium } from 'playwright';

// Applies a static custom range on Thermostat Detail and reports the bounds sent
// to runtime_thermostat plus the first row returned. Setting writes are aborted
// so the account's saved chart range is untouched.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', timezoneId: 'America/New_York', viewport: { width: 1440, height: 1000 } });
const requests = [];
await context.route('**/api/**', async (route) => {
  const body = route.request().postData() ?? '';
  if (body.includes('update_setting')) return route.abort();
  if (body.includes('runtime_thermostat') && body.includes('between')) {
    const response = await route.fetch();
    const text = await response.text();
    const first = text.match(/"timestamp":"([^"]+)"/)?.[1];
    requests.push({ between: decodeURIComponent(body).match(/"value":\[[^\]]+\]/)?.[0], firstTimestamp: first });
    return route.fulfill({ response, body: text });
  }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Detail').first().waitFor({ timeout: 90_000 });
await page.getByRole('button', { name: 'Chart menu' }).first().click();
await page.getByRole('menuitem', { name: 'Custom' }).click();
await page.getByRole('button', { name: 'Static' }).click();
const yesterday = new Date(Date.now() - 86_400_000);
const value = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
await page.getByLabel('Start').fill(value);
await page.getByLabel('End').fill(value);
await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(8_000);
console.log(JSON.stringify({ day: value, requests }, null, 2));
await browser.close();
