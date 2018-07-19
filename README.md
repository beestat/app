This is an issues-only repository for beestat.io.

# Patch Notes

### Beestat 1.1 (TBD)
#### Bug Fixes:
- Fixed runtime over-reporting for multi-stage systems
- Fixed multiple stages not showing up for non-heat pump systems
- Fixed non-heat pump systems showing heat as aux
- Fixed graph rendering bug when changing the time range on Aggregate Runtime graph
- Fixed rendering issue on Temperature Profile graph when resizing
- Fixed too many fonts loading
- Fixed setpoint series generally behaving poorly in many circumstances
- Fixed database query failing when time zone was positive UTC (hotfixed)
- Fixed invalid date on aggregate runtime graph (hotfixed)

#### Enhancements:
- Added smoothing to inside and outside temperature series on Recent Activity graph
- Added 1d, 3d, 7d options to Recent Activity graph
- Added basic help descriptions to all graphs
- Added useful links to footer
- Added privacy page
- Improved overall look & feel of graphs slightly (size, colors, fonts, icons, etc)
- Improved performance of Recent Activity graph, especially when resizing or toggling series
- Improved chart export sizes/filenames
- Updated chart axis to not change when toggling series
- Rewrote entire frontend to not be a heap of garbage

### Beestat 1.0 (5/8/2018)
#### Bug Fixes:
- N/A

#### Enhancements:
- Basic system view
- Recent activity graph
- Aggregate runtime graph
- Temperature Profile graph (beta)
