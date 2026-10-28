import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const requestedWidths = process.argv.slice(2).map(Number).filter(Number.isFinite);
for (const width of requestedWidths.length ? requestedWidths : [760, 900, 1051, 1440]) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: 'test-results/auth-state.json',
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  let legacyGroups;
  for (const [name, url] of [
    ['legacy', 'https://dev.app.beestat.io/?layer=compare'],
    ['react', 'https://dev.app.beestat.io/react/index.php#/compare'],
  ]) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.getByText('Comparison Settings', { exact: true }).first().waitFor({ timeout: 90_000 });
    await page.getByText('Fetching', { exact: true }).first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
    await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
    await page.waitForTimeout(700);
    const layout = await page.evaluate((pageName) => {
      const headings = [...document.querySelectorAll('p')].filter((node) => ['Setback', 'Property', 'Setpoint', 'Balance Point', 'Runtime Per Degree Day'].includes(node.textContent?.trim() ?? ''));
      const metricsTitle = [...document.querySelectorAll('*')].find((node) => node.children.length === 0 && node.textContent?.trim() === 'Metrics');
      const metricCard = metricsTitle?.closest(pageName === 'react' ? '.MuiCard-root' : '.card') ?? metricsTitle?.parentElement?.parentElement;
      const cool = [...document.querySelectorAll('*')].find((node) => node.children.length === 0 && node.textContent?.trim() === 'Cool' && metricCard?.contains(node));
      const chart = cool?.parentElement?.parentElement?.nextElementSibling ?? cool?.parentElement?.nextElementSibling;
      const textMetrics = ['Comparison Settings', 'Region', 'Nearby', 'Comparing to homes like...', 'Matching system type and stages', 'Any region', 'My Home', 'System', 'Property', 'Metrics'].map((text) => {
        const node = [...document.querySelectorAll('*')].find((candidate) => candidate.children.length === 0 && candidate.textContent?.trim() === text);
        if (!node) return { text };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { text, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), fontSize: style.fontSize, lineHeight: style.lineHeight, margin: style.margin, padding: style.padding };
      });
      const settingButtons = ['Nearby', 'Global', 'Very Similar', 'Type: Detached', 'All'].map((text) => {
        const node = [...document.querySelectorAll('*')].find((candidate) => candidate.children.length === 0 && candidate.textContent?.trim() === text);
        if (!node) return { text };
        const rect = node.getBoundingClientRect();
        const parentRect = node.parentElement?.getBoundingClientRect();
        return { text, x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), parent: parentRect && { x: Math.round(parentRect.x), y: Math.round(parentRect.y), width: Math.round(parentRect.width), height: Math.round(parentRect.height) } };
      });
      return {
        innerWidth,
        devicePixelRatio,
        bodyWidth: document.body.getBoundingClientRect().width,
        cardWidth: metricCard?.getBoundingClientRect().width,
        groups: headings.map((node) => ({ text: node.textContent?.trim(), x: Math.round(node.getBoundingClientRect().x), y: Math.round(node.getBoundingClientRect().y), width: Math.round(node.parentElement?.getBoundingClientRect().width ?? 0) })),
        chartChildren: chart?.children.length,
        chartWidth: chart?.getBoundingClientRect().width,
        firstBars: chart ? [...chart.children].slice(0, 4).map((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })) : [],
        textMetrics,
        settingButtons,
      };
    }, name);
    console.log(JSON.stringify({ width, name, ...layout }));
    if (name === 'legacy') {
      legacyGroups = layout.groups;
    } else {
      const legacyByName = Object.fromEntries(legacyGroups.map((group) => [group.text, group]));
      for (const group of layout.groups) {
        const legacy = legacyByName[group.text];
        if (!legacy || Math.abs(group.x - legacy.x) > 1 || Math.abs(group.width - legacy.width) > 1 || Math.abs(group.y - legacy.y) > 1) {
          throw new Error(`Metric column geometry differs from legacy at ${width}px: ${JSON.stringify({ legacy, react: group })}`);
        }
      }
    }
  }
  await context.close();
}
await browser.close();
