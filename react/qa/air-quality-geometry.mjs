import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });

async function measure(viewport, kind, url) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Air Quality Detail', { exact: true }).waitFor({ timeout: 90_000 });
  await page.locator('.highcharts-container').first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1_500);
  const charts = await page.locator('.highcharts-container').evaluateAll((containers) => containers.map((container) => {
    const rect = (element) => {
      const box = element?.getBoundingClientRect();
      return box && Object.fromEntries(['x', 'y', 'width', 'height', 'right', 'bottom'].map((key) => [key, Math.round(box[key] * 10) / 10]));
    };
    return {
      chart: rect(container),
      plot: rect(container.querySelector('.highcharts-plot-background')),
      xLabels: [...container.querySelectorAll('.highcharts-xaxis-labels text')].map((label) => ({ text: label.textContent, x: label.getBoundingClientRect().x })).sort((left, right) => left.x - right.x).map((label) => label.text),
      yLabels: [...container.querySelectorAll('.highcharts-yaxis-labels text')].map((label) => label.textContent),
    };
  }));
  let summaryMenu;
  if (kind === 'react') {
    await page.getByRole('button', { name: 'Air Quality summary options' }).click();
    summaryMenu = await page.getByRole('menuitem').allTextContents();
  }
  await page.close();
  return { kind, viewport, charts, summaryMenu };
}

const results = [];
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  results.push(await measure(viewport, 'legacy', 'https://dev.app.beestat.io/?layer=air_quality'));
  results.push(await measure(viewport, 'react', 'https://dev.app.beestat.io/react/index.php#/air-quality'));
}
for (const result of results.filter((item) => item.kind === 'react')) {
  for (const option of ['Past 1 Week', 'Past 4 Weeks', 'Help']) if (!result.summaryMenu?.includes(option)) throw new Error(`Air Quality Summary menu is missing ${option}.`);
}
for (let index = 0; index < results.length; index += 2) {
  const legacy = results[index];
  const react = results[index + 1];
  const legacyLabels = legacy.charts[3]?.xLabels;
  const reactLabels = react.charts[3]?.xLabels;
  if (JSON.stringify(reactLabels) !== JSON.stringify(legacyLabels)) {
    throw new Error(`Air Quality x-axis labels differ from legacy at ${legacy.viewport.width}px: ${JSON.stringify({ legacy: legacyLabels, react: reactLabels })}`);
  }
}
console.log(JSON.stringify({
  viewports: [1440, 390],
  xAxisLabelsMatch: true,
  summaryMenuMatches: true,
}, null, 2));
await browser.close();
