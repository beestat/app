/**
 * Temperature profiles.
 */
beestat.component.card.temperature_profiles = function() {
  var self = this;

  beestat.dispatcher.addEventListener('cache.data.comparison_temperature_profile', function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);

  this.layer_.register_loader(beestat.generate_temperature_profile);
};
beestat.extend(beestat.component.card.temperature_profiles, beestat.component.card);

/**
 * Decorate card.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.temperature_profiles.prototype.decorate_contents_ = function(parent) {
  var self = this;

  this.chart_ = new beestat.component.chart();
  this.chart_.options.chart.height = 300;

  if (
    beestat.cache.data.comparison_temperature_profile === undefined
  ) {
    this.chart_.render(parent);
    this.show_loading_('Calculating');
  } else {
    var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

    // var x_categories = [];
    var trendlines = {};
    var raw = {};

    // Global x range.
    var x_min = Infinity;
    var x_max = -Infinity;

    var y_min = Infinity;
    var y_max = -Infinity;
    for (var type in beestat.cache.data.comparison_temperature_profile) {
      var profile = beestat.cache.data.comparison_temperature_profile[type];

      if (profile !== null) {
        // Convert the data to Celsius if necessary
        var deltas_converted = {};
        for (var key in profile.deltas) {
          deltas_converted[beestat.temperature({'temperature': key})] =
            beestat.temperature({
              'temperature': profile.deltas[key],
              'delta': true,
              'round': 3
            });
        }

        profile.deltas = deltas_converted;
        var linear_trendline = this.get_linear_trendline_(profile.deltas);

        var min_max_keys = Object.keys(profile.deltas);

        // This specific trendline x range.
        var this_x_min = Math.min.apply(null, min_max_keys);
        var this_x_max = Math.max.apply(null, min_max_keys);

        // Global x range.
        x_min = Math.min(x_min, this_x_min);
        x_max = Math.max(x_max, this_x_max);

        trendlines[type] = [];
        raw[type] = [];

        /**
         * Data is stored internally as °F with 1 value per degree. That data
         * gets converted to °C which then requires additional precision
         * (increment).
         *
         * The additional precision introduces floating point error, so
         * convert the x value to a fixed string.
         *
         * The string then needs converted to a number for highcharts, so
         * later on use parseFloat to get back to that.
         *
         * Stupid Celsius.
         */
        var increment;
        var fixed;
        if (thermostat.temperature_unit === '°F') {
          increment = 1;
          fixed = 0;
        } else {
          increment = 0.1;
          fixed = 1;
        }
        for (var x = this_x_min; x <= this_x_max; x += increment) {
          var x_fixed = x.toFixed(fixed);
          var y = (linear_trendline.slope * x_fixed) +
            linear_trendline.intercept;

          trendlines[type].push([
            parseFloat(x_fixed),
            y
          ]);
          if (profile.deltas[x_fixed] !== undefined) {
            raw[type].push([
              parseFloat(x_fixed),
              profile.deltas[x_fixed]
            ]);
            y_min = Math.min(y_min, profile.deltas[x_fixed]);
            y_max = Math.max(y_max, profile.deltas[x_fixed]);
          }
        }
      }
    }

    // Set y_min and y_max to be equal but opposite so the graph is always
    // centered.
    var absolute_y_max = Math.max(Math.abs(y_min), Math.abs(y_max));
    y_min = absolute_y_max * -1;
    y_max = absolute_y_max;

    // y_min = -5;
    // y_max = 5;
    // x_min = Math.min(x_min, 0);
    // x_max = Math.max(x_max, 100);

    // Chart
    this.chart_.options.exporting.chartOptions.title.text = this.get_title_();
    this.chart_.options.exporting.chartOptions.subtitle.text = this.get_subtitle_();

    this.chart_.options.chart.backgroundColor = beestat.style.color.bluegray.base;
    this.chart_.options.exporting.filename = 'Temperature Profiles';
    this.chart_.options.chart.zoomType = null;
    this.chart_.options.plotOptions.series.connectNulls = true;
    this.chart_.options.legend = {'enabled': false};

    this.chart_.options.xAxis = {
      // 'categories': x_categories,
      // 'min': x_min,
      // 'max': x_max,
      'lineWidth': 0,
      'tickLength': 0,
      'tickInterval': 5,
      'gridLineWidth': 1,
      'gridLineColor': beestat.style.color.bluegray.light,
      'gridLineDashStyle': 'longdash',
      'labels': {
        'style': {'color': beestat.style.color.gray.base},
        'formatter': function() {
          return this.value + thermostat.temperature_unit;
        }
      }
    };

    this.chart_.options.yAxis = [
      {
        'alignTicks': false,
        'gridLineColor': beestat.style.color.bluegray.light,
        'gridLineDashStyle': 'longdash',
        'title': {'text': null},
        'labels': {
          'style': {'color': beestat.style.color.gray.base},
          'formatter': function() {
            return this.value + thermostat.temperature_unit;
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

    this.chart_.options.tooltip = {
      'shared': true,
      'useHTML': true,
      'borderWidth': 0,
      'shadow': false,
      'backgroundColor': null,
      'followPointer': true,
      'crosshairs': {
        'width': 1,
        'zIndex': 100,
        'color': beestat.style.color.gray.light,
        'dashStyle': 'shortDot',
        'snap': false
      },
      'positioner': function(tooltip_width, tooltip_height, point) {
        return beestat.component.chart.tooltip_positioner(
          self.chart_.get_chart(),
          tooltip_width,
          tooltip_height,
          point
        );
      },
      'formatter': function() {
        var sections = [];
        var section = [];
        this.points.forEach(function(point) {
          var series = point.series;

          var value = beestat.temperature({
            'temperature': point.y,
            'units': true,
            'convert': false,
            'delta': true,
            'type': 'string'
          }) + ' / hour';

          if (series.name.indexOf('Raw') === -1) {
            section.push({
              'label': series.name,
              'value': value,
              'color': series.color
            });
          }
        });
        sections.push(section);

        return beestat.component.chart.tooltip_formatter(
          'Outdoor Temp: ' +
          beestat.temperature({
            'temperature': this.x,
            'round': 0,
            'units': true,
            'convert': false
          }),
          sections
        );
      }
    };

    this.chart_.options.series = [];

    // Trendline data
    this.chart_.options.series.push({
      'data': trendlines.heat,
      'name': 'Indoor Heat Δ',
      'color': beestat.series.compressor_heat_1.color,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'type': 'line',
      'lineWidth': 2,
      'states': {'hover': {'lineWidthPlus': 0}}
    });

    // Trendline data
    this.chart_.options.series.push({
      'data': trendlines.cool,
      'name': 'Indoor Cool Δ',
      'color': beestat.series.compressor_cool_1.color,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'type': 'line',
      'lineWidth': 2,
      'states': {'hover': {'lineWidthPlus': 0}}
    });

    // Trendline data
    this.chart_.options.series.push({
      'data': trendlines.resist,
      'name': 'Indoor Δ',
      'color': beestat.style.color.gray.dark,
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'type': 'line',
      'lineWidth': 2,
      'states': {'hover': {'lineWidthPlus': 0}}
    });

    // Raw data
    this.chart_.options.series.push({
      'data': raw.heat,
      'name': 'Heat Raw',
      'color': beestat.series.compressor_heat_1.color,
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
    this.chart_.options.series.push({
      'data': raw.cool,
      'name': 'Cool Raw',
      'color': beestat.series.compressor_cool_1.color,
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
    this.chart_.options.series.push({
      'data': raw.resist,
      'name': 'Resist Raw',
      'color': beestat.style.color.gray.dark,
      'dashStyle': 'ShortDot',
      'marker': {
        'enabled': false,
        'states': {'hover': {'enabled': false}}
      },
      'type': 'spline',
      'lineWidth': 1,
      'states': {'hover': {'lineWidthPlus': 0}}
    });

    this.chart_.render(parent);
  }
};

/**
 * Get a linear trendline from a set of data.
 *
 * @param {Object} data The data; at least two points required.
 *
 * @return {Object} The slope and intercept of the trendline.
 */
beestat.component.card.temperature_profiles.prototype.get_linear_trendline_ = function(data) {
  // Requires at least two points.
  if (Object.keys(data).length < 2) {
    return null;
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x_squared = 0;
  var n = 0;

  for (var x in data) {
    x = parseFloat(x);
    var y = parseFloat(data[x]);

    sum_x += x;
    sum_y += y;
    sum_xy += (x * y);
    sum_x_squared += Math.pow(x, 2);
    n++;
  }

  var slope = ((n * sum_xy) - (sum_x * sum_y)) /
    ((n * sum_x_squared) - (Math.pow(sum_x, 2)));
  var intercept = ((sum_y) - (slope * sum_x)) / (n);

  return {
    'slope': slope,
    'intercept': intercept
  };
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.temperature_profiles.prototype.get_title_ = function() {
  return 'Temperature Profiles';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.temperature_profiles.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Chart')
    .set_icon('download')
    .set_callback(function() {
      self.chart_.get_chart().exportChartLocal();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      (new beestat.component.modal.help_temperature_profiles()).render();
    }));
};
