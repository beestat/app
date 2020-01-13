/**
 * Runtime sensor detail chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_sensor_detail = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_sensor_detail, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_sensor_detail.prototype.get_options_xAxis_labels_formatter_ = function() {
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

beestat.component.chart.runtime_sensor_detail.prototype.get_options_legend_labelFormatter_ = function() {
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
beestat.component.chart.runtime_sensor_detail.prototype.get_options_series_ = function() {
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
    beestat.style.color.lightblue.base
  ];

  Object.values(beestat.cache.sensor).forEach(function(sensor, i) {
    if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
      series.push({
        'name': 'temperature_' + sensor.sensor_id,
        'data': self.data_.series['temperature_' + sensor.sensor_id],
        'color': colors[i],
        'yAxis': 0,
        'type': 'spline',
        'lineWidth': 1
      });

      var sensor_count = (Object.keys(self.data_.series).length - 1) / 2;

      series.push({
        'linkedTo': ':previous',
        'name': 'occupancy_' + sensor.sensor_id,
        'data': self.data_.series['occupancy_' + sensor.sensor_id],
        'color': colors[i],
        'yAxis': 1,
        'type': 'line',
        'lineWidth': beestat.component.chart.runtime_sensor_detail.get_swimlane_properties(sensor_count, 1).line_width,
        'linecap': 'square',
        'className': 'crisp_edges'
      });
    }
  });

  series.push({
    'name': '',
    'data': self.data_.series.dummy,
    'yAxis': 1,
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
beestat.component.chart.runtime_sensor_detail.prototype.get_options_yAxis_ = function() {
  /**
   * Highcharts doesn't seem to respect axis behavior well so just overriding
   * it completely here.
   */

  var sensor_count = (Object.keys(this.data_.series).length - 1) / 2;

  var y_min = Math.floor((this.data_.metadata.chart.y_min - 5) / 10) * 10;
  var y_max = Math.ceil((this.data_.metadata.chart.y_max + 10) / 10) * 10;

  /**
   * This is unfortunate. Axis heights can be done in either pixels or
   * percentages. If you use percentages, it's percentage of the plot height
   * which includes the y-axis labels and the legend. These heights are
   * variable, so setting a 20% height on the swimlane axis means the axis
   * height can actually change depending on external factors. When trying to
   * accurately position lanes, this variation can mess up pixel-perfect
   * spacing.
   *
   * If you use pixels you can get more exact, but since there's no way to
   * determine the available height for the chart (plot area minus y-axis
   * labels minus legend), you're left in the dark on how high to make your
   * "rest of the space" axis. There's also no way to set the height of one
   * axis and have the other axis take the remaining space.
   *
   * So, as a workaround, setting the swimlane axis to a fixed height and
   * having it sit on top of a full height axis works well enough. Adding a
   * bit of padding to the primary axis prevents those values from flowing on
   * top. It's not perfect because you get the main axis all the way up the
   * side but it's not terrible.
   */
  y_max += ((sensor_count > 8) ? 20 : 10);

  var tick_positions = [];
  var tick_interval = (beestat.setting('temperature_unit') === '°F') ? 10 : 5;
  var current_tick_position =
    Math.floor(y_min / tick_interval) * tick_interval;
  while (current_tick_position <= y_max) {
    tick_positions.push(current_tick_position);
    current_tick_position += tick_interval;
  }

  return [
    // Temperature
    {
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + beestat.setting('temperature_unit');
        }
      },
      'tickPositions': tick_positions
    },

    // Swimlanes
    {
      'height': 100,
      'top': 15,
      'min': 0,
      'max': 100,
      'reversed': true,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false}
    }
  ];
};

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.runtime_sensor_detail.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var sections = [];
    var group = [];

    var values = {};
    this.points.forEach(function(point) {
      values[point.series.name] = point.y;
    });

    this.points.forEach(function(point) {
      var label;
      var value;
      var color;

      if (point.series.name.includes('temperature') === true) {
        label = self.data_.metadata.series[point.series.name].name;
        color = point.series.color;
        value = beestat.temperature({
          'temperature': values[point.series.name],
          'convert': false,
          'units': true
        });

        var occupancy_key = point.series.name.replace('temperature', 'occupancy');
        if (values[occupancy_key] !== undefined && values[occupancy_key] !== null) {
          value += ' ●';
        }
      } else {
        return;
      }

      group.push({
        'label': label,
        'value': value,
        'color': color
      });
    });

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
 * Get properties of swimlane series.
 *
 * @param {number} count The number of swimlanes present.
 * @param {number} i Which swimlane this is.
 *
 * @return {Object} The swimlane line width and y position.
 */
beestat.component.chart.runtime_sensor_detail.get_swimlane_properties = function(count, i) {
  var height = 50;
  var max_line_width = 16;

  // Spacing.
  var spacing = 4;

  // Base line width is a percentage height of the container.
  var line_width = Math.round(height / count);

  // Cap to a max line width.
  line_width = Math.min(line_width, max_line_width);

  // Set y, then shift it up slightly because the width expands out from the center.
  var y = (line_width * i);
  y += Math.round((line_width / 2));

  // Make the lines slightly less tall to create space between them.
  line_width -= spacing;

  return {
    'line_width': line_width,
    'y': y
  };
};
