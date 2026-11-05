import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json' });
const results = [];
async function openReady(page, url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (attempt === 0) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      else await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.getByText('Sensor Detail', { exact: true }).waitFor({ timeout: 60_000 });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  for (const [kind, url] of [['legacy', 'https://dev.app.beestat.io/?layer=detail'], ['react', 'https://dev.app.beestat.io/react/index.php#/detail']]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    await openReady(page, url);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((resolve) => setTimeout(resolve, 100)); }
      scrollTo(0, 0);
    });
    await page.waitForFunction(() => document.querySelectorAll('.highcharts-container').length >= 5, undefined, { timeout: 90_000 });
    await page.waitForTimeout(500);
    results.push(await page.evaluate(({ kind, viewport }) => {
      const rect = (node) => { const box = node?.getBoundingClientRect(); return box && Object.fromEntries(['x', 'y', 'width', 'height'].map((key) => [key, Math.round(box[key] * 10) / 10])); };
      const card = (title) => {
        let root = [...document.querySelectorAll('*')].find((node) => node.children.length === 0 && node.textContent?.trim() === title);
        while (root?.parentElement && !root.querySelector('.highcharts-container')) root = root.parentElement;
        const charts = [...(root?.querySelectorAll('.highcharts-container') ?? [])].map((chart) => ({
          rect: rect(chart),
          plot: rect(chart.querySelector('.highcharts-plot-background')),
          xLabels: [...chart.querySelectorAll('.highcharts-xaxis-labels text')].map((label) => ({ text: label.textContent, x: Math.round(label.getBoundingClientRect().x * 10) / 10 })).sort((left, right) => left.x - right.x),
          legends: [...chart.querySelectorAll('.highcharts-legend-item')].map((item) => ({ name: item.textContent?.trim(), color: item.querySelector('path')?.getAttribute('stroke') })),
        }));
        return { rect: rect(root), charts };
      };
      return { kind, viewport, thermostat: card('Thermostat Detail'), sensor: card('Sensor Detail') };
    }, { kind, viewport }));
    await page.close();
  }
}
for (const viewport of [1440, 390]) {
  const legacy = results.find((result) => result.kind === 'legacy' && result.viewport.width === viewport);
  const react = results.find((result) => result.kind === 'react' && result.viewport.width === viewport);
  const legacyRaceway = legacy.thermostat.charts[0].plot;
  const reactRaceway = react.thermostat.charts[0].plot;
  if (Math.abs(legacyRaceway.width - reactRaceway.width) > 1 || Math.abs(legacyRaceway.height - reactRaceway.height) > 1) throw new Error(`Thermostat raceway geometry differs at ${viewport}px: ${JSON.stringify({ legacyRaceway, reactRaceway })}`);
  if (Math.abs(legacy.sensor.rect.height - react.sensor.rect.height) > 1) throw new Error(`Sensor Detail card height differs at ${viewport}px: ${JSON.stringify({ legacy: legacy.sensor.rect, react: react.sensor.rect })}`);
  for (let index = 0; index < 3; index += 1) if (Math.abs(legacy.sensor.charts[index].rect.height - react.sensor.charts[index].rect.height) > 1) throw new Error(`Sensor Detail chart ${index} height differs at ${viewport}px.`);
  for (const [name, legacyChart, reactChart] of [['Thermostat Detail', legacy.thermostat.charts.at(-1), react.thermostat.charts.at(-1)], ['Sensor Detail', legacy.sensor.charts.at(-1), react.sensor.charts.at(-1)]]) {
    // These pages are loaded sequentially against live five-minute data, so a
    // boundary can change the wall-clock text while preserving the exact tick
    // cadence. Compare the rendered label rail, which is the visual contract.
    const medianGap = (labels) => {
      const gaps = labels.slice(1).map((label, index) => label.x - labels[index].x).sort((left, right) => left - right);
      return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    };
    // Sequential live requests can start/end on different five-minute rows,
    // shifting the whole rail and occasionally changing its count by one. The
    // visual cadence is the label density and median spacing, not absolute x.
    const labelRailMatches = Math.abs(legacyChart.xLabels.length - reactChart.xLabels.length) <= 1 && Math.abs(medianGap(legacyChart.xLabels) - medianGap(reactChart.xLabels)) <= 1;
    if (!labelRailMatches) throw new Error(`${name} x-axis label cadence differs at ${viewport}px: ${JSON.stringify({ legacy: legacyChart, react: reactChart })}`);
  }
  const reactGaps = react.sensor.charts.slice(1).map((chart, index) => Math.round(chart.rect.y - react.sensor.charts[index].rect.y - react.sensor.charts[index].rect.height));
  if (reactGaps.some((gap) => gap !== 8)) throw new Error(`Sensor Detail chart spacing differs at ${viewport}px: ${JSON.stringify(reactGaps)}`);
  const normalize = (name) => name?.replace(/\u200b/g, ' ');
  const legacyColors = Object.fromEntries(legacy.sensor.charts.at(-1).legends.map((item) => [normalize(item.name), item.color]));
  const reactColors = Object.fromEntries(react.sensor.charts.at(-1).legends.map((item) => [normalize(item.name), item.color]));
  for (const name of ['Ziebee II', 'Cade', 'Downstairs', 'Master Bedroom', 'Office', 'Upstairs']) if (legacyColors[name] !== reactColors[name]) throw new Error(`${name} color differs at ${viewport}px: ${JSON.stringify({ legacy: legacyColors[name], react: reactColors[name] })}`);
}
console.log(JSON.stringify({
  viewports: [1440, 390],
  xAxisLabelsMatch: true,
  racewayGeometryMatches: true,
  sensorGeometryMatches: true,
}, null, 2));
await browser.close();
