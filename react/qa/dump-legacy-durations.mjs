import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

// Saves a slice of real runtime_thermostat rows with the equipment and "System Off"
// durations legacy computes for its Thermostat Detail tooltip, as a unit-test fixture.
const [outPath = 'src/components/detail/__fixtures__/legacy-durations.json', limit = '288'] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.waitForFunction(() => window.beestat?.cache?.data?.runtime_thermostat_detail__runtime_thermostat?.length > 0, null, { timeout: 120_000 });

const fixture = await page.evaluate((count) => {
  const key = 'runtime_thermostat_detail__runtime_thermostat';
  const range = {
    type: beestat.setting('runtime_thermostat_detail_range_type'),
    dynamic: beestat.setting('runtime_thermostat_detail_range_dynamic'),
    static_begin: beestat.setting('runtime_thermostat_detail_range_static_begin'),
    static_end: beestat.setting('runtime_thermostat_detail_range_static_end'),
  };
  const data = beestat.runtime_thermostat.get_data(beestat.setting('thermostat_id'), range, key);
  const fields = ['timestamp', 'compressor_mode', 'compressor_1', 'compressor_2', 'auxiliary_heat_1', 'auxiliary_heat_2', 'fan', 'accessory_type', 'accessory'];
  const rows = beestat.cache.data[key]
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-count)
    .map((row) => Object.fromEntries(fields.map((field) => [field, row[field] ?? null])));
  const codes = ['fan', 'compressor_heat_1', 'compressor_heat_2', 'auxiliary_heat_1', 'auxiliary_heat_2', 'compressor_cool_1', 'compressor_cool_2', 'humidifier', 'dehumidifier', 'ventilator', 'economizer', 'off_heat_cool'];
  const expected = {};
  for (const row of rows) {
    const x = moment(row.timestamp).valueOf();
    const entry = {};
    for (const code of codes) {
      const duration = data.metadata.series[code]?.durations?.[x];
      if (duration !== undefined) entry[code] = duration.seconds;
    }
    expected[row.timestamp] = entry;
  }
  return { rows, expected };
}, Number(limit));

await writeFile(outPath, `${JSON.stringify(fixture)}\n`);
console.log(JSON.stringify({ outPath, rows: fixture.rows.length, withDurations: Object.values(fixture.expected).filter((entry) => Object.keys(entry).length).length }));
await browser.close();
