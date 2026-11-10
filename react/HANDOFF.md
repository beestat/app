# React migration handoff log

Shared notes between agents (Codex / Claude) working on the React migration and cleanup branches. Newest entry first. Each entry: what was done, what is verified, what is next.

Ground rules:
- Never commit `api/user.php` (local dev-only change that makes `force_log_in` public for QA).
- Commit locally in small pieces. `feature/react-modernization` is pushed; do not push `feature/react-theme-cleanup` until requested.
- QA reuses `react/test-results/auth-state.json`; if it expires, a new force-login URL is needed from Jon.

## 2026-11-10: Claude, Jon's cleanup list (loader, alerts, slider, metrics, Air Quality, range overlay)

Jon's requests, all done:
- **Loader:** the rising inset fills were too dark (brightness .58). They now peak at .84 brightness / .72 opacity so the bars read as a lighter shimmer.
- **Footer:** removed the "Thermostat data, made useful." tagline. Phone link padding is tighter so all five links fit one row at 390px (Contact used to wrap alone).
- **Alerts:** list and opened rows share one `AlertRow`; the icon has `flexShrink: 0`, so opening an alert no longer shrinks the icon or moves the text. Rows are keyboard-focusable. The Dismiss button was red-on-red (invisible as a button); it now uses `red.dark`.
- **Range dialogs:** `ChartRangeMenu`'s dynamic Days number field is now a slider (1–max, every day labeled up to 7, weekly marks for 30) with a "Past N days" readout. Also fixed: the three cards fell back to 3 days for any saved count other than 1/3/7, so a custom 5 or 12 reset on reload. `savedRangeDays()` accepts any integer up to the card's max, like legacy.
- **Compare Metrics:** a dot marks where the user's line meets the curve (HTML so it stays round over the stretched SVG). Percentile display is capped at 99 because legacy's rounding produced "> 100% homes".
- **Air Quality hover:** the motion lanes are part of the synchronized hover (guide line on all four charts) and the readout lists sensors with motion at that time. Hovering the lanes themselves opens the readout via an invisible series, because Highcharts closes every tooltip except the hovered chart's. The lanes' left margin went from 45 to 60 to match the charts below; legacy had the same 15px offset, so motion did not line up in time.
- **Air Quality data bug:** the detail lines were read from the *summary* query (1 or 4 weeks), so a custom range older than that showed empty lines. They now come from the detail query, as in legacy.
- **Range changes:** Thermostat Detail, Sensor Detail, Air Quality Detail and Compare Metrics keep the previous chart under a dimmed, blurred `RefreshOverlay` with the loader while the new range loads (`placeholderData: keepPreviousForThermostat`). Switching thermostats still shows the full loader. Visualize's 3D view is unchanged; it still hides the scene while rebuilding.

Verified: typecheck, 53 unit tests, build, new `qa/cleanup-round-3.mjs` (alert geometry, both sliders + saved 5-day write, overlay during a delayed fetch, 28 metric dots on their markers, aligned Air Quality plots + four guides + Motion row), plus loading-indicator, compare-metric-geometry, tooltip-regressions, air-quality-menu/docked, footer-newsletter, detail-card-interactions, reset-zoom-state, custom-range-bounds, button-consistency, chart-range-settings (updated for the slider) and design-review.

Known: `qa/air-quality-geometry.mjs` heights and gaps pass, but its label comparison fails because the account's Air Quality range is now 7 days and legacy renders blank x labels there; the script assumes 3 days. Unrelated to this round.

Open question for Jon: on desktop the Alerts card stretches to the System/Sensors row height, leaving a large solid red block under a single alert.

## 2026-11-07: Codex, editor/create flow and chart interaction polish

Finished the latest cleanup requests without changing the API, floor-plan data, or exact legacy editor/3D engines. The Create Floor Plan dialog is now a complete theme-driven setup flow with structured plan/home sections, responsive fields, explicit basement behavior, validation, and a live floor/ceiling summary. Its intercepted QA still produces the exact legacy floor-plan payload. Disabled exact-editor tools now use flat, muted theme styling instead of appearing as active dark buttons; fresh four-theme screenshots and the full exact Visualize parity run pass at desktop, 390px, and 320px with `floor_plan.update` blocked.

