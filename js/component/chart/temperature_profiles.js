/**
 * Temperature profiles chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.temperature_profiles = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.temperature_profiles, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_xAxis_labels_formatter_ = function() {
  return function() {
    return this.value + beestat.setting('units.temperature');
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_series_ = function() {
  var series = [];

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_heat_1,
    'name': 'indoor_heat_1_delta',
    'color': beestat.series.indoor_heat_1_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_heat_2,
    'name': 'indoor_heat_2_delta',
    'color': beestat.series.indoor_heat_2_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_auxiliary_heat_1,
    'name': 'indoor_auxiliary_heat_1_delta',
    'color': beestat.series.indoor_auxiliary_heat_1_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_auxiliary_heat_2,
    'name': 'indoor_auxiliary_heat_2_delta',
    'color': beestat.series.indoor_auxiliary_heat_2_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_cool_1,
    'name': 'indoor_cool_1_delta',
    'color': beestat.series.indoor_cool_1_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_cool_2,
    'name': 'indoor_cool_2_delta',
    'color': beestat.series.indoor_cool_2_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Trendline data
  series.push({
    'data': this.data_.series.trendline_resist,
    'name': 'indoor_resist_delta',
    'color': beestat.series.indoor_resist_delta.color,
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'line',
    'lineWidth': 2,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_heat_1,
    'name': 'indoor_heat_1_delta_raw',
    'color': beestat.series.indoor_heat_1_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_heat_2,
    'name': 'indoor_heat_2_delta_raw',
    'color': beestat.series.indoor_heat_2_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  series.push({
    'data': this.data_.series.raw_auxiliary_heat_1,
    'name': 'indoor_auxiliary_heat_1_delta_raw',
    'color': beestat.series.indoor_auxiliary_heat_1_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_auxiliary_heat_2,
    'name': 'indoor_auxiliary_heat_2_delta_raw',
    'color': beestat.series.indoor_auxiliary_heat_2_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_cool_1,
    'name': 'indoor_cool_1_delta_raw',
    'color': beestat.series.indoor_cool_1_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_cool_2,
    'name': 'indoor_cool_2_delta_raw',
    'color': beestat.series.indoor_cool_2_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  // Raw data
  series.push({
    'data': this.data_.series.raw_resist,
    'name': 'indoor_resist_delta_raw',
    'color': beestat.series.indoor_resist_delta_raw.color,
    'dashStyle': 'ShortDot',
    'marker': {
      'enabled': false,
      'states': {'hover': {'enabled': false}}
    },
    'type': 'spline',
    'lineWidth': 1,
    'states': {'hover': {'lineWidthPlus': 0}}
  });

  return series;
};

/**
 * Override for get_options_yAxis_.
 *
 * @return {Array} The y-axis options.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_yAxis_ = function() {
  /**
   * The 0.25° in either direction forces the chart to pad another degree when
   * this close to the boundary.
   */
  var absolute_y_max = Math.max(
    Math.abs(this.data_.metadata.chart.y_min - 0.25),
    Math.abs(this.data_.metadata.chart.y_max + 0.25)
  );

  var y_min = absolute_y_max * -1;
  var y_max = absolute_y_max;

  return [
    {
      'alignTicks': false,
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + beestat.setting('units.temperature');
        }
      },
      'min': y_min,
      'max': y_max,
      'plotLines': [
        {
          'color': beestat.style.color.bluegray.light,
          'dashStyle': 'solid',
          'width': 3,
          'value': 0,
          'zIndex': 1
        }
      ]
    }
  ];
};

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var sections = [];
    var section = [];
    this.points.forEach(function(point) {
      var series = point.series;

      var value = beestat.temperature({
        'temperature': point.y,
        'units': true,
        'input_temperature_unit': beestat.setting('units.temperature'),
        'delta': true,
        'type': 'string'
      }) + ' / h';

      if (point.y.toFixed(1) > 0) {
        value = '+' + value;
      }

      if (series.name.indexOf('raw') === -1) {
        section.push({
          'label': beestat.series[series.name].name,
          'value': value,
          'color': series.color
        });
      }
    });
    sections.push(section);

    return self.tooltip_formatter_helper_(
      'Outdoor Temp: ' +
      beestat.temperature({
        'temperature': this.x,
        'round': 0,
        'units': true,
        'input_temperature_unit': beestat.setting('units.temperature')
      }),
      sections
    );
  };
};

/**
 * Override for get_options_chart_zoomType_.
 *
 * @return {string} The zoom type.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_chart_zoomType_ = function() {
  return null;
};

/**
 * Override for get_options_legend_.
 *
 * @return {object} The legend options.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_legend_ = function() {
  return {
    'enabled': false
  };
};

/**
 * Override for get_options_xAxis_.
 *
 * @return {object} The xAxis options.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_xAxis_ = function() {
  return {
    'lineWidth': 0,
    'tickLength': 0,
    'tickInterval': 5,
    'gridLineWidth': 1,
    'gridLineColor': beestat.style.color.bluegray.light,
    'gridLineDashStyle': 'longdash',
    'labels': {
      'style': {
        'color': beestat.style.color.gray.base
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
          'text': 'Now: ' + beestat.temperature({
            'temperature': this.data_.metadata.chart.outdoor_temperature,
            'input_temperature_unit': beestat.setting('units.temperature'),
            'units': true,
            'round': 0
          })
        },
        'value': this.data_.metadata.chart.outdoor_temperature,
        'zIndex': 2
      }
    ]
  };
};

/**
 * Override for get_options_chart_height_.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_chart_height_ = function() {
  return 300;
};

/**
 * Override for get_options_plotOptions_series_connectNulls_.
 *
 * @return {boolean} Whether or not to connect nulls.
 */
beestat.component.chart.temperature_profiles.prototype.get_options_plotOptions_series_connectNulls_ = function() {
  return true;
};
