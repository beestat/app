/**
 * Parent score card.
 */
beestat.component.card.score = function() {
  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var data_change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.comparison_temperature_profile',
      'cache.data.comparison_scores_' + this.type_
    ],
    data_change_function
  );

  beestat.component.card.apply(this, arguments);

  this.layer_.register_loader(beestat.generate_temperature_profile);
  this.layer_.register_loader(beestat.get_comparison_scores);
};
beestat.extend(beestat.component.card.score, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_contents_ = function(parent) {
  // this.view_detail_ = true;

  if (this.view_detail_ === true) {
    this.decorate_detail_(parent);
  } else {
    this.decorate_score_(parent);
  }
};

/**
 * Decorate the score with the circle.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_score_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];

  if (
    beestat.cache.data.comparison_temperature_profile === undefined ||
    beestat.cache.data['comparison_scores_' + this.type_] === undefined
  ) {
    // Height buffer so the cards don't resize after they load.
    parent.appendChild($.createElement('div')
      .style('height', '166px')
      .innerHTML('&nbsp;'));
    this.show_loading_('Calculating');
  } else {
    var percentile;
    if (
      thermostat_group.temperature_profile[this.type_] !== undefined &&
      beestat.cache.data['comparison_scores_' + this.type_].length > 2 &&
      beestat.cache.data.comparison_temperature_profile[this.type_] !== null
    ) {
      percentile = this.get_percentile_(
        beestat.cache.data.comparison_temperature_profile[this.type_].score,
        beestat.cache.data['comparison_scores_' + this.type_]
      );
    } else {
      percentile = null;
    }

    var color;
    if (percentile > 70) {
      color = beestat.style.color.green.base;
    } else if (percentile > 50) {
      color = beestat.style.color.yellow.base;
    } else if (percentile > 25) {
      color = beestat.style.color.orange.base;
    } else if (percentile !== null) {
      color = beestat.style.color.red.base;
    } else {
      color = '#fff';
    }

    var container = $.createElement('div')
      .style({
        'text-align': 'center',
        'position': 'relative',
        'margin-top': beestat.style.size.gutter
      });
    parent.appendChild(container);

    var percentile_text;
    var percentile_font_size;
    var percentile_color;
    if (percentile !== null) {
      percentile_text = '';
      percentile_font_size = 48;
      percentile_color = '#fff';
    } else if (
      thermostat_group['system_type_' + this.type_] === null ||
      thermostat_group['system_type_' + this.type_] === 'none'
    ) {
      percentile_text = 'None';
      percentile_font_size = 16;
      percentile_color = beestat.style.color.gray.base;
    } else {
      percentile_text = 'Insufficient data';
      percentile_font_size = 16;
      percentile_color = beestat.style.color.yellow.base;
    }

    var percentile_div = $.createElement('div')
      .innerText(percentile_text)
      .style({
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'font-size': percentile_font_size,
        'font-weight': beestat.style.font_weight.light,
        'color': percentile_color
      });
    container.appendChild(percentile_div);

    var stroke = 3;
    var size = 150;
    var diameter = size - stroke;
    var radius = diameter / 2;
    var circumference = Math.PI * diameter;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('height', size);
    svg.setAttribute('width', size);
    svg.style.transform = 'rotate(-90deg)';
    container.appendChild(svg);

    var background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    background.setAttribute('cx', (size / 2));
    background.setAttribute('cy', (size / 2));
    background.setAttribute('r', radius);
    background.setAttribute('stroke', beestat.style.color.bluegray.dark);
    background.setAttribute('stroke-width', stroke);
    background.setAttribute('fill', 'none');
    svg.appendChild(background);

    var stroke_dasharray = circumference;
    var stroke_dashoffset_initial = stroke_dasharray;
    var stroke_dashoffset_final = stroke_dasharray * (1 - (percentile / 100));

    var foreground = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    foreground.style.transition = 'stroke-dashoffset 1s ease';
    foreground.setAttribute('cx', (size / 2));
    foreground.setAttribute('cy', (size / 2));
    foreground.setAttribute('r', radius);
    foreground.setAttribute('stroke', color);
    foreground.setAttribute('stroke-width', stroke);
    foreground.setAttribute('stroke-linecap', 'round');
    foreground.setAttribute('stroke-dasharray', stroke_dasharray);
    foreground.setAttribute('stroke-dashoffset', stroke_dashoffset_initial);
    foreground.setAttribute('fill', 'none');
    svg.appendChild(foreground);

    /*
     * For some reason the render event (which is timeout 0) doesn't work well
     * here.
     */
    setTimeout(function() {
      foreground.setAttribute('stroke-dashoffset', stroke_dashoffset_final);

      if (percentile !== null) {
        $.step(
          function(percentage, sine) {
            var calculated_percentile = Math.round(percentile * sine);
            percentile_div.innerText(calculated_percentile);
          },
          1000,
          null,
          30
        );
      }
    }, 100);
  }
};