The branded loader still uses five exact crops of the canonical `favicon.png`, but now animates only the logo's existing dark inset regions. The roof and full mark remain fixed while those dark regions rise in a visible staggered wave. Motion QA verifies the clip, brightness, opacity, source images, and delays.

Reset Zoom is disabled until a chart actually has zoom extremes on Thermostat Detail, Sensor Detail, Air Quality Detail, and Analyze Summary. The new `qa/reset-zoom-state.mjs` verifies Detail's complete disabled -> enabled -> disabled transition and Analyze's initial disabled state. Unknown Sensor temperatures now use a muted em dash with an accessible explanation instead of `???`.

Air Quality hover now presents one synchronized readout containing Air Quality, TVOC, and CO2 values at the shared timestamp while retaining guides on all three charts. Its tooltip uses Highcharts' outside layer so the third row cannot be clipped by a 75px plot. `qa/tooltip-regressions.mjs` now captures the hovered state and requires all three labels in the visible readout; it also retains the Sensor occupancy clipping, Summary/Profile guide, and Profile font-size checks.

The route screenshot sweep found the mobile Air Quality summary's 24 hour headers colliding into an unreadable string. Phones now label clean three-hour anchors (`12a`, `3a`, ...), while the full 24-column data grid and desktop hourly labels remain unchanged. Exact chart geometry/cadence QA and the rebuilt 14-state design review pass.

Verified this round: production build, 13 unit files / 53 tests, reset-zoom state, tooltip regressions, loader motion, Create Floor Plan payload/phone geometry, four-way floor-plan theming, nine-dialog review, fourteen-route desktop/mobile design review, and exact Visualize editor/scene parity. Fresh screenshots were inspected for the Create dialog, editor disabled states, Air Quality hover, Settings, Detail, Compare, and representative dialogs.

## 2026-11-07: Codex, button sizing and Metrics geometry

Normalized the MUI control scale: ordinary buttons, toggle buttons, Visualize setting tiles, header controls, and small icon buttons are exactly 32px high; small controls are 28px and intentional large CTAs are 40px. Lucide icons inside buttons are constrained to 18px so a default 24px icon can no longer silently make one button taller. The Change System Type choices are explicitly large option tiles and keep their deliberate 44/48px touch targets. `qa/button-consistency.mjs` checks all primary routes and currently verifies 71 medium controls plus 24 icon buttons at 32px.

Rebuilt the Compare Metrics plot geometry so the user's vertical marker and density curve share the exact same SVG coordinate system. Edge markers are no longer clamped away from their actual bucket. The value label clamps independently for readability, while min/max bounds now occupy a dedicated axis row beneath the plot instead of floating over the curve/fill. `qa/compare-metric-geometry.mjs` checks all 28 rendered metrics: marker/curve error is below 0.001 viewBox units and every bounds row remains inside its graph.

Moved the System card's weather bubble 23px farther outward so it no longer crowds the indoor temperature. `qa/system-circle-color.mjs` now checks the geometry at 1440px, 390px, and 320px; the measured text-to-bubble gap is 12.28px at each width and the bubble remains inside the card.

Separated the Sensors card's occupancy and in-use status icons with the theme spacing scale instead of rendering them edge-to-edge. `qa/sensor-status-spacing.mjs` verifies a 6px gap for every applicable sensor row at 1440px, 390px, and 320px, and the desktop/mobile screenshot review remains clean.

Removed the decorative thumbs-up from the empty Alerts card. The concise title and supporting copy now form the complete centered empty state, with less visual noise; the rebuilt 14-state desktop/mobile design review passes without errors.

Replaced the footer's tiny centered bullet list with a dedicated theme-driven `AppFooter`: a quiet divider, compact Beestat identity, properly grouped link targets, consistent hover/focus states, and an intentional stacked phone layout. All existing destinations remain unchanged, and the rebuilt 14-state desktop/mobile design review passes without errors or overflow.

