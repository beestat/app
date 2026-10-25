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

- [x] React owns routing, data coordination, and lifecycle; no iframe or legacy page passthrough is used
- [x] React-owned Visualize Settings card and persistence bridge
- [x] React lifecycle host mounts Beestat's exact floor-plan editor modules, preserving viewport, snapping, layers, geometry, object properties, keyboard controls, undo/redo, and plan management
- [x] React lifecycle host mounts Beestat's complete exact 3D card, preserving geometry, trees, roofs, openings, weather, lighting, camera, and every original toolbar control
- [x] Exact 3D runtime pipeline includes sensor temperature/occupancy, thermostat equipment state, address-based sun position, playback, date/weather, and heat-map scaling
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
