import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/?layer=compare', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Comparison Settings', { exact: true }).waitFor({ timeout: 90_000 });
await page.getByText('Fetching', { exact: true }).first().waitFor({ state: 'detached', timeout: 90_000 });
const sample = await page.evaluate(() => ({
  profile: window.beestat.cache.thermostat[window.beestat.setting('thermostat_id')].profile.setback.cool,
  metric: window.beestat.cache.data.metrics.setback.cool,
}));
console.log(JSON.stringify(sample, null, 2));
await browser.close();
