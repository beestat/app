/**
 * Runtime thermostat detail temperature chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.time_to_detail = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.time_to_detail, beestat.component.chart);

/**
 * Override for get_options_xAxis_.
 *
 * @return {object} The xAxis options.
 */
beestat.component.chart.time_to_detail.prototype.get_options_xAxis_ = function() {
  return {
    'categories': this.data_.x,
    'lineColor': beestat.style.color.bluegray.light,
    'tickLength': 0,
    'labels': {
      'style': {
        'color': beestat.style.color.gray.base,
        'font-size': '12px'
      },
      'formatter': this.get_options_xAxis_labels_formatter_()
    },
    'crosshair': this.get_options_xAxis_crosshair_(),
    'plotLines': [
      {
        'color': beestat.series.outdoor_temperature.color,
        'dashStyle': 'ShortDash',
        'width': 1,
        'label': {
          'style': {
            'color': beestat.series.outdoor_temperature.color
          },
          'useHTML': true,
          'text': beestat.time(
            this.data_.metadata.chart.setpoint_reached_m.diff(moment(), 'second'),
          ) + ' (' + this.data_.metadata.chart.setpoint_reached_m.format('h:mm a') + ')'
        },
        'value': this.data_.metadata.chart.setpoint_reached_m.diff(moment(), 'minute'),
        'zIndex': 2
      }
    ]
  };
};

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.time_to_detail.prototype.get_options_xAxis_labels_formatter_ = function() {
  var current_day;
  var current_time;

  return function() {
    var day = this.value.format('ddd');

    var time = this.value.clone();
    var minutes = time.minutes();
    var rounded_minutes = Math.round(minutes / 5) * 5;
    time.minutes(rounded_minutes).seconds(0);
    time = time.format('h:mm');

    var label_parts = [];
    if (day !== current_day) {
      label_parts.push(day);
    }
    if (time !== current_time) {
      label_parts.push(time);
    }
    current_day = day;
    current_time = time;

    return label_parts.join(' ');
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.time_to_detail.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

  // Indoor/Outdoor Temperature
  [
    'indoor_temperature',
    'outdoor_temperature',
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': (series_code === 'indoor_temperature') ? 0 : 1,
        'type': 'spline',
        'dashStyle': (series_code === 'indoor_temperature') ? 'Solid' : 'ShortDash',
        'lineWidth': (series_code === 'indoor_temperature') ? 2 : 1
      });
    }
  });

  // Setpoint Heat/Cool
  [
    'setpoint_heat',
    'setpoint_cool'
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': 0,
        'type': 'line',
        'lineWidth': 1,
        'step': 'right',
        'className': 'crisp_edges'
      });
    }
  });

  return series;
};

/**
 * Override for get_options_yAxis_.
 *
 * @return {Array} The y-axis options.
 */
beestat.component.chart.time_to_detail.prototype.get_options_yAxis_ = function() {
  return [
    // Indoor Temperature
    {
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'allowDecimals': false,
      'title': {'text': null},
      'labels': {
        'style': {
          'color': beestat.style.color.gray.base,
          'fontSize': '11px'
        },
        'formatter': function() {
          return this.value + beestat.setting('units.temperature');
        }
      }
    },
    // Outdoor Temperature
    {
      'gridLineColor': beestat.style.color.bluegray.light,
      'opposite': true,
      'gridLineDashStyle': 'longdash',
      'allowDecimals': false,
      'title': {'text': null},
      'labels': {
        'style': {
          'color': beestat.style.color.gray.base,
          'fontSize': '11px'
        },
        'formatter': function() {
          return this.value + beestat.setting('units.temperature');
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
beestat.component.chart.time_to_detail.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var points = [];
    var x = this.x;

    var sections = [];
    var groups = {
      'data': [],
      'delta': []
    };

    // Add some other stuff.
    [
      'indoor_temperature',
      'outdoor_temperature',
      'setpoint_heat',
      'setpoint_cool',
      'indoor_cool_1_delta',
      'indoor_cool_2_delta',
      'indoor_heat_1_delta',
      'indoor_heat_2_delta',
      'indoor_auxiliary_heat_1_delta',
      // 'indoor_auxiliary_heat_2_delta'
    ].forEach(function(series_code) {
      if (
        self.data_.metadata.series[series_code].active === true
      ) {
        points.push({
          'series_code': series_code,
          'value': self.data_.metadata.series[series_code].data[x.valueOf()],
          'color': beestat.series[series_code].color
        });
      }
    });

    points.forEach(function(point) {
      var label;
      var value;
      var color;
      var group;

      if (
        point.series_code.includes('temperature') === true ||
        point.series_code.includes('setpoint') === true
      ) {
        group = 'data';
        label = beestat.series[point.series_code].name;
        color = beestat.series[point.series_code].color;
        value = point.value;

        value = beestat.temperature({
          'temperature': value,
          'input_temperature_unit': beestat.setting('units.temperature'),
          'units': true
        });
      } else if(point.series_code.includes('delta') === true) {
        group = 'delta';
        label = beestat.series[point.series_code].name;
        color = beestat.series[point.series_code].color;
        value = point.value;

        value = beestat.temperature({
          'temperature': point.value,
          'units': true,
          'input_temperature_unit': beestat.setting('units.temperature'),
          'delta': true,
          'type': 'string'
        }) + ' / h';

        if (point.value.toFixed(1) > 0) {
          value = '+' + value;
        }
      }
      else {
        return;
      }

      groups[group].push({
        'label': label,
        'value': value,
        'color': color
      });
    });

    sections.push(groups.data);
    sections.push(groups.delta);

    var title = this.x.format('ddd, MMM D @ h:mma');

    return self.tooltip_formatter_helper_(
      title,
      sections
    );
  };
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.time_to_detail.prototype.get_options_chart_height_ = function() {
  return 350;
};

/**
 * Get the top margin for the chart.
 *
 * @return {number} The top margin for the chart.
 */
beestat.component.chart.time_to_detail.prototype.get_options_chart_marginTop_ = function() {
  return 20;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.time_to_detail.prototype.get_options_chart_marginLeft_ = function() {
  return 45;
};

/**
 * Get the right margin for the chart.
 *
 * @return {number} The right margin for the chart.
 */
beestat.component.chart.time_to_detail.prototype.get_options_chart_marginRight_ = function() {
  return 45;
};
