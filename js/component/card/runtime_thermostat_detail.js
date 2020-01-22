/**
 * Runtime detail card. Shows a graph similar to what ecobee shows with the
 * runtime info for a recent period of time.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for
 */
beestat.component.card.runtime_thermostat_detail = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

  /*
   * When a setting is changed clear all of the data. Then rerender which will
   * trigger the loading state. Also do this when the cache changes.
   *
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'setting.runtime_thermostat_detail_smoothing',
      'setting.runtime_thermostat_detail_range_type',
      'setting.runtime_thermostat_detail_range_dynamic',
      'cache.runtime_thermostat'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.runtime_thermostat_detail, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.runtime_thermostat_detail.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var data = this.get_data_();
  this.chart_ = new beestat.component.chart.runtime_thermostat_detail(data);
  this.chart_.render(parent);

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var required_begin;
  var required_end;
  if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
    required_begin = moment()
      .subtract(
        beestat.setting('runtime_thermostat_detail_range_dynamic'),
        'day'
      )
      .second(0);

    required_end = moment()
      .subtract(1, 'hour')
      .second(0);
  } else {
    required_begin = moment(
      beestat.setting('runtime_thermostat_detail_range_static_begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('runtime_thermostat_detail_range_static_end') + ' 23:59:59'
    );
  }

  // Don't go before there's data.
  required_begin = moment.max(
    required_begin,
    moment(thermostat.first_connected)
  );

  // Don't go after now.
  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );

  /**
   * If the needed data exists in the database and the runtime_thermostat
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  if (this.data_synced_(required_begin, required_end) === true) {
    if (beestat.cache.runtime_thermostat === undefined) {
      this.show_loading_('Loading Runtime Detail');

      var value;
      var operator;

      if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
        value = required_begin.format();
        operator = '>=';
      } else {
        value = [
          required_begin.format(),
          required_end.format()
        ];
        operator = 'between';
      }

      new beestat.api()
        .add_call(
          'runtime_thermostat',
          'read',
          {
            'attributes': {
              'thermostat_id': thermostat.thermostat_id,
              'timestamp': {
                'value': value,
                'operator': operator
              }
            }
          }
        )
        .set_callback(function(response) {
          beestat.cache.set('runtime_thermostat', response);
        })
        .send();
    }
  } else {
    this.show_loading_('Syncing Runtime Detail');
    setTimeout(function() {
      new beestat.api()
        .add_call(
          'thermostat',
          'read_id',
          {
            'attributes': {
              'inactive': 0
            }
          },
          'thermostat'
        )
        .set_callback(function(response) {
          beestat.cache.set('thermostat', response);
          self.rerender();
        })
        .send();
    }, 2000);
  }
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.runtime_thermostat_detail.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 1 Day')
    .set_icon('numeric_1_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 1 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 1,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 3 Days')
    .set_icon('numeric_3_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 3 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 3,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 7 Days')
    .set_icon('numeric_7_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 7 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 7,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Custom')
    .set_icon('calendar_edit')
    .set_callback(function() {
      (new beestat.component.modal.runtime_thermostat_detail_custom()).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Chart')
    .set_icon('download')
    .set_callback(function() {
      self.chart_.export();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Reset Zoom')
    .set_icon('magnify_minus')
    .set_callback(function() {
      self.chart_.reset_zoom();
    }));

  if (beestat.setting('runtime_thermostat_detail_smoothing') === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Disable Smothing')
      .set_icon('chart_line')
      .set_callback(function() {
        beestat.setting('runtime_thermostat_detail_smoothing', false);
      }));
  } else {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Enable Smoothing')
      .set_icon('chart_bell_curve')
      .set_callback(function() {
        beestat.setting('runtime_thermostat_detail_smoothing', true);
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://www.notion.so/Runtime-Detail-e499fb13fd4441f4b3f096baca1cb138');
    }));
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_data_ = function() {
  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {
        'title': this.get_title_(),
        'subtitle': this.get_subtitle_(),
        'y_min': Infinity,
        'y_max': -Infinity
      }
    }
  };

  // A couple private helper functions for manipulating the min/max y values.
  var y_min_max = function(value) {
    if (value !== null) {
      data.metadata.chart.y_min = Math.min(data.metadata.chart.y_min, value);
      data.metadata.chart.y_max = Math.max(data.metadata.chart.y_max, value);
    }
  };

  // Duration objects. These are passed by reference into the metadata.
  var durations = {};

  // Y values for equipment swimlane data.
  var equipment_y = {
    'calendar_event_smartrecovery': 94,
    'calendar_event_home': 94,
    'calendar_event_away': 94,
    'calendar_event_sleep': 94,
    'calendar_event_smarthome': 94,
    'calendar_event_smartaway': 94,
    'calendar_event_hold': 94,
    'calendar_event_vacation': 94,
    'calendar_event_quicksave': 94,
    'calendar_event_other': 94,
    'calendar_event_custom': 94,
    'compressor_heat_1': 67,
    'compressor_heat_2': 67,
    'auxiliary_heat_1': 67,
    'auxiliary_heat_2': 67,
    'compressor_cool_1': 67,
    'compressor_cool_2': 67,
    'fan': 47,
    'humidifier': 31,
    'dehumidifier': 31,
    'ventilator': 31,
    'economizer': 31
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
    'economizer',
    'dummy'
  ].forEach(function(series_code) {
    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false,
      'durations': {}
    };
    durations[series_code] = {'seconds': 0};
  });

  data.metadata.series.calendar_event_name = {};
  data.metadata.series.system_mode = {};

  /*
   * Figure out what date range to use.
   * var begin_m = moment()
   *   .subtract(
   *     beestat.setting('runtime_thermostat_detail_range_dynamic'),
   *     'day'
   *   );
   * begin_m
   *   .minute(Math.ceil(begin_m.minute() / 5) * 5)
   *   .second(0)
   *   .millisecond(0);
   * var end_m = moment();
   */

  var begin_m;
  var end_m;
  if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
    begin_m = moment().subtract(
      beestat.setting('runtime_thermostat_detail_range_dynamic'),
      'day'
    );
    end_m = moment().subtract(1, 'hour');
  } else {
    begin_m = moment(
      beestat.setting('runtime_thermostat_detail_range_static_begin') + ' 00:00:00'
    );
    end_m = moment(
      beestat.setting('runtime_thermostat_detail_range_static_end') + ' 23:59:59'
    );
  }

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  begin_m = moment.max(
    begin_m,
    moment(thermostat.first_connected)
  );

  begin_m
    .minute(Math.ceil(begin_m.minute() / 5) * 5)
    .second(0)
    .millisecond(0);

  var runtime_thermostats = this.get_runtime_thermostat_by_date_();

  // Initialize moving average.
  var moving = [];
  var moving_count;
  if (beestat.setting('runtime_thermostat_detail_smoothing') === true) {
    moving_count = 10;
  } else {
    moving_count = 1;
  }
  var offset;
  for (var i = 0; i < moving_count; i++) {
    offset = (i - Math.floor(moving_count / 2)) * 300000;
    moving.push(runtime_thermostats[begin_m.valueOf() + offset]);
  }

  // Loop.
  var current_m = begin_m;
  while (
    // beestat.cache.runtime_thermostat.length > 0 &&
    current_m.isSameOrAfter(end_m) === false
  ) {
    data.x.push(current_m.clone());

    // Without this series the chart will jump to the nearest value if there is a chunk of missing data.
    data.series.dummy.push(1);
    data.metadata.series.dummy.active = true;

    var runtime_thermostat = runtime_thermostats[
      current_m.valueOf()
    ];

    if (runtime_thermostat !== undefined) {
      /**
       * Things that use the moving average.
       */
      var indoor_humidity_moving = this.get_average_(moving, 'indoor_humidity');
      data.series.indoor_humidity.push(indoor_humidity_moving);
      data.metadata.series.indoor_humidity.active = true;

      var outdoor_humidity_moving = this.get_average_(moving, 'outdoor_humidity');
      data.series.outdoor_humidity.push(outdoor_humidity_moving);
      data.metadata.series.outdoor_humidity.active = true;

      var indoor_temperature_moving = beestat.temperature(
        this.get_average_(moving, 'indoor_temperature')
      );
      data.series.indoor_temperature.push(indoor_temperature_moving);
      y_min_max(indoor_temperature_moving);
      data.metadata.series.indoor_temperature.active = true;

      var outdoor_temperature_moving = beestat.temperature(
        this.get_average_(moving, 'outdoor_temperature')
      );
      data.series.outdoor_temperature.push(outdoor_temperature_moving);
      y_min_max(outdoor_temperature_moving);
      data.metadata.series.outdoor_temperature.active = true;

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
        y_min_max(setpoint_heat);

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
        y_min_max(setpoint_cool);

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
            this_calendar_event_name = runtime_thermostat.climate;
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
        durations[runtime_thermostat.accessory_type] = {'seconds': 0};
      }

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
 * Get all the runtime_thermostat rows indexed by date.
 *
 * @return {array} The runtime_thermostat rows.
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_runtime_thermostat_by_date_ = function() {
  var runtime_thermostats = {};
  if (beestat.cache.runtime_thermostat !== undefined) {
    beestat.cache.runtime_thermostat.forEach(function(runtime_thermostat) {
      runtime_thermostats[moment(runtime_thermostat.timestamp).valueOf()] = runtime_thermostat;
    });
  }
  return runtime_thermostats;
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
beestat.component.card.runtime_thermostat_detail.prototype.get_average_ = function(runtime_thermostats, series_code) {
  var average = 0;
  var count = 0;
  for (var i = 0; i < runtime_thermostats.length; i++) {
    if (runtime_thermostats[i] !== undefined) {
      average += runtime_thermostats[i][series_code];
      count++;
    }
  }

  return average / count;
};

/**
 * Get the title of the card.
 *
 * @return {string} Title
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_title_ = function() {
  return 'Runtime Detail';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_subtitle_ = function() {
  if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
    var s = (beestat.setting('runtime_thermostat_detail_range_dynamic') > 1) ? 's' : '';

    return 'Past ' +
      beestat.setting('runtime_thermostat_detail_range_dynamic') +
      ' day' +
      s;
  }

  var begin = moment(beestat.setting('runtime_thermostat_detail_range_static_begin'))
    .format('MMM D, YYYY');
  var end = moment(beestat.setting('runtime_thermostat_detail_range_static_end'))
    .format('MMM D, YYYY');

  return begin + ' to ' + end;
};

/**
 * Determine whether or not the data to render the desired date range has been
 * synced.
 *
 * @param {moment} required_sync_begin
 * @param {moment} required_sync_end
 *
 * @return {boolean} Whether or not the data is synced.
 */
beestat.component.card.runtime_thermostat_detail.prototype.data_synced_ = function(required_sync_begin, required_sync_end) {
  // Demo can just grab whatever data is there.
  if (window.is_demo === true) {
    return true;
  }

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  return (
    current_sync_begin.isSameOrBefore(required_sync_begin) &&
    current_sync_end.isSameOrAfter(required_sync_end)
  );
};
