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
    self.get_data_(true);
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.runtime_sensor_detail__runtime_thermostat',
      'cache.data.runtime_sensor_detail__runtime_sensor'
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

  this.charts_ = {
    'equipment': new beestat.component.chart.runtime_thermostat_detail_equipment(
      this.get_data_()
    ),
    'occupancy': new beestat.component.chart.runtime_sensor_detail_occupancy(
      this.get_data_()
    ),
    'temperature': new beestat.component.chart.runtime_sensor_detail_temperature(
      this.get_data_()
    )
  };

  var container = $.createElement('div').style({
    'position': 'relative'
  });
  parent.appendChild(container);

  var chart_container = $.createElement('div');
  container.appendChild(chart_container);

  this.charts_.equipment.render(chart_container);
  this.charts_.occupancy.render(chart_container);
  this.charts_.temperature.render(chart_container);

  // Sync extremes and crosshair.
  Object.values(this.charts_).forEach(function(source_chart) {
    Object.values(self.charts_).forEach(function(target_chart) {
      target_chart.sync_extremes(source_chart);
      target_chart.sync_crosshair(source_chart);
    });
  });

  // Keep the series list in sync across charts.
  this.charts_.temperature.addEventListener('legend_item_click', function() {
    this.get_chart().series.forEach(function(temperature_series) {
      var occupancy_key = temperature_series.name.replace('temperature', 'occupancy');
      self.charts_.occupancy.get_chart().series.forEach(function(occupancy_series) {
        if (occupancy_series.name === occupancy_key) {
          occupancy_series.setVisible(temperature_series.visible);
        }
      });
    });
  });

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
    moment(thermostat.data_begin)
  );

  // Don't go after now.
  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );

  required_end = moment.max(
    required_end,
    moment(thermostat.data_begin)
  );

  /**
   * If the needed data exists in the database and the runtime_sensor cache is
   * empty, then query the data. If the needed data does not exist in the
   * database, check every 2 seconds until it does.
   */
  if (beestat.thermostat.data_synced(this.thermostat_id_, required_begin, required_end) === true) {
    if (beestat.cache.data.runtime_sensor_detail__runtime_sensor === undefined) {
      this.show_loading_('Fetching');

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
        if (sensor.thermostat_id === self.thermostat_id_) {
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
            },
            'runtime_sensor_' + sensor.sensor_id
          );
        }
      });

      api_call.add_call(
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
        },
        'runtime_thermostat'
      );

      api_call.set_callback(function(response) {
        var runtime_sensors = [];
        for (var alias in response) {
          var r = response[alias];
          if (alias === 'runtime_thermostat') {
            beestat.cache.set('data.runtime_sensor_detail__runtime_thermostat', r);
          } else {
            runtime_sensors = runtime_sensors.concat(r);
          }
        }
        beestat.cache.set('data.runtime_sensor_detail__runtime_sensor', runtime_sensors);
      });

      api_call.send();
    } else if (this.has_data_() === false) {
      chart_container.style('filter', 'blur(3px)');
      var no_data = $.createElement('div');
      no_data.style({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': '100%',
        'height': '100%',
        'display': 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        'text-align': 'center'
      });
      no_data.innerText('No data to display');
      container.appendChild(no_data);
    }
  } else {
    this.show_loading_('Syncing');
    window.setTimeout(function() {
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
        beestat.cache.delete('data.runtime_sensor_detail__runtime_sensor');
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
        beestat.cache.delete('data.runtime_sensor_detail__runtime_sensor');
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
        beestat.cache.delete('data.runtime_sensor_detail__runtime_sensor');
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

  if (this.has_data_() === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Download Chart')
      .set_icon('download')
      .set_callback(function() {
        self.charts_.temperature.export();
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Reset Zoom')
      .set_icon('magnify_close')
      .set_callback(function() {
        self.charts_.temperature.reset_zoom();
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/891f94a6bdb34895a453b7b91591ec29');
    }));
};

/**
 * Whether or not there is data to display on the chart.
 *
 * @return {boolean} Whether or not there is data to display on the chart.
 */
beestat.component.card.runtime_sensor_detail.prototype.has_data_ = function() {
  var data = this.get_data_();
  for (var series_code in data.metadata.series) {
    if (
      series_code !== 'dummy' &&
      data.metadata.series[series_code].active === true
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Get data. This doesn't directly or indirectly make any API calls, but it
 * caches the data so it doesn't have to loop over everything more than once.
 *
 * @param {boolean} force Force get the data?
 *
 * @return {object} The data.
 */
beestat.component.card.runtime_sensor_detail.prototype.get_data_ = function(force) {
  const self = this;

  if (this.data_ === undefined || force === true) {
    var range = {
      'type': beestat.setting('runtime_sensor_detail_range_type'),
      'dynamic': beestat.setting('runtime_sensor_detail_range_dynamic'),
      'static_begin': beestat.setting('runtime_sensor_detail_range_static_begin'),
      'static_end': beestat.setting('runtime_sensor_detail_range_static_end')
    };

    var sensor_data = beestat.runtime_sensor.get_data(
      Object.values(beestat.cache.sensor).filter(function(sensor) {
        return sensor.thermostat_id === self.thermostat_id_;
      })
        .map(sensor => sensor.sensor_id),
      range,
      'runtime_sensor_detail__runtime_sensor'
    );
    var thermostat_data = beestat.runtime_thermostat.get_data(
      this.thermostat_id_,
      range,
      'runtime_sensor_detail__runtime_thermostat'
    );

    this.data_ = sensor_data;

    Object.assign(this.data_.series, thermostat_data.series);
    Object.assign(this.data_.metadata.series, thermostat_data.metadata.series);

    this.data_.metadata.chart.title = this.get_title_();
    this.data_.metadata.chart.subtitle = this.get_subtitle_();
  }

  return this.data_;
};

/**
 * Get the title of the card.
 *
 * @return {string} Title
 */
beestat.component.card.runtime_sensor_detail.prototype.get_title_ = function() {
  return 'Sensor Detail';
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
