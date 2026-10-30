# React migration handoff log

Shared notes between agents (Codex / Claude) working on `feature/react-modernization`. Newest entry first. Each entry: what was done, what is verified, what is next.

Ground rules:
- Never commit `api/user.php` (local dev-only change that makes `force_log_in` public for QA).
- Commit locally in small pieces; do not push.
- QA reuses `react/test-results/auth-state.json`; if it expires, a new force-login URL is needed from Jon.

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
