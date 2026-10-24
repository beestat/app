import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Floor Plan', { exact: true }).waitFor({ timeout: 90_000 });
const model = await page.evaluate(() => {
  const plans = Object.values(window.beestat?.cache?.floor_plan ?? {});
  return plans.map((plan) => ({
    keys: Object.keys(plan),
    dataKeys: Object.keys(plan.data ?? {}),
    groups: (plan.data?.groups ?? []).map((group) => ({
      keys: Object.keys(group),
      counts: Object.fromEntries(Object.entries(group).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])),
      samples: Object.fromEntries(Object.entries(group).filter(([, value]) => Array.isArray(value) && value.length).map(([key, value]) => [key, { keys: Object.keys(value[0]), value: value[0] }])),
    })),
  }));
});
console.log(JSON.stringify(model, null, 2));
await browser.close();