Corrected the footer's Newsletter action to open the existing in-app subscription dialog instead of navigating to the external newsletter site. `qa/footer-newsletter.mjs` verifies the button semantics, finished dialog, and no overflow at 1440px, 390px, and 320px without submitting; the dialog's introductory copy also fixes the pre-existing “for an updates” typo.

Replaced Visualize's cramped Static heat-map minimum/maximum number inputs with a theme-driven dual-thumb slider. The current endpoints remain continuously visible, temperature uses the selected °F/°C unit, occupancy remains 0–100%, and API persistence happens only when a drag/keyboard adjustment is committed rather than on every intermediate movement. `qa/visualize-static-range.mjs` intercepts all setting writes, verifies both occupancy and temperature ranges plus paired min/max persistence at 1440px, 390px, and 320px, captures the card at each width, and blocks/fails on any floor-plan mutation.

## 2026-11-06: Codex, interaction consistency and second cleanup sweep

Made the branded loader's motion unmistakable without moving or redrawing the logo: the untouched canonical mark remains static while the four darker inset fills visibly rise from the bottom in a staggered wave. Reduced-motion still receives the static mark, and `qa/loading-indicator.mjs` now verifies the changing clip geometry in addition to stagger, brightness, and opacity.

Standardized MUI menu density, icon columns, typography, selected surfaces, direct-icon spacing, and dividers between selection/actions/help groups. Analyze's range presets now have meaningful icons, and the UI review captures Analyze and Air Quality menus in addition to the existing header/chart/Compare states. Restored hover guides on Temperature Profiles and Air Quality; the three Air Quality plots now synchronize their vertical guide and tooltip position. `qa/tooltip-regressions.mjs` verifies visible guides on Summary, Profile, and all three Air Quality plots while retaining the unclipped Sensor occupancy tooltip check.

The screenshot pass also removes Compare's deliberately padded dead space, balances Metrics into two dense desktop columns while preserving the legacy one-column mobile order, increases Air Quality series visibility, makes runtime-chip foregrounds derive from each segment's actual background, and rounds the nested sensor surfaces. Menu, chart, route, mobile-overflow, theme, typecheck, unit, and production-build checks pass; rerun the full suite after the final build/commit.

The Download Data preset strip no longer overrides the theme with welded square buttons. Presets are separate rounded controls with a consistent 6px gap and the same selected treatment as the rest of the app; download URL/date behavior and the 390px dialog geometry still pass.

## 2026-11-06: Codex, post-parity usability and visual-cohesion pass

Started the deliberate “keep Beestat, fix its old rough edges” pass. The app content now has a consistent 16px gutter below the header on desktop and mobile instead of the first card touching the app bar. MUI toggle buttons received clear theme-owned inactive, hover, focus, and selected surfaces. Compare’s Region/Property controls are real exclusive toggle groups with semantic green/purple selected states and outlined surfaced inactive states; Visualize settings use the same visual language rather than filling inactive buttons with a misleading slate color.

Added `qa/design-review.mjs`, which captures all seven primary routes at desktop and phone widths, scrolls through lazy cards, waits for branded loaders to finish, checks horizontal overflow, and blocks setting writes. The screenshot pass also changed Settings unit choices from checkbox-like squares to proper circular radio marks, gave the empty Alerts card an explicit “No active alerts / Everything looks good” state, and removed Contribute’s artificially stretched intro card. Dynamic colored cards/circles now derive foreground contrast from their actual theme color, including System status, Air Quality unsupported state, and Filter Info.

## 2026-11-06: Codex, cohesive dialogs, branded loading, themed editor, and Settings redesign

Applied a shared MUI dialog shell (spacing, rounded surfaced paper, borders, shadows, and actions) and rebuilt Change System Type as three semantic equipment groups with clear detected states. Its phone layout uses three compact columns so every choice remains visible above the actions. Added `qa/dialog-review.mjs`, which captures nine real dialogs at desktop and phone widths without mutating the account.

