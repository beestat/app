/**
 * Recent activity card. Shows a graph similar to what ecobee shows with the
 * runtime info for a recent period of time.
 */
beestat.component.card.aggregate_runtime = function() {
  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var setting_change_function = beestat.debounce(function() {
    beestat.cache.set('aggregate_runtime', []);
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'setting.aggregate_runtime_time_count',
      'setting.aggregate_runtime_time_period',
      'setting.aggregate_runtime_group_by',
      'setting.aggregate_runtime_gap_fill'
    ],
    setting_change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.aggregate_runtime, beestat.component.card);

beestat.component.card.aggregate_runtime.equipment_series = [
  'compressor_cool_1',
  'compressor_cool_2',
  'compressor_heat_1',
  'compressor_heat_2',
  'auxiliary_heat_1',
  'auxiliary_heat_2',
  'auxiliary_heat_3'
];

beestat.component.card.aggregate_runtime.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  this.chart_ = new beestat.component.chart();
  var series = this.get_series_();

  this.chart_.options.chart.backgroundColor = beestat.style.color.bluegray.base;
  this.chart_.options.exporting.filename = thermostat.name + ' - Aggregate Runtime';
  this.chart_.options.exporting.chartOptions.title.text = this.get_title_();
  this.chart_.options.exporting.chartOptions.subtitle.text = this.get_subtitle_();

  var current_day;
  var current_hour;
  var current_week;
  var current_month;
  var current_year;

  this.chart_.options.xAxis = {
    'categories': series.x.chart_data,
    'lineColor': beestat.style.color.bluegray.light,
    'tickLength': 0,
    'labels': {
      'style': {
        'color': beestat.style.color.gray.base
      },
      'formatter': function() {
        var date_parts = this.value.match(/(?:h(\d+))?(?:d(\d+))?(?:w(\d+))?(?:m(\d+))?(?:y(\d+))?/);
        var hour = moment(date_parts[1], 'H').format('ha');
        var day = date_parts[2];
        var month = moment(date_parts[4], 'M').format('MMM');

        var year;
        var week;
        if (beestat.setting('aggregate_runtime_group_by') === 'week') {
          // ISO 8601 week of the year.
          var yearweek_m = moment().isoWeek(date_parts[3])
            .year(date_parts[5])
            .day('Monday');
          week = yearweek_m.format('MMM D');
          year = yearweek_m.format('YYYY');
        } else {
          year = date_parts[5];
        }

        var label_parts = [];
        switch (beestat.setting('aggregate_runtime_group_by')) {
        case 'year':
          label_parts.push(year);
          break;
        case 'month':
          label_parts.push(month);
          if (year !== current_year) {
            label_parts.push(year);
          }
          break;
        case 'week':
          if (week !== current_week) {
            label_parts.push(week);
          }
          if (year !== current_year) {
            label_parts.push(year);
          }
          break;
        case 'day':
          if (month !== current_month) {
            label_parts.push(month);
          }
          label_parts.push(day);
          if (year !== current_year) {
            label_parts.push(year);
          }
          break;
        case 'hour':
          if (month !== current_month) {
            label_parts.push(month);
          }
          if (day !== current_day) {
            label_parts.push(day);
          }
          if (year !== current_year) {
            label_parts.push(year);
          }
          label_parts.push(hour);
          break;
        }

        current_hour = hour;
        current_day = day;
        current_week = week;
        current_month = month;
        current_year = year;

        return label_parts.join(' ');
      }
    }
  };

  var y_max_hours;
  var tick_interval;
  switch (beestat.setting('aggregate_runtime_group_by')) {
  case 'year':
    y_max_hours = 8760;
    tick_interval = 2190;
    break;
  case 'month':
    y_max_hours = 672;
    tick_interval = 168;
    break;
  case 'week':
    y_max_hours = 168;
    tick_interval = 24;
    break;
  case 'day':
    y_max_hours = 24;
    tick_interval = 6;
    break;
  }

  this.chart_.options.yAxis = [
    {
      'alignTicks': false,
      'min': 0,
      'softMax': y_max_hours,
      'tickInterval': tick_interval,
      'reversedStacks': false,
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'title': {
        'text': ''
      },
      'labels': {
        'style': {
          'color': beestat.style.color.gray.base
        },
        'formatter': function() {
          return this.value + 'h';
        }
      }
    },
    {
      'alignTicks': false,
      'gridLineColor': null,
      'gridLineDashStyle': 'longdash',
      'opposite': true,
      'allowDecimals': false,
      'title': {
        'text': ''
      },
      'labels': {
        'style': {
          'color': beestat.style.color.gray.base
        },
        'formatter': function() {
          return this.value + thermostat.temperature_unit;
        }
      }
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
      var date_parts = this.x.match(/(?:h(\d+))?(?:d(\d+))?(?:w(\d+))?(?:m(\d+))?(?:y(\d+))?/);
      var hour = moment(date_parts[1], 'H').format('ha');
      var day = date_parts[2];
      var month = moment(date_parts[4], 'M').format('MMM');

      var year;
      var week;
      if (beestat.setting('aggregate_runtime_group_by') === 'week') {
        // ISO 8601 week of the year.
        var yearweek_m = moment().isoWeek(date_parts[3])
          .year(date_parts[5])
          .day('Monday');
        week = yearweek_m.format('MMM D');
        year = yearweek_m.format('YYYY');
      } else {
        year = date_parts[5];
      }

      var label_parts = [];
      switch (beestat.setting('aggregate_runtime_group_by')) {
      case 'year':
        label_parts.push(year);
        break;
      case 'month':
        label_parts.push(month);
        label_parts.push(year);
        break;
      case 'week':
        label_parts.push('Week of');
        label_parts.push(week + ',');
        label_parts.push(year);
        break;
      case 'day':
        label_parts.push(month);
        label_parts.push(day);
        break;
      case 'hour':
        label_parts.push(hour);
        break;
      }

      var sections = [];
      var section = [];
      for (var series_code in series) {
        var value = series[series_code].data[this.x];

        // Don't show in tooltip if there was no runtime to report.
        if (value === 0) {
          continue;
        }

        switch (series_code) {
        case 'x':
        case 'min_max_outdoor_temperature':
          continue;
          break;
        case 'average_outdoor_temperature':
          value = beestat.temperature({
            'temperature': value,
            'convert': false,
            'units': true,
            'round': 0
          });

          value += ' (';
          value += beestat.temperature({
            'temperature': series.min_max_outdoor_temperature.data[this.x].min,
            'convert': false,
            'units': true,
            'round': 0
          });
          value += ' to ';
          value += beestat.temperature({
            'temperature': series.min_max_outdoor_temperature.data[this.x].max,
            'convert': false,
            'units': true,
            'round': 0
          });
          value += ')';

          break;
        default:
          value = beestat.time(value, 'hours');
          break;
        }

        if (value !== null) {
          section.push({
            'label': beestat.series[series_code].name,
            'value': value,
            'color': beestat.series[series_code].color
          });
        }
      }
      sections.push(section);

      return beestat.component.chart.tooltip_formatter(
        label_parts.join(' '),
        sections,
        150
      );
    }
  };

  this.chart_.options.series = [];

  beestat.component.card.aggregate_runtime.equipment_series.forEach(function(series_code) {
    if (series[series_code].enabled === true) {
      self.chart_.options.series.push({
        'data': series[series_code].chart_data,
        'yAxis': 0,
        'groupPadding': 0,
        'name': beestat.series[series_code].name,
        'type': 'column',
        'color': beestat.series[series_code].color
      });
    }
  });

  this.chart_.options.series.push({
    'name': beestat.series.average_outdoor_temperature.name,
    'data': series.average_outdoor_temperature.chart_data,
    'color': beestat.series.average_outdoor_temperature.color,
    'type': 'spline',
    'yAxis': 1,
    'dashStyle': 'ShortDash',
    'lineWidth': 1,
    'zones': beestat.component.chart.get_outdoor_temperature_zones()
  });

  this.chart_.options.series.push({
    'name': beestat.series.min_max_outdoor_temperature.name,
    'data': series.min_max_outdoor_temperature.chart_data,
    'color': beestat.series.min_max_outdoor_temperature.color,
    'type': 'areasplinerange',
    'yAxis': 1,
    'fillOpacity': 0.2,
    'lineWidth': 0,
    'visible': false
  });

  this.chart_.render(parent);

  /*
   * If the data is available, then get the data if we don't already have it
   * loaded. If the data is not available, poll until it becomes available.
   */
  if (this.data_available_() === true) {
    if (beestat.cache.aggregate_runtime.length === 0) {
      this.get_data_();
    } else {
      this.hide_loading_();
    }
  } else {
    var poll_interval = 10000;

    beestat.add_poll_interval(poll_interval);
    beestat.dispatcher.addEventListener('poll.aggregate_runtime_load', function() {
      if (self.data_available_() === true) {
        beestat.remove_poll_interval(poll_interval);
        beestat.dispatcher.removeEventListener('poll.aggregate_runtime_load');
        self.get_data_();
      }
    });
  }
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.aggregate_runtime.prototype.get_series_ = function() {
  // TODO: Auto-generate these where possible like I did in recent_activity
  var series = {
    'x': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'average_outdoor_temperature': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'min_max_outdoor_temperature': {
      'enabled': true,
      'chart_data': [],
      'data': {}
    },
    'compressor_heat_1': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'compressor_heat_2': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'compressor_cool_1': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'compressor_cool_2': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'auxiliary_heat_1': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'auxiliary_heat_2': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    },
    'auxiliary_heat_3': {
      'enabled': false,
      'chart_data': [],
      'data': {}
    }
  };

  beestat.cache.aggregate_runtime.forEach(function(aggregate, i) {

    /*
     * Generate a custom x value that I can use to build the custom axis for
     * later. I thought about sending a timestamp back from the API instead of
     * these discrete values but it's not possible due to the grouping. I could
     * try to convert this to a timestamp or moment value but I'll just have to
     * break it back out anyways so there's not much point to that.
     */
    var x_parts = [];
    [
      'hour',
      'day',
      'week',
      'month',
      'year'
    ].forEach(function(period) {
      if (aggregate[period] !== undefined) {
        x_parts.push(period[0] + aggregate[period]);
      }
    });
    var x = x_parts.join('');

    series.x.chart_data.push(x);

    /*
     * Used to estimate values when data is missing. These magic numbers are the
     * number of expected data points in a group when that group represents a
     * year, month, etc.
     */
    var adjustment_factor;
    switch (beestat.setting('aggregate_runtime_group_by')) {
    case 'year':
      var year = x_parts[0].match(/\d+/)[0];
      var is_leap_year = moment(year, 'YYYY').isLeapYear();
      var days_in_year = is_leap_year === true ? 366 : 365;
      adjustment_factor = days_in_year * 288;
      break;
    case 'month':
      var month = x_parts[0].match(/\d+/)[0];
      var year = x_parts[1].match(/\d+/)[0];
      var days_in_month = moment(year + '-' + month, 'YYYY-MM').daysInMonth();
      adjustment_factor = days_in_month * 288;
      break;
    case 'week':
      adjustment_factor = 2016;
      break;
    case 'day':
      adjustment_factor = 288;
      break;
    case 'hour':
      adjustment_factor = 12;
      break;
    default:
      console.error('Adjustment factor not available.');
      break;
    }

    beestat.component.card.aggregate_runtime.equipment_series.forEach(function(series_code) {
      var value = aggregate[series_code];

      // Account for missing data in all but the last x value.
      if (
        beestat.setting('aggregate_runtime_gap_fill') === true &&
        i < (beestat.cache.aggregate_runtime.length - 1)
      ) {
        value = value *
          adjustment_factor /
          aggregate.count;
      }

      // The value (in hours).
      value /= 3600;

      // Enable the series if it has data.
      if (value > 0) {
        series[series_code].enabled = true;
      }

      series[series_code].chart_data.push([
        x,
        value
      ]);
      series[series_code].data[x] = value;
    });

    // Average outdoor temperature.
    var average_outdoor_temperature_value = beestat.temperature({
      'temperature': aggregate.average_outdoor_temperature
    });

    series.average_outdoor_temperature.data[x] = average_outdoor_temperature_value;
    series.average_outdoor_temperature.chart_data.push([
      x,
      average_outdoor_temperature_value
    ]);

    // Min/max outdoor temperature.
    var min_outdoor_temperature_value = beestat.temperature({
      'temperature': aggregate.min_outdoor_temperature
    });
    var max_outdoor_temperature_value = beestat.temperature({
      'temperature': aggregate.max_outdoor_temperature
    });

    series.min_max_outdoor_temperature.data[x] = {
      'min': min_outdoor_temperature_value,
      'max': max_outdoor_temperature_value
    };
    series.min_max_outdoor_temperature.chart_data.push([
      x,
      min_outdoor_temperature_value,
      max_outdoor_temperature_value
    ]);
  });

  return series;
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.aggregate_runtime.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 2 Months')
    .set_icon('calendar_range')
    .set_callback(function() {
      if (
        beestat.setting('aggregate_runtime_time_count') !== 2 ||
        beestat.setting('aggregate_runtime_time_period') !== 'month' ||
        beestat.setting('aggregate_runtime_group_by') !== 'day'
      ) {
        beestat.setting({
          'aggregate_runtime_time_count': 2,
          'aggregate_runtime_time_period': 'month',
          'aggregate_runtime_group_by': 'day'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 12 Months')
    .set_icon('calendar_range')
    .set_callback(function() {
      if (
        beestat.setting('aggregate_runtime_time_count') !== 12 ||
        beestat.setting('aggregate_runtime_time_period') !== 'month' ||
        beestat.setting('aggregate_runtime_group_by') !== 'week'
      ) {
        beestat.setting({
          'aggregate_runtime_time_count': 12,
          'aggregate_runtime_time_period': 'month',
          'aggregate_runtime_group_by': 'week'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('All Time')
    .set_icon('calendar_range')
    .set_callback(function() {
      if (
        beestat.setting('aggregate_runtime_time_count') !== 0 ||
        beestat.setting('aggregate_runtime_time_period') !== 'all' ||
        beestat.setting('aggregate_runtime_group_by') !== 'month'
      ) {
        beestat.setting({
          'aggregate_runtime_time_count': 0,
          'aggregate_runtime_time_period': 'all',
          'aggregate_runtime_group_by': 'month'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Custom')
    .set_icon('calendar_edit')
    .set_callback(function() {
      (new beestat.component.modal.aggregate_runtime_custom()).render();
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

  if (beestat.setting('aggregate_runtime_gap_fill') === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Disable Gap-Fill')
      .set_icon('basket_unfill')
      .set_callback(function() {
        beestat.setting('aggregate_runtime_gap_fill', false);
      }));
  } else {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Enable Gap-Fill')
      .set_icon('basket_fill')
      .set_callback(function() {
        beestat.setting('aggregate_runtime_gap_fill', true);
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      (new beestat.component.modal.help_aggregate_runtime()).render();
    }));
};

/**
 * Get the title of the card.
 *
 * @return {string}
 */
beestat.component.card.aggregate_runtime.prototype.get_title_ = function() {
  return 'Aggregate Runtime';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string}
 */
beestat.component.card.aggregate_runtime.prototype.get_subtitle_ = function() {
  var s = (beestat.setting('aggregate_runtime_time_count') > 1) ? 's' : '';

  var string = '';

  if (beestat.setting('aggregate_runtime_time_period') === 'all') {
    string = 'All time';
  } else {
    string = 'Past ' +
      beestat.setting('aggregate_runtime_time_count') +
      ' ' +
      beestat.setting('aggregate_runtime_time_period') +
      s;
  }

  string += ', ' +
    ' grouped by ' +
    beestat.setting('aggregate_runtime_group_by');

  return string;
};

/**
 * Determine whether or not enough data is currently available to render this
 * card.
 *
 * @return {boolean}
 */
beestat.component.card.aggregate_runtime.prototype.data_available_ = function() {
  // Demo can juse grab whatever data is there.
  if (window.is_demo === true) {
    this.show_loading_('Loading Aggregate Runtime');
    return true;
  }

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  var required_sync_begin;
  if (beestat.setting('aggregate_runtime_time_period') === 'all') {
    required_sync_begin = moment(thermostat.first_connected);
  } else {
    required_sync_begin = moment().subtract(moment.duration(
      beestat.setting('aggregate_runtime_time_count'),
      beestat.setting('aggregate_runtime_time_period')
    ));
  }
  required_sync_begin = moment.max(required_sync_begin, moment(thermostat.first_connected));
  var required_sync_end = moment().subtract(1, 'hour');

  // Percentage
  var denominator = required_sync_end.diff(required_sync_begin, 'day');
  var numerator_begin = moment.max(current_sync_begin, required_sync_begin);
  var numerator_end = moment.min(current_sync_end, required_sync_end);
  var numerator = numerator_end.diff(numerator_begin, 'day');
  var percentage = numerator / denominator * 100;
  if (isNaN(percentage) === true || percentage < 0) {
    percentage = 0;
  }

  if (percentage >= 95) {
    this.show_loading_('Loading Aggregate Runtime');
  } else {
    this.show_loading_('Syncing Data (' +
      Math.round(percentage) +
      '%)');
  }

  return (
    current_sync_begin.isSameOrBefore(required_sync_begin) &&
    current_sync_end.isSameOrAfter(required_sync_end)
  );
};

/**
 * Get the data needed to render this card.
 */
beestat.component.card.aggregate_runtime.prototype.get_data_ = function() {
  var self = this;
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  beestat.api(
    'ecobee_runtime_thermostat',
    'get_aggregate_runtime',
    {
      'ecobee_thermostat_id': thermostat.ecobee_thermostat_id,
      'time_period': beestat.setting('aggregate_runtime_time_period'),
      'group_by': beestat.setting('aggregate_runtime_group_by'),
      'time_count': beestat.setting('aggregate_runtime_time_count')
    },
    function(response) {
      beestat.cache.set('aggregate_runtime', response);
      self.rerender();
    }
  );
};
