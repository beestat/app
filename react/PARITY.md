# React parity checklist

This is the working acceptance list for comparisons against authenticated legacy Beestat using Ziebee II. A page is not complete until its desktop and mobile structure, data rules, controls, loading/empty/error states, and interactions have been compared in Playwright.

## Detail

- [ ] Header/navigation and thermostat selector
- [ ] System card: mode/schedule/override/as-of subtitle, indoor/weather circles, equipment, climate, time-to-temperature, menus/modals
- [x] Sensors card: internal sensor placement, two-column remote grid, temperature/occupancy/participation states, menu
- [x] Alerts card: alert-specific icons, compact rows, dismiss/restore, menus
- [ ] Contribution/rating reminder eligibility
- [x] Songstead promotion placement and desktop/mobile layout
- [x] Thermostat runtime chips and mode-conditional setpoints
- [x] Thermostat comfort/equipment raceway
- [ ] Thermostat synchronized zoom/crosshair, legacy tooltip detail, custom dates/download/reset/help menu
- [x] Sensor equipment and occupancy raceways
- [ ] Sensor synchronized zoom/crosshair, occupancy tooltip state, custom dates/download/reset/help menu
- [ ] Footer parity

## Analyze

- [ ] Thermostat Summary series, totals, grouping, gap-fill/smart-scale and full menu
- [ ] Temperature Profiles series, trendlines, raw-data toggles, tooltip and menu

## Visualize

- [x] React lifecycle host with shared state (no iframe/passthrough)
- [ ] Floor-plan editor feature parity
- [ ] 3D scene, playback, heat-map and occupancy parity
- [x] Read-only Playwright validation against the saved floor plan

## Compare

- [x] Comparison Settings controls and persistence
- [ ] My Home card and system-type diagram
- [x] Every metric tile rendered as a histogram/percentile (no raw API payloads)

## Air Quality

- [ ] Support-warning eligibility
- [x] Detail chart series/axes/tooltip/menu
- [x] Summary heatmap

## Settings and secondary pages

- [ ] General settings and persistence
- [ ] Manage thermostats behavior
- [ ] API key management
- [ ] Announcements, download, contribute, no-thermostat and demo states