Added an animated Beestat loader based on the untouched canonical `favicon.png`. The complete logo—including roof, bar silhouettes, and bee—stays fixed while exact clipped copies of the four darker yellow bar insets brighten in a staggered wave. No artwork is redrawn, and reduced-motion users receive only the static mark. It replaces generic spinners in app startup/lazy routes, Detail runtime/sensors, Air Quality, Compare metrics, and Visualize. `qa/loading-indicator.mjs` verifies the canonical source, four staggered inset animations, a real opacity/filter change, and captures the blocked-API startup state after every image layer decodes.

The exact legacy floor-plan implementation remains intact, but its inline chrome is now bridged to MUI semantic surfaces, text, divider, and primary colors. Added overflow containment without changing editor geometry. `qa/floor-plan-theme.mjs` captures all four base/contrast combinations and verifies distinct computed paper/primary colors; exact Visualize parity still passes at 1440px, 390px, and 320px with the original toolbar, geometry, scene, and no test writes.

High-contrast variants now own genuinely distinct semantic/chart series ramps instead of inheriting their base palette. `qa/theme-charts.mjs` verifies four different live Highcharts palettes across Detail, Analyze, and Air Quality. Settings was reorganized into an Appearance card, a responsive Interface/Units/Temperature Profiles row, and paired thermostat/API management cards with consistent icons, descriptions, surfaces, and phone action layout. Existing setting keys, API calls, toast behavior, and profile regeneration are unchanged; Settings parity and screenshot review pass.

## 2026-11-05 18:10: Codex, focused themes and reimagined Metrics

Replaced the expanded preset catalog with the requested two-choice model: OG Beestat and Midnight are the only selectable base themes, and a separate `ui.high_contrast` checkbox resolves each to its internal high-contrast counterpart. Old saved System/Daylight/Honeycomb values safely fall back to OG Beestat; True Black falls back to Midnight. The four internal definitions now have deliberately separated page/card surfaces. Cards use contrast and a soft shadow rather than the disliked inset outline. Bright semantic surfaces now select whichever of white or near-black has the strongest actual contrast instead of accepting marginal white text; `theme.test.ts` locks all semantic controls in all four combinations to at least 4.5:1.

Reimagined Compare Metrics without changing its data or meaning. Solid color slabs became compact accent rails, and the histogram is presented as a Catmull-Rom-style smooth density curve with a translucent area fill. The current-home position/value, percentile, sample count, and min/max labels remain. The groups use responsive auto-fit layout and the current-value badge clamps at distribution edges. Desktop and 390px screenshots were inspected.

Added `qa/ui-review.mjs`, which captures the header menu, Announcements dialog, Compare menu, system-type dialog, mobile Metrics, and the mobile menu while intercepting setting writes. Updated theme picker/chart QA for the two-base-plus-checkbox model. Verified: typecheck/build, 13 unit files / 53 tests, authenticated e2e 14/14, Settings parity, Compare interactions, chart theme switching, four-way theme surfaces, six-state visual review, and no mobile overflow. `git diff --check` only reports Jon's intentionally untouched trailing whitespace in `api/user.php`.

The screenshot pass also removed Settings' desktop single-column dead space: Appearance stays full width, while UI, units, and profile controls now form a responsive section grid that collapses back to one column on phones. The legacy fixed heights on Settings and API-key cards were removed so their surfaces hug actual content.

Detail's top row no longer leaves an unexplained empty panel below the System status row. The fixed 398px card minimums were removed; Sensors now determines the row's natural height, and System uses a flex content layout that anchors equipment/climate status to the card bottom. This preserves the aligned three-card row without the marked dead area. Exact Detail chart/raceway geometry still passes at 1440px and 390px.

Chart range menus now align every row on the same icon column. Preset ranges use Calendar Range icons, Custom retains Calendar Days, and subtle dividers separate range selection, chart actions, and Help. The UI review suite now captures this open-menu state; Air Quality's exact conditional row set still passes.

## 2026-11-05 12:42: Codex, expanded theme presets and System mode

Expanded the Songstead-style theme catalog from three choices to five presets plus System: Beestat, Midnight, True Black, Daylight, and Honeycomb. True Black supplies pure-black OLED foundations; Honeycomb is a warm light palette that keeps the Beestat character; System follows the browser/device light-dark preference and previews the currently resolved palette. The default remains exact Beestat.

