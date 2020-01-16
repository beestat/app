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

  this.data_.metadata.sensors.forEach(function(sensor, i) {
    if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
      series.push({
        'name': 'temperature_' + sensor.sensor_id,
        'data': self.data_.series['temperature_' + sensor.sensor_id],
        'color': colors[i],
        'yAxis': 0,
        'type': 'spline',
        'lineWidth': 1
      });

      // var sensor_count = (Object.keys(self.data_.series).length - 1) / 2;

      series.push({
        'linkedTo': ':previous',
        'name': 'occupancy_' + sensor.sensor_id,
        'data': self.data_.series['occupancy_' + sensor.sensor_id],
        'color': colors[i],
        'yAxis': 1,
        'type': 'line',
        'lineWidth': beestat.component.chart.runtime_sensor_detail.get_swimlane_properties(self.data_.metadata.sensors.length, 1).line_width,
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
  var y_min = Math.floor((this.data_.metadata.chart.y_min) / 5) * 5;
  var y_max = Math.ceil((this.data_.metadata.chart.y_max) / 5) * 5;

  y_max += ((beestat.setting('temperature_unit') === '°F') ? 10 : 4);

  var tick_positions = [];
  var tick_interval = (beestat.setting('temperature_unit') === '°F') ? 5 : 2;
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
      // 'top': 0,
      'min': 0,
      'max': 100,
      'reversed': true,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false},
      'plotBands': {
        'zIndex': 2,
        // 'color': 'red',
        'color': beestat.style.color.bluegray.dark,
        'from': 0,
        'to': 51
      }
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

    // Get all the point values and index them by series_code for reference.
    var values = {};
    this.points.forEach(function(point) {
      values[point.series.name] = point.y;
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

      if (series_code.includes('temperature') && visible[series_code] === true) {
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
 * Get properties of swimlane series.
 *
 * @param {number} count The number of swimlanes present.
 * @param {number} i Which swimlane this is.
 *
 * @return {Object} The swimlane line width and y position.
 */
beestat.component.chart.runtime_sensor_detail.get_swimlane_properties = function(count, i) {
  // Available height for all swimlanes
  var height = 50;

  // Some sensible max height if you have very few sensors.
  var max_line_width = 16;

  // Spacing. This is arbitrary...spacing decreases to 0 after you hit 15 sensors.
  var spacing = Math.floor(15 / count);

  // Base line width is a percentage height of the container.
  var line_width = Math.floor(height / count);

  // Cap to a max line width.
  line_width = Math.min(line_width, max_line_width);

  // Set y, then shift it up slightly because the width expands out from the center.
  var y = (line_width * i);
  y += Math.round((line_width / 2));

  // Make the lines slightly less tall to create space between them.
  line_width -= spacing;

  // Center within the swimlane area.
  var occupied_space = (line_width * count) + (spacing * count);
  var empty_space = height - occupied_space;
  // y += (empty_space / 2);

  return {
    'line_width': line_width,
    'y': y
  };
};

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
 * determine the available height for the chart (plot area minus y-axis labels
 * minus legend), you're left in the dark on how high to make your "rest of
 * the space" axis. There's also no way to set the height of one axis and have
 * the other axis take the remaining space.
 *
 * So, as a workaround...I simply overlay the swimlanes on the top of a
 * full-height temperature chart. Then I draw a rectangle on top of y-axis
 * labels I want to hide so it appears to be on it's own.
 *
 * Helpful: https://www.highcharts.com/demo/renderer
 *
 * @return {object} The events list for the chart.
 */
beestat.component.chart.runtime_sensor_detail.prototype.get_options_chart_events_ = function() {
  return {
    'load': function() {
      this.renderer.rect(0, 0, 30, 80)
        .attr({
          'fill': beestat.style.color.bluegray.base,
          'zIndex': 10
        })
        .add();
    }
  };
};

/**
 * See comment on get_options_chart_events_. This is done separately to
 * override the normal load event rectangle draw because on export I also add
 * padding and a title which screws up the positioning a bit.
 *
 * @return {object} The events list for the chart on export.
 */
beestat.component.chart.runtime_sensor_detail.prototype.get_options_exporting_chart_events_ = function() {
  return {
    'load': function() {
      this.renderer.rect(beestat.style.size.gutter, 60, 30, 60)
        .attr({
          'fill': beestat.style.color.bluegray.base,
          'zIndex': 10
        })
        .add();
    }
  };
};
