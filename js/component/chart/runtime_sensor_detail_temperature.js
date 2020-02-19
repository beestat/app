/**
 * Runtime sensor detail chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_sensor_detail_temperature = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_sensor_detail_temperature, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_xAxis_labels_formatter_ = function() {
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

/**
 * Get legend values. The series name is used for some other magic so this has
 * to be overridden.
 *
 * @return {function} A function that returns the proper legend name.
 */
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_legend_labelFormatter_ = function() {
  var self = this;
  return function() {
    return self.data_.metadata.series[this.name].name;
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

  var colors = [
    beestat.style.color.blue.base,
    beestat.style.color.red.base,
    beestat.style.color.yellow.base,
    beestat.style.color.green.base,
    beestat.style.color.orange.base,
    beestat.style.color.bluegreen.base,
    beestat.style.color.purple.base,
    beestat.style.color.lightblue.base,
    beestat.style.color.blue.light,
    beestat.style.color.red.light,
    beestat.style.color.yellow.light,
    beestat.style.color.green.light,
    beestat.style.color.orange.light,
    beestat.style.color.bluegreen.light,
    beestat.style.color.purple.light,
    beestat.style.color.lightblue.light,
    beestat.style.color.blue.dark,
    beestat.style.color.red.dark,
    beestat.style.color.yellow.dark,
    beestat.style.color.green.dark,
    beestat.style.color.orange.dark,
    beestat.style.color.bluegreen.dark,
    beestat.style.color.purple.dark,
    beestat.style.color.lightblue.dark
  ];

  // Sensors
  this.data_.metadata.sensors.forEach(function(sensor, i) {
    series.push({
      'name': 'temperature_' + sensor.sensor_id,
      'data': self.data_.series['temperature_' + sensor.sensor_id],
      'color': colors[i],
      'yAxis': 0,
      'type': 'spline',
      'lineWidth': 1
    });
  });

  // Indoor/Outdoor Temperature
  [
    'indoor_temperature',
    'outdoor_temperature'
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': 0,
        'type': 'spline',
        'dashStyle': (series_code === 'indoor_temperature') ? 'Solid' : 'ShortDash',
        'lineWidth': (series_code === 'indoor_temperature') ? 2 : 1,
        'visible': false
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
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_yAxis_ = function() {
  return [
    {
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'allowDecimals': false,
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
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
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var sections = [];
    var group = [];

    // Get all the point values and index them by series_code for reference.
    var values = {};
    this.points.forEach(function(point) {
      values[point.series.name] = point.y;

      var occupancy_key = point.series.name.replace('temperature', 'occupancy');
      if (self.data_.metadata.series[occupancy_key] !== undefined) {
        values[occupancy_key] =
          self.data_.metadata.series[occupancy_key].data[point.x.valueOf()];
      }
    });

    /**
     * Get a couple of other properties and index them by series_code for
     * reference. This dives up to the chart itself because the tooltip shows
     * all series unless explicitly disabled and those aren't always in the
     * points array.
     */
    var colors = {};
    var visible = {};
    self.chart_.series.forEach(function(series) {
      colors[series.name] = series.color;
      visible[series.name] = series.visible;
    });

    for (var series_code in self.data_.series) {
      var label;
      var value;
      var color;

      if (visible[series_code] === true) {
        label = self.data_.metadata.series[series_code].name;
        color = colors[series_code];
        if (values[series_code] === undefined) {
          value = '-';
        } else {
          value = beestat.temperature({
            'temperature': values[series_code],
            'convert': false,
            'units': true
          });
        }

        var occupancy_key = series_code.replace('temperature', 'occupancy');
        if (values[occupancy_key] !== undefined && values[occupancy_key] !== null) {
          value += ' ●';
        }

        group.push({
          'label': label,
          'value': value,
          'color': color
        });
      }
    }

    if (group.length === 0) {
      group.push({
        'label': 'No data',
        'value': '',
        'color': beestat.style.color.gray.base
      });
    }

    sections.push(group);

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
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_tooltip_positioner_y_ = function() {
  return 0;
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_chart_height_ = function() {
  return 300;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.runtime_sensor_detail_temperature.prototype.get_options_chart_marginLeft_ = function() {
  return 45;
};
