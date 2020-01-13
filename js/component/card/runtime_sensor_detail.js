/**
 * Runtime detail card. Shows a graph similar to what ecobee shows with the
 * runtime info for a recent period of time.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for
 */
beestat.component.card.runtime_sensor_detail = function(thermostat_id) {
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
      'setting.runtime_sensor_detail_smoothing',
      'setting.runtime_sensor_detail_range_type',
      'setting.runtime_sensor_detail_range_dynamic',
      'cache.runtime_sensor'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.runtime_sensor_detail, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.runtime_sensor_detail.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var data = this.get_data_();

  this.chart_ = new beestat.component.chart.runtime_sensor_detail(data);
  this.chart_.render(parent);

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var required_begin;
  var required_end;
  if (beestat.setting('runtime_sensor_detail_range_type') === 'dynamic') {
    required_begin = moment()
      .subtract(
        beestat.setting('runtime_sensor_detail_range_dynamic'),
        'day'
      )
      .second(0);

    required_end = moment()
      .subtract(1, 'hour')
      .second(0);
  } else {
    required_begin = moment(
      beestat.setting('runtime_sensor_detail_range_static_begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('runtime_sensor_detail_range_static_end') + ' 23:59:59'
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
   * If the needed data exists in the database and the runtime_sensor
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  if (this.data_synced_(required_begin, required_end) === true) {
    if (beestat.cache.runtime_sensor === undefined) {
      this.show_loading_('Loading Runtime Detail');

      var value;
      var operator;

      if (beestat.setting('runtime_sensor_detail_range_type') === 'dynamic') {
        value = required_begin.format();
        operator = '>=';
      } else {
        value = [
          required_begin.format(),
          required_end.format()
        ];
        operator = 'between';
      }

      var api_call = new beestat.api();
      Object.values(beestat.cache.sensor).forEach(function(sensor) {
        if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
          api_call.add_call(
            'runtime_sensor',
            'read',
            {
              'attributes': {
                'sensor_id': sensor.sensor_id,
                'timestamp': {
                  'value': value,
                  'operator': operator
                }
              }
            }
          );
        }
      });

      api_call.set_callback(function(response) {
        var runtime_sensors = [];
        response.forEach(function(r) {
          runtime_sensors = runtime_sensors.concat(r);
        });
        beestat.cache.set('runtime_sensor', runtime_sensors);
      });

      api_call.send();
    }
  } else {
    this.show_loading_('Syncing Runtime Detail');
    setTimeout(function() {
      new beestat.api()
        .add_call(
          'thermostat',
          'read_id',
          {},
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
beestat.component.card.runtime_sensor_detail.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 1 Day')
    .set_icon('numeric_1_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_sensor_detail_range_dynamic') !== 1 ||
        beestat.setting('runtime_sensor_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_sensor');
        beestat.setting({
          'runtime_sensor_detail_range_dynamic': 1,
          'runtime_sensor_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 3 Days')
    .set_icon('numeric_3_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_sensor_detail_range_dynamic') !== 3 ||
        beestat.setting('runtime_sensor_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_sensor');
        beestat.setting({
          'runtime_sensor_detail_range_dynamic': 3,
          'runtime_sensor_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 7 Days')
    .set_icon('numeric_7_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_sensor_detail_range_dynamic') !== 7 ||
        beestat.setting('runtime_sensor_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('runtime_sensor');
        beestat.setting({
          'runtime_sensor_detail_range_dynamic': 7,
          'runtime_sensor_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Custom')
    .set_icon('calendar_edit')
    .set_callback(function() {
      (new beestat.component.modal.runtime_sensor_detail_custom()).render();
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

  if (beestat.setting('runtime_sensor_detail_smoothing') === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Disable Smothing')
      .set_icon('chart_line')
      .set_callback(function() {
        beestat.setting('runtime_sensor_detail_smoothing', false);
      }));
  } else {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Enable Smoothing')
      .set_icon('chart_bell_curve')
      .set_callback(function() {
        beestat.setting('runtime_sensor_detail_smoothing', true);
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://www.notion.so/beestat/891f94a6bdb34895a453b7b91591ec29');
    }));
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.runtime_sensor_detail.prototype.get_data_ = function() {
  var self = this;

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

  var series_codes = [];
  Object.values(beestat.cache.sensor).forEach(function(sensor) {
    if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
      series_codes.push('temperature_' + sensor.sensor_id);
      series_codes.push('occupancy_' + sensor.sensor_id);
    }
  });
  series_codes.push('dummy');

  // Initialize a bunch of stuff.
  var sequential = {};
  series_codes.forEach(function(series_code) {
    sequential[series_code] = 0;

    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false
    };
    if (series_code === 'dummy') {
      data.metadata.series[series_code].name = null;
    } else {
      var sensor_id = series_code.replace(/[^0-9]/g, '');
      data.metadata.series[series_code].name = beestat.cache.sensor[sensor_id].name;
    }
  });

  var begin_m;
  var end_m;
  if (beestat.setting('runtime_sensor_detail_range_type') === 'dynamic') {
    begin_m = moment().subtract(
      beestat.setting('runtime_sensor_detail_range_dynamic'),
      'day'
    );
    end_m = moment().subtract(1, 'hour');
  } else {
    begin_m = moment(
      beestat.setting('runtime_sensor_detail_range_static_begin') + ' 00:00:00'
    );
    end_m = moment(
      beestat.setting('runtime_sensor_detail_range_static_end') + ' 23:59:59'
    );
  }

  // TODO: This needs to be max of begin and when I actually have sensor data
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  begin_m = moment.max(
    begin_m,
    moment(thermostat.first_connected)
  );

  begin_m
    .minute(Math.ceil(begin_m.minute() / 5) * 5)
    .second(0)
    .millisecond(0);

  var runtime_sensors = this.get_runtime_sensor_by_date_();

  // Initialize moving average.
  var moving = [];
  var moving_count;
  if (beestat.setting('runtime_sensor_detail_smoothing') === true) {
    moving_count = 15;
  } else {
    moving_count = 1;
  }
  var offset;
  for (var i = 0; i < moving_count; i++) {
    offset = (i - Math.floor(moving_count / 2)) * 300000;
    moving.push(runtime_sensors[begin_m.valueOf() + offset]);
  }

  // Loop.
  var current_m = begin_m;
  while (
    // beestat.cache.runtime_sensor.length > 0 &&
    current_m.isSameOrAfter(end_m) === false
  ) {
    data.x.push(current_m.clone());

    // Without this series the chart will jump to the nearest value if there is a chunk of missing data.
    data.series.dummy.push(1);
    data.metadata.series.dummy.active = true;

    if (runtime_sensors[current_m.valueOf()] !== undefined) {
      runtime_sensors[current_m.valueOf()].forEach(function(runtime_sensor, j) {
        var temperature_moving = beestat.temperature(
          self.get_average_(moving, j)
        );
        data.series['temperature_' + runtime_sensor.sensor_id].push(temperature_moving);
        y_min_max(temperature_moving);
        data.metadata.series['temperature_' + runtime_sensor.sensor_id].active = true;

        if (runtime_sensor.occupancy === true) {
          let swimlane_properties =
            beestat.component.chart.runtime_sensor_detail.get_swimlane_properties(
              runtime_sensors[current_m.valueOf()].length,
              j
            );

          sequential['occupancy_' + runtime_sensor.sensor_id]++;
          data.series['occupancy_' + runtime_sensor.sensor_id].push(swimlane_properties.y);
        } else {
          if (sequential['occupancy_' + runtime_sensor.sensor_id] > 0) {
            let swimlane_properties =
              beestat.component.chart.runtime_sensor_detail.get_swimlane_properties(
                runtime_sensors[current_m.valueOf()].length,
                j
              );

            data.series['occupancy_' + runtime_sensor.sensor_id].push(swimlane_properties.y);
          } else {
            data.series['occupancy_' + runtime_sensor.sensor_id].push(null);
          }
          sequential['occupancy_' + runtime_sensor.sensor_id] = 0;
        }
      });
    } else {
      Object.values(beestat.cache.sensor).forEach(function(sensor) {
        if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
          data.series['temperature_' + sensor.sensor_id].push(null);
          data.series['occupancy_' + sensor.sensor_id].push(null);
        }
      });
    }

    current_m.add(5, 'minute');

    /**
     * Remove the first row in the moving average and add the next one. Yes
     * this could introduce undefined values; that's ok. Those are handled in
     * the get_average_ function.
     */
    moving.shift();
    moving.push(runtime_sensors[current_m.valueOf() + offset]);
  }

  return data;
};

/**
 * Get all the runtime_sensor rows indexed by date.
 *
 * @return {array} The runtime_sensor rows.
 */
beestat.component.card.runtime_sensor_detail.prototype.get_runtime_sensor_by_date_ = function() {
  var runtime_sensors = {};
  if (beestat.cache.runtime_sensor !== undefined) {
    beestat.cache.runtime_sensor.forEach(function(runtime_sensor) {
      var timestamp = [moment(runtime_sensor.timestamp).valueOf()];
      if (runtime_sensors[timestamp] === undefined) {
        runtime_sensors[timestamp] = [];
      }
      runtime_sensors[timestamp].push(runtime_sensor);
    });
  }
  return runtime_sensors;
};

/**
 * Given an array of runtime_sensors, get the average value of one of the
 * keys. Allows and ignores undefined values in order to keep a more accurate
 * moving average.
 *
 * @param {array} runtime_sensors
 * @param {string} j The index in the sub-array
 *
 * @return {number} The average.
 */
beestat.component.card.runtime_sensor_detail.prototype.get_average_ = function(runtime_sensors, j) {
  var average = 0;
  var count = 0;
  for (var i = 0; i < runtime_sensors.length; i++) {
    if (runtime_sensors[i] !== undefined) {
      average += runtime_sensors[i][j].temperature;
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
beestat.component.card.runtime_sensor_detail.prototype.get_title_ = function() {
  return 'Runtime Detail';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.runtime_sensor_detail.prototype.get_subtitle_ = function() {
  if (beestat.setting('runtime_sensor_detail_range_type') === 'dynamic') {
    var s = (beestat.setting('runtime_sensor_detail_range_dynamic') > 1) ? 's' : '';

    return 'Past ' +
      beestat.setting('runtime_sensor_detail_range_dynamic') +
      ' day' +
      s;
  }

  var begin = moment(beestat.setting('runtime_sensor_detail_range_static_begin'))
    .format('MMM D, YYYY');
  var end = moment(beestat.setting('runtime_sensor_detail_range_static_end'))
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
beestat.component.card.runtime_sensor_detail.prototype.data_synced_ = function(required_sync_begin, required_sync_end) {
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
