# React parity checklist

This is the working acceptance list for comparisons against authenticated legacy Beestat using Ziebee II. A page is not complete until its desktop and mobile structure, data rules, controls, loading/empty/error states, and interactions have been compared in Playwright.

Latest QA note (2026-10-23): force-login and authenticated comparison are working again. The latest full desktop/mobile pass preflighted `System - Ziebee II` and completed with no page errors or failed HTTP responses. Targeted passes subsequently verified the corrected Analyze totals/date boundaries, preset grouping and custom controls, Compare metric layout, and Air Quality support/detail structure.

## Detail

- [x] Header/navigation and thermostat selector
- [x] System card: mode/schedule/override/as-of subtitle, indoor/weather circles, equipment, climate, time-to-temperature, menus/modals
- [x] Sensors card: internal sensor placement, two-column remote grid, temperature/occupancy/participation states, menu
- [x] Alerts card: alert-specific icons, compact rows, dismiss/restore, menus
- [x] Contribution/rating reminder eligibility
- [x] Songstead promotion placement and desktop/mobile layout
- [x] Thermostat runtime chips and mode-conditional setpoints
- [x] Thermostat comfort/equipment raceway
- [x] Thermostat synchronized zoom/crosshair, legacy tooltip detail, custom dates/download/reset/help menu
- [x] Sensor equipment and occupancy raceways
- [x] Sensor synchronized zoom/crosshair, occupancy tooltip state, custom dates/download/reset/help menu
- [x] Footer parity

## Analyze

- [x] Thermostat Summary series, totals, grouping, gap-fill/smart-scale and full menu
- [x] Temperature Profiles series, trendlines, raw traces, tooltip, history, info and menu

## Visualize

- [x] Temporary React lifecycle bridge with shared state (no iframe), retained as the migration reference
- [x] React-owned Visualize Settings card and persistence bridge
- [x] Native editor on the default route: typed model, SVG renderer, pan/zoom, layers, draft editing, explicit save and undo
- [x] Native 3D scene on the default route with independent Three.js lifecycle, geometry, runtime heatmap, playback and event-driven rendering
- [x] React-owned floor-plan editor feature parity, including layers, geometry, orientation, object properties and draft-safe undo/save
- [x] React-owned 3D scene, playback, date/weather controls, heat-map and occupancy parity
- [x] Read-only Playwright validation against the saved floor plan

## Compare

- [x] Comparison Settings controls and persistence
- [x] My Home card and system-type diagram
- [x] Every metric tile rendered as a histogram/percentile (no raw API payloads)

## Air Quality

- [x] Support-warning eligibility
- [x] Detail chart series/axes/tooltip/menu
- [x] Summary heatmap

## Settings and secondary pages

- [x] General settings and persistence
- [x] Manage thermostats behavior
- [x] API key management
- [x] Announcements, download, contribute, no-thermostat and demo states
