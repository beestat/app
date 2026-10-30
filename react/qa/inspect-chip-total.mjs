import { chromium } from 'playwright';

// Compares legacy's Moment-based runtime chip minutes with React's millisecond math.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.waitForFunction(() => window.beestat?.cache?.runtime_thermostat_summary, null, { timeout: 90_000 });
const result = await page.evaluate(() => {
  const keys = ['sum_compressor_cool_1', 'sum_compressor_cool_2', 'sum_compressor_heat_1', 'sum_compressor_heat_2', 'sum_auxiliary_heat_1'];
  const months = new Map();
  const thermostatId = Number(beestat.setting('thermostat_id'));
  for (const row of Object.values(beestat.cache.runtime_thermostat_summary).filter((item) => Number(item.thermostat_id) === thermostatId)) {
    const month = String(row.date).slice(0, 7);
    if (!months.has(month)) months.set(month, Object.fromEntries(keys.map((key) => [key, 0])));
    for (const key of keys) months.get(month)[key] += Number(row[key] ?? 0);
  }
  return Object.fromEntries(keys.map((key) => {
    const hours = [...months.keys()].sort().reduce((sum, month) => sum + months.get(month)[key] / 3600, 0);
    const milliseconds = Math.round(hours * 3_600_000);
    return [key, { hours, legacy: beestat.time(hours, 'hours'), fallback: `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`, milliseconds: `${Math.floor(milliseconds / 3_600_000)}h ${Math.floor(milliseconds / 60_000) % 60}m` }];
  }));
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
