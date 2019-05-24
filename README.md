# Sponsors
## BrowserStack ![BrowserStack](https://3fxtqy18kygf3on3bu39kh93-wpengine.netdna-ssl.com/wp-content/themes/browserstack/img/browserstack-logo.svg)
I use BrowserStack to help me test and debug in devices that I do not have physical access to. They provide free access to their tools for open source projects.

# Patch Notes
### Beestat 1.3 (1/24/2019 - 4/4/2019)
### Bug Fixes:
- Fixed sensors not sorting alphabetically [[#92]](https://github.com/ziebelje/beestat-issues/issues/92)
- Fixed beestat not logging you out if ecobee access is revoked/fails [[#95]](https://github.com/ziebelje/beestat-issues/issues/95)
- Fixed graph exports not using correct font [[#50]](https://github.com/ziebelje/beestat-issues/issues/50)
- Fixed broken API cache; should improve performance [[#97]](https://github.com/ziebelje/beestat-issues/issues/97)
- Fixed system card not turning circle orange when heat is running (heat pumps only)
- Fixed some longstanding bugs where bad data from ecobee (temperature values out of range, etc) could throw exceptions
- Added toggle for gap fill on Aggregate Runtime
- Fixed gap fill not working if data was present but wrong

### Enhancements:
- General
  - Enabled orientation choice when pinning app on mobile devices [[#93]](https://github.com/ziebelje/beestat-issues/issues/93)
  - Added Air Filter info popup [[#96]](https://github.com/ziebelje/beestat-issues/issues/96)
  - Added localized caching to prevent sending unnecessary API calls (improves performance)
- UI
  - Made loading animation a little bit cooler
  - Switched to icon set with larger selection
  - Updated styling to be less "gray all the time"
- API
  - Added beestat-cached-until header to indicate when the API call will stop returning a cached response
- Home Comparisons
  - Added Home Comparisons page
  - Added "My Home" card
  - Shows the detected system types for heat, aux heat, and cool (95% accurate)
  - Allows changing the detected system types for heat, aux heat, and cool
  - Shows geographical region (usually State/Provice, Country)
  - Geographical region is determined based on address stored with ecobee
  - Shows property characteristics (structure type, stories, square feet, age)
  - Added "Comparison Settings" card
  - Allows you to choose the date your temperature profile is calculated from
  - Allows you to choose the region you compare your home to
  - Allows you to choose the type of home you compare your home to
  - Added "Heat Score" card
  - Heat Score is a measure of how quickly your home heats using your base heat system (not aux) compared to other homes. Cycles per hour and balance point are also factored in
  - Added "Cool Score" card
  - Cool Score is a measure of how quickly your home cools compared to other homes. Cycles per hour and balance point are also factored in.
  - Added "Resist Score" card
  - Resist Score is a measure of the rate at which your home's temperature changes when no heat/cool is running compared to other homes
  - Added new "Temperature Profile" card
  - Shows the "Resist" data much like the old Temperature Profile card
  - Also added a heat profile line to show the rate of heat change when your heat is running
  - Also added a heat profile line to show the rate of heat change when your cool is running
    
    
---

### Beestat 1.22 (12/13/2018 - 1/23/2019)
### Bug Fixes:
- Fixed temperature incorrectly rounding on System and Recent Activity [[#84]](https://github.com/ziebelje/beestat-issues/issues/84)
- Ecobee fixed authorization screen showing that beestat gets write permissions instead of just read [[#33]](https://github.com/ziebelje/beestat-issues/issues/33)
- Fixed thermostats with no internal sensors breaking application
- Fixed Aggregate Runtime double counting heat stage 1 for gas furnaces [[#89]](https://github.com/ziebelje/beestat-issues/issues/89)
- Fixed Aggregate Runtime aux getting cut off in certain circumstances

### Enhancements:
- Added ability to issue API keys for programmatic access to beestat [[#12]](https://github.com/ziebelje/beestat-issues/issues/) [[Link]](https://documenter.getpostman.com/view/6332024/RznFnd9912)
- Mobile app pinning uses "standalone" instead of "fullscreen" to mimic most other apps
- Added "Add to Home Screen" dialog on Android [[Link]](https://developers.google.com/web/fundamentals/app-install-banners/#the_mini-info_bar)
- Added friendly names for a number of recently added thermostat model numbers [[Link]](https://www.ecobee.com/home/developer/api/documentation/v1/objects/Thermostat.shtml#modelNumber)
- Updated setpoint to be one (heat/cool) or two (auto) lines instead of shaded range
- Updated API to return proper data types on int, boolean, and float values
- Decreased timeout when connecting to ecobee to 5 seconds
- Added error messages alerts to the GUI
- Slightly improved performance of API caching
- Improved readibility of outdoor temperature line on Aggregate Runtime

---

### Beestat 1.21 (11/4/2018 - 12/12/2018)
### Bug Fixes:
- Fixed comfort profiles not displaying correctly historically
- Fixed heat/cool differential temperature beestat alert not respecting temperature units
- Fixed loading percentages showing as negative on graphs
- Fixed some graphs never loading
- Fixed some alert icons not displaying correctly
- Fixed API call looping
- Fixed switching thermostats failing due to race condition
- Fixed temperature rounding sometimes being too precise
- Fixed error when setting a graph date range to the current date range
- Fixed error reporting not working

### Enhancements
- Moved beestat to host with Digital Ocean
- Added log out button
- Added outdoor humidity (tooltip only)
- Added automatic syncing of data behind the scenes (https://www.patreon.com/posts/new-patron-perk-23002191)
- Tweaked accessory series to separate it a bit from the fan series
- Improved performance of graph rendering when resizing browser
- Decreased smoothing on recent activity graph
- Added framework for adding new dashboards (will use for beestat 1.3)

### Beestat 1.2 (11/4/2018)
### Bug Fixes:
- Fixed dry contact sensors on EMS Si showing up as "undefined"
- Fixed fractional degrees incorrectly showing up on aggregate runtime y-axis
- Restored historical data lost during 1.1 conversion that ecobee no longer has (hotfixed)
- Slightly tweaked aggregate runtime adjustments for missing data to be more accurate

### Enhancements
- Design
  - Significantly improved look & feel
  - Added popup menus to group less common functionality
  - Added modal windows as necessary/useful
  - Changed color palette slightly
- System
  - Added humidity
  - Added mode (cool/heat/auto)
  - Added setpoint
  - Added running equipment (cool, heat, aux, fan, ventilator, humidifier, dehumidifier, economizer)
  - Added status (schedule/override)
  - Added currently active comfort profile
  - Added model number
  - Added serial number
  - Added firmware revision
  - Added weather station
  - Added first connected date
  - Added live updating (every 5 minutes; will be enabled within a week post-update)
  - Updated thermostat switcher to include system mode (cool/heat)
  - Updated thermostat switcher to include thermostat temperature
- Sensors
  - Added occupancy indicator
  - Added in-use indicator
  - Added temperature above/below average temperature indicator
  - Added live updating (every 5 minutes)
- Alerts (new card)
  - Added custom beestat alerts for heat/cool differential temp
  - Alerts can be dismissed from beestat (does not affect alerts on your thermostat)
- Patreon (new card)
  - You can now support beestat on Patreon: https://www.patreon.com/beestat
  - Patreon banner can be hidden if you link your Patreon account and you are a supporter
  - Patreon banner can be hidden for one month at a time if you are not a supporter
  - There are no software limitations if you are not a supporter
- Other
  - Added fractional degrees to mostly everything
  - Updated settings to store on server instead of client (which thermostat you have open, chart settings, alert settings, etc)
  - Updated storage schema to more genericly support different thermostat types (working towards Nest support)
  - Added "beestat.io" watermark to chart exports
  - Improved API call caching
  - Improved help screens a bit
  - Fixed tooltip positioning going off the edge on mobile
- Recent Activity
  - Added indoor humidity
  - Added follow me (Home, Away, Sleep, etc)
    - Note: Uses your current schedule so it can be wrong if you changed your schedule recently; fix is pending
  - Added system mode (tooltip only)
  - Added duration for all equipment runs (ex: see that your heat ran for 2h 32m)
  - Added accessory
  - Added colors to tooltip
  - Combined Heat1/2 & Cool1/2 into a single entry on the legend
  - Added deferred loading; loading of application is not blocked by this chart
- Aggregate Runtime
  - Updated tooltip to show time more granularly (ex: 2h 10m instead of rounding to 2h)
  - Added colors to tooltip
  - Added deferred loading; loading of application is not blocked by this chart
- Home Efficiency
  - Restyled graph to be nicer and more intuitive
  - Removed home & location info
  - Added arbitrary "efficiency score" and ranking. Higher score is better. Lower percentile is better.
  - More changes to this coming in the next version of beestat
  - Added deferred loading; loading of application is not blocked by this chart

---

### Beestat 1.1 (7/20/2018)
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

### Other Notes:
- Upon logging in all thermostat data will fully re-sync as there is new data added that was not synced previously.

### Known Issues:
- Re-sync is causing historical weather data (before April 2018) to be missing as ecobee no longer has this data
- Re-sync is causing historical thermostat data (before May 2017) to sometimes be missing as ecobee is no longer reporting this data

---

### Beestat 1.0 (5/8/2018)
#### Bug Fixes:
- N/A

#### Enhancements:
- Basic system view
- Recent activity graph
- Aggregate runtime graph
- Temperature Profile graph (beta)
