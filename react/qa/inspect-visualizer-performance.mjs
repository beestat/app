import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  storageState: 'test-results/auth-state.json',
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await page.goto('https://dev.app.beestat.io/react/index.php#/visualize', { waitUntil: 'domcontentloaded', timeout: 90_000 });
await page.locator('[data-editor-engine="beestat-exact"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-lazy-mount]').last().scrollIntoViewIfNeeded();
await page.locator('canvas[data-native-three="true"]').waitFor({ state: 'visible', timeout: 90_000 });
await page.locator('[data-visualizer-stage][aria-busy="false"]').waitFor({ timeout: 180_000 });

// Profile the already-mounted exact scene. Attaching to the live renderer is
// important: the visualizer scripts and sometimes the lazy scene itself may
// finish loading before an after-navigation prototype hook can be installed.
await page.evaluate(() => {
  window.__sceneTimings = {};
  window.__rangeLongTasks = [];
  window.__recordSceneTiming = (name, duration) => {
    const timing = window.__sceneTimings[name] ?? { calls: 0, total: 0, longest: 0 };
    timing.calls += 1;
    timing.total += duration;
    timing.longest = Math.max(timing.longest, duration);
    window.__sceneTimings[name] = timing;
  };
  const wrap = (target, name) => {
    const original = target?.[name];
    if (typeof original !== 'function' || original.__timed) return;
    const timed = function(...args) {
      const started = performance.now();
      try {
        return original.apply(this, args);
      } finally {
        window.__recordSceneTiming(name, performance.now() - started);
      }
    };
    timed.__timed = true;
    target[name] = timed;
  };

  const instance = window.beestat.component.card.three_d.active_instance_;
  const scene = instance.scene_;
  wrap(instance, 'get_data_');
  ['update_', 'set_date', 'update_raycaster_', 'update_celestial_light_intensities_', 'update_tree_wind_', 'update_weather_']
    .forEach((name) => wrap(scene, name));
  const render = scene.renderer_.render.bind(scene.renderer_);
  scene.renderer_.render = (...args) => {
    const started = performance.now();
    try {
      return render(...args);
    } finally {
      window.__recordSceneTiming('renderer.render', performance.now() - started);
    }
  };
  window.__rangeLongTaskObserver = new PerformanceObserver((list) => {
    window.__rangeLongTasks.push(...list.getEntries().map((entry) => Math.round(entry.duration)));
  });
  window.__rangeLongTaskObserver.observe({ type: 'longtask', buffered: false });
});

const today = page.getByRole('button', { name: 'Today', exact: true });
const yesterday = page.getByRole('button', { name: 'Yesterday', exact: true });
const todayBackground = await today.evaluate((node) => getComputedStyle(node).backgroundColor);
const yesterdayBackground = await yesterday.evaluate((node) => getComputedStyle(node).backgroundColor);
const target = todayBackground === yesterdayBackground || todayBackground.includes('55, 71, 79') ? today : yesterday;
await target.click();
await page.locator('[data-visualizer-stage][aria-busy="true"]').waitFor({ timeout: 30_000 });
await page.locator('[data-visualizer-stage][aria-busy="false"]').waitFor({ timeout: 180_000 });
const profile = await page.evaluate(() => ({
  timings: Object.fromEntries(Object.entries(window.__sceneTimings)
    .map(([name, timing]) => [name, {
      calls: timing.calls,
      totalMs: Math.round(timing.total),
      longestMs: Math.round(timing.longest),
    }])
    .sort((left, right) => right[1].totalMs - left[1].totalMs)),
  longTasks: window.__rangeLongTasks,
}));

if (!profile.timings['renderer.render'] || !profile.timings.set_date || !profile.timings.update_) {
  throw new Error(`Incomplete visualizer profile: ${JSON.stringify(profile)}`);
}
console.log(JSON.stringify(profile, null, 2));
await browser.close();