Extended intercepted theme QA across the full six-choice sequence, including exact surfaces/app bars/cards/link colors, System resolving to an emulated light preference, live persistence order, and a 390px no-horizontal-overflow assertion. The test always restores Beestat and does not mutate the account. Production build and typecheck pass.

## 2026-11-05 12:37: Codex, custom-theme visual audit and legacy CSS isolation

Captured and visually inspected full-page Midnight and Daylight Settings screenshots. Both palettes are coherent and the theme preview tiles remain representative inside either active theme. Disabled ripple animation on the theme tiles so selection changes are visually stable.

The Daylight screenshot exposed a real integration issue: legacy `dashboard.css` globally forces every `a:link` to `#ecf0f1`, overriding MUI anchor-buttons and making API Documentation nearly white on a white card. Added theme-owned link-state rules for MUI text/contained buttons and menu items across all semantic colors; legacy pages are untouched. `qa/theme-picker.mjs` now captures both theme screenshots and asserts the exact themed API-link color, preventing that leak from returning. Also made the app-bar thermostat switcher use a semantic translucent contrast surface (the Daylight slate ramp would otherwise produce white-on-white) and moved Sensor Detail's occupancy rail to the semantic subtle surface.

Verified production build, theme surface/link QA, runtime chart palette QA, 44 unit tests, Visualize branded loading state, and Visualize startup scheduling/performance. The latter still reports one expected long task from the verbatim legacy 3D implementation, but editor paint occurs before scene startup and there are zero floor-plan writes.

## 2026-11-05 12:30: Codex, theme-driven components and chart QA

Completed the first visual-literal audit. Remaining application colors now come from semantic MUI surfaces, palette ramps, contrast colors, or CSS theme variables; the few remaining inline RGB/RGBA values are data interpolation and shadows. Visualizer loading, Songstead promotion, compare chips/histograms, synchronized chart crosshairs, alert/sensor states, and header demo state no longer pin themselves to the legacy dark palette.

Centralized consistent MUI behavior for buttons, toggle buttons, menus, list icons, dialogs, tooltips, snackbars, and contrast text in `theme.ts`. Added a typed `contentSx` escape hatch to `DashboardCard` and removed page-level `.MuiCardContent-root` overrides. The legacy 24px card default remains intact; Settings/Contribute use explicit compact content and Compare/Analyze retain their geometry-specific values. An attempted universal 16px default was rejected after `qa/detail-geometry.mjs` caught an 8px Sensor Detail regression; after correction, exact desktop/mobile detail geometry passes again.

Added `qa/theme-charts.mjs`, which intercepts theme writes, switches through all themes, navigates to Detail without reloading dashboard state, and verifies exact Highcharts SVG strokes for each palette before restoring Beestat. Verified: theme surface QA, chart theme QA, typecheck, 44 unit tests, production build, authenticated e2e 14/14, Analyze geometry, Compare route audit, Contribute geometry, and exact Detail geometry. Next: inspect remaining repeated `sx` control patterns for reusable semantic components, capture light/dark screenshots, and run interaction/tooltip/visualizer checks before the next commit.

## 2026-11-05 12:20: Codex, theme-driven cleanup foundation

Pushed the completed parity work on `feature/react-modernization` and created `feature/react-theme-cleanup` on top. Replaced the single static MUI theme with a Songstead-style definition/factory architecture and three user-selectable themes: exact legacy Beestat, Midnight, and Daylight. The saved `ui.theme` setting is applied live through `AppThemeProvider`; a new Appearance picker on Settings uses the existing generic setting API, so neither the backend nor database changed. `auto` is accepted for forward/legacy compatibility.

Moved the active palette through the major app surfaces rather than recoloring only MUI chrome: runtime equipment/calendar metadata, Thermostat and Sensor Detail charts/raceways, System/Sensors/Alerts, Analyze charts, Air Quality charts, Compare, Contribute, header navigation, Visualize settings, and Highcharts HTML tooltip shells. Semantic surfaces (`raised`, `subtle`, `chart`, `tooltip`) and app-bar colors now live in the theme. The default Beestat definition preserves the current exact colors and layout.

