# React migration handoff log

Shared notes between agents (Codex / Claude) working on `feature/react-modernization`. Newest entry first. Each entry: what was done, what is verified, what is next.

Ground rules:
- Never commit `api/user.php` (local dev-only change that makes `force_log_in` public for QA).
- Commit locally in small pieces; do not push.
- QA reuses `react/test-results/auth-state.json`; if it expires, a new force-login URL is needed from Jon.

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
