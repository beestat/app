# Beestat React

Modern React frontend for Beestat. It uses the existing PHP API and database without schema or endpoint changes.

## Run locally

```bash
npm install
npm run dev
```

The Vite server proxies `/api` to `https://dev.app.beestat.io`. For a production-style build served by the existing Apache/PHP app:

```bash
npm run build
```

Then open `https://dev.app.beestat.io/react/index.php`. `index.php` reads Vite's manifest so every JavaScript and CSS URL is content-hashed and safe with the app's immutable cache headers.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Authenticated Playwright tests require `BEESTAT_FORCE_LOGIN_URL`. The `qa/compare.mjs` helper accepts that URL on stdin, captures legacy/React desktop screenshots plus a mobile screenshot, and never writes the login URL to the repository. After the first login it saves `test-results/auth-state.json`, which the other `qa/*.mjs` scripts reuse.

`qa/side-by-side.mjs <legacy-layer> <react-route> <ready-text> [width]` captures settled full-page legacy and React screenshots for a single route into `test-results/side-by-side/`.

dev.app.beestat.io serves this working copy, so `npm run build` updates the dev React app directly.

## Architecture and performance

- React 19, TypeScript, MUI, TanStack Query, Lucide, and Highcharts.
- The API client preserves the existing POST and batch contracts.
- Dashboard entities refresh every five minutes and deduplicate concurrent requests.
- Non-primary routes are code-split. Large chart components are lazy-loaded near the viewport, keeping them out of the first mobile render.
- Charts disable animation and markers for dense series and use Highcharts' boost path.
- The floor-plan editor and Three.js visualizer reuse Beestat's original modules. `components/visualize/legacyVisualizer.ts` loads those scripts into the page on demand (no iframe), and React components mount and tear them down. This keeps the heavily tuned 3D engine and all floor-plan behavior intact while React owns routing, data and the surrounding application.
- User settings and mutations continue to use the current API methods; no new persistence layer exists in this frontend.

## Routes

The production entry uses hash routing so it works under the current Apache configuration:

- `#/detail`
- `#/analyze`
- `#/visualize`
- `#/compare`
- `#/air-quality`
- `#/settings`
- `#/announcements`
- `#/download`
- `#/contribute`
