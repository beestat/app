import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/compare', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('Metrics', { exact: true }).waitFor({ timeout: 90_000 });
await page.locator('[data-metric-marker]').first().waitFor({ state: 'attached', timeout: 90_000 });

const metrics = await page.locator('[data-metric-marker]').evaluateAll((markers) => markers.map((marker) => {
  const curve = marker.parentElement?.querySelector('[data-metric-curve]');
  const graph = marker.closest('svg')?.parentElement?.parentElement;
  const bounds = graph?.querySelector('[data-metric-bounds]');
  if (marker.tagName.toLowerCase() !== 'line' || curve?.tagName.toLowerCase() !== 'path' || !(bounds instanceof HTMLElement) || !(graph instanceof HTMLElement)) return { valid: false, marker: marker.tagName, curve: curve?.tagName, bounds: Boolean(bounds), graph: Boolean(graph) };
  const x = Number(marker.getAttribute('x1'));
  const y = Number(marker.getAttribute('y1'));
  let low = 0;
  let high = curve.getTotalLength();
  for (let index = 0; index < 20; index += 1) {
    const middle = (low + high) / 2;
    if (curve.getPointAtLength(middle).x < x) low = middle;
    else high = middle;
  }
  const curvePoint = curve.getPointAtLength((low + high) / 2);
  const boundsRect = bounds.getBoundingClientRect();
  const graphRect = graph.getBoundingClientRect();
  return { valid: true, xError: Math.abs(curvePoint.x - x), yError: Math.abs(curvePoint.y - y), boundsInside: boundsRect.left >= graphRect.left && boundsRect.right <= graphRect.right && boundsRect.bottom <= graphRect.bottom + .5 };
}));

if (!metrics.length || metrics.some((metric) => !metric.valid || metric.xError > .02 || metric.yError > .1 || !metric.boundsInside)) throw new Error(`Metric geometry regression: ${JSON.stringify(metrics, null, 2)}`);
console.log(JSON.stringify({ count: metrics.length, maxXError: Math.max(...metrics.map((metric) => metric.xError)), maxYError: Math.max(...metrics.map((metric) => metric.yError)), boundsInside: metrics.every((metric) => metric.boundsInside) }, null, 2));
await browser.close();
