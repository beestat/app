import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
const writes = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : undefined;
    calls = batch ? (Array.isArray(batch) ? batch : Object.values(batch)) : [payload];
  } catch {
    return route.continue();
  }
  const settingWrites = calls.filter((call) => call?.resource === 'user' && call?.method === 'update_setting');
  if (!settingWrites.length) return route.continue();
  for (const call of settingWrites) {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
    writes.push({ key: args.key, value: args.value });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/analyze', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Temperature Profiles', { exact: true }).waitFor({ timeout: 90_000 });

const summaryMenu = page.getByRole('button', { name: 'Thermostat summary menu' });
await summaryMenu.click();
if (await page.getByRole('menuitem').count() !== 7) throw new Error('Thermostat Summary menu differs from legacy.');
if (await page.getByRole('menuitem', { name: 'Help', exact: true }).getAttribute('href') !== 'https://doc.beestat.io/3225b739ebbc42d68a18260565fda4f1') throw new Error('Thermostat Summary help URL differs from legacy.');
await page.getByRole('menuitem', { name: 'Past 3 Months' }).click();
await page.getByText(/Past 3 months, grouped by day/).waitFor();

await summaryMenu.click();
await page.getByRole('menuitem', { name: 'Custom' }).click();
const rangeDialog = page.getByRole('dialog', { name: 'Thermostat Summary - Custom Range' });
if (!await rangeDialog.getByText('Choose a custom range to display on the Runtime Summary chart.', { exact: true }).isVisible()) throw new Error('Custom summary copy differs from legacy.');
await rangeDialog.getByLabel('Count').fill('6');
if (await rangeDialog.getByRole('button', { name: 'months', exact: true }).getAttribute('aria-pressed') !== 'true') throw new Error('Custom summary did not retain the selected time period.');
await rangeDialog.getByRole('button', { name: 'Week', exact: true }).click();
await rangeDialog.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByText(/Past 6 months, grouped by week/).waitFor();

await summaryMenu.click();
const summaryDownloadPromise = page.waitForEvent('download');
await page.getByRole('menuitem', { name: 'Download Chart' }).click();
const summaryDownload = await summaryDownloadPromise;
if (summaryDownload.suggestedFilename() !== 'beestat-thermostat-summary.svg') throw new Error(`Unexpected summary download name: ${summaryDownload.suggestedFilename()}`);

await page.getByRole('button', { name: 'Temperature profiles menu' }).click();
if (await page.getByRole('menuitem').count() !== 4) throw new Error('Temperature Profiles menu differs from legacy.');
if (await page.getByRole('menuitem', { name: 'Help', exact: true }).getAttribute('href') !== 'https://doc.beestat.io/9c0fba6793dd4bc68f798c1516f0ea25') throw new Error('Temperature Profiles help URL differs from legacy.');
await page.getByRole('menuitem', { name: 'More Info' }).click();
const profileDialog = page.getByRole('dialog', { name: 'Temperature Profiles Info' });
await profileDialog.waitFor();
const trendFields = await profileDialog.getByText(/^Slope = /).count();
if (trendFields < 2 || !await profileDialog.getByText(/^Generated .* from the past .* of data \(updated weekly\)\.$/).isVisible()) throw new Error('Temperature Profiles info differs from legacy.');
await profileDialog.getByRole('button', { name: 'Close' }).click();

await page.getByRole('button', { name: 'Temperature profiles menu' }).click();
const profileDownloadPromise = page.waitForEvent('download');
await page.getByRole('menuitem', { name: 'Download Profile' }).click();
const profileDownload = await profileDownloadPromise;
if (!/^Temperature Profile - \d{4}-\d{2}-\d{2}\.json$/.test(profileDownload.suggestedFilename())) throw new Error(`Unexpected profile download name: ${profileDownload.suggestedFilename()}`);

const expectedWrites = [
  ['runtime_thermostat_summary_time_count', 3], ['runtime_thermostat_summary_time_period', 'month'], ['runtime_thermostat_summary_group_by', 'day'],
  ['runtime_thermostat_summary_time_count', 6], ['runtime_thermostat_summary_time_period', 'month'], ['runtime_thermostat_summary_group_by', 'week'],
];
for (const [key, value] of expectedWrites) {
  if (!writes.some((write) => write.key === key && String(write.value) === String(value))) throw new Error(`Missing intercepted summary setting ${key}=${value}: ${JSON.stringify(writes)}`);
}

console.log(JSON.stringify({ writes, trendFields, downloads: [summaryDownload.suggestedFilename(), profileDownload.suggestedFilename()] }, null, 2));
await browser.close();
