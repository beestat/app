import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/?layer=analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Thermostat Summary', { exact: true }).waitFor({ timeout: 90_000 });
await page.getByText('Fetching', { exact: true }).first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
const result = await page.evaluate(() => {
  const thermostatId = window.beestat.setting('thermostat_id');
  const card = new window.beestat.component.card.runtime_thermostat_summary(thermostatId);
  const calculated = card.get_data_();
  card.dispose();
  const rows = Object.values(window.beestat.cache.runtime_thermostat_summary).filter((row) => row.thermostat_id === thermostatId);
  return {
    settings: {
      count: window.beestat.setting('runtime_thermostat_summary_time_count'),
      period: window.beestat.setting('runtime_thermostat_summary_time_period'),
      group: window.beestat.setting('runtime_thermostat_summary_group_by'),
      gapFill: window.beestat.setting('runtime_thermostat_summary_gap_fill'),
    },
    rowCount: rows.length,
    firstDate: rows[0]?.date,
    lastDate: rows.at(-1)?.date,
    calculatedPoints: calculated.series.sum_compressor_cool_1.length,
    calculatedCool1Hours: calculated.metadata.series.sum_compressor_cool_1.total,
    calculatedCool2Hours: calculated.metadata.series.sum_compressor_cool_2.total,
    rawCool1Seconds: rows.reduce((sum, row) => sum + Number(row.sum_compressor_cool_1 ?? 0), 0),
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
