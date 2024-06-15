beestat.runtime_thermostat = {};

/**
 * Get a bunch of data for the current runtime_thermostat rows. Includes
 * basically everything you need to make a cool chart.
 *
 * @param {number} thermostat_id The thermostat_id to get data for.
 * @param {object} range Range settings.
 * @param {string} key The key to pull the data from inside
 * beestat.cache.data. This exists because runtime_thermostat data exists in
 * two spots: one for the Thermostat Detail chart, and once for the Sensor
 * Detail chart.
 *
 * @return {object} The data.
 */
beestat.runtime_thermostat.get_data = function(thermostat_id, range, key) {
  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {}
    }
  };

  // Duration objects. These are passed by reference into the metadata.
  var durations = {};

  // Y values for equipment swimlane data.
  var equipment_y = {
    'calendar_event_smartrecovery': 3,
    'calendar_event_home': 3,
    'calendar_event_away': 3,
    'calendar_event_sleep': 3,
    'calendar_event_smarthome': 3,
    'calendar_event_smartaway': 3,
    'calendar_event_hold': 3,
    'calendar_event_vacation': 3,
    'calendar_event_quicksave': 3,
    'calendar_event_other': 3,
    'calendar_event_custom': 3,
    'compressor_heat_1': 16,
    'compressor_heat_2': 16,
    'auxiliary_heat_1': 16,
    'auxiliary_heat_2': 16,
    'compressor_cool_1': 16,
    'compressor_cool_2': 16,
    'fan': 29,
    'humidifier': 39,
    'dehumidifier': 39,
    'ventilator': 39,
    'economizer': 39
  };

  // Initialize a bunch of stuff.
  [
    'calendar_event_smartrecovery',
    'calendar_event_home',
    'calendar_event_away',
    'calendar_event_sleep',
    'calendar_event_smarthome',
    'calendar_event_smartaway',
    'calendar_event_hold',
    'calendar_event_vacation',
    'calendar_event_quicksave',
    'calendar_event_other',
    'calendar_event_custom',
    'outdoor_temperature',
    'indoor_temperature',
    'indoor_humidity',
    'outdoor_humidity',
    'setpoint_heat',
    'setpoint_cool',
    'compressor_heat_1',
    'compressor_heat_2',
    'auxiliary_heat_1',
    'auxiliary_heat_2',
    'compressor_cool_1',
    'compressor_cool_2',
    'fan',
    'humidifier',
    'dehumidifier',
    'ventilator',
    'economizer',
    'off_heat_cool',
    'dummy'
  ].forEach(function(series_code) {
    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false,
      'durations': {},

      /**
       * Note to future self: This can be used for all series. Need to
       * populate the raw data points for each series here. The tooltip should
       * get data from here and not the chart points array. Then the series
       * data can be whatever is necessary to produce a performance-optimized
       * chart as long as there is one series (dummy) that has a point at
       * every x-value. That will allow a smooth tooltip, lightweight lines,
       * and accurate data.
       */
      'data': {}
    };

    if (beestat.series[series_code] !== undefined) {
      data.metadata.series[series_code].name = beestat.series[series_code].name;
    } else {
      data.metadata.series[series_code].name = null;
    }

    durations[series_code] = {'seconds': 0};
  });

  data.metadata.series.calendar_event_name = {};
  data.metadata.series.system_mode = {};

  var begin_m;
  var end_m;
  if (range.type === 'dynamic') {
    begin_m = moment().subtract(
      range.dynamic,
      'day'
    );
    end_m = moment();
  } else {
    begin_m = moment(
      range.static_begin + ' 00:00:00'
    );
    end_m = moment(
      range.static_end + ' 23:59:59'
    );
  }

  begin_m
    .minute(Math.ceil(begin_m.minute() / 5) * 5)
    .second(0)
    .millisecond(0);

  var runtime_thermostats = beestat.runtime_thermostat.get_runtime_thermostats_by_date_(key);

  // Initialize moving average.
  var moving = [];
  var moving_count = 5;

  var offset;
  for (var i = 0; i < moving_count; i++) {
    offset = (i - Math.floor(moving_count / 2)) * 300000;
    moving.push(runtime_thermostats[begin_m.valueOf() + offset]);
  }

  // Loop.
  var current_m = begin_m;
  while (
    current_m.isSameOrAfter(end_m) === false
  ) {
    data.x.push(current_m.clone());

    // Without this series the chart will jump to the nearest value if there is a chunk of missing data.
    data.series.dummy.push(beestat.temperature(70));
    data.metadata.series.dummy.active = true;

    var runtime_thermostat = runtime_thermostats[
      current_m.valueOf()
    ];

    if (runtime_thermostat !== undefined) {
      /**
       * Outdoor temp/humidity (moving average).
       */
      var outdoor_temperature_moving = beestat.temperature(
        beestat.runtime_thermostat.get_average_(moving, 'outdoor_temperature')
      );
      if (runtime_thermostat.outdoor_temperature === null) {
        data.series.outdoor_temperature.push(null);
      } else {
        data.series.outdoor_temperature.push(outdoor_temperature_moving);
      }
      data.metadata.series.outdoor_temperature.data[current_m.valueOf()] =
        beestat.temperature(runtime_thermostat.outdoor_temperature);
      data.metadata.series.outdoor_temperature.active = true;

      var outdoor_humidity_moving = beestat.runtime_thermostat.get_average_(
        moving,
        'outdoor_humidity'
      );
      if (runtime_thermostat.outdoor_humidity === null) {
        data.series.outdoor_humidity.push(null);
      } else {
        data.series.outdoor_humidity.push(outdoor_humidity_moving);
      }
      data.metadata.series.outdoor_humidity.data[current_m.valueOf()] =
        runtime_thermostat.outdoor_humidity;
      data.metadata.series.outdoor_humidity.active = true;

      /**
       * Indoor temp/humidity.
       */
      data.series.indoor_humidity.push(runtime_thermostat.indoor_humidity);
      data.metadata.series.indoor_humidity.data[current_m.valueOf()] =
        runtime_thermostat.indoor_humidity;
      data.metadata.series.indoor_humidity.active = true;

      var indoor_temperature = beestat.temperature(
        runtime_thermostat.indoor_temperature
      );
      data.series.indoor_temperature.push(indoor_temperature);
      data.metadata.series.indoor_temperature.data[current_m.valueOf()] =
        indoor_temperature;
      data.metadata.series.indoor_temperature.active = true;

      /**
       * Add setpoints, but only when relevant. For example: Only show the
       * heat setpoint line when the heat is actually on.
       */
      if (
        runtime_thermostat.system_mode === 'auto' ||
        runtime_thermostat.system_mode === 'heat' ||
        runtime_thermostat.system_mode === 'auxiliary_heat'
      ) {
        var setpoint_heat = beestat.temperature(
          runtime_thermostat.setpoint_heat
        );
        data.series.setpoint_heat.push(setpoint_heat);
        data.metadata.series.setpoint_heat.data[current_m.valueOf()] = setpoint_heat;

        data.metadata.series.setpoint_heat.active = true;
      } else {
        data.series.setpoint_heat.push(null);
      }

      if (
        runtime_thermostat.system_mode === 'auto' ||
        runtime_thermostat.system_mode === 'cool'
      ) {
        var setpoint_cool = beestat.temperature(
          runtime_thermostat.setpoint_cool
        );
        data.series.setpoint_cool.push(setpoint_cool);
        data.metadata.series.setpoint_cool.data[current_m.valueOf()] = setpoint_cool;

        data.metadata.series.setpoint_cool.active = true;
      } else {
        data.series.setpoint_cool.push(null);
      }

      /*
       * HVAC Mode. This isn't graphed but it's available for the tooltip.
       * series.system_mode.chart_data.push([x, runtime_thermostat.system_mode]);
       */
      data.metadata.series.system_mode[current_m.valueOf()] = runtime_thermostat.system_mode;

      /*
       * Thanks, ecobee...I more or less copied this code from the ecobee Follow
       * Me graph to make sure it's accurate.
       */
      var this_calendar_event;
      var this_calendar_event_name;

      if (runtime_thermostat.event === null) {
        if (runtime_thermostat.climate === null) {
          this_calendar_event = 'calendar_event_other';
          this_calendar_event_name = 'Other';
        } else {
          switch (runtime_thermostat.climate.toLowerCase()) {
          case 'home':
          case 'sleep':
          case 'away':
            this_calendar_event = 'calendar_event_' + runtime_thermostat.climate.toLowerCase();
            this_calendar_event_name =
              runtime_thermostat.climate.charAt(0).toUpperCase() +
              runtime_thermostat.climate.slice(1);
            break;
          default:
            this_calendar_event = 'calendar_event_custom';
            this_calendar_event_name = runtime_thermostat.climate;
            break;
          }
        }
      } else if (runtime_thermostat.event.match(/SmartRecovery/i) !== null) {
        this_calendar_event = 'calendar_event_smartrecovery';
        this_calendar_event_name = 'Smart Recovery';
      } else if (runtime_thermostat.event.match(/^home$/i) !== null) {
        this_calendar_event = 'calendar_event_home';
        this_calendar_event_name = 'Home';
      } else if (runtime_thermostat.event.match(/^away$/i) !== null) {
        this_calendar_event = 'calendar_event_away';
        this_calendar_event_name = 'Away';
      } else if (runtime_thermostat.event.match(/^smarthome$/i) !== null) {
        this_calendar_event = 'calendar_event_smarthome';
        this_calendar_event_name = 'Smart Home';
      } else if (runtime_thermostat.event.match(/^smartaway$/i) !== null) {
        this_calendar_event = 'calendar_event_smartaway';
        this_calendar_event_name = 'Smart Away';
      } else if (
        runtime_thermostat.event.match(/^auto$/i) !== null ||
        runtime_thermostat.event.match(/^today$/i) !== null ||
        runtime_thermostat.event.match(/^hold$/i) !== null
      ) {
        this_calendar_event = 'calendar_event_hold';
        this_calendar_event_name = 'Hold';
      } else if (
        runtime_thermostat.event.match(/^vacation$/i) !== null ||
        runtime_thermostat.event.match(/(\S\S\S\s\d+\s\d\d\d\d)|(\d{12})/i) !== null
      ) {
        this_calendar_event = 'calendar_event_vacation';
        this_calendar_event_name = 'Vacation';
      } else if (runtime_thermostat.event.match(/^quicksave$/i) !== null) {
        this_calendar_event = 'calendar_event_quicksave';
        this_calendar_event_name = 'Quick Save';
      } else {
        this_calendar_event = 'calendar_event_other';
        this_calendar_event_name = 'Other';
      }

      [
        'calendar_event_smartrecovery',
        'calendar_event_home',
        'calendar_event_away',
        'calendar_event_sleep',
        'calendar_event_smarthome',
        'calendar_event_smartaway',
        'calendar_event_hold',
        'calendar_event_vacation',
        'calendar_event_quicksave',
        'calendar_event_other',
        'calendar_event_custom'
      ].forEach(function(calendar_event) {
        if (calendar_event === this_calendar_event) {
          data.series[calendar_event].push(equipment_y[calendar_event]);
          data.metadata.series[calendar_event].data[current_m.valueOf()] =
            equipment_y[calendar_event];
          data.metadata.series[calendar_event].active = true;
        } else {
          data.series[calendar_event].push(null);
        }
      });

      data.metadata.series.calendar_event_name[current_m.valueOf()] =
        this_calendar_event_name;

      /**
       * If all stages of the compressor are off, clear the durations. It is
       * important that this only get reset if the seconds values are also
       * zero to support backfilling.
       */
      if (
        runtime_thermostat.compressor_1 === 0 &&
        runtime_thermostat.compressor_2 === 0 &&
        (
          durations.compressor_heat_1.seconds > 0 ||
          durations.compressor_heat_2.seconds > 0 ||
          durations.compressor_cool_1.seconds > 0 ||
          durations.compressor_cool_2.seconds > 0
        )
      ) {
        durations.compressor_heat_1 = {'seconds': 0};
        durations.compressor_heat_2 = {'seconds': 0};
        durations.compressor_cool_1 = {'seconds': 0};
        durations.compressor_cool_2 = {'seconds': 0};
      }

      if (
        runtime_thermostat.auxiliary_heat_1 === 0 &&
        runtime_thermostat.auxiliary_heat_2 === 0 &&
        (
          durations.auxiliary_heat_1.seconds > 0 ||
          durations.auxiliary_heat_2.seconds > 0
        )
      ) {
        durations.auxiliary_heat_1 = {'seconds': 0};
        durations.auxiliary_heat_2 = {'seconds': 0};
      }

      // Reset fan to 0
      if (runtime_thermostat.fan === 0) {
        durations.fan = {'seconds': 0};
      }

      // Reset accessories
      if (runtime_thermostat.accessory === 0) {
        durations.humidifier = {'seconds': 0};
        durations.dehumidifier = {'seconds': 0};
        durations.ventilator = {'seconds': 0};
        durations.economizer = {'seconds': 0};
      }

      // System off duration
      if (
        durations.off_heat_cool.seconds === 0 &&
        (
          runtime_thermostat.compressor_1 < 300 &&
          runtime_thermostat.compressor_2 < 300 &&
          runtime_thermostat.auxiliary_heat_1 < 300 &&
          runtime_thermostat.auxiliary_heat_2 < 300 &&
          runtime_thermostat.fan < 300
        )
      ) {
        // If currently running and it stops.
        durations.off_heat_cool = {
          'seconds': 300 - Math.max(
            runtime_thermostat.compressor_1,
            runtime_thermostat.compressor_2,
            runtime_thermostat.auxiliary_heat_1,
            runtime_thermostat.auxiliary_heat_2
          )
        };
      } else if (
        durations.off_heat_cool.seconds > 0 &&
        (
          runtime_thermostat.compressor_1 > 0 ||
          runtime_thermostat.compressor_2 > 0 ||
          runtime_thermostat.auxiliary_heat_1 > 0 ||
          runtime_thermostat.auxiliary_heat_2 > 0
        )
      ) {
        // If not currently running and it starts
        durations.off_heat_cool.seconds +=
          Math.max(
            runtime_thermostat.compressor_1,
            runtime_thermostat.compressor_2,
            runtime_thermostat.auxiliary_heat_1,
            runtime_thermostat.auxiliary_heat_2
          );

        durations.off_heat_cool = {'seconds': 0};
      } else if (
        durations.off_heat_cool.seconds > 0
      ) {
        // If not currently running
        durations.off_heat_cool.seconds += 300;
      }

      data.metadata.series.off_heat_cool.durations[current_m.valueOf()] = durations.off_heat_cool;

      // Equipment
      [
        'fan',
        'compressor_heat_1',
        'compressor_heat_2',
        'auxiliary_heat_1',
        'auxiliary_heat_2',
        'compressor_cool_1',
        'compressor_cool_2',
        'humidifier',
        'dehumidifier',
        'ventilator',
        'economizer'
      ].forEach(function(series_code) {
        var runtime_thermostat_series_code;
        switch (series_code) {
        case 'compressor_heat_1':
        case 'compressor_heat_2':
          runtime_thermostat_series_code = series_code
            .replace('compressor_heat', 'compressor');
          break;
        case 'compressor_cool_1':
        case 'compressor_cool_2':
          runtime_thermostat_series_code = series_code
            .replace('compressor_cool', 'compressor');
          break;
        case 'humidifier':
        case 'dehumidifier':
        case 'ventilator':
        case 'economizer':
          runtime_thermostat_series_code = 'accessory';
          break;
        default:
          runtime_thermostat_series_code = series_code;
          break;
        }

        var equipment_on = function(series_code_on, runtime_thermostat_series_code_on) {
          switch (series_code_on) {
          case 'compressor_heat_1':
          case 'compressor_heat_2':
            return runtime_thermostat[runtime_thermostat_series_code_on] > 0 &&
              runtime_thermostat.compressor_mode === 'heat';
          case 'compressor_cool_1':
          case 'compressor_cool_2':
            return runtime_thermostat[runtime_thermostat_series_code_on] > 0 &&
              runtime_thermostat.compressor_mode === 'cool';
          case 'humidifier':
          case 'dehumidifier':
          case 'ventilator':
          case 'economizer':
            return runtime_thermostat[runtime_thermostat_series_code_on] > 0 &&
              runtime_thermostat.accessory_type === series_code;
          default:
            return runtime_thermostat[series_code] > 0;
          }
        };

        if (equipment_on(series_code, runtime_thermostat_series_code) === true) {
          data.metadata.series[series_code].active = true;
          data.metadata.series[series_code].durations[current_m.valueOf()] = durations[series_code];
          data.series[series_code].push(equipment_y[series_code]);
          data.metadata.series[series_code].data[current_m.valueOf()] =
            equipment_y[series_code];

          if (
            series_code === 'auxiliary_heat_1' ||
            series_code === 'compressor_heat_1' ||
            series_code === 'compressor_cool_1'
          ) {
            var series_code_2 = series_code.replace('1', '2');
            data.metadata.series[series_code_2].durations[current_m.valueOf()] = durations[series_code_2];
          }
          durations[series_code].seconds += runtime_thermostat[runtime_thermostat_series_code];

          /*
           * If heat/cool/aux 2 is on, extend the bar from heat/cool/aux 1
           * behind and set the duration.
           */
          if (series_code.slice(-1) === '2') {
            var series_code_1 = series_code.replace('2', '1');
            data.series[series_code_1]
              .splice(-1, 1, equipment_y[series_code_1]);
            data.metadata.series[series_code_1]
              .durations[current_m.valueOf()] = durations[series_code_1];

            data.metadata.series[series_code_1].data[current_m.valueOf()] =
              equipment_y[series_code_1];
          }
        } else {
          data.series[series_code].push(null);
        }
      });
    } else {
      data.series.calendar_event_smartrecovery.push(null);
      data.series.calendar_event_home.push(null);
      data.series.calendar_event_away.push(null);
      data.series.calendar_event_sleep.push(null);
      data.series.calendar_event_smarthome.push(null);
      data.series.calendar_event_smartaway.push(null);
      data.series.calendar_event_hold.push(null);
      data.series.calendar_event_vacation.push(null);
      data.series.calendar_event_quicksave.push(null);
      data.series.calendar_event_other.push(null);
      data.series.calendar_event_custom.push(null);
      data.series.indoor_temperature.push(null);
      data.series.outdoor_temperature.push(null);
      data.series.indoor_humidity.push(null);
      data.series.outdoor_humidity.push(null);
      data.series.setpoint_heat.push(null);
      data.series.setpoint_cool.push(null);
      data.series.fan.push(null);
      data.series.compressor_heat_1.push(null);
      data.series.compressor_heat_2.push(null);
      data.series.auxiliary_heat_1.push(null);
      data.series.auxiliary_heat_2.push(null);
      data.series.compressor_cool_1.push(null);
      data.series.compressor_cool_2.push(null);
      data.series.humidifier.push(null);
      data.series.dehumidifier.push(null);
      data.series.ventilator.push(null);
      data.series.economizer.push(null);
      data.series.off_heat_cool.push(null);
    }

    current_m.add(5, 'minute');

    /**
     * Remove the first row in the moving average and add the next one. Yes
     * this could introduce undefined values; that's ok. Those are handled in
     * the get_average_ function.
     */
    moving.shift();
    moving.push(runtime_thermostats[current_m.valueOf() + offset]);
  }

  return data;
};