/**
 * Decorate the detail bell curve.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_detail_ = function(parent) {



































  // var self = this;

  this.chart_ = new beestat.component.chart();
  this.chart_.options.chart.height = 166;

  // if (
  //   beestat.cache.data.comparison_temperature_profile === undefined
  // ) {
  //   this.chart_.render(parent);
  //   this.show_loading_('Calculating');
  // } else {
    // var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

    // var x_categories = [];
    // var trendlines = {};
    // var raw = {};

    // Global x range.
/*    var x_min = Infinity;
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

        *
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
    y_max = absolute_y_max;*/

    // y_min = -5;
    // y_max = 5;
    // x_min = Math.min(x_min, 0);
    // x_max = Math.max(x_max, 100);

    // Chart
    // this.chart_.options.exporting.chartOptions.title.text = this.get_title_();
    // this.chart_.options.exporting.chartOptions.subtitle.text = this.get_subtitle_();

    // this.chart_.options.chart.backgroundColor = beestat.style.color.bluegray.base;
    // this.chart_.options.exporting.filename = this.get_title_();
    this.chart_.options.chart.zoomType = null;
    // this.chart_.options.plotOptions.series.connectNulls = true;
    this.chart_.options.legend = {'enabled': false};

/*    this.chart_.options.xAxis = {
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
    };*/


    this.chart_.options.xAxis = {
      'title': { 'text': null },
      'plotLines': [
        {
          'color': 'white',
          'width': 2,
          'value': beestat.cache.data.comparison_temperature_profile[this.type_].score

        }
      ]
        // alignTicks: false
    };
    this.chart_.options.yAxis = {
      'title': { 'text': null }
    };

/*    this.chart_.options.yAxis = [
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
    ];*/

/*    this.chart_.options.tooltip = {
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

          // if (series.name.indexOf('Raw') === -1) {
            section.push({
              'label': series.name,
              'value': value,
              'color': series.color
            });
          // }
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
    };*/

  // beestat.cache.data['comparison_scores_' + this.type_] = [ 0.4, 0.6, 0.6, 0.7, 0.8, 0.8, 0.8, 0.9, 0.9, 1, 1, 1, 1, 1, 1.1, 1.1, 1.1, 1.1, 1.2, 1.2, 1.2, 1.4, 1.4, 1.5, 1.5, 1.5, 1.5, 1.5, 1.6, 1.7, 1.8, 1.9, 2.3, 2.6, 2.7, 3.3, 3.3, 3.6, 5.9]


    console.log(beestat.cache.data['comparison_scores_' + this.type_]);

    var color = this.type_ === 'resist' ? beestat.style.color.gray.base : beestat.series['compressor_' + this.type_ + '_1'].color;

    this.chart_.options.series = [


      {
        // 'data': trendlines.heat,
        // 'name': 'Indoor Heat Δ',
        // 'color': beestat.series.compressor_heat_1.color,
        // 'marker': {
          // 'enabled': false,
          // 'states': {'hover': {'enabled': false}}
        // },
        'type': 'bellcurve',
        'baseSeries': 1,
        'color': color,

        // Histogram
        // 'type': 'histogram',
        // 'binWidth': 0.1,
        // 'borderWidth': 0,

        // 'data': beestat.cache.data['comparison_scores_' + this.type_]
        // 'lineWidth': 2,
        // 'states': {'hover': {'lineWidthPlus': 0}}
      },
{
        'data': beestat.cache.data['comparison_scores_' + this.type_],
        'visible': false
      },

    ];

    console.log(parent);
    // return;

    // Trendline data
    // this.chart_.options.series.push({
      // 'data': trendlines.heat,
      // 'name': 'Indoor Heat Δ',
      // 'color': beestat.series.compressor_heat_1.color,
      // 'marker': {
        // 'enabled': false,
        // 'states': {'hover': {'enabled': false}}
      // },
      // 'type': 'bellcurve',
      // 'data': beestat.cache.data['comparison_scores_' + this.type_]
      // 'lineWidth': 2,
      // 'states': {'hover': {'lineWidthPlus': 0}}
    // });

    console.log('render chart');
    this.chart_.render(parent);
  // }





















};

/**
 * Get the percentile rank of a score in a set of scores.
 *
 * @param {number} score
 * @param {array} scores
 *
 * @return {number} The percentile rank.
 */
beestat.component.card.score.prototype.get_percentile_ = function(score, scores) {
  var n = scores.length;
  var below = 0;
  scores.forEach(function(s) {
    if (s < score) {
      below++;
    }
  });

  return Math.round(below / n * 100);
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  // menu.add_menu_item(new beestat.component.menu_item()
  //   .set_text('View Detail')
  //   .set_icon('chart_bell_curve')
  //   .set_callback(function() {
  //     self.view_detail_ = true;
  //     self.rerender();
  //   }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      (new beestat.component.modal.help_score(self.type_)).render();
    }));
};

/**
 * Get subtitle.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.score.prototype.get_subtitle_ = function() {
  if (this.view_detail_ === true) {
    if (
      // beestat.cache.data['comparison_scores_' + this.type_] !== undefined &&
      // beestat.cache.data['comparison_scores_' + this.type_].length > 2 &&
      beestat.cache.data.comparison_temperature_profile !== undefined &&
      beestat.cache.data.comparison_temperature_profile[this.type_] !== null
    ) {
      return 'Your raw score: ' + beestat.cache.data.comparison_temperature_profile[this.type_].score;
    }

    return 'N/A';
  } else {
    if (
      beestat.cache.data['comparison_scores_' + this.type_] !== undefined &&
      beestat.cache.data['comparison_scores_' + this.type_].length > 2 &&
      beestat.cache.data.comparison_temperature_profile !== undefined &&
      beestat.cache.data.comparison_temperature_profile[this.type_] !== null
    ) {
      return 'Comparing to ' + Number(beestat.cache.data['comparison_scores_' + this.type_].length).toLocaleString() + ' Homes';
    }

    return 'N/A';
  }

};
