/**
 * Runtime thermostat summary chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_thermostat_summary = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_thermostat_summary, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_xAxis_labels_formatter_ = function() {
  var current_month;
  var current_year;

  return function() {
    if (this.isFirst === true) {
      current_month = null;
      current_year = null;
    }
    var label_parts = [];

    var day = this.value.format('D');
    var week = this.value.clone().startOf('isoweek')
      .format('MMM D');
    var month = this.value.format('MMM');
    var year = this.value.format('YYYY');

    switch (beestat.setting('runtime_thermostat_summary_group_by')) {
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
      label_parts.push(week);
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
    }

    current_month = month;
    current_year = year;

    return label_parts.join(' ');
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

  [
    'sum_compressor_cool_1',
    'sum_compressor_cool_2',
    'sum_compressor_heat_1',
    'sum_compressor_heat_2',
    'sum_auxiliary_heat_1',
    'sum_auxiliary_heat_2'
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': 0,
        'groupPadding': 0,
        'type': 'column'
      });
    }
  });

  if (self.data_.metadata.series.avg_outdoor_temperature.active === true) {
    series.push({
      'name': 'avg_outdoor_temperature',
      'data': this.data_.series.avg_outdoor_temperature,
      'color': beestat.series.avg_outdoor_temperature.color,
      'yAxis': 1,
      'type': 'spline',
      'dashStyle': 'ShortDash',
      'lineWidth': 1
    });
  }

  if (self.data_.metadata.series.extreme_outdoor_temperature.active === true) {
    series.push({
      'name': 'extreme_outdoor_temperature',
      'data': this.data_.series.extreme_outdoor_temperature,
      'color': beestat.series.extreme_outdoor_temperature.color,
      'type': 'areasplinerange',
      'yAxis': 1,
      'fillOpacity': 0.2,
      'lineWidth': 0,
      'visible': false
    });
  }

  return series;
};

/**
 * Override for get_options_yAxis_.
 *
 * @return {Array} The y-axis options.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_yAxis_ = function() {
  var y_max_hours;
  var tick_interval;
  if (beestat.setting('runtime_thermostat_summary_smart_scale') === true) {
    switch (beestat.setting('runtime_thermostat_summary_group_by')) {
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
  }

  return [
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
          return this.value + beestat.setting('temperature_unit');
        }
      }
    }
  ];
};

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var sections = [];
    var groups = {
      'heat': [],
      'cool': [],
      'other': []
    };

    var values = {};
    this.points.forEach(function(point) {
      if (point.series.name === 'extreme_outdoor_temperature') {
        values.min_outdoor_temperature = point.point.low;
        values.max_outdoor_temperature = point.point.high;
      } else {
        values[point.series.name] = point.y;
      }
    });

    this.points.forEach(function(point) {
      var label;
      var value;
      var color;
      switch (point.series.name) {
      case 'extreme_outdoor_temperature':
        label = beestat.series.extreme_outdoor_temperature.name;
        color = point.series.color;
        if (
          values.min_outdoor_temperature !== undefined &&
          values.max_outdoor_temperature !== undefined
        ) {
          value = beestat.temperature({
            'temperature': values.min_outdoor_temperature,
            'convert': false,
            'units': true,
            'round': 0
          });
          value += ' to ';
          value += beestat.temperature({
            'temperature': values.max_outdoor_temperature,
            'convert': false,
            'units': true,
            'round': 0
          });
        }
        break;
      case 'avg_outdoor_temperature':
        label = beestat.series.avg_outdoor_temperature.name;
        color = point.series.color;
        value = beestat.temperature({
          'temperature': values.avg_outdoor_temperature,
          'convert': false,
          'units': true,
          'round': 0
        });
        break;
      default:
        label = beestat.series[point.series.name].name;
        value = beestat.time(values[point.series.name], 'hours');
        color = point.series.color;
        break;
      }

      var group;
      if (point.series.name.indexOf('heat') !== -1) {
        group = 'heat';
      } else if (point.series.name.indexOf('cool') !== -1) {
        group = 'cool';
      } else {
        group = 'other';
      }

      groups[group].push({
        'label': label,
        'value': value,
        'color': color
      });
    });

    sections.push(groups.heat);
    sections.push(groups.cool);
    sections.push(groups.other);

    var title;
    switch (beestat.setting('runtime_thermostat_summary_group_by')) {
    case 'year':
      title = this.x.format('YYYY');
      break;
    case 'month':
      title = this.x.format('MMM YYYY');
      break;
    case 'week':
      title = 'Week of ' + this.x.clone().startOf('isoweek')
        .format('MMM Do, YYYY');
      break;
    case 'day':
      title = this.x.format('MMM Do');
      break;
    }

    return self.tooltip_formatter_helper_(
      title,
      sections
    );
  };
};

/**
 * Remove the crosshair width so it is one series wide.
 *
 * @return {object} The crosshair width.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_xAxis_crosshair_width_ = function() {
  return undefined;
};

/**
 * Get the crosshair snap.
 *
 * @return {object} The crosshair snap.
 */
beestat.component.chart.runtime_thermostat_summary.prototype.get_options_xAxis_crosshair_snap_ = function() {
  return true;
};
