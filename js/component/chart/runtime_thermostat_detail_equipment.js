/**
 * Runtime sensor detail chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_thermostat_detail_equipment = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_thermostat_detail_equipment, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_xAxis_labels_formatter_ = function() {
  return function() {
    return null;
  };
};

/**
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

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
    'calendar_event_custom',
    'compressor_heat_1',
    'compressor_heat_2',
    'auxiliary_heat_1',
    'auxiliary_heat_2',
    'compressor_cool_1',
    'compressor_cool_2',
    'fan',
    'humidifier',
    'dehumidifier',
    'ventilator',
    'economizer'
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      var line_width;
      if (
        series_code.includes('heat') === true ||
        series_code.includes('cool') === true
      ) {
        line_width = 12;
      } else {
        line_width = 6;
      }

      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': 0,
        'type': 'line',
        'lineWidth': line_width,
        'linecap': 'square',
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
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_yAxis_ = function() {
  return [
    {
      'min': 0,
      'max': 44,

      // Keeps the chart from ending on a multiple of whatever the tick interval gets set to.
      'endOnTick': false,

      'reversed': true,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false}
    }
  ];
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_chart_height_ = function() {
  return 44;
};

/**
 * Get the legend enabled options.
 *
 * @return {Function} The legend enabled options.
 */
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_legend_enabled_ = function() {
  return false;
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.runtime_thermostat_detail_equipment.prototype.get_options_chart_marginLeft_ = function() {
  return 40;
};
