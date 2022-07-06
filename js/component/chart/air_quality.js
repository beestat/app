/**
 * Air Quality chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.air_quality = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.air_quality, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.air_quality.prototype.get_options_xAxis_labels_formatter_ = function() {
  return function() {
    return null;
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.air_quality.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

  // Sensors
  this.data_.metadata.sensors.forEach(function(sensor) {
    if (sensor.type === 'thermostat') {
      series.push({
        'name': 'air_quality_' + sensor.sensor_id,
        'data': self.data_.series['air_quality_' + sensor.sensor_id],
        'color': beestat.series.air_quality.color,
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
beestat.component.chart.air_quality.prototype.get_options_yAxis_ = function() {
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
      },
      'min': 0,
      'max': 100,
      'tickInterval': 100
    }
  ];
};

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.air_quality.prototype.get_options_tooltip_formatter_ = function() {
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
          'label': beestat.series.air_quality.name,
          'value': (self.data_.metadata.series['air_quality_' + sensor.sensor_id].data[x.valueOf()]),
          'color': beestat.series.air_quality.color
        });
      }
    });

    sections.push(groups.data);

    var title = this.x.format('ddd, MMM D @ h:mma');

    return self.tooltip_formatter_helper_(
      title,
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
beestat.component.chart.air_quality.prototype.get_options_tooltip_positioner_y_ = function() {
  return 0;
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.air_quality.prototype.get_options_chart_height_ = function() {
  return 75;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.air_quality.prototype.get_options_chart_marginLeft_ = function() {
  return 60;
};

/**
 * Get the legend enabled options.
 *
 * @return {Function} The legend enabled options.
 */
beestat.component.chart.air_quality.prototype.get_options_legend_enabled_ = function() {
  return false;
};

/**
 * Get the bottom margin for the chart.
 *
 * @return {number} The right margin for the chart.
 */
beestat.component.chart.air_quality.prototype.get_options_chart_marginBottom_ = function() {
  return 10;
};
