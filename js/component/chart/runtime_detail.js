/**
 * Runtime thermostat summary chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_detail = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_detail, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_detail.prototype.get_options_xAxis_labels_formatter_ = function() {
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
 * Override for get_options_series_.
 *
 * @return {Array} All of the series to display on the chart.
 */
beestat.component.chart.runtime_detail.prototype.get_options_series_ = function() {
  var self = this;
  var series = [];

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

  // Indoor/Outdoor Humidity
  [
    'indoor_humidity',
    'outdoor_humidity'
  ].forEach(function(series_code) {
    if (self.data_.metadata.series[series_code].active === true) {
      series.push({
        'name': series_code,
        'data': self.data_.series[series_code],
        'color': beestat.series[series_code].color,
        'yAxis': 1,
        'type': 'spline',
        'dashStyle': (series_code === 'indoor_humidity') ? 'Solid' : 'ShortDash',
        'lineWidth': (series_code === 'indoor_humidity') ? 2 : 1,
        'visible': false
      });
    }
  });

  // Swimlanes
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
        'yAxis': 2,
        'type': 'line',
        'lineWidth': line_width,
        'linecap': 'square',
        'className': 'crisp_edges',
        'showInLegend': false
      });
    }
  });

  series.push({
    'name': '',
    'data': self.data_.series.dummy,
    'yAxis': 2,
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
beestat.component.chart.runtime_detail.prototype.get_options_yAxis_ = function() {
  /**
   * Highcharts doesn't seem to respect axis behavior well so just overriding
   * it completely here.
   */

  var y_min = Math.floor((this.data_.metadata.chart.y_min - 5) / 10) * 10;
  var y_max = Math.ceil((this.data_.metadata.chart.y_max + 10) / 10) * 10;
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
      'height': '80%',
      'top': '20%',
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

    // Humidity
    {
      'height': '80%',
      'top': '20%',
      'alignTicks': false,
      'gridLineColor': null,
      'opposite': true,
      'title': {'text': null},
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + '%';
        }
      },

      // https://github.com/highcharts/highcharts/issues/3403
      'min': 0,
      'minRange': 100,
      'ceiling': 100
    },

    // Swimlanes
    {
      'height': '20%',
      'top': '0%',
      'min': 0,
      'max': 100,
      'gridLineWidth': 0,
      'title': {'text': null},
      'labels': {'enabled': false}
    }
  ];
};

// https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/stock/demo/candlestick-and-volume/

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.runtime_detail.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var sections = [];
    var groups = {
      'mode': [],
      'data': [],
      'equipment': []
    };

    var values = {};
    this.points.forEach(function(point) {
      values[point.series.name] = point.y;
    });

    // HVAC Mode
    var system_mode;
    var system_mode_color;

    switch (self.data_.metadata.series.system_mode[this.x.valueOf()]) {
    case 'auto':
      system_mode = 'Auto';
      system_mode_color = beestat.style.color.gray.base;
      break;
    case 'heat':
      system_mode = 'Heat';
      system_mode_color = beestat.series.compressor_heat_1.color;
      break;
    case 'cool':
      system_mode = 'Cool';
      system_mode_color = beestat.series.compressor_cool_1.color;
      break;
    case 'off':
      system_mode = 'Off';
      system_mode_color = beestat.style.color.gray.base;
      break;
    case 'auxiliary_heat':
      system_mode = 'Aux';
      system_mode_color = beestat.series.auxiliary_heat_1.color;
      break;
    }

    if (system_mode !== undefined) {
      groups.mode.push({
        'label': 'System Mode',
        'value': system_mode,
        'color': system_mode_color
      });
    }

    this.points.forEach(function(point) {
      var label;
      var value;
      var color;
      var group;

      if (
        point.series.name.includes('temperature') === true ||
        point.series.name.includes('setpoint') === true
      ) {
        group = 'data';
        label = beestat.series[point.series.name].name;
        color = point.series.color;
        value = beestat.temperature({
          'temperature': values[point.series.name],
          'convert': false,
          'units': true
        });
      } else if (point.series.name.includes('humidity') === true) {
        group = 'data';
        label = beestat.series[point.series.name].name;
        color = point.series.color;
        value = Math.round(values[point.series.name]) + '%';
      } else if (
        point.series.name === 'fan' ||
        point.series.name === 'compressor_heat_1' ||
        point.series.name === 'auxiliary_heat_1' ||
        point.series.name === 'compressor_cool_1' ||
        point.series.name === 'dehumidifier' ||
        point.series.name === 'economizer' ||
        point.series.name === 'humidifier' ||
        point.series.name === 'ventilator'
      ) {
        group = 'equipment';
        label = beestat.series[point.series.name].name;
        color = point.series.color;
        value = beestat.time(
          self.data_.metadata.series[point.series.name].durations[point.x.valueOf()]
        );
      } else if (
        point.series.name.includes('calendar_event')
      ) {
        group = 'mode';
        label = 'Comfort Profile';
        color = point.series.color;
        value = self.data_.metadata.series.calendar_event_name[point.x.valueOf()];
      } else {
        return;
      }

      groups[group].push({
        'label': label,
        'value': value,
        'color': color
      });

      // Show stage 2 duration on stage 1, if applicable.
      if (
        point.series.name === 'compressor_heat_1' &&
        self.data_.metadata.series.compressor_heat_2.durations[point.x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.compressor_heat_2.name,
          'value': beestat.time(
            self.data_.metadata.series.compressor_heat_2.durations[point.x.valueOf()]
          ),
          'color': beestat.series.compressor_heat_2.color
        });
      }

      if (
        point.series.name === 'auxiliary_heat_1' &&
        self.data_.metadata.series.auxiliary_heat_2.durations[point.x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.auxiliary_heat_2.name,
          'value': beestat.time(
            self.data_.metadata.series.auxiliary_heat_2.durations[point.x.valueOf()]
          ),
          'color': beestat.series.auxiliary_heat_2.color
        });
      }

      if (
        point.series.name === 'compressor_cool_1' &&
        self.data_.metadata.series.compressor_cool_2.durations[point.x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.compressor_cool_2.name,
          'value': beestat.time(
            self.data_.metadata.series.compressor_cool_2.durations[point.x.valueOf()]
          ),
          'color': beestat.series.compressor_cool_2.color
        });
      }
    });

    if (
      groups.mode.length === 0 &&
      groups.equipment.length === 0 &&
      groups.data.length === 0
    ) {
      groups.mode.push({
        'label': 'No data',
        'value': '',
        'color': beestat.style.color.gray.base
      });
    }

    sections.push(groups.mode);
    sections.push(groups.equipment);
    sections.push(groups.data);

    var title = this.x.format('ddd, MMM D @ h:mma');

    return self.tooltip_formatter_helper_(
      title,
      sections
    );
  };
};