Verified typecheck, 12 unit files / 44 tests, production build, existing Settings parity, and new intercepted `qa/theme-picker.mjs`. Theme QA performs Midnight -> Daylight -> Beestat live changes without mutating the account and checks exact body/app-bar/card RGB values. Next: centralize the remaining repeated component-state styling into MUI variants/overrides, audit raw visual literals, add chart-series theme QA, then run the full authenticated desktop/mobile suite and parity screenshots before pushing this cleanup branch.

## 2026-11-05 07:29: Codex, remove zero announcement badges

Removed MUI's hidden `0` badge nodes after all announcements are read. They were visually scaled away but remained in page/accessibility text, unlike legacy (and appeared as an unexplained `0` in every route text snapshot). The header and menu now instantiate a Badge only when `unread > 0`; otherwise they render the Lucide icon directly. Announcements dialog/icon/read persistence QA passes and now asserts no zero badge remains. Final integrated verification: production build, 12 unit files / 44 tests, and authenticated desktop/mobile e2e 14/14 all pass.

## 2026-11-05 07:23: Codex, exact Analyze desktop label cadence

Fixed a live geometry mismatch in Thermostat Summary. For the current 116 monthly rows, React rounded its target interval up and rendered `Apr/Aug/Dec` (29 labels), while legacy uses a three-month `Apr/Jul/Oct/Jan` cadence (39 labels). Desktop cadence now rounds down to legacy's roughly 38 intervals; the existing explicit nine-interval phone rule is unchanged. `qa/analyze-geometry.mjs` now passes exact x-label arrays and chart geometry at both 1440px and 390px. Production build passes.

Hardened `qa/detail-geometry.mjs` against sequential live requests landing on different five-minute boundary rows. It now compares label density and median pixel cadence (allowing one edge label) instead of absolute x coordinates, while retaining exact raceway, chart height, gap, and sensor-color checks. It passes at 1440px and 390px.

Also made `qa/poll-refresh.mjs` a real assertion instead of a log-only string search. It structurally parses single/batched API envelopes and requires `dashboard -> runtime.sync -> runtime_thermostat.read` after fast-forwarding five minutes. Both initial load and poll pass (two runtime reads are expected because Thermostat and Sensor Detail each consume thermostat runtime rows).

## 2026-11-05 07:17: Codex, sequence exact editor and 3D startup

Fixed a Visualize startup scheduling regression exposed by `qa/visualizer-load-performance.mjs`. Once the exact editor collapsed to 120px, the 3D lazy mount became visible and both idle callbacks could run in the same idle period, allowing expensive 3D initialization to follow editor construction before an editor paint. `ExactFloorPlanEditor` now reports readiness; `VisualizePage` gates the existing deferred 3D mount on that signal and keeps a single branded preparation wrapper visible meanwhile. No legacy editor or Three.js rendering implementation was changed.

The performance QA now measures the claimed condition directly: a mutation observer timestamps exact-editor readiness, a double-animation-frame paint opportunity, and exact-scene startup. Live result: `editorPaintOpportunity=2868.5`, `sceneStarted=4145.4`, so 3D starts during a later idle period, with zero floor-plan writes. Range switching still returns in 8ms, shows its loader in 4ms, finishes in 667ms, and performs zero scene rerenders. Exact 3D/editor parity passes at desktop, 390px, and 320px; the prior current-date failure was a stale October-only regex, now month-independent. Five-minute refresh preserves the same canvas, opacity 1, and no loader/flicker. Typecheck and production build pass.

## 2026-11-05 07:10: Codex, tooltip QA restored

Repaired two stale hover checks without changing app behavior. `qa/tooltip-regressions.mjs` now scrolls the lazy Sensor Detail card into view before waiting for its charts and switches to desktop before inspecting the floating Temperature Profiles tooltip (phones intentionally dock it). It passes with the mobile occupancy tooltip fully inside the viewport, a visible summary crosshair, and a 16px profile tooltip.