/**
 * Given an array of runtime thermostats, get the average value of one of the
 * keys. Allows and ignores undefined values in order to keep a more accurate
 * moving average.
 *
 * @param {array} runtime_thermostats
 * @param {string} series_code
 *
 * @return {number} The average.
 */
beestat.runtime_thermostat.get_average_ = function(runtime_thermostats, series_code) {
  var average = 0;
  var count = 0;
  for (var i = 0; i < runtime_thermostats.length; i++) {
    if (
      runtime_thermostats[i] !== undefined &&
      runtime_thermostats[i][series_code] !== null
    ) {
      average += runtime_thermostats[i][series_code];
      count++;
    }
  }

  return average / count;
};

/**
 * Get all the runtime_thermostat rows indexed by date.
 *
 * @param {string} key The key to pull the data from inside
 * beestat.cache.data. This exists because runtime_thermostat data exists in
 * two spots: one for the Thermostat Detail chart, and once for the Sensor
 * Detail chart.
 *
 * @return {array} The runtime_thermostat rows.
 */
beestat.runtime_thermostat.get_runtime_thermostats_by_date_ = function(key) {
  var runtime_thermostats = {};
  if (beestat.cache.data[key] !== undefined) {
    beestat.cache.data[key].forEach(function(runtime_thermostat) {
      runtime_thermostats[moment(runtime_thermostat.timestamp).valueOf()] = runtime_thermostat;
    });
  }
  return runtime_thermostats;
};
