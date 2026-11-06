import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});

await context.route('**/api/', async (route) => {
  try {
    const payload = JSON.parse(route.request().postData() ?? '{}');
    const batch = payload.batch ? JSON.parse(payload.batch) : [payload];
    const calls = Array.isArray(batch) ? batch : Object.values(batch);
    const changesTheme = calls.some((call) => {
      const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments;
      return call.resource === 'user' && call.method === 'update_setting' && ['ui.theme', 'ui.high_contrast'].includes(args?.key);
    });
    if (changesTheme) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
  } catch { /* Non-JSON requests continue normally. */ }
  return route.continue();
});

const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/settings', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByRole('radiogroup', { name: 'Theme' }).waitFor({ timeout: 90_000 });

async function selectAndRead(label, expectedStroke, highContrast = false) {
  await page.getByRole('radio', { name: label }).click();
  await page.getByRole('radio', { name: label }).waitFor({ state: 'visible' });
  const contrast = page.getByRole('checkbox', { name: /High Contrast/ });
  if (await contrast.isChecked() !== highContrast) await contrast.click();
  await page.evaluate(() => { window.location.hash = '#/detail'; });
  await page.getByText('Thermostat Detail', { exact: true }).waitFor();
  await page.evaluate(() => [...document.querySelectorAll('*')].find((node) => node.textContent === 'Thermostat Detail')?.scrollIntoView({ block: 'center' }));
  const heading = page.getByText('Thermostat Detail', { exact: true });
  const card = heading.locator('xpath=ancestor::*[contains(@class,"MuiCard-root")][1]');
  await card.locator('.highcharts-root').last().waitFor({ timeout: 90_000 });
  await page.waitForFunction((stroke) => [...document.querySelectorAll('.highcharts-series path')].some((path) => path.getAttribute('stroke')?.toLowerCase() === stroke), expectedStroke);
  const detail = await card.locator('.highcharts-series path').evaluateAll((paths) => [...new Set(paths.map((path) => path.getAttribute('stroke')).filter(Boolean))]);
  const collect = async (route, heading) => {
    await page.evaluate((nextRoute) => { window.location.hash = `#/${nextRoute}`; }, route);
    const routeHeading = page.getByText(heading, { exact: true }).first();
    await routeHeading.waitFor({ timeout: 90_000 });
    await routeHeading.scrollIntoViewIfNeeded();
    const routeCard = routeHeading.locator('xpath=ancestor::*[contains(@class,"MuiCard-root")][1]');
    await routeCard.locator('.highcharts-series path[stroke]').first().waitFor({ state: 'attached', timeout: 90_000 });
    return routeCard.locator('.highcharts-series path[stroke]').evaluateAll((paths) => [...new Set(paths.map((path) => path.getAttribute('stroke')).filter((stroke) => stroke && stroke !== 'none'))].sort());
  };
  const analyze = await collect('analyze', 'Thermostat Summary');
  const airQuality = await collect('air-quality', 'Air Quality Detail');
  await page.evaluate(() => { window.location.hash = '#/settings'; });
  await page.getByRole('radiogroup', { name: 'Theme' }).waitFor();
  return { detail, analyze, airQuality };
}

const beestat = await selectAndRead('OG Beestat', '#d1d8e0');
const beestatHighContrast = await selectAndRead('OG Beestat', '#ffffff', true);
const midnight = await selectAndRead(/Midnight/, '#d6dde7');
const midnightHighContrast = await selectAndRead(/Midnight/, '#ffffff', true);
await page.getByRole('radio', { name: 'OG Beestat' }).click();
await page.getByRole('checkbox', { name: /High Contrast/ }).click();

const combinations = [beestat, beestatHighContrast, midnight, midnightHighContrast];
for (const route of ['detail', 'analyze', 'airQuality']) {
  if (new Set(combinations.map((combination) => JSON.stringify(combination[route]))).size !== 4) throw new Error(`${route} chart series did not provide a distinct palette for all four theme combinations.`);
}

console.log(JSON.stringify({ beestat, beestatHighContrast, midnight, midnightHighContrast }, null, 2));
await browser.close();
