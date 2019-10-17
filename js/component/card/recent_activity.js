/**
 * Recent activity card. Shows a graph similar to what ecobee shows with the
 * runtime info for a recent period of time.
 */
beestat.component.card.recent_activity = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.recent_activity, beestat.component.card);

beestat.component.card.recent_activity.optional_series = [
  'compressor_heat_1',
  'compressor_heat_2',
  'compressor_cool_1',
  'compressor_cool_2',
  'auxiliary_heat_1',
  'auxiliary_heat_2',
  'fan',
  'dehumidifier',
  'economizer',
  'humidifier',
  'ventilator'
];

beestat.component.card.recent_activity.calendar_events = [
  'calendar_event_home',
  'calendar_event_away',
  'calendar_event_sleep',
  'calendar_event_vacation',
  'calendar_event_smarthome',
  'calendar_event_smartaway',
  'calendar_event_smartrecovery',
  'calendar_event_hold',
  'calendar_event_quicksave',
  'calendar_event_other'
];

/**
 * Decorate
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.recent_activity.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  this.chart_ = new beestat.component.chart();
  var series = this.get_series_();

  this.chart_.options.chart.backgroundColor = beestat.style.color.bluegray.base;
  this.chart_.options.exporting.filename = thermostat.name + ' - Recent Activity';
  this.chart_.options.exporting.chartOptions.title.text = this.get_title_();
  this.chart_.options.exporting.chartOptions.subtitle.text = this.get_subtitle_();

  var current_day;
  var current_hour;
  this.chart_.options.xAxis = {
    'categories': series.x.chart_data,
    'type': 'datetime',
    'lineColor': beestat.style.color.bluegray.light,
    'min': series.x.chart_data[0],
    'max': series.x.chart_data[series.x.chart_data.length - 1],
    'minRange': 21600000,
    'tickLength': 0,
    'gridLineWidth': 0,
    'labels': {
      'style': {'color': beestat.style.color.gray.base},
      'formatter': function() {
        var m = moment(this.value);
        var hour = m.format('ha');
        var day = m.format('ddd');

        var label_parts = [];
        if (day !== current_day) {
          label_parts.push(day);
        }
        if (hour !== current_hour) {
          label_parts.push(hour);
        }

        current_hour = hour;
        current_day = day;

        return label_parts.join(' ');
      }
    }
  };

  // Add some space for the top of the graph.
  this.y_max_ += 30;

  // Because higcharts isn't respecting the tickInterval parameter...seems to
  // have to do with the secondary axis; as removing it makes it work a lot
  // better.
  var tick_positions = [];
  var tick_interval = (thermostat.temperature_unit === '°F') ? 10 : 5;
  var current_tick_position =
    Math.floor(this.y_min_ / tick_interval) * tick_interval;
  while (current_tick_position <= this.y_max_) {
    tick_positions.push(current_tick_position);
    current_tick_position += tick_interval;
  }

  this.chart_.options.yAxis = [
    // Temperature
    {
      // 'alignTicks': false, // Uncommenting this will allow the humidity series to line up but it will also force the y-axis to be a bit larger. For example, a y min of 17 will get set to a min of 0 instead of 15 because the spacing is set to 20.
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + thermostat.temperature_unit;
        }
      },
      'tickPositions': tick_positions
    },

    // Top bars
    {
      'height': 100,
      'min': 0,
      'max': 100,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false}
    },

    // Humidity
    {
      'alignTicks': false,
      'gridLineColor': null,
      'tickInterval': 10,
      // 'gridLineDashStyle': 'longdash',
      'opposite': true,
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + '%';
        }
      },

      /*
       * If you set a min/max highcharts always shows the axis. Setting these
       * attributes prevents the "always show" logic and the 0-100 is achieved
       * with this set of parameters.
       * https://github.com/highcharts/highcharts/issues/3403
       */
      'min': 0,
      'minRange': 100,
      'ceiling': 100
    }
  ];

  this.chart_.options.tooltip = {
    'shared': true,
    'useHTML': true,
    'borderWidth': 0,
    'shadow': false,
    'backgroundColor': null,
    'followPointer': true,
    'crosshairs': {
      'width': 1,
      'zIndex': 100,
      'color': beestat.style.color.gray.light,
      'dashStyle': 'shortDot',
      'snap': false
    },
    'positioner': function(tooltip_width, tooltip_height, point) {
      return beestat.component.chart.tooltip_positioner(
        self.chart_.get_chart(),
        tooltip_width,
        tooltip_height,
        point
      );
    },
    'formatter': function() {
      var self = this;

      var sections = [];

      // HVAC Mode
      var system_mode;
      var system_mode_color;

      switch (series.system_mode.data[self.x]) {
      case 'auto':
        system_mode = 'Auto';
        system_mode_color = beestat.style.color.gray.base;
        break;
      case 'heat':
        system_mode = 'Heat';
        system_mode_color = beestat.series.compressor_heat_1.color;
        break;
      case 'cool':
        system_mode = 'Cool';
        system_mode_color = beestat.series.compressor_cool_1.color;
        break;
      case 'off':
        system_mode = 'Off';
        system_mode_color = beestat.style.color.gray.base;
        break;
      case 'auxiliary_heat':
        system_mode = 'Aux';
        system_mode_color = beestat.series.auxiliary_heat_1.color;
        break;
      }

      var section_1 = [];
      sections.push(section_1);

      if (system_mode !== undefined) {
        section_1.push({
          'label': 'Mode',
          'value': system_mode,
          'color': system_mode_color
        });
      }

      // Calendar Event / Comfort Profile
      var event;
      var event_color;

      for (var i = 0; i < beestat.component.card.recent_activity.calendar_events.length; i++) {
        var calendar_event = beestat.component.card.recent_activity.calendar_events[i];
        if (series[calendar_event].data[self.x] !== null) {
          event = beestat.series[calendar_event].name;
          event_color = beestat.series[calendar_event].color;
          break;
        }
      }

      if (event !== undefined) {
        section_1.push({
          'label': 'Comfort Profile',
          'value': event,
          'color': event_color
        });
      }

      var section_2 = [];
      sections.push(section_2);

      [
        'setpoint_heat',
        'setpoint_cool',
        'indoor_temperature',
        'outdoor_temperature',
        'indoor_humidity',
        'outdoor_humidity'
      ].forEach(function(series_code) {
        var value;

        if (series_code === 'setpoint_cool') {
          return; // Grab it when doing setpoint_heat
        } else if (series_code === 'setpoint_heat') {
          if (
            series[series_code].data[self.x] === null
          ) {
            return;
          }

          switch (series.system_mode.data[self.x]) {
          case 'heat':
            if (series.setpoint_heat.data[self.x] === null) {
              return;
            }
            value = beestat.temperature({
              'temperature': series.setpoint_heat.data[self.x],
              'convert': false,
              'units': true
            });
            break;
          case 'cool':
            if (series.setpoint_cool.data[self.x] === null) {
              return;
            }
            value = beestat.temperature({
              'temperature': series.setpoint_cool.data[self.x],
              'convert': false,
              'units': true
            });
            break;
          case 'auto':
            if (
              series.setpoint_heat.data[self.x] === null ||
              series.setpoint_cool.data[self.x] === null
            ) {
              return;
            }
            value = beestat.temperature({
              'temperature': series.setpoint_heat.data[self.x],
              'convert': false,
              'units': true
            });
            value += ' - ';
            value += beestat.temperature({
              'temperature': series.setpoint_cool.data[self.x],
              'convert': false,
              'units': true
            });
            break;
            default:
              return;
            break;
          }
        } else if (
          series_code === 'indoor_humidity' ||
          series_code === 'outdoor_humidity'
        ) {
          if (series[series_code].data[self.x] === null) {
            return;
          }
          value = series[series_code].data[self.x] + '%';
        } else {
          if (series[series_code].data[self.x] === null) {
            return;
          }
          value = beestat.temperature({
            'temperature': series[series_code].data[self.x],
            'convert': false,
            'units': true
          });
        }

        section_2.push({
          'label': beestat.series[series_code].name,
          'value': value,
          'color': beestat.style.color.gray.light
        });
      });

      var section_3 = [];
      sections.push(section_3);

      beestat.component.card.recent_activity.optional_series.forEach(function(series_code) {
        if (
          series[series_code].data[self.x] !== undefined &&
          series[series_code].data[self.x] !== null
        ) {
          section_3.push({
            'label': beestat.series[series_code].name,
            'value': beestat.time(series[series_code].durations[self.x].seconds),
            'color': beestat.series[series_code].color
          });
        }
      });

      return beestat.component.chart.tooltip_formatter(
        moment(this.x).format('ddd, MMM D @ h:mma'),
        sections
      );
    }
  };

  this.chart_.options.series = [];

  beestat.component.card.recent_activity.calendar_events.forEach(function(calendar_event) {
    self.chart_.options.series.push({
      'id': calendar_event,
      'linkedTo': (calendar_event !== 'calendar_event_home') ? 'calendar_event_home' : undefined,
      'data': series[calendar_event].chart_data,
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': 'Comfort Profile',
      'type': 'line',
      'color': beestat.series[calendar_event].color,
      'lineWidth': 5,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  });

  if (series.compressor_cool_1.enabled === true) {
    this.chart_.options.series.push({
      'id': 'compressor_cool_1',
      'data': series.compressor_cool_1.chart_data,
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': 'Cool',
      'type': 'line',
      'color': beestat.series.compressor_cool_1.color,
      'lineWidth': 10,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  }

  if (series.compressor_cool_2.enabled === true) {
    this.chart_.options.series.push({
      'data': series.compressor_cool_2.chart_data,
      'linkedTo': 'compressor_cool_1',
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': beestat.series.compressor_cool_2.name,
      'type': 'line',
      'color': beestat.series.compressor_cool_2.color,
      'lineWidth': 10,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  }

  if (series.compressor_heat_1.enabled === true) {
    this.chart_.options.series.push({
      'id': 'compressor_heat_1',
      'data': series.compressor_heat_1.chart_data,
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': 'Heat',
      'type': 'line',
      'color': beestat.series.compressor_heat_1.color,
      'lineWidth': 10,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  }

  if (series.compressor_heat_2.enabled === true) {
    this.chart_.options.series.push({
      'linkedTo': 'compressor_heat_1',
      'data': series.compressor_heat_2.chart_data,
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': beestat.series.compressor_heat_2.name,
      'type': 'line',
      'color': beestat.series.compressor_heat_2.color,
      'lineWidth': 10,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  }

  [
    'auxiliary_heat_1',
    'auxiliary_heat_2'
  ].forEach(function(equipment) {
    if (series[equipment].enabled === true) {
      self.chart_.options.series.push({
        'data': series[equipment].chart_data,
        'yAxis': 1,
        'marker': {
          'enabled': false,
          'states': {'hover': {'enabled': false}}
        },
        'name': beestat.series[equipment].name,
        'type': 'line',
        'color': beestat.series[equipment].color,
        'lineWidth': 10,
        'linecap': 'square',
        'states': {'hover': {'lineWidthPlus': 0}}
      });
    }
  });

  if (series.fan.enabled === true) {
    this.chart_.options.series.push({
      'data': series.fan.chart_data,
      'yAxis': 1,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'name': beestat.series.fan.name,
      'type': 'line',
      'color': beestat.series.fan.color,
      'lineWidth': 5,
      'linecap': 'square',
      'states': {'hover': {'lineWidthPlus': 0}}
    });
  }

  [
    'dehumidifier',
    'economizer',
    'humidifier',
    'ventilator'
  ].forEach(function(equipment) {
    if (series[equipment].enabled === true) {
      self.chart_.options.series.push({
        'data': series[equipment].chart_data,
        'yAxis': 1,
        'marker': {
          'enabled': false,
          'states': {'hover': {'enabled': false}}
        },
        'name': beestat.series[equipment].name,
        'type': 'line',
        'color': beestat.series[equipment].color,
        'lineWidth': 5,
        'linecap': 'square',
        'states': {'hover': {'lineWidthPlus': 0}}
      });
    }
  });

  this.chart_.options.series.push({
    'id': 'indoor_humidity',
    'data': series.indoor_humidity.chart_data,
    'yAxis': 2,
    'name': beestat.series.indoor_humidity.name,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'dashStyle': 'DashDot',
    'visible': false,
    'lineWidth': 1,
    'color': beestat.series.indoor_humidity.color,
    'states': {'hover': {'lineWidthPlus': 0}},

    /*
     * Weird HighCharts bug...
     * https://stackoverflow.com/questions/48374093/highcharts-highstock-line-change-to-area-bug
     * https://github.com/highcharts/highcharts/issues/766
     */
    'linecap': 'square'
  });

  this.chart_.options.series.push({
    'id': 'outdoor_humidity',
    'data': series.outdoor_humidity.chart_data,
    'yAxis': 2,
    'name': beestat.series.outdoor_humidity.name,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'dashStyle': 'DashDot',
    'visible': false,
    'lineWidth': 1,
    'color': beestat.series.outdoor_humidity.color,
    'states': {'hover': {'lineWidthPlus': 0}},

    /*
     * Weird HighCharts bug...
     * https://stackoverflow.com/questions/48374093/highcharts-highstock-line-change-to-area-bug
     * https://github.com/highcharts/highcharts/issues/766
     */
    'linecap': 'square'
  });

  this.chart_.options.series.push({
    'data': series.indoor_temperature.chart_data,
    'yAxis': 0,
    'name': beestat.series.indoor_temperature.name,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 2,
    'color': beestat.series.indoor_temperature.color,
    'states': {'hover': {'lineWidthPlus': 0}},

    /*
     * Weird HighCharts bug...
     * https://stackoverflow.com/questions/48374093/highcharts-highstock-line-change-to-area-bug
     * https://github.com/highcharts/highcharts/issues/766
     */
    'linecap': 'square'
  });

  this.chart_.options.series.push({
    'color': beestat.series.outdoor_temperature.color,
    'data': series.outdoor_temperature.chart_data,
    // 'zones': beestat.component.chart.get_outdoor_temperature_zones(),
    'yAxis': 0,
    'name': beestat.series.outdoor_temperature.name,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'dashStyle': 'ShortDash',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  this.chart_.options.series.push({
    'data': series.setpoint_heat.chart_data,
    'id': 'setpoint_heat',
    'yAxis': 0,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'name': beestat.series.setpoint_heat.name,
    'type': 'line',
    'color': beestat.series.setpoint_heat.color,
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}},
    'step': 'right'
  });

  this.chart_.options.series.push({
    'data': series.setpoint_cool.chart_data,
    'yAxis': 0,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'name': beestat.series.setpoint_cool.name,
    'type': 'line',
    'color': beestat.series.setpoint_cool.color,
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}},
    'step': 'right'
  });

  this.chart_.render(parent);

  this.show_loading_('Syncing Recent Activity');

  /*
   * If the data is available, then get the data if we don't already have it
   * loaded. If the data is not available, poll until it becomes available.
   */
  if (this.data_available_() === true) {
    if (beestat.cache.runtime_thermostat.length === 0) {
      this.get_data_();
    } else {
      this.hide_loading_();
    }
  } else {
    var poll_interval = 10000;

    beestat.add_poll_interval(poll_interval);
    beestat.dispatcher.addEventListener('poll.recent_activity_load', function() {
      if (self.data_available_() === true) {
        beestat.remove_poll_interval(poll_interval);
        beestat.dispatcher.removeEventListener('poll.recent_activity_load');
        self.get_data_();
      }
    });
  }
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.recent_activity.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 1 Day')
    .set_icon('numeric_1_box')
    .set_callback(function() {
      if (
        beestat.setting('recent_activity_time_count') !== 1 ||
        beestat.setting('recent_activity_time_period') !== 'day'
      ) {
        beestat.setting({
          'recent_activity_time_count': 1,
          'recent_activity_time_period': 'day'
        });

        /*
         * Rerender; the timeout lets the menu close immediately without being
         * blocked by the time it takes to rerender the chart.
         */
        setTimeout(function() {
          self.rerender();
        }, 0);
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 3 Days')
    .set_icon('numeric_3_box')
    .set_callback(function() {
      if (
        beestat.setting('recent_activity_time_count') !== 3 ||
        beestat.setting('recent_activity_time_period') !== 'day'
      ) {
        beestat.setting({
          'recent_activity_time_count': 3,
          'recent_activity_time_period': 'day'
        });

        setTimeout(function() {
          self.rerender();
        }, 0);
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 7 Days')
    .set_icon('numeric_7_box')
    .set_callback(function() {
      if (
        beestat.setting('recent_activity_time_count') !== 7 ||
        beestat.setting('recent_activity_time_period') !== 'day'
      ) {
        beestat.setting({
          'recent_activity_time_count': 7,
          'recent_activity_time_period': 'day'
        });
        setTimeout(function() {
          self.rerender();
        }, 0);
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Chart')
    .set_icon('download')
    .set_callback(function() {
      self.chart_.get_chart().exportChartLocal();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Reset Zoom')
    .set_icon('magnify_minus')
    .set_callback(function() {
      self.chart_.get_chart().zoomOut();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      (new beestat.component.modal.help_recent_activity()).render();
    }));
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.recent_activity.prototype.get_series_ = function() {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  /*
   * The more data that gets shown the larger the smoothing factor should be
   * (less points, smoother graph).
   */
  var smoothing_factor = beestat.setting('recent_activity_time_count') * 3;

  this.y_min_ = Infinity;
  this.y_max_ = -Infinity;

  /*
   * The chart_data property is what Highcharts uses. The data property is the
   * same data indexed by the x value to make it easy to access.
   */
  var series = {
    'x': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'setpoint_heat': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'setpoint_cool': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'outdoor_temperature': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'indoor_temperature': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'indoor_humidity': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'outdoor_humidity': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'system_mode': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    }
  };

  // Initialize the optional series.
  beestat.component.card.recent_activity.optional_series.forEach(function(optional_series) {
    series[optional_series] = {
      'enabled': false,
      'chart_data': [],
      'data': {},
      'durations': {}
    };
  });

  // Initialize the calendar event series.
  beestat.component.card.recent_activity.calendar_events.forEach(function(calendar_event) {
    series[calendar_event] = {
      'enabled': false,
      'chart_data': [],
      'data': {}
    };
  });

  /*
   * Overrides the %10 smoothing for when there is missing data. Basically just
   * ensures that the graph starts back up right away instead of waiting for a
   * 10th data point.
   */
  var previous_indoor_temperature_value = null;
  var previous_outdoor_temperature_value = null;
  var previous_indoor_humidity_value = null;
  var previous_outdoor_humidity_value = null;

  var min_x = moment()
    .subtract(
      beestat.setting('recent_activity_time_count'),
      beestat.setting('recent_activity_time_period')
    )
    .valueOf();

  /*
   * This creates a distinct object for each chunk of runtime so the total on
   * time can be computed for any given segment.
   */
  var durations = {};

  beestat.cache.runtime_thermostat.forEach(function(runtime_thermostat, i) {
    // if (runtime_thermostat.ecobee_thermostat_id !== thermostat.ecobee_thermostat_id) {
    //   return;
    // }
    //

    if (runtime_thermostat.compressor_mode === 'heat') {
      runtime_thermostat.compressor_heat_1 = runtime_thermostat.compressor_1;
      runtime_thermostat.compressor_heat_2 = runtime_thermostat.compressor_2;
      runtime_thermostat.compressor_cool_1 = 0;
      runtime_thermostat.compressor_cool_2 = 0;
    } else if (runtime_thermostat.compressor_mode === 'cool') {
      runtime_thermostat.compressor_heat_1 = 0;
      runtime_thermostat.compressor_heat_2 = 0;
      runtime_thermostat.compressor_cool_1 = runtime_thermostat.compressor_1;
      runtime_thermostat.compressor_cool_2 = runtime_thermostat.compressor_2;
    } else if (runtime_thermostat.compressor_mode === 'off') {
      runtime_thermostat.compressor_heat_1 = 0;
      runtime_thermostat.compressor_heat_2 = 0;
      runtime_thermostat.compressor_cool_1 = 0;
      runtime_thermostat.compressor_cool_2 = 0;
    } else {
      runtime_thermostat.compressor_heat_1 = null;
      runtime_thermostat.compressor_heat_2 = null;
      runtime_thermostat.compressor_cool_1 = null;
      runtime_thermostat.compressor_cool_2 = null;
    }

    runtime_thermostat.humidifier = 0;
    runtime_thermostat.dehumidifier = 0;
    runtime_thermostat.ventilator = 0;
    runtime_thermostat.economizer = 0;

    // The string includes +00:00 as the UTC offset but moment knows what time
    // zone my PC is in...or at least it has a guess. This means that beestat
    // graphs can now show up in local time instead of thermostat time.
    var x = moment(runtime_thermostat.timestamp).valueOf();
    if (x < min_x) {
      return;
    }

    series.x.chart_data.push(x);

    var original_durations = {};
    if (runtime_thermostat.compressor_heat_2 > 0) {
      original_durations.compressor_heat_1 = runtime_thermostat.compressor_heat_1;
      runtime_thermostat.compressor_heat_1 = runtime_thermostat.compressor_heat_2;
    }
    // TODO DO THIS FOR AUX
    // TODO DO THIS FOR COOL

    beestat.component.card.recent_activity.optional_series.forEach(function(series_code) {
      if (durations[series_code] === undefined) {
        durations[series_code] = [{'seconds': 0}];
      }

      // if (series_code === 'compressor_heat_1') {
        // runtime_thermostat
      // }

      if (
        runtime_thermostat[series_code] !== null &&
        runtime_thermostat[series_code] > 0
      ) {
        var value;
        switch (series_code) {
        case 'fan':
          value = 70;
          break;
        case 'dehumidifier':
        case 'economizer':
        case 'humidifier':
        case 'ventilator':
          value = 62;
          break;
        default:
          value = 80;
          break;
        }

        series[series_code].enabled = true;
        series[series_code].chart_data.push([
          x,
          value
        ]);
        series[series_code].data[x] = value;

        var duration = original_durations[series_code] !== undefined
          ? original_durations[series_code]
          : runtime_thermostat[series_code];

        durations[series_code][durations[series_code].length - 1].seconds += duration;
        // durations[series_code][durations[series_code].length - 1].seconds += runtime_thermostat[series_code];
        series[series_code].durations[x] = durations[series_code][durations[series_code].length - 1];
      } else {
        series[series_code].chart_data.push([
          x,
          null
        ]);
        series[series_code].data[x] = null;

        if (durations[series_code][durations[series_code].length - 1].seconds > 0) {
          durations[series_code].push({'seconds': 0});
        }
      }
    });

    /*
     * This is the ecobee code.
     *
     * var normalizedString = eventString;
     * var vacationPattern = /(\S\S\S\s\d+\s\d\d\d\d)|(\d{12})/i;
     * var smartRecoveryPattern = /smartRecovery/i;
     * var smartAwayPattern = /smartAway/i;
     * var smartHomePattern = /smartHome/i;
     * var quickSavePattern = /quickSave/i;
     *
     * if (typeof eventString === 'string') {
     * eventString = eventString.toLowerCase();
     * normalizedString = eventString;
     *
     * if (eventString === 'auto' || eventString === 'today' || eventString === 'hold' || typeof thermostatClimates.climates[eventString] !== 'undefined') {
     * normalizedString  = 'hold';
     * } else if (vacationPattern.test(eventString) || eventString.toLowerCase().indexOf('vacation') === 0) {
     * normalizedString = 'vacation';
     * } else if(smartRecoveryPattern.test(eventString)) {
     * normalizedString = 'smartRecovery';
     * } else if(smartHomePattern.test(eventString)) {
     * normalizedString = 'smartHome';
     * } else if(smartAwayPattern.test(eventString)) {
     * normalizedString = 'smartAway';
     * } else if(quickSavePattern.test(eventString)) {
     * normalizedString = 'quickSave';
     * } else {
     * normalizedString = 'customEvent';
     * }
     * }
     */

    /*
     * Here are some examples of what I get in the database and what they map to
     *
     * calendar_event_home home
     * calendar_event_away away
     * calendar_event_smartrecovery (SmartRecovery)
     * calendar_event_smartrecovery smartAway(SmartRecovery)
     * calendar_event_smartrecovery auto(SmartRecovery)
     * calendar_event_smartrecovery hold(SmartRecovery)
     * calendar_event_smartrecovery 149831444185(SmartRecovery)
     * calendar_event_smartrecovery Vacation(SmartRecovery)
     * calendar_event_smartrecovery 152304757299(SmartRecovery)
     * calendar_event_smartrecovery Apr 29 2016(SmartRecovery)
     * calendar_event_smarthome smartHome
     * calendar_event_smartaway smartAway
     * calendar_event_hold hold
     * calendar_event_vacation Vacation
     * calendar_event_quicksave QuickSave
     * calendar_event_vacation 151282889098
     * calendar_event_vacation May 14 2016
     * calendar_event_hold auto
     * calendar_event_other NULL
     * calendar_event_other HKhold
     * calendar_event_other 8915FC00B0DA
     * calendar_event_other 769347151
     */

    /*
     * Thanks, ecobee...I more or less copied this code from the ecobee Follow
     * Me graph to make sure it's as accurate as possible.
     */
    var this_calendar_event;

    /*
     * Display a fixed schedule in demo mode.
     */
    if (window.is_demo === true) {
      var m = moment(runtime_thermostat.timestamp);

      // Moment and ecobee use different indexes for the days of the week
      var day_of_week_index = (m.day() + 6) % 7;

      // Ecobee splits the schedule up into 30 minute chunks; find the right one
      var m_midnight = m.clone().startOf('day');
      var minute_of_day = m.diff(m_midnight, 'minutes');
      var chunk_of_day_index = Math.floor(minute_of_day / 30); // max 47

      var ecobee_thermostat = beestat.cache.ecobee_thermostat[
        thermostat.ecobee_thermostat_id
      ];

      this_calendar_event = 'calendar_event_' + ecobee_thermostat.json_program.schedule[day_of_week_index][chunk_of_day_index];
    } else {
      if (runtime_thermostat.event === null) {
        if (runtime_thermostat.climate === null) {
          this_calendar_event = 'calendar_event_other';
        } else {
          this_calendar_event = 'calendar_event_' + runtime_thermostat.climate.toLowerCase();
        }
      } else if (runtime_thermostat.event.match(/SmartRecovery/i) !== null) {
        this_calendar_event = 'calendar_event_smartrecovery';
      } else if (runtime_thermostat.event.match(/^home$/i) !== null) {
        this_calendar_event = 'calendar_event_home';
      } else if (runtime_thermostat.event.match(/^away$/i) !== null) {
        this_calendar_event = 'calendar_event_away';
      } else if (runtime_thermostat.event.match(/^smarthome$/i) !== null) {
        this_calendar_event = 'calendar_event_smarthome';
      } else if (runtime_thermostat.event.match(/^smartaway$/i) !== null) {
        this_calendar_event = 'calendar_event_smartaway';
      } else if (runtime_thermostat.event.match(/^auto$/i) !== null) {
        this_calendar_event = 'calendar_event_hold';
      } else if (runtime_thermostat.event.match(/^today$/i) !== null) {
        this_calendar_event = 'calendar_event_hold';
      } else if (runtime_thermostat.event.match(/^hold$/i) !== null) {
        this_calendar_event = 'calendar_event_hold';
      } else if (runtime_thermostat.event.match(/^vacation$/i) !== null) {
        this_calendar_event = 'calendar_event_vacation';
      } else if (runtime_thermostat.event.match(/(\S\S\S\s\d+\s\d\d\d\d)|(\d{12})/i) !== null) {
        this_calendar_event = 'calendar_event_vacation';
      } else if (runtime_thermostat.event.match(/^quicksave$/i) !== null) {
        this_calendar_event = 'calendar_event_quicksave';
      } else {
        this_calendar_event = 'calendar_event_other';
      }
    }


    // Dynamically add new calendar events for custom climates.
    if (
      beestat.component.card.recent_activity.calendar_events.indexOf(this_calendar_event) === -1
    ) {
      beestat.component.card.recent_activity.calendar_events.push(this_calendar_event);

      series[this_calendar_event] = {
        'enabled': false,
        'chart_data': [],
        'data': {},
        'durations': {}
      };

      beestat.series[this_calendar_event] = {
        'name': runtime_thermostat.climate,
        'color': beestat.style.color.bluegreen.base
      };
    }

    beestat.component.card.recent_activity.calendar_events.forEach(function(calendar_event) {
      if (calendar_event === this_calendar_event && this_calendar_event !== 'calendar_event_other') {
        var value = 95;
        series[calendar_event].enabled = true;
        series[calendar_event].chart_data.push([
          x,
          value
        ]);
        series[calendar_event].data[x] = value;
      } else {
        series[calendar_event].chart_data.push([
          x,
          null
        ]);
        series[calendar_event].data[x] = null;
      }
    });

    /*
     * HVAC Mode. This isn't graphed but it's available for the tooltip.
     * series.system_mode.chart_data.push([x, runtime_thermostat.system_mode]);
     */
    series.system_mode.data[x] = runtime_thermostat.system_mode;

    // Setpoints
    var setpoint_value_heat = beestat.temperature({'temperature': runtime_thermostat.setpoint_heat});
    var setpoint_value_cool = beestat.temperature({'temperature': runtime_thermostat.setpoint_cool});

    // NOTE: At one point I was also factoring in your heat/cool differential
    // plus the extra degree offset ecobee adds when you are "away". That made
    // the graph very exact but it wasn't really "setpoint" so I felt that would
    // be confusing.

    if (
      runtime_thermostat.system_mode === 'auto' ||
      runtime_thermostat.system_mode === 'heat' ||
      runtime_thermostat.system_mode === 'auxiliary_heat' ||
      runtime_thermostat.system_mode === null // Need this for the explicit null to remove from the graph.
    ) {
      series.setpoint_heat.data[x] = setpoint_value_heat;
      series.setpoint_heat.chart_data.push([
        x,
        setpoint_value_heat
      ]);

      if (setpoint_value_heat !== null) {
        self.y_min_ = Math.min(self.y_min_, setpoint_value_heat);
        self.y_max_ = Math.max(self.y_max_, setpoint_value_heat);
      }
    } else {

      /**
       * Explicitly add a null entry to force an empty spot on the line.
       * Otherwise Highcharts will connect gaps (see #119).
       */
      series.setpoint_heat.data[x] = null;
      series.setpoint_heat.chart_data.push([
        x,
        null
      ]);
    }

    if (
      runtime_thermostat.system_mode === 'auto' ||
      runtime_thermostat.system_mode === 'cool' ||
      runtime_thermostat.system_mode === null // Need this for the explicit null to remove from the graph.
    ) {
      series.setpoint_cool.data[x] = setpoint_value_cool;
      series.setpoint_cool.chart_data.push([
        x,
        setpoint_value_cool
      ]);

      if (setpoint_value_cool !== null) {
        self.y_min_ = Math.min(self.y_min_, setpoint_value_cool);
        self.y_max_ = Math.max(self.y_max_, setpoint_value_cool);
      }
    } else {

      /**
       * Explicitly add a null entry to force an empty spot on the line.
       * Otherwise Highcharts will connect gaps (see #119).
       */
      series.setpoint_cool.data[x] = null;
      series.setpoint_cool.chart_data.push([
        x,
        null
      ]);
    }

    // Indoor temperature
    var indoor_temperature_value = beestat.temperature(runtime_thermostat.indoor_temperature);
    series.indoor_temperature.data[x] = indoor_temperature_value;

    /*
     * Draw a data point if:
     * It's one of the nth data points (smoothing) OR
     * The previous value is null (forces data point right when null data stops instead of on the 10th) OR
     * The current value is null (forces null data to display as a blank section) PR
     * The next value is null (forces data point right when null data starts instead of on the 10th)
     * The current value is the last value (forces data point right at the end)
     */
    if (
      i % smoothing_factor === 0 ||
      (
        previous_indoor_temperature_value === null &&
        indoor_temperature_value !== null
      ) ||
      indoor_temperature_value === null ||
      (
        beestat.cache.runtime_thermostat[i + 1] !== undefined &&
        beestat.cache.runtime_thermostat[i + 1].indoor_temperature === null
      ) ||
      i === (beestat.cache.runtime_thermostat.length - 1)
    ) {
      series.indoor_temperature.enabled = true;
      series.indoor_temperature.chart_data.push([
        x,
        indoor_temperature_value
      ]);

      if (indoor_temperature_value !== null) {
        self.y_min_ = Math.min(self.y_min_, indoor_temperature_value);
        self.y_max_ = Math.max(self.y_max_, indoor_temperature_value);
      }
    }

    // Outdoor temperature
    var outdoor_temperature_value = beestat.temperature(runtime_thermostat.outdoor_temperature);
    series.outdoor_temperature.data[x] = outdoor_temperature_value;

    /*
     * Draw a data point if:
     * It's one of the 10th data points (smoothing) OR
     * The previous value is null (forces data point right when null data stops instead of on the 10th) OR
     * The current value is null (forces null data to display as a blank section) PR
     * The next value is null (forces data point right when null data starts instead of on the 10th)
     * The current value is the last value (forces data point right at the end)
     */
    if (
      i % smoothing_factor === 0 ||
      (
        previous_outdoor_temperature_value === null &&
        outdoor_temperature_value !== null
      ) ||
      outdoor_temperature_value === null ||
      (
        beestat.cache.runtime_thermostat[i + 1] !== undefined &&
        beestat.cache.runtime_thermostat[i + 1].outdoor_temperature === null
      ) ||
      i === (beestat.cache.runtime_thermostat.length - 1)
    ) {
      series.outdoor_temperature.enabled = true;
      series.outdoor_temperature.chart_data.push([
        x,
        outdoor_temperature_value
      ]);

      if (outdoor_temperature_value !== null) {
        self.y_min_ = Math.min(self.y_min_, outdoor_temperature_value);
        self.y_max_ = Math.max(self.y_max_, outdoor_temperature_value);
      }
    }

    // Indoor humidity
    var indoor_humidity_value;
    if (runtime_thermostat.indoor_humidity !== null) {
      indoor_humidity_value = parseInt(
        runtime_thermostat.indoor_humidity,
        10
      );
    } else {
      indoor_humidity_value = null;
    }
    series.indoor_humidity.data[x] = indoor_humidity_value;

    /*
     * Draw a data point if:
     * It's one of the 10th data points (smoothing) OR
     * The previous value is null (forces data point right when null data stops instead of on the 10th) OR
     * The current value is null (forces null data to display as a blank section) PR
     * The next value is null (forces data point right when null data starts instead of on the 10th)
     * The current value is the last value (forces data point right at the end)
     */
    if (
      i % smoothing_factor === 0 ||
      (
        previous_indoor_humidity_value === null &&
        indoor_humidity_value !== null
      ) ||
      indoor_humidity_value === null ||
      (
        beestat.cache.runtime_thermostat[i + 1] !== undefined &&
        beestat.cache.runtime_thermostat[i + 1].indoor_humidity === null
      ) ||
      i === (beestat.cache.runtime_thermostat.length - 1)
    ) {
      series.indoor_humidity.enabled = true;
      series.indoor_humidity.chart_data.push([
        x,
        indoor_humidity_value
      ]);
    }

    // Outdoor humidity
    var outdoor_humidity_value;
    if (runtime_thermostat.outdoor_humidity !== null) {
      outdoor_humidity_value = parseInt(
        runtime_thermostat.outdoor_humidity,
        10
      );
    } else {
      outdoor_humidity_value = null;
    }
    series.outdoor_humidity.data[x] = outdoor_humidity_value;

    /*
     * Draw a data point if:
     * It's one of the 10th data points (smoothing) OR
     * The previous value is null (forces data point right when null data stops instead of on the 10th) OR
     * The current value is null (forces null data to display as a blank section) PR
     * The next value is null (forces data point right when null data starts instead of on the 10th)
     * The current value is the last value (forces data point right at the end)
     */
    if (
      i % smoothing_factor === 0 ||
      (
        previous_outdoor_humidity_value === null &&
        outdoor_humidity_value !== null
      ) ||
      outdoor_humidity_value === null ||
      (
        beestat.cache.runtime_thermostat[i + 1] !== undefined &&
        beestat.cache.runtime_thermostat[i + 1].outdoor_humidity === null
      ) ||
      i === (beestat.cache.runtime_thermostat.length - 1)
    ) {
      series.outdoor_humidity.enabled = true;
      series.outdoor_humidity.chart_data.push([
        x,
        outdoor_humidity_value
      ]);
    }

    previous_indoor_temperature_value = indoor_temperature_value;
    previous_outdoor_temperature_value = outdoor_temperature_value;
    previous_indoor_humidity_value = indoor_humidity_value;
    previous_outdoor_humidity_value = outdoor_humidity_value;
  });

  return series;
};

/**
 * Get the title of the card.
 *
 * @return {string} Title
 */
beestat.component.card.recent_activity.prototype.get_title_ = function() {
  return 'Recent Activity';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.recent_activity.prototype.get_subtitle_ = function() {
  var s = (beestat.setting('recent_activity_time_count') > 1) ? 's' : '';

  return 'Past ' +
    beestat.setting('recent_activity_time_count') +
    ' ' +
    beestat.setting('recent_activity_time_period') +
    s;
};

/**
 * Determine whether or not enough data is currently available to render this
 * card. In this particular case require data from 7 days to an hour ago to be synced.
 *
 * @return {boolean} Whether or not the data is available.
 */
beestat.component.card.recent_activity.prototype.data_available_ = function() {
  // Demo can juse grab whatever data is there.
  if (window.is_demo === true) {
    return true;
  }

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  var required_sync_begin = moment().subtract(7, 'day');
  required_sync_begin = moment.max(
    required_sync_begin,
    moment(thermostat.first_connected)
  );
  var required_sync_end = moment().subtract(1, 'hour');

  return (
    current_sync_begin.isSameOrBefore(required_sync_begin) &&
    current_sync_end.isSameOrAfter(required_sync_end)
  );
};

/**
 * Get the data needed to render this card.
 */
beestat.component.card.recent_activity.prototype.get_data_ = function() {
  var self = this;
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  new beestat.api()
    .add_call(
      'runtime_thermostat',
      'read',
      {
        'attributes': {
          'thermostat_id': thermostat.thermostat_id,
          'timestamp': {
            'value': moment()
              .subtract(7, 'd')
              .format('YYYY-MM-DD'),
            'operator': '>'
          }
        }
      }
    )
    .set_callback(function(response) {
      beestat.cache.set('runtime_thermostat', response);
      self.rerender();
    })
    .send();
};
