/**
 * Runtime thermostat detail temperature chart.
 *
 * @param {object} data The chart data.
 */
beestat.component.chart.runtime_thermostat_detail_temperature = function(data) {
  this.data_ = data;

  beestat.component.chart.apply(this, arguments);
};
beestat.extend(beestat.component.chart.runtime_thermostat_detail_temperature, beestat.component.chart);

/**
 * Override for get_options_xAxis_labels_formatter_.
 *
 * @return {Function} xAxis labels formatter.
 */
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_xAxis_labels_formatter_ = function() {
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
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_series_ = function() {
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
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_yAxis_ = function() {
  return [
    // Temperature
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

    // Humidity
    {
      'alignTicks': false,
      'gridLineColor': null,
      'opposite': true,
      'title': {'text': null},
      'labels': {
        'style': {
          'color': beestat.style.color.gray.base,
          'fontSize': '11px'
        },
        'formatter': function() {
          return this.value + '%';
        }
      },

      // https://github.com/highcharts/highcharts/issues/3403
      'min': 0,
      'minRange': 100,
      'ceiling': 100
    }
  ];
};

/**
 * Override for get_options_tooltip_formatter_.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_tooltip_formatter_ = function() {
  var self = this;

  return function() {
    var points = [];
    var x = this.x;

    var sections = [];
    var groups = {
      'mode': [],
      'data': [],
      'equipment': [],
      'off': []
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
      'outdoor_temperature',
      'setpoint_heat',
      'setpoint_cool',
      'indoor_humidity',
      'outdoor_humidity'
    ].forEach(function(series_code) {
      if (
        self.data_.metadata.series[series_code].data[x.valueOf()] !== undefined
      ) {
        points.push({
          'series_code': series_code,
          'value': self.data_.metadata.series[series_code].data[x.valueOf()]
        });
      }
    });

    // Add points which are, more or less, always present.
    [
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
      'economizer',
      'calendar_event_smartrecovery',
      'calendar_event_home',
      'calendar_event_away',
      'calendar_event_sleep',
      'calendar_event_smarthome',
      'calendar_event_smartaway',
      'calendar_event_hold',
      'calendar_event_vacation',
      'calendar_event_quicksave',
      'calendar_event_door_window_open',
      'calendar_event_other',
      'calendar_event_custom'
    ].forEach(function(series_code) {
      if (self.data_.metadata.series[series_code].data[x.valueOf()] !== undefined) {
        points.push({
          'series_code': series_code,
          'value': self.data_.metadata.series[series_code].data[x.valueOf()]
        });
      }
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
        value = self.data_.metadata.series[point.series_code].data[x.valueOf()];

        value = beestat.temperature({
          'temperature': value,
          'input_temperature_unit': beestat.setting('units.temperature'),
          'units': true
        });
      } else if (point.series_code.includes('humidity') === true) {
        group = 'data';
        label = beestat.series[point.series_code].name;
        color = beestat.series[point.series_code].color;
        value = self.data_.metadata.series[point.series_code].data[x.valueOf()];

        value = Math.round(value) + '%';
      } else if (
        point.series_code === 'fan' ||
        point.series_code === 'compressor_heat_1' ||
        point.series_code === 'auxiliary_heat_1' ||
        point.series_code === 'compressor_cool_1' ||
        point.series_code === 'dehumidifier' ||
        point.series_code === 'economizer' ||
        point.series_code === 'humidifier' ||
        point.series_code === 'ventilator'
      ) {
        group = 'equipment';
        label = beestat.series[point.series_code].name;
        color = beestat.series[point.series_code].color;
        value = beestat.time(
          self.data_.metadata.series[point.series_code].durations[x.valueOf()]
        );
      } else if (
        point.series_code.includes('calendar_event')
      ) {
        group = 'mode';
        label = 'Comfort Profile';
        color = beestat.series[point.series_code].color;
        value = self.data_.metadata.series.calendar_event_name[x.valueOf()];
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
        point.series_code === 'compressor_heat_1' &&
        self.data_.metadata.series.compressor_heat_2.durations[x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.compressor_heat_2.name,
          'value': beestat.time(
            self.data_.metadata.series.compressor_heat_2.durations[x.valueOf()]
          ),
          'color': beestat.series.compressor_heat_2.color
        });
      }

      if (
        point.series_code === 'auxiliary_heat_1' &&
        self.data_.metadata.series.auxiliary_heat_2.durations[x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.auxiliary_heat_2.name,
          'value': beestat.time(
            self.data_.metadata.series.auxiliary_heat_2.durations[x.valueOf()]
          ),
          'color': beestat.series.auxiliary_heat_2.color
        });
      }

      if (
        point.series_code === 'compressor_cool_1' &&
        self.data_.metadata.series.compressor_cool_2.durations[x.valueOf()].seconds > 0
      ) {
        groups.equipment.push({
          'label': beestat.series.compressor_cool_2.name,
          'value': beestat.time(
            self.data_.metadata.series.compressor_cool_2.durations[x.valueOf()]
          ),
          'color': beestat.series.compressor_cool_2.color
        });
      }
    });

    if (
      self.data_.metadata.series.off_heat_cool.durations[x.valueOf()] !== undefined &&
      self.data_.metadata.series.off_heat_cool.durations[x.valueOf()].seconds > 0
    ) {
      groups.off.push({
        'label': beestat.series.off_heat_cool.name,
        'value': beestat.time(
          self.data_.metadata.series.off_heat_cool.durations[x.valueOf()]
        ),
        'color': beestat.series.off_heat_cool.color
      });
    }

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
    sections.push(groups.data);
    sections.push(groups.equipment);

    sections.push(groups.off);

    var title = this.x.format('ddd, MMM D @ h:mma');

    return self.tooltip_formatter_helper_(
      title,
      sections
    );
  };
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_chart_marginLeft_ = function() {
  return 45;
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_chart_height_ = function() {
  return 350;
};

/**
 * Get the boost enabled option.
 *
 * @return {object} The boost enabled option.
 */
beestat.component.chart.runtime_thermostat_detail_temperature.prototype.get_options_boost_enabled_ = function() {
  return true;
};
