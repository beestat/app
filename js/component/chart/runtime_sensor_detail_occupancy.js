/**
 * Runtime sensor detail chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_sensor_detail_occupancy = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_sensor_detail_occupancy, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_xAxis_labels_formatter_ = function() {
  return function() {
    return null;
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_series_ = function() {
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
      'name': 'occupancy_' + sensor.sensor_id,
      'data': self.data_.series['occupancy_' + sensor.sensor_id],
      'color': colors[i],
      'yAxis': 0,
      'type': 'line',
      'lineWidth': beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties(self.data_.metadata.sensors.length, 1).line_width,
      'linecap': 'square',
      'className': 'crisp_edges'
    });
  });

  series.push({
    'name': '',
    'data': self.data_.series.dummy,
    'yAxis': 0,
    'type': 'line',
    'lineWidth': 0
  });

  return series;
};

/**
 * Override for get_options_yAxis_.
 *
 * @return {Array} The y-axis options.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_yAxis_ = function() {
  return [
    {
      'min': 0,
      'max': 50,

      // Keeps the chart from ending on a multiple of whatever the tick interval gets set to.
      'endOnTick': false,

      'reversed': true,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false},
      'plotBands': [
        {
          'zIndex': 2,
          'color': beestat.style.color.bluegray.dark,
          'from': 0,
          'to': 50
        }
      ]
    }
  ];
};

/**
 * Get properties of swimlane series.
 *
 * @param {number} count The number of swimlanes present.
 * @param {number} i Which swimlane this is.
 *
 * @return {Object} The swimlane line width and y position.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties = function(count, i) {
  // Available height for all swimlanes
  var height = 50;

  // Some sensible max height if you have very few sensors.
  var max_line_width = 16;

  // Spacing. This is arbitrary...spacing decreases to 0 after you hit 15 sensors.
  var spacing = Math.floor(15 / count);
  spacing = Math.min(spacing, 4);

  // Base line width is a percentage height of the container.
  var line_width = Math.floor(height / count);

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

/**
 * Get the height of the chart. For really precise charts, make sure to
 * include relevant spacing.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_chart_height_ = function() {
  return 50 + this.get_options_chart_spacing_()[0] + this.get_options_chart_spacing_()[2];
};

/**
 * Get the legend enabled options.
 *
 * @return {Function} The legend enabled options.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_legend_enabled_ = function() {
  return false;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.runtime_sensor_detail_occupancy.prototype.get_options_chart_marginLeft_ = function() {
  return 45;
};
