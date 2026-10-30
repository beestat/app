# React migration handoff log

Shared notes between agents (Codex / Claude) working on `feature/react-modernization`. Newest entry first. Each entry: what was done, what is verified, what is next.

Ground rules:
- Never commit `api/user.php` (local dev-only change that makes `force_log_in` public for QA).
- Commit locally in small pieces; do not push.
- QA reuses `react/test-results/auth-state.json`; if it expires, a new force-login URL is needed from Jon.

## 2026-10-30 03:50: Claude, iteration 31 (charts refresh on poll)

Done: legacy `beestat.poll` sends `runtime.sync` every 5-minute poll and, when it isn't served from cache, deletes the Detail/Sensor/Air Quality/3D chart caches so the charts pick up new rows. React synced only when the thermostat changed, so open charts never updated. `DashboardContext` now re-sends `runtime.sync` whenever the dashboard data refreshes (`query.dataUpdatedAt`). After each refresh that isn't the first sync for that thermostat, it invalidates the `runtime-thermostat`, `runtime-sensors`, `air-quality` and `visualize-runtime` queries. React can't see legacy's client-side "from cache" flag, so it invalidates on every poll (at most every 5 minutes).

Verified: typecheck, 41 unit tests, build, `qa/poll-refresh.mjs` (Playwright fake clock, fast-forward 5:05): dashboard → runtime.sync → runtime_thermostat.read repeats after one poll.

Possible follow-up: the 3D view (`visualize-runtime`) now refetches every 5 minutes, as legacy's `three_d` cache deletion does. Watch for visible reload jank on Visualize.

## 2026-10-30 03:40: Claude, iteration 30 (focus refresh, error boundary)

Done:
- **Correction to iteration 17:** `main.tsx` sets `refetchOnWindowFocus: false` for all queries, so returning to the tab did *not* refresh the dashboard. Legacy `beestat/poll.js` polls right away when the last poll is over 6 minutes old. The dashboard query now has `staleTime: 5 min` + `refetchOnWindowFocus: true`, so a focus refreshes only stale data. Other queries keep the global defaults.
- New `components/common/ErrorBoundary.tsx` wraps the routes in `App.tsx`, keyed by pathname. A render error in a page shows "Something went wrong showing this page." with Reload, while the header and navigation stay usable. Previously any render error blanked the whole app. Tests: `ErrorBoundary.test.tsx` (jsdom).

Verified: typecheck, 41 unit tests, build, e2e 14/14, console audit clean.

## 2026-10-30 03:30: Claude, iteration 29 (storage guard)

Done:
- `state/settings.ts` `setSetting` now ignores storage errors. `localStorage.setItem` throws when storage is blocked or full (e.g. some private-browsing modes), and `setThermostatId` calls it, so switching thermostats could have thrown there. `getSetting` was already guarded. This is the only storage access in `src`.
- New `state/settings.test.ts` (jsdom via a `// @vitest-environment jsdom` header, since the default test env is Node): round trip, fallback, and throwing storage.
- Temperature Profiles subtitle (duration wording, date format) checked against legacy: matches.

Verified: 39 unit tests, typecheck, build.

## 2026-10-30 03:25: Claude, iteration 28 (review sweep, PARITY update)

No code changes needed. Reviewed and found matching or not applicable:
- Legacy chart base: the occupancy plot band is just the lane background (React uses the chart background); `afterSetExtremes` sync is covered by Codex's zoom sync.
- Announcements: the unread count, mark-read on open, the first-run newsletter and auto-open for unread important announcements match `layer/load.js` and `header.js`.
- `beestat.ecobee.notify_if_down` is disabled in legacy (early `return`), so there's nothing to port.
- The Floor Plan card menu (Switch/Add New/Edit/Delete/Help) comes from legacy's own `floor_plan_editor` module, which React mounts as-is.

`PARITY.md` has a new "Cross-cutting behaviors" section listing what tonight's iterations verified.

## 2026-10-30 03:20: Claude, iteration 27 (Sensor legend ↔ occupancy)

