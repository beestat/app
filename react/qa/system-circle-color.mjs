import { chromium } from 'playwright';

// Compares the System card temperature circle background and running equipment between legacy and React.
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: 'test-results/auth-state.json', viewport: { width: 1440, height: 1000 } });

const circleColor = (page) => page.evaluate(() => {
  const circle = [...document.querySelectorAll('div')].find((element) => {
    const style = getComputedStyle(element);
    return style.borderRadius === '50%' && Math.round(element.getBoundingClientRect().width) >= 176;
  });
  return circle ? getComputedStyle(circle).backgroundColor : null;
});

const legacy = await context.newPage();
await legacy.goto('https://dev.app.beestat.io/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await legacy.getByText(/System - /).first().waitFor({ timeout: 90_000 });
const running = await legacy.evaluate(() => beestat.cache.thermostat[beestat.setting('thermostat_id')].running_equipment);
const legacyColor = await circleColor(legacy);

const modern = await context.newPage();
await modern.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await modern.getByText(/System - /).first().waitFor({ timeout: 90_000 });
const reactColor = await circleColor(modern);

const spacing = [];
for (const width of [1440, 390, 320]) {
  await modern.setViewportSize({ width, height: 1000 });
  const geometry = await modern.evaluate(() => {
    const card = document.querySelector('[data-system-circle]');
    const temperature = document.querySelector('[data-system-temperature]');
    const weather = document.querySelector('[data-system-weather]');
    if (!(card instanceof HTMLElement) || !(temperature instanceof HTMLElement) || !(weather instanceof HTMLElement)) return null;
    const cardRect = card.getBoundingClientRect();
    const temperatureRect = temperature.getBoundingClientRect();
    const weatherRect = weather.getBoundingClientRect();
    return { gap: weatherRect.left - temperatureRect.right, weatherInsideCardWidth: weatherRect.right <= card.closest('.MuiCard-root').getBoundingClientRect().right };
  });
  spacing.push({ width, ...geometry });
}
if (spacing.some((item) => item.gap < 12 || !item.weatherInsideCardWidth)) throw new Error(`System weather spacing regression: ${JSON.stringify(spacing)}`);

console.log(JSON.stringify({ running, legacyColor, reactColor, match: legacyColor === reactColor, spacing }));
await browser.close();
