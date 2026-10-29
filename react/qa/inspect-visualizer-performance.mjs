import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/detail', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.getByText('System - Ziebee II', { exact: true }).waitFor({ timeout: 90_000 });

await page.evaluate(() => {
  window.__sceneTimings = {};
  const prototype = window.beestat?.component?.scene?.prototype;
  const names = [
    'decorate_', 'add_renderer_', 'add_floor_plan_', 'add_room_', 'add_walls_',
    'apply_opening_cuts_', 'add_opening_fixtures_', 'add_lights_', 'add_roofs_',
    'add_environment_', 'add_trees_', 'add_weather_', 'update_raycaster_',
    'update_celestial_light_intensities_', 'update_tree_wind_', 'update_weather_',
  ];
  names.forEach((name) => {
    const original = prototype?.[name];
    if (typeof original !== 'function') return;
    prototype[name] = function(...args) {
      const started = performance.now();
      try {
        return original.apply(this, args);
      } finally {
        const timing = window.__sceneTimings[name] ?? { calls: 0, total: 0, longest: 0 };
        const duration = performance.now() - started;
        timing.calls += 1;
        timing.total += duration;
        timing.longest = Math.max(timing.longest, duration);
        window.__sceneTimings[name] = timing;
      }
    };
  });
  const addRenderer = prototype.add_renderer_;
  prototype.add_renderer_ = function(...args) {
    const result = addRenderer.apply(this, args);
    const render = this.renderer_.render.bind(this.renderer_);
    this.renderer_.render = (...renderArgs) => {
      const started = performance.now();
      try {
        return render(...renderArgs);
      } finally {
        const timing = window.__sceneTimings['renderer.render'] ?? { calls: 0, total: 0, longest: 0 };
        const duration = performance.now() - started;
        timing.calls += 1;
        timing.total += duration;
        timing.longest = Math.max(timing.longest, duration);
        window.__sceneTimings['renderer.render'] = timing;
      }
    };
    return result;
  };
});

await page.getByRole('link', { name: 'Visualize' }).click();
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-lazy-mount]').last().scrollIntoViewIfNeeded();
await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.waitForTimeout(250);
const timings = await page.evaluate(() => Object.fromEntries(
  Object.entries(window.__sceneTimings)
    .map(([name, timing]) => [name, {
      calls: timing.calls,
      totalMs: Math.round(timing.total),
      longestMs: Math.round(timing.longest),
    }])
    .sort((left, right) => right[1].totalMs - left[1].totalMs),
));
console.log(JSON.stringify(timings, null, 2));
await browser.close();
