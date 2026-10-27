import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
});

async function measure(viewport, kind, url) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.getByText('Thermostat Summary', { exact: true }).first().waitFor({ timeout: 90_000 });
  await page.locator('.highcharts-container').nth(1).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1_500);

  const charts = await page.locator('.highcharts-container').evaluateAll((containers) => containers
    .filter((container) => {
      const rect = container.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((container) => {
      const roundedRect = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return Object.fromEntries(['x', 'y', 'width', 'height', 'right', 'bottom'].map((key) => [key, Math.round(rect[key] * 10) / 10]));
      };
      return {
        chart: roundedRect(container),
        plot: roundedRect(container.querySelector('.highcharts-plot-background')),
        xLabels: [...container.querySelectorAll('.highcharts-xaxis-labels text')].map((label) => label.textContent),
        yLabels: [...container.querySelectorAll('.highcharts-yaxis-labels')].map((axis) => [...axis.querySelectorAll('text')].map((label) => label.textContent)),
        axes: (() => {
          const chartIndex = Number(container.getAttribute('data-highcharts-chart'));
          const chart = window.Highcharts?.charts?.[chartIndex];
          return chart?.axes?.map((axis) => ({
            horiz: axis.horiz,
            min: axis.min,
            max: axis.max,
            len: axis.len,
            tickInterval: axis.tickInterval,
            tickPositions: [...axis.tickPositions],
          }));
        })(),
      };
    }));

  await page.close();
  return { kind, viewport, charts };
}

const results = [];
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  results.push(await measure(viewport, 'legacy', 'https://dev.app.beestat.io/?layer=analyze'));
  results.push(await measure(viewport, 'react', 'https://dev.app.beestat.io/react/index.php#/analyze'));
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
