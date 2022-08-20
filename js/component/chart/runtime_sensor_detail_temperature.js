/**
 * Runtime sensor detail temperature chart.
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

  // Sensors
  this.data_.metadata.sensors.forEach(function(sensor) {
    series.push({
      'name': 'temperature_' + sensor.sensor_id,
      'data': self.data_.series['temperature_' + sensor.sensor_id],
      'color': self.data_.metadata.series['temperature_' + sensor.sensor_id].color,
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
    var points = [];
    var x = this.x;

    var sections = [];
    var groups = {
      'mode': [],
      'data': []
    };

    var visible_series = [];
    self.get_chart().series.forEach(function(series) {
      if (series.visible === true) {
        visible_series.push(series.name);
      }
    });

    // Add points which can be toggled.
    [
      'indoor_temperature',
      'outdoor_temperature'
    ].forEach(function(series_code) {
      if (
        self.data_.metadata.series[series_code].data[x.valueOf()] !== undefined &&
        visible_series.includes(series_code) === true
      ) {
        points.push({
          'series_code': series_code,
          'value': self.data_.metadata.series[series_code].data[x.valueOf()],
          'color': beestat.series[series_code].color
        });
      }
    });

    // Add some other stuff.
    [
      'calendar_event_smartrecovery',
      'calendar_event_home',
      'calendar_event_away',
      'calendar_event_sleep',
      'calendar_event_smarthome',
      'calendar_event_smartaway',
      'calendar_event_hold',
      'calendar_event_vacation',
      'calendar_event_quicksave',
      'calendar_event_other',
      'calendar_event_custom'
    ].forEach(function(series_code) {
      if (
        self.data_.metadata.series[series_code].data[x.valueOf()] !== undefined
      ) {
        points.push({
          'series_code': series_code,
          'value': self.data_.metadata.series[series_code].data[x.valueOf()],
          'color': beestat.series[series_code].color
        });
      }
    });

    var occupancy = {};
    self.get_chart().series.forEach(function(series) {
      if (series.name.substring(0, 12) === 'temperature_') {
        points.push({
          'series_code': series.name,
          'value': self.data_.metadata.series[series.name].data[x.valueOf()],
          'color': series.color
        });
        var occupancy_key = series.name.replace('temperature', 'occupancy');
        occupancy[occupancy_key] =
          (self.data_.metadata.series[occupancy_key].data[x.valueOf()] !== undefined);
      }
    });

    points.forEach(function(point) {
      var label;
      var value;
      var group;
      var color;
      var point_value;

      if (
        point.series_code.includes('calendar_event')
      ) {
        group = 'mode';
        label = 'Comfort Profile';
        color = beestat.series[point.series_code].color;
        value = self.data_.metadata.series.calendar_event_name[x.valueOf()];
      } else {
        group = 'data';
        label = self.data_.metadata.series[point.series_code].name;
        color = point.color;
        if (point.value === undefined) {
          value = '-';
          point_value = 0;
        } else {
          value = beestat.temperature({
            'temperature': point.value,
            'input_temperature_unit': beestat.setting('temperature_unit'),
            'units': true
          });
          point_value = point.value;
        }

        var occupancy_key = point.series_code.replace('temperature', 'occupancy');
        if (occupancy[occupancy_key] === true) {
          value += ' ●';
        }
      }

      groups[group].push({
        'label': label,
        'value': value,
        'color': color,
        'point_value': point_value
      });
    });

    // Sort sensor data by temperature descending.
    groups.data.sort(function(a, b) {
      return b.point_value - a.point_value;
    });

    if (
      groups.mode.length === 0 &&
      groups.data.length === 0
    ) {
      groups.mode.push({
        'label': 'No data',
        'value': '',
        'color': beestat.style.color.gray.base
      });
    }

    sections.push(groups.mode);
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
