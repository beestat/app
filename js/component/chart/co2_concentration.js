/**
 * CO2 Concentration chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.co2_concentration = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.co2_concentration, beestat.component.chart);

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.co2_concentration.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

  // Sensors
  this.data_.metadata.sensors.forEach(function(sensor) {
    if (sensor.type === 'thermostat') {
      series.push({
        'name': 'co2_concentration_' + sensor.sensor_id,
        'data': self.data_.series['co2_concentration_' + sensor.sensor_id],
        'color': beestat.series.co2_concentration.color,
        'yAxis': 0,
        'type': 'spline',
        'lineWidth': 1
      });
    }
  });

  series.push({
    'name': '',
    'data': self.data_.series.dummy,
    'yAxis': 0,
    'type': 'line',
    'lineWidth': 0,
    'showInLegend': false
  });

  return series;
};

/**
 * Override for get_options_yAxis_.
 *
 * @return {Array} The y-axis options.
 */
beestat.component.chart.co2_concentration.prototype.get_options_yAxis_ = function() {
  return [
    {
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'allowDecimals': false,
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value;
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
beestat.component.chart.co2_concentration.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var x = this.x;

    var sections = [];
    var groups = {
      'data': []
    };

    $.values(beestat.cache.sensor).forEach(function(sensor) {
      if (
        sensor.thermostat_id === beestat.setting('thermostat_id') &&
        sensor.type === 'thermostat'
      ) {
        groups.data.push({
          'label': beestat.series.co2_concentration.name,
          'value': (self.data_.metadata.series['co2_concentration_' + sensor.sensor_id].data[x.valueOf()]) + ' ppm',
          'color': beestat.series.co2_concentration.color
        });
      }
    });

    sections.push(groups.data);

    return self.tooltip_formatter_helper_(
      null,
      sections
    );
  };
};

/**
 * Get the tooltip positioner y value.
 *
 * @param {number} tooltip_width Tooltip width.
 * @param {number} tooltip_height Tooltip height.
 * @param {point} point Highcharts current point.
 *
 * @return {number} The tooltip y value.
 */
beestat.component.chart.co2_concentration.prototype.get_options_tooltip_positioner_y_ = function() {
  return 0;
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.co2_concentration.prototype.get_options_chart_height_ = function() {
  return 135;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.co2_concentration.prototype.get_options_chart_marginLeft_ = function() {
  return 60;
};

/**
 * Get the legend enabled options.
 *
 * @return {Function} The legend enabled options.
 */
beestat.component.chart.co2_concentration.prototype.get_options_legend_enabled_ = function() {
  return false;
};

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.co2_concentration.prototype.get_options_xAxis_labels_formatter_ = function() {
  var current_day;
  var current_hour;

  return function() {
    var hour = this.value.format('ha');
    var day = this.value.format('ddd');

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
  };
};