`qa/detail-tooltips.mjs` now finds legacy's anonymous docked tooltip by its actual table content; the prior selector expected a class/data attribute legacy never sets. A three-position live comparison captures every required row (`System Mode`, comfort profile, temperatures, hidden humidity, and `System Off`) in both legacy and React. Summary legend exclusivity and sensor occupancy-lane legend QA also pass. The authenticated e2e suite passes 14/14 and the 320px route sweep passes all ten routes with all five navigation items visible.

## 2026-11-05 07:06: Codex, Glenwood calendar-day boundary

Fixed Glenwood Report's one-year validation to count date-only calendar boundaries like legacy Moment. React previously divided elapsed local-midnight milliseconds by 24 hours, so an otherwise valid 366-day range spanning a fall DST transition could become `366.0417` and be rejected. Added a shared DST-independent `calendarDayDistance` helper and exact 366-day forward/reverse tests. Typecheck and 12 test files / 44 tests pass; production build passes.

The live `qa/glenwood-parity.mjs` rerun was attempted but the legacy enrollment page timed out waiting for its card during the current dev API instability. Its existing side-by-side screenshots and geometry audit remain unchanged; rerun it when the legacy page is healthy.

## 2026-11-05 07:00: Codex, DST-safe rolling chart ranges

Matched legacy Moment's calendar-day subtraction for dynamic Thermostat Detail, Sensor Detail, Air Quality Detail, and Air Quality summary ranges. The previous fixed `days * 86,400,000` subtraction shifted the requested local hour when a range crossed a daylight-saving transition. A shared `localDaysAgo` helper now preserves local wall-clock time.

Added unit coverage plus `qa/dynamic-range-dst.mjs`, which runs Detail in `America/New_York` at noon on November 5, selects Past 7 Days, intercepts the API, and verifies the lower bound is noon EDT on October 29 (`16:00Z`, not the incorrect `17:00Z`). Verified: browser QA passes, typecheck passes, 12 test files / 43 tests pass, and the production build passed before the browser check.

## 2026-11-05 06:55: Codex, bounded console audit resume

Resumed after the usage gap. The saved authentication still works; typecheck and all 41 unit tests pass. Hardened `qa/console-audit.mjs`: it snapshots/caps each route's scroll height instead of re-reading a lazy-growing document forever, scrolls from Node in bounded steps, and prints per-route progress. The sweep now completes all 14 desktop/mobile combinations rather than appearing hung.

The November 5 live run encountered intermittent dev API failures (two HTTP 500 responses and several >90s readiness misses) during the long desktop sweep. Mobile navigation and all routes were traversed, and no new React page errors were reported. Treat the missing-card results as backend instability and rerun once the dev API is healthy; do not weaken the audit to hide them.

## 2026-10-30 07:55: Codex, stable Air Quality rolling-axis parity

Fixed the pre-existing `qa/air-quality-geometry.mjs` false negative noted below. Legacy and React both use a rolling three-day window with five-minute samples; because the pages load sequentially, crossing a sample boundary can shift one suppressed hour label even when the 17-sample tick cadence is identical. The check now allows a one-label density difference and compares day transitions, while retaining exact chart heights and inter-chart gaps at 1440 and 390px. The live geometry run passes.

## 2026-10-30 07:45: Codex, exact Air Quality Detail menu

Resolved both judgment calls from iteration 23 in favor of strict legacy parity. Air Quality no longer shows the React-only Download Chart action. `ChartRangeMenu` now omits unavailable actions rather than rendering disabled rows, and Air Quality supplies Reset Zoom only when runtime data exists, matching legacy `air_quality_detail.decorate_top_right_`. Thermostat and Sensor Detail still pass both handlers and retain Download Chart and Reset Zoom.

New `qa/air-quality-menu.mjs` verifies the exact six live-data rows and an intercepted empty-data state where Reset Zoom is absent. Typecheck, 41 unit tests, and build pass.

## 2026-10-30 07:35: Codex, exact Thermostat Detail tooltip rows

Fixed the remaining `qa/detail-tooltips.mjs` capture issue. Legacy synchronizes the temperature and raceway charts, which can leave multiple visible HTML tooltips; the script now performs the second synthetic mouse move Highcharts 11 needs and reads the longest visible HTML tooltip instead of the empty SVG group or raceway tooltip.

