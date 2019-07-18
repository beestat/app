/**
 * A chart. Mostly just a wrapper for the Highcharts stuff so the defaults
 * don't have to be set every single time.
 */
beestat.component.chart = function() {
  var self = this;

  this.options = {};

  this.options.credits = false;

  this.options.exporting = {
    'enabled': false,
    'sourceWidth': 980,
    'scale': 1,
    'filename': 'beestat',
    'chartOptions': {
      'credits': {
        'text': 'beestat.io'
      },
      'title': {
        'align': 'left',
        'text': null,
        'margin': beestat.style.size.gutter,
        'style': {
          'color': '#fff',
          'font-weight': beestat.style.font_weight.bold,
          'font-size': beestat.style.font_size.large
        }
      },
      'subtitle': {
        'align': 'left',
        'text': null,
        'style': {
          'color': '#fff',
          'font-weight': beestat.style.font_weight.light,
          'font-size': beestat.style.font_size.normal
        }
      },
      'chart': {
        'style': {
          'fontFamily': 'Montserrat, Helvetica, Sans-Serif'
        },
        'spacing': [
          beestat.style.size.gutter,
          beestat.style.size.gutter,
          beestat.style.size.gutter,
          beestat.style.size.gutter
        ]
      }
    }
  };

  this.options.chart = {
    'style': {
      'fontFamily': 'Montserrat'
    },
    'spacing': [
      beestat.style.size.gutter,
      0,
      0,
      0
    ],
    'zoomType': 'x',
    'panning': true,
    'panKey': 'ctrl',
    'backgroundColor': beestat.style.color.bluegray.base,
    'resetZoomButton': {
      'theme': {
        'display': 'none'
      }
    }
  };

  this.options.title = {
    'text': null
  };
  this.options.subtitle = {
    'text': null
  };

  this.options.legend = {
    'itemStyle': {
      'color': '#ecf0f1',
      'font-weight': '500'
    },
    'itemHoverStyle': {
      'color': '#bdc3c7'
    },
    'itemHiddenStyle': {
      'color': '#7f8c8d'
    }
  };

  this.options.plotOptions = {
    'series': {
      'animation': false,
      'marker': {
        'enabled': false
      },
      'states': {
        'hover': {
          'enabled': false
        },
        'inactive': {
          'opacity': 1
        }
      }
    },
    'column': {
      'pointPadding': 0,
      'borderWidth': 0,
      'stacking': 'normal',
      'dataLabels': {
        'enabled': false
      }
    }
  };

  this.addEventListener('render', function() {
    self.chart_.reflow();
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.chart, beestat.component);

beestat.component.chart.prototype.rerender_on_breakpoint_ = false;

beestat.component.chart.prototype.decorate_ = function(parent) {
  this.options.chart.renderTo = parent[0];
  this.chart_ = Highcharts.chart(this.options);

  // parent.style('position', 'relative');
};

/**
 * Get the Highcharts chart object
 *
 * @return {object}
 */
beestat.component.chart.prototype.get_chart = function() {
  return this.chart_;
};

/**
 * Generate a number of colors between two points.
 *
 * @param {Object} begin RGB begin color
 * @param {Object} end RGB end color
 * @param {number} steps Number of colors to generate
 *
 * @see http://forums.codeguru.com/showthread.php?259953-Code-to-create-Color-Gradient-programatically&s=4710043a327ee6059da1f8433ad1e5d2&p=795289#post795289
 *
 * @private
 *
 * @return {Array.<Object>} RGB color array
 */
beestat.component.chart.generate_gradient = function(begin, end, steps) {
  var gradient = [];
  for (var i = 0; i < steps; i++) {
    var n = i / (steps - 1);
    gradient.push({
      'r': Math.round(begin.r * (1 - n) + end.r * n),
      'g': Math.round(begin.g * (1 - n) + end.g * n),
      'b': Math.round(begin.b * (1 - n) + end.b * n)
    });
  }
  return gradient;
};

beestat.component.chart.tooltip_positioner = function(
  chart,
  tooltip_width,
  tooltip_height,
  point
) {
  var plot_width = chart.plotWidth;

  var fits_on_left = (point.plotX - tooltip_width) > 0;
  var fits_on_right = (point.plotX + tooltip_width) < plot_width;

  var x;
  var y = 60;
  if (fits_on_left === true) {
    x = point.plotX - tooltip_width + chart.plotLeft;
  } else if (fits_on_right === true) {
    x = point.plotX + chart.plotLeft;
  } else {
    x = chart.plotLeft;
  }

  return {
    'x': x,
    'y': y
  };
};

/**
 * Get the HTML needed to render a tooltip.
 *
 * @param {string} title The tooltip title.
 * @param {array} sections Data inside the tooltip.
 *
 * @return {string} The tooltip HTML.
 */
beestat.component.chart.tooltip_formatter = function(title, sections) {
  var tooltip = $.createElement('div')
    .style({
      'background-color': beestat.style.color.bluegray.dark,
      'padding': beestat.style.size.gutter / 2
    });

  var title_div = $.createElement('div')
    .style({
      'font-weight': beestat.style.font_weight.bold,
      'font-size': beestat.style.font_size.large,
      'margin-bottom': beestat.style.size.gutter / 4,
      'color': beestat.style.color.gray.light
    })
    .innerText(title);
  tooltip.appendChild(title_div);

  var table = $.createElement('table')
    .setAttribute({
      'cellpadding': '0',
      'cellspacing': '0'
    });
  tooltip.appendChild(table);

  sections.forEach(function(section, i) {
    if (section.length > 0) {
      section.forEach(function(item) {
        var tr = $.createElement('tr').style('color', item.color);
        table.appendChild(tr);

        var td_label = $.createElement('td')
          .style({
            'min-width': '115px',
            'font-weight': beestat.style.font_weight.bold
          })
          .innerText(item.label);
        tr.appendChild(td_label);

        var td_value = $.createElement('td').innerText(item.value);
        tr.appendChild(td_value);
      });

      if (i < sections.length) {
        var spacer_tr = $.createElement('tr');
        table.appendChild(spacer_tr);

        var spacer_td = $.createElement('td')
          .style('padding-bottom', beestat.style.size.gutter / 4);
        spacer_tr.appendChild(spacer_td);
      }
    }
  });

  return tooltip[0].outerHTML;
};

beestat.component.chart.get_outdoor_temperature_zones = function() {

  /*
   * This will get me one color for every degree on a nice gradient without
   * using the multicolor series plugin. Very cool.
   */
  var zone_definitions = [
    {
      'value': beestat.temperature(-20),
      'color': beestat.style.hex_to_rgb(beestat.style.color.lightblue.base)
    },
    {
      'value': beestat.temperature(30),
      'color': beestat.style.hex_to_rgb(beestat.style.color.lightblue.base)
    },
    {
      'value': beestat.temperature(60),
      'color': beestat.style.hex_to_rgb(beestat.style.color.green.base)
    },
    {
      'value': beestat.temperature(75),
      'color': beestat.style.hex_to_rgb(beestat.style.color.yellow.base)
    },
    {
      'value': beestat.temperature(90),
      'color': beestat.style.hex_to_rgb(beestat.style.color.red.base)
    },
    {
      'value': beestat.temperature(120),
      'color': beestat.style.hex_to_rgb(beestat.style.color.red.base)
    }
  ];

  var zones = [];
  var zone_divisor = 1; // Increase this to like 2 or 3 if there are performance issues with this series.
  for (var i = 0; i < zone_definitions.length - 1; i++) {
    var gradient = beestat.component.chart.generate_gradient(
      zone_definitions[i].color,
      zone_definitions[i + 1].color,
      Math.ceil((zone_definitions[i + 1].value - zone_definitions[i].value) / zone_divisor)
    );
    for (var j = 0; j < gradient.length; j++) {
      zones.push({
        'value': zone_definitions[i].value + j,
        'color': 'rgb(' + gradient[j].r + ',' + gradient[j].g + ',' + gradient[j].b + ')'
      });
    }
  }

  return zones;
};

/**
 * Wrap the highcharts SVG function with this to embed Montserrat 300 so the
 * graph downloads don't look like garbage.
 */
Highcharts.wrap(Highcharts, 'downloadSVGLocal', function(
  p,
  svg,
  options,
  failCallback,
  successCallback
) {
  p(
    svg.replace(/<\/svg/, '<style>@font-face {font-family: "Montserrat";src: url("data:application/font-woff;charset=utf-8;base64,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");}</style>$&'),
    options,
    failCallback,
    successCallback
  );
});