Done: Sensor Detail legend visibility is now React state, the same pattern as Thermostat Detail. Hiding a sensor hides its temperature line *and* its occupancy lane, as legacy `card/runtime_sensor_detail.js` does. Indoor/Outdoor Temp keep their hidden-by-default state. Toggles survive data refreshes.

Verified: typecheck, 37 unit tests, build, e2e 14/14, `qa/sensor-legend-occupancy.mjs [sensor]`: Office lanes go 4 → 3 → 4. QA tip: a hidden Highcharts line here keeps its `g.highcharts-series` group but drops its path after about a second, so count drawn paths rather than groups.

## 2026-10-30 03:05: Claude, iteration 26 (legend behaviors)

Done:
- Thermostat Summary: Outdoor Temp and Degree Days are shown one at a time, as in legacy `chart/runtime_thermostat_summary.js` (each series' click handler hides the other). Implemented with the series `show` event, because in Highcharts 12 `this.visible` inside `legendItemClick` already reflects the new state, so legacy's check would be inverted. `qa/summary-legend.mjs`: clicking Degree Days hides Outdoor Temp and vice versa.
- Thermostat Detail: legacy `card/runtime_thermostat_detail.js` gives both the raceway and the temperature chart a 45px right margin while a right-axis (humidity) series is visible. React left the raceway at full width, so the plots were 46px out of alignment (`qa/detail-humidity-alignment.mjs`: 1407 vs 1361). Legend visibility is now React state (`legendItemClick` updates state and returns false), and both charts get `marginRight` from it, aligned at 1362. Side benefit: the 5-minute data refresh no longer resets humidity toggles to hidden.

Not done / to check: legacy `card/runtime_sensor_detail.js` syncs occupancy-lane visibility with the temperature legend (hiding a sensor's line hides its occupancy lane). React's Sensor Detail may already do this (Codex's checklist mentions occupancy). Verify with a legend click.

Verified: typecheck, 37 unit tests, build, e2e 14/14, both QA scripts.

## 2026-10-30 02:50: Claude, iteration 25 (Air Quality docked tooltips)

Done: legacy Air Quality is also three separate charts (`chart/air_quality.js`, `voc_concentration.js`, `co2_concentration.js`), each docking its own tooltip under itself, so React now gives each chart its own `useDockedTooltip()`. The shared `options()` formatter picks the hook by series name. That closes the gap left in iteration 24.

Verified: typecheck, 37 unit tests, build, `qa/air-quality-docked.mjs [width]`. At 390, hovering the charts fills the Air Quality, TVOC and CO₂ panels under their own charts with nothing floating; at 1440 there are no docked panels. QA tip: Highcharts needs two mouse moves inside a chart before it shows a tooltip, and hovering the vertical middle of the 135px CO₂ chart can land below the plot. The script hovers 30px from the top.

## 2026-10-30 02:40: Claude, iteration 24 (docked tooltips)

Done: React saved Settings → "Always Dock Tooltips" but never used it, and phones got floating tooltips over the chart. Legacy `beestat.component.chart` docks the tooltip into a panel under the chart when that setting is on **or** the window is < 600px. New `components/common/DockedTooltip.tsx` `useDockedTooltip()` returns `show(html)` (floating HTML, or stores it and returns false) and `panel` to render under the chart. It's wired into Thermostat Detail, Sensor Detail, Analyze Summary and Temperature Profiles.

Not done: Air Quality Detail. React draws it as three synchronized charts, each with its own tooltip, so one shared docked panel would show whichever fired last. Legacy's single chart produces one combined tooltip. Docking there needs the three readings merged first.

Verified: typecheck, 37 unit tests, build, e2e 14/14, `qa/docked-tooltips.mjs`: at 390 the tooltip is docked with nothing floating (screenshot `test-results/side-by-side/docked-tooltip-390.png`), at 1440 it floats.

## 2026-10-30 02:25: Claude, iteration 23 (chart range menus review)

No code changes needed. Checked every chart range dialog against its legacy modal:
- Thermostat Detail: 30-day max, 12-month lookback, title/description match.
- Sensor Detail: 7-day max, 3-month lookback, title/description match.
- Air Quality: 7-day max, 1-month lookback (legacy code uses `subtract(1, 'month')` even though its text says 90 days), title/description match.
- Menus: Past 1/3/7 Days, Custom, Reset Zoom, Help match on all three.

Differences left as-is (decide if they matter):
- Air Quality's menu in React has "Download Chart"; legacy doesn't. It's extra, not missing.
- Legacy shows Reset Zoom on Air Quality only when there is data, and `ChartRangeMenu` disables (rather than hides) items with no handler.

## 2026-10-30 02:20: Claude, iteration 22 (Visualize custom range)

Ported the missing rules from legacy `modal/visualize_custom.js` into `VisualizeSettingsCard`:
- Dates more than seven days apart show "Max range is seven days" and Save is disabled. React allowed any span, which could load months of sensor data into the 3D averaging.
- Reversed dates are swapped on save; React used to disable the button instead.
- Legacy title ("Visualize - Custom Range"), instruction text about multi-day averaging, and button label (Save).
- `qa/visualize-custom-range.mjs` (setting writes captured, never sent): a 10-day span shows the error with Save disabled; 10/20 → 10/17 saves as begin 10/17, end 10/20.

Verified: typecheck, 37 unit tests, build, the new QA script.

## 2026-10-30 02:10: Claude, iteration 21 (Analyze custom range)

Compared the Thermostat Summary custom dialog with legacy `modal/runtime_thermostat_summary_custom.js`. Options, plural labels, ∞ for All, and `parseInt || 1` already matched. Fixed: legacy keeps the typed count while All is selected and saves 0 only on Save, but React zeroed the draft count and came back as 1. The field also shows `max(1, count)` when leaving All, as legacy shows `count || 1`.

Verified: typecheck, 37 unit tests, build, `qa/analyze-interactions.mjs` (writes intercepted; it saves counts 3 and 6 as before).

## 2026-10-30 02:05: Claude, iteration 20 (console audit)

Done:
- Sensor Detail and Air Quality tooltips: legacy computes no durations there (only Thermostat Detail does), so iteration 19's gap doesn't apply.
- `qa/console-audit.mjs` visits all 7 routes at 1440 and 390, scrolls through each, and reports console warnings/errors, page errors and HTTP ≥ 400. The only finding was Highcharts' "include accessibility.js" warning. `components/common/highchartsSetup.ts` sets `accessibility.enabled: false` globally (legacy doesn't load the module either) and is imported by `chartTooltip.ts`. The audit is now clean across all 14 combinations.
- Bundle check: the `charts` chunk is byte-identical; `index` is 273.2 kB (it was 271.6 kB at the start of the night, the difference being tonight's header features).

Verified: typecheck, 37 unit tests, build, console audit clean.

## 2026-10-30 01:55: Claude, iteration 19 (Detail tooltip durations)

Found and fixed a real tooltip gap on Thermostat Detail:
- Legacy `beestat.runtime_thermostat.get_data` keeps running duration objects and stores a *reference* at each timestamp, so hovering any point in a run shows that whole run's length (fan, heat/cool/aux stages, accessories), and it adds a "System Off" row with how long heating/cooling has been off. React showed only the hovered 5-minute row's seconds ("Fan 0h 3m") and read a nonexistent `off_heat_cool` column, so "Off" never appeared.
- `runtimeData.ts` `legacyDurations()` ports that bookkeeping line for line: resets (compressor/aux only when all stages read exactly 0, fan, accessories), System Off accumulation, stage 2 references copied onto stage 1 and back. It exposes `data.durationAt[x]`. `offAt` is gone.
- The Thermostat Detail tooltip lists heat 1 / aux 1 / cool 1 / fan / accessories with their run length, stage 2 under stage 1 when > 0, "System Off" (gray), and "No data" when empty, as in legacy.
- Fixture test: `qa/dump-legacy-durations.mjs` captured 860 real rows plus legacy's computed durations into `src/components/detail/__fixtures__/legacy-durations.json`. React matches all 860. A synthetic heat-run test covers the stage 1/2 and reset paths (it's cooling-off season, so the fixture has only fan and System Off).
- `qa/detail-tooltips.mjs` hovers the React chart: it now shows e.g. "Fan 0h 7m … System Off 71h 40m". Its legacy side still can't find legacy's tooltip element, so it needs selector work if you want a live side-by-side.

Verified: 37 unit tests, typecheck, build.

## 2026-10-30 01:40: Claude, iteration 18 (summary tooltip grouping)

Done: Thermostat Summary series now carry their legacy code in `custom.code` (`sum_compressor_heat_1`, `sum_heating_degree_days`, …), and the tooltip groups rows by whether that code contains "heat" or "cool", as legacy `runtime_thermostat_summary` does. React used to group by display name, which put heating degree days under "other" and would misgroup renamed furnace stages. Both degree-day series are named "Degree Days" as in legacy (React's tooltip said "Cooling Degree Days").

Verified: typecheck, 35 unit tests, build, `qa/analyze-interactions.mjs` (setting writes intercepted).

## 2026-10-30 01:30: Claude, iteration 17 (data loading review, 900px, runtime tests)

Done:
- Dashboard loading reviewed against legacy `layer/load.js` and `beestat/poll.js`. Same batch, the per-thermostat `runtime.sync`, and a 5-minute refetch. TanStack's refetch-on-focus stands in for legacy's "poll immediately after 6+ minutes in the background" watcher. No change needed.
- Detail at 900px side by side: matches (text nav, three cards, sensors drop to one column in both).
- New `buildRuntimeData` tests, after checking the rules against legacy `runtime_thermostat.js`: compressor seconds split by `compressor_mode`, accessories by `accessory_type`, setpoint visibility per system mode, calendar lane mapping (Sleep / Smart Recovery / Eco Away / custom climate), per-thermostat labels, and `runtimeTickPositions` sampling.

Verified: 35 unit tests.

Untested pure modules left: `chartSync.ts`, `state/settings.ts`, `chartTooltip.ts`, `useVisualizeRuntime.ts`.

## 2026-10-30 01:20: Claude, iteration 16 (write-path audit, log-out redirects)

Done:
- `api/client.ts` now does what legacy `beestat.api.load_` does for error codes 1505 (session expired), 10000/10001/10002 (no or unrefreshable ecobee token), 10500 (access revoked) and 10501 (no ecobee access): it sends the browser to `/`, where log-in is handled. React used to show an error with a Retry button that could never succeed. Two new client tests cover the redirect and confirm other errors stay on the page.
- Audited every React write call against legacy. Settings → Temperature Profiles (ignore solar gain, custom start date) already mirrors legacy's `generate_profile` (clear cache) + `profile: null` + thermostat re-read. The only refresh gap found was Change System Type metrics, fixed in iteration 15.

Not done, noted: legacy also ignores error 10601 (newsletter "Failed to subscribe") silently. React's newsletter dialog shows the error message instead, which seems fine.

Verified: 30 unit tests, typecheck, build, `qa/api-error-state.mjs`.

## 2026-10-30 01:10: Claude, iteration 15 (Sensors sort, Change System Type)

Done:
- `ff0ce1d`: sensors sort case-insensitively (`localeCompare(b, 'en', { sensitivity: 'base' })`), as legacy does.
- Change System Type (Compare → My Home ⋮):
  - After saving, the `['metrics', thermostatId]` queries are invalidated. Comparisons match on system type, but the metrics query key only includes the comparison attributes, so React kept showing metrics for the old system type until reload. Legacy refetches `get_metrics` in the same batch.
  - A mode with neither reported nor detected equipment stays unselected and is left out of `system_types`, as in legacy. React defaulted it to `'none'` and would have saved that.
  - Cool buttons use legacy `blue.light`.
- Alerts were reviewed lightly; Codex's `qa/detail-card-interactions.mjs` already covers pin/dismiss/restore.

Verified: typecheck, 28 unit tests, build, `qa/compare-interactions.mjs` (intercepts the save, so nothing is persisted): the payload has all three modes.

## 2026-10-30 01:00: Claude, iteration 14 (System subtitle and footer)

Done:
- System subtitle and footer use legacy's " • " separator instead of " · " ("Cool • Schedule • 73.5", "Help • Feedback • …"). The sweep text now matches legacy exactly.
- "Last sync" tooltip uses the same with/without-date format as the "As of" time, as legacy does (format chosen from the status time's age).
- Override detection, setpoint display per mode and the 3-hour date rule already matched legacy `get_subtitle_`.

Verified: typecheck, 28 unit tests, build, `qa/compare.mjs` subtitle identical.

## 2026-10-30 00:55: Claude, iteration 13 (time to temperature)

Done: System card "Time to heat/cool" moved to `components/detail/timeToTemperature.ts` (unit-tested), a port of legacy `decorate_time_to_temperature_`:
- Operating mode uses legacy priority (aux 2 > aux 1 > heat 2 > heat 1 > cool 2 > cool 1) via the shared `operatingMode()` (the circle color uses it too). React used to take the first matching item in `running_equipment`.
- Duration is formatted like `beestat.time` ("1h 5m": minutes floored and unpadded, leading "0h " removed). React used `formatDuration`, which pads ("1h 05m") and rounds minutes.
- Clock is Moment `h:mm a` ("3:15 pm"); React used toLocaleTimeString ("3:15 PM").
- A rate of exactly 0 is "Never", as in legacy; React said "Unknown".

Verified: 28 unit tests, typecheck, build, e2e 14/14, circle color still matches (fan only right now). The box only appears while heating or cooling below setpoint, so a live comparison wasn't possible tonight.

## 2026-10-30 00:45: Claude, iteration 12 (System card colors)

Done:
- Temperature circle background now follows legacy `beestat.thermostat.get_color`. The highest running stage in the order aux 2 > aux 1 > heat 2 > heat 1 > cool 2 > cool 1 picks its series color from `equipmentFor(thermostat)`: red for aux on heat pumps, orange for aux on furnaces, orange-light/dark for heat stages, light-blue light/main for cool stages. React used one blue for any cooling and one orange for any heating (aux included), and checked cooling first.
- Running-equipment snowflake uses legacy `blue.light` (#4b7bec) instead of `lightBlue.light`.
- Running-equipment stage subscripts and "Aux heat" titles were already right (legacy uses detected stages and does not apply the furnace rename here).
- `qa/system-circle-color.mjs` compares the computed circle color and prints the running equipment. Tonight nothing is running and both are `rgb(38, 50, 56)`; recheck while heat or cool is running.

Verified: typecheck, 23 unit tests, build.

## 2026-10-30 00:35: Claude, iteration 11 (equipment naming by system type)

Done: `runtimeData.ts` has `equipmentFor(thermostat)`, a port of the series renames in legacy `layer/load.js`:
- First stages get " 1" ("Heat 1", "Cool 1", "Aux Heat 1") only when the configured stage count for that mode is > 1 (reported, else detected; `stageCount`/`systemType` helpers mirror `beestat.thermostat.get_stages`/`get_system_type`).
- **Non-heat-pump heat** (heat equipment not `compressor`/`geothermal`, e.g. a gas furnace): aux stage 1/2 take Heat/Heat 2 names and orange colors. React used to show furnace runtime as red "Aux" everywhere. This affects many legacy users.
- Aux stage 2 is "Aux 2", as legacy says, not "Aux Heat 2".

Wired into `buildRuntimeData(rows, thermostat)` (Detail, Sensor, Air Quality raceways and tooltips), `RuntimeChips` (labels are the stage-1 name minus its digit, like legacy `name.replace(/\d/, '')`), the Thermostat Detail tooltip mode colors, and the Thermostat Summary columns/chips. React previously guessed "Cool 1" etc. from whether stage-2 data was non-zero.

Verified: 23 unit tests (new `equipmentFor` cases: two-stage heat pump, single-stage with two aux stages, gas furnace, reported overriding detected), typecheck, build, e2e 14/14; Ziebee II Analyze text still matches legacy. The gas-furnace path is covered by unit tests only, since there's no such account available.

## 2026-10-30 00:20: Claude, iteration 10 (System/Analyze dialogs)

Done:
- `qa/modal-parity.mjs <filter_info|thermostat_info|weather|temperature_profiles_info>` renders the legacy modal directly (`new beestat.component.modal[name](...)`), opens the matching React dialog, and prints both texts.
- Thermostat Info and Weather: identical values. Weather only differs in line breaks inside the layout.
- Temperature Profiles Info / chart: React hard-coded "Cool 1 Δ", "Heat 1 Δ" and "Aux Heat 1 Δ". Legacy (`layer/load.js`) only adds the " 1" when `get_stages(mode) > 1` (reported stages, else detected). Ziebee II has one aux stage, so legacy says "Aux Heat Δ". `profileNames(thermostat)` in `AnalyzePage.tsx` now follows that rule for the info dialog, chart series and tooltip. Dialog text is now identical on dev.

Follow-up worth checking: legacy `layer/load.js` applies the same stage rule to Thermostat Summary names (`sum_compressor_heat_1` etc.) and renames aux to heat for non-heat-pump systems. React's summary decides "Cool"/"Cool 1" from whether stage-2 data is non-zero. It matches for Ziebee II, but could differ on accounts whose config and data disagree.

Verified: typecheck, 20 unit tests, build.

## 2026-10-30 00:05: Claude, iteration 9 (date edge cases, filter info)

Done:
- `d570be2`: Glenwood report `validIsoDate` parsed local midnight and compared the UTC date, so it rejected every valid date for users east of UTC. It now parses as UTC.
- Filter Info "Replace In" moved to `components/detail/filterInfo.ts` (unit-tested; expectations checked against the real `js/lib/moment/moment.js`):
  - Days are counted from now and truncated (`moment.diff(now, 'days')`). React counted from today's midnight, so a future date showed one day more than legacy.
  - Month-end last-changed dates clamp like `moment.add(n, 'months')` (Nov 30 + 3 mo = Feb 28) instead of rolling over.
  - "Xmo Yd" uses Moment's ceiling for the remaining days (React used round).
  - Lifespan pluralizes only when life > 1, as legacy does.
- `qa/filter-info-parity.mjs` opens the legacy modal and the React dialog: identical text on dev.
- Reviewed and already correct: Download Data (presets, local-offset timestamps, mobile-app lockout), `analyzeSummary.ts` date keys (consistently UTC on both sides).

Verified: 20 unit tests, typecheck, build.

Next: thermostat info and weather dialogs vs legacy; temperature profiles info modal.

## 2026-10-30 00:15: Claude, iteration 8 (custom range dialog and request bounds)

Compared `ChartRangeMenu` with legacy `modal/runtime_thermostat_detail_custom.js`. Fixed:
- Thermostat and Sensor Detail sent static ranges as offset-less strings (`2026-10-28T00:00:00`), so the server read them in its own time zone. Legacy sends `moment(...).format()` with the local offset. Both cards now send `new Date(local).toISOString()`; Air Quality already did this. `qa/custom-range-bounds.mjs` (New York time zone, `update_setting` aborted) shows the first row at `04:00Z`, which is local midnight.
- Dialog default dates used `toISOString().slice(0, 10)`, which is tomorrow's date every evening in the Americas. A `localDate()` helper now uses the viewer's calendar date.
- The dynamic day count is clamped on blur like legacy (blank/0 → 1, >30 → 30) instead of showing an error and disabling Save.

Already matched: 30-day max, "Detail not available for this range." with min = later of sync begin and 12 months ago.

Next: download/announcements dialogs; check other `toISOString().slice(0, 10)` uses (`analyzeSummary.ts:39`, `AirQualityPage.tsx:72` query key, `GlenwoodPage.tsx:89`) for local-vs-UTC intent.

## 2026-10-30 00:05: Claude, iteration 7 (header thermostat switcher)

Done:
- Multi-thermostat accounts now get legacy's header quick-switch tiles ("Name • 68°F", one per other thermostat, sorted by name, right-aligned before the ⋮ menu). As in legacy `get_switcher_width_`, they appear only when logo + navigation + menu + the measured switcher width fit: 791/451/346px base for the text/icon/phone layouts. Clicking calls `setThermostatId` (legacy reloads the page). The "Switch Thermostat" menu item and dialog are unchanged.
- `qa/header-switcher.mjs` injects a fake second thermostat ("Basement", id 999999) into the dashboard batch response in the browser and aborts every `update_setting` request, so nothing is persisted. Results: shown at 1440 and 600, hidden at 900 (791 + ~135 > 900) and 390, which matches legacy's rule.

Verified: typecheck, 16 unit tests, build; screenshots in `test-results/side-by-side/header-switcher-*.png`.

Next: dialogs side by side (custom range, download, announcements).

## 2026-10-29 23:55: Claude, iteration 6 (header breakpoints)

Done:
- Header now follows legacy `js/component/header.js`. Text navigation at ≥791px (logo 160 + nav 565 + menu 50 + margin 16); full logo with the 225px icon strip at 451–790px; favicon with icons below 451px. React used to switch at 900/600px, showed the favicon from 900px down, and stretched the icons across the whole bar on phones.
- Icon tiles are 32px squares 40px apart, like legacy, with a 20px gap after the favicon on phones. Below about 330px they may shrink instead of overflowing.
- `qa/header-widths.mjs` captures legacy/React header strips at 320/390/600/1000 into `test-results/side-by-side/header-*.png`.

Verified: typecheck, build; header captures match legacy at all four widths; `qa/mobile-routes.mjs` shows scrollWidth 320 on every route; e2e 14/14.

Gap noted, not done: when the account has several thermostats, legacy puts a thermostat switcher button in the header (`get_switcher_width_`), while React only has "Switch Thermostat" in the ⋮ menu. Ziebee II has one thermostat, so this can't be checked here.

Next: dialogs side by side (custom range, download, announcements, thermostat switcher).

## 2026-10-29 23:45: Claude, iteration 5 (Detail geometry)

Done:
- `9e61846`: Sensors card now uses legacy's grid, `repeat(auto-fit, minmax(144px, 1fr))` with 16px gaps (legacy's 160px minimum includes a 16px cell padding). React had a fixed 2-column grid with 8px gaps. At 1440 the tile columns now land on the same pixels as legacy (507–712 / 728–933); mobile is two columns with 16px gutters, as in legacy.
- Sensor Detail legend: removed a `maxWidth: 400` responsive rule forcing `itemWidth: 130`, which wrapped "Master Bedroom" and "Outdoor Temp" on mobile. Legacy sets no item width; it now matches at 390.

Checked, same as legacy: unlabeled fan icon in the System card, Cool Setpoint color (`lightblue.light` in both).

Next: dialogs (custom date range, download, announcements) side by side; Analyze at 390.

## 2026-10-29 23:35: Claude, iteration 4 (Visualize, coverage audit, e2e)

Done:
- Visualize side by side at 1440: matches legacy (floor plan card, settings, 3D card, toolbar, timeline).
- Mobile Compare (390): matches legacy, including the iteration 3 fixes.
- Audited every legacy `js/component/card/*` and `modal/*` that is actually used (weather, thermostat/filter info, change system type, visualize intro/video/affiliate, rate-app, enjoy-beestat, contribute benefits/status/merchandise). React has an equivalent for each. `early_access` and `rookstack_survey_notification` are not used anywhere in legacy.
- `7bf46ed`: README no longer says Visualize runs in an isolated surface (it loads the legacy scripts in-page via `legacyVisualizer.ts`) and documents the auth-state reuse and `qa/side-by-side.mjs`.
- `e2e/smoke.spec.ts` now reuses `test-results/auth-state.json` when `BEESTAT_FORCE_LOGIN_URL` is not set (it used to always skip). It also covers analyze/visualize/compare/air-quality/settings/contribute with a no-page-error assertion: 14/14 pass on desktop and mobile.

Next: interaction-level checks (chart range menus, custom date dialogs) against legacy; Analyze mobile; Detail sensor-tile geometry (legacy rows look slightly taller).

## 2026-10-29 23:25: Claude, iteration 3 (Compare, Settings, Air Quality)

Done (`7c0c3c9`):
- Compare metric tiles: the percentage used `Math.round(100 * n / sum)`; legacy uses `(n / sum * 100).toFixed(0)`. With 113/200 those give 57 vs 56, so Heat 2 balance point showed "> 57% homes" where legacy shows "> 56%". It now copies legacy's order.
- "Comparing to homes like…" shows the raw property type ("Property Type: detached"), as legacy does, instead of title-casing it.
- The tile sub-lines ("450 others", "< 88% homes") were 11px captions; legacy uses the 13px base font for all three lines.
- Added `qa/side-by-side.mjs <legacy-layer> <react-route> <ready-text> [width]`, which captures settled full-page legacy/React screenshots to `test-results/side-by-side/`.

Reviewed, no change needed:
- Settings: same content; React's modern controls look intentional. Legacy's Manage Thermostats ⋮ → Help opens `window.open('TODO')`, so React leaving that menu out is deliberate.
- Air Quality: layout and summary heatmap match.

Verified: tests, typecheck, build; Compare screenshot on dev matches legacy text.

Next: Visualize side by side; contribute/download/announcements dialogs; check mobile widths of Compare/Analyze for the same issues.

## 2026-10-29 23:30: Claude, iteration 2 (Analyze)

Done:
- Runtime chip totals: the old code used global `moment` only when the legacy visualizer had loaded it, and otherwise fell back to `(hours % 1) * 60`, which showed Aux as `568h 48m` where legacy shows `568h 49m`. `legacyDurationParts` (now in `analyzeSummary.ts`, with a unit test) copies Moment's exact `hours*1000*60*60` → floor seconds → floor minutes steps. Plain rounding is NOT right: legacy truncates Cool 2 to `6,601h 38m` and Heat 2 to `11,684h 46m`.
- Temperature Profiles y-axis labels had no color (nearly invisible) and a fixed `marginLeft: 36` clipped the minus sign ("-1°F" showed as "1°F"). They now use legacy's gray 11px style and an automatic margin.
- `qa/inspect-chip-total.mjs` prints legacy chip text next to both formulas for the live data.

Verified: 16 unit tests, typecheck, build; on dev, Analyze text and screenshot match legacy, including all five chip totals.

Known noise: `qa/parity.mjs` reports "An unknown error occurred when fetching the script." It comes from legacy's service-worker registration (`js/beestat.js:38`) in headless Chromium, not from React.

Next: compare the Compare, Settings and Air Quality parity screenshots in `test-results/parity/`.

## 2026-10-29 23:10: Claude, iteration 1

Done:
- `04ff872`: Detail nav tab is now highlighted at `/` (index route), not only at `#/detail`.
- `863a4b9`: Thermostat/Sensor Detail cards had `Suspense fallback={null}`, so they collapsed to zero height while their chunk loaded and the footer jumped. They now render a titled card placeholder at 500px.

Verified: test, typecheck and build pass; `qa/compare.mjs` shows no errors, and the first-paint screenshot shows the highlighted tab and placeholder cards. Note: dev.app.beestat.io serves this working copy directly, so `npm run build` is all it takes to deploy to dev.

Not an issue: the "0" after the nav in the sweep text is MUI's hidden unread badge.

Next ideas: compare first-paint and settled screenshots for the other routes; sensor tile geometry (legacy rows look about 84px vs 75px in React at 1440 wide); legacy uses MDI icons while React uses Lucide (intentional?).

## 2026-10-29 22:58: Claude, overnight session start

State on arrival (HEAD `a466183`):
- `PARITY.md` checklist is fully checked off.
- `npm test` (15 tests), `npm run typecheck` and `npm run build` all pass.
- The last Codex commits were QA hardening (unattended parity sweep, bounded API waits, preload guards).

Plan: run the full parity sweep and the QA scripts against dev, fix any regressions found, then close coverage gaps and clean up stale docs.