That live comparison exposed an app gap: legacy reads all six temperature/humidity series from its metadata, regardless of legend visibility, while React relied on Highcharts `this.points` (which omits hidden series). React now uses timestamp maps for all six series, so its tooltip includes Indoor/Outdoor Humidity exactly like legacy even while those lines start hidden. The script asserts capture and the seven common rows on both implementations. Verified live at three positions plus typecheck, 41 unit tests, and build.

## 2026-10-30 07:25: Codex, exact 3D background poll refresh

Fixed the open item from iteration 31. Invalidating `['visualize-runtime']` did not refresh the exact 3D card because that legacy-backed card reads raw runtime caches directly and does not use the otherwise-unused React query. `DashboardContext` now increments `runtimeRefreshKey` only after the five-minute `runtime.sync` succeeds. `VisualizePage` passes it to `ExactThreeCard`, which fetches fresh raw sensor and thermostat rows through its existing in-place update path.

The poll path deliberately does not pause or hide the existing scene, set the branded loader, or rebuild Three.js geometry. `qa/visualizer-poll-refresh.mjs` fast-forwards a live Visualize page through one poll and asserts the order `dashboard -> runtime.sync -> visualize.runtime`, the same canvas identity, `aria-busy=false` throughout, opacity 1 throughout, and no loader. The original `qa/poll-refresh.mjs` still passes for Detail. Also verified: typecheck, 41 unit tests, production build.

## 2026-10-30 07:10: Claude, final summary of the overnight session

60 local commits on `feature/react-modernization` after `a466183`, none pushed. `api/user.php` was left uncommitted (dev-only `force_log_in` change). Every change was compared with the legacy source; the iteration entries below give the evidence and the `qa/` script for each.

**User-visible parity fixes**
- Header: legacy breakpoints (791/451px), 32px icon tiles, Detail highlighted at `/`, multi-thermostat quick switcher.
- Detail: chart placeholders while chunks load; sensor tile grid and gutters; System card circle color priority and snowflake color; time-to-temperature (mode priority, "1h 5m", "3:15 pm", "Never"); "•" separators; filter "Replace In" math.
- Thermostat tooltip: whole-run durations and "System Off", ported from legacy `get_data` and checked against 860 real rows (fixture test).
- Equipment naming by configured stages and non-heat-pump heat (furnace aux shown as orange "Heat"), across charts, chips and tooltips.
- Legends: Outdoor Temp/Degree Days exclusive; raceway stays aligned when humidity is shown; sensor occupancy lanes follow the legend; toggles survive refreshes.
- Docked tooltips under charts below 600px or with "Always Dock Tooltips" (all charts including Air Quality).
- Analyze: chip minute truncation (Aux 568h 49m), profile axis labels, stage names, summary tooltip grouping, custom count kept across All.
- Compare: percentage rounding, property type text, tile font size, metrics refetch after changing system type.
- Range dialogs: local-time request bounds, local default dates, day clamping, Visualize seven-day limit and date swap.

**Robustness**
- Log-out redirect on session/ecobee-access API errors; route error boundary; guarded localStorage; Highcharts accessibility warning silenced.
- Refresh like legacy's poll: stale dashboard refetches on tab focus, and each poll re-sends `runtime.sync` and refetches chart data.

**Tests and QA**
- Unit tests went from 15 to 41. e2e smoke now runs on saved auth across 7 routes × 2 widths (14/14).
- About 20 new `qa/*.mjs` scripts (side-by-side, header widths/switcher, modal parity, tooltips, console audit, poll refresh, etc.). They mostly don't change account data: setting writes are aborted or intercepted, though the side-by-side and capture scripts make no writes at all.
- `README.md` corrected; `PARITY.md` gained a "Cross-cutting behaviors" section.

**Open items for Codex**
- Watch Visualize for reload jank now that the 3D data refetches every 5 minutes (iteration 31).
- `qa/detail-tooltips.mjs` can't capture legacy's tooltip element yet.
- Air Quality's extra "Download Chart" and disabled-vs-hidden menu items (iteration 23) are judgment calls.
- The gas-furnace naming and running-equipment colors are covered by unit tests only, because no such live data was available.

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
