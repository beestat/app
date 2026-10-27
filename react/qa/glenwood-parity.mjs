import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const mutations = [];
await context.route('**/api/', async (route) => {
  let calls = [];
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    calls = payload.batch ? JSON.parse(payload.batch) : [payload];
  } catch { return route.continue(); }
  const writes = calls.filter((call) => call?.method === 'update_setting');
  if (!writes.length) return route.continue();
  mutations.push(...writes);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.goto('https://dev.app.beestat.io/?layer=glenwood_enroll', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Enrollment', { exact: true }).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/parity/legacy-glenwood_enroll.png', fullPage: true });
await page.goto('https://dev.app.beestat.io/?layer=detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
await page.mouse.click(1408, 32);
await page.getByText('Glenwood Report', { exact: true }).click();
await page.getByText('Run Report', { exact: true }).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/parity/legacy-glenwood_report.png', fullPage: true });

await page.goto('https://dev.app.beestat.io/react/index.php#/glenwood-enrollment', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Enrollment', { exact: true }).waitFor({ timeout: 90_000 });
const enrollment = {
  privacy: await page.getByText('What is not shared:', { exact: false }).isVisible(),
  status: await page.getByText(/currently enrolled|not currently enrolled/).innerText(),
  thermostat: await page.getByText('Ziebee II', { exact: true }).isVisible(),
  overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
};
await page.screenshot({ path: 'test-results/parity/react-glenwood-enrollment.png', fullPage: true });

await page.goto('https://dev.app.beestat.io/react/index.php#/glenwood-report', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Run Report', { exact: true }).waitFor({ timeout: 90_000 });
await page.getByRole('button', { name: 'Run' }).click();
await page.getByText('Both begin and end dates are required.', { exact: true }).waitFor();
await page.getByLabel('Begin Date').fill('2024-01-01');
await page.getByLabel('End Date').fill('2026-01-02');
await page.getByRole('button', { name: 'Run' }).click();
await page.getByText('Maximum range is one year.', { exact: true }).waitFor();
await page.screenshot({ path: 'test-results/parity/react-glenwood-report.png', fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://dev.app.beestat.io/?layer=glenwood_enroll', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Enrollment', { exact: true }).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/parity/legacy-glenwood_enroll-mobile.png', fullPage: true });
await page.goto('https://dev.app.beestat.io/?layer=detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });
await page.mouse.click(358, 32);
await page.getByText('Glenwood Report', { exact: true }).click();
await page.getByText('Run Report', { exact: true }).waitFor({ timeout: 90_000 });
await page.screenshot({ path: 'test-results/parity/legacy-glenwood_report-mobile.png', fullPage: true });
for (const route of ['glenwood-enrollment', 'glenwood-report']) {
  await page.goto(`https://dev.app.beestat.io/react/index.php#/${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText(route === 'glenwood-report' ? 'Run Report' : 'Enrollment', { exact: true }).waitFor({ timeout: 90_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) throw new Error(`${route} overflows mobile by ${overflow}px.`);
  await page.screenshot({ path: `test-results/parity/react-${route}-mobile.png`, fullPage: true });
}

console.log(JSON.stringify({ enrollment, mutations: mutations.map((call) => ({ resource: call.resource, method: call.method, arguments: call.arguments })), errors }, null, 2));
await browser.close();
