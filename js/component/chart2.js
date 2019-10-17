/**
 * A chart. Mostly just a wrapper for the Highcharts stuff so the defaults
 * don't have to be set every single time.
 */
beestat.component.chart2 = function() {
  var self = this;

  this.addEventListener('render', function() {
    self.chart_.reflow();
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.chart2, beestat.component);

beestat.component.chart2.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate. Calls all the option getters and renders the chart.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.chart2.prototype.decorate_ = function(parent) {
  var options = {};

  options.credits = this.get_options_credits_();
  options.exporting = this.get_options_exporting_();
  options.chart = this.get_options_chart_();
  options.title = this.get_options_title_();
  options.subtitle = this.get_options_subtitle_();
  options.legend = this.get_options_legend_();
  options.plotOptions = this.get_options_plotOptions_();
  options.xAxis = this.get_options_xAxis_();
  options.yAxis = this.get_options_yAxis_();
  options.series = this.get_options_series_();
  options.tooltip = this.get_options_tooltip_();

  options.chart.renderTo = parent[0];

  this.chart_ = Highcharts.chart(options);
};

/**
 * Reset the chart zoom level all the way out.
 */
beestat.component.chart2.prototype.reset_zoom = function() {
  this.chart_.zoomOut();
};

/**
 * Export the chart to a PNG.
 */
beestat.component.chart2.prototype.export = function() {
  this.chart_.exportChartLocal();
};

/**
 * Get the legend options.
 *
 * @return {object} The legend options.
 */
beestat.component.chart2.prototype.get_options_legend_ = function() {
  return {
    'itemStyle': {
      'color': '#ecf0f1',
      'font-weight': '500'
    },
    'itemHoverStyle': {
      'color': '#bdc3c7'
    },
    'itemHiddenStyle': {
      'color': '#7f8c8d'
    },
    'labelFormatter': this.get_options_legend_labelFormatter_()
  };
};

/**
 * Get the legend labelFormatter options.
 *
 * @return {Function} The legend labelFormatter options.
 */
beestat.component.chart2.prototype.get_options_legend_labelFormatter_ = function() {
  return function() {
    return beestat.series[this.name].name;
  };
};

/**
 * Get the plotOptions.
 *
 * @return {object} The plotOptions.
 */
beestat.component.chart2.prototype.get_options_plotOptions_ = function() {
  return {
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
};

/**
 * Get the title options.
 *
 * @return {object} The title options.
 */
beestat.component.chart2.prototype.get_options_title_ = function() {
  return {
    'text': null
  };
};

/**
 * Get the subtitle options
 *
 * @return {object} The subtitle options.
 */
beestat.component.chart2.prototype.get_options_subtitle_ = function() {
  return {
    'text': null
  };
};

/**
 * Get the chart options.
 *
 * @return {object} The chart options.
 */
beestat.component.chart2.prototype.get_options_chart_ = function() {
  return {
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
};

/**
 * Get the export options.
 *
 * @return {object} The export options.
 */
beestat.component.chart2.prototype.get_options_exporting_ = function() {
  return {
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
};

/**
 * Get the credits options.
 *
 * @return {boolean} The credits options.
 */
beestat.component.chart2.prototype.get_options_credits_ = function() {
  return false;
};

/**
 * Get the xAxis options.
 *
 * @return {object} The xAxis options.
 */
beestat.component.chart2.prototype.get_options_xAxis_ = function() {
  return {
    'categories': this.data_.x,
    'lineColor': beestat.style.color.bluegray.light,
    'tickLength': 0,
    'labels': {
      'style': {
        'color': beestat.style.color.gray.base
      },
      'formatter': this.get_options_xAxis_labels_formatter_()
    }
  };
};

/**
 * Get the xAxis label formatter options. Needs to be overridden.
 *
 * @return {object} The xAxis label formatter options.
 */
beestat.component.chart2.prototype.get_options_xAxis_labels_formatter_ = function() {
  return null;
};

/**
 * Get the yAxis label formatter options. Needs to be overridden.
 *
 * @return {object} The yAxis label formatter options.
 */
beestat.component.chart2.prototype.get_options_yAxis_ = function() {
  return null;
};

/**
 * Get the series options. Needs to be overridden.
 *
 * @return {object} The series options.
 */
beestat.component.chart2.prototype.get_options_series_ = function() {
  return null;
};

/**
 * Get the tooltip options.
 *
 * @return {object} The tooltip options.
 */
beestat.component.chart2.prototype.get_options_tooltip_ = function() {
  return {
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
    'positioner': this.get_options_tooltip_positioner_(),
    'formatter': this.get_options_tooltip_formatter_()
  };
};

/**
 * Get the tooltip formatter. Needs to be overridden.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart2.prototype.get_options_tooltip_formatter_ = function() {
  return null;
};

/**
 * Get the tooltip positioner. Makes sure the tooltip is positioned nicely.
 *
 * @return {Function} The tooltip positioner.
 */
beestat.component.chart2.prototype.get_options_tooltip_positioner_ = function() {
  var self = this;
  return function(tooltip_width, tooltip_height, point) {
    var plot_width = self.chart_.plotWidth;

    var fits_on_left = (point.plotX - tooltip_width) > 0;
    var fits_on_right = (point.plotX + tooltip_width) < plot_width;

    var x;
    var y = 60;
    if (fits_on_left === true) {
      x = point.plotX - tooltip_width + self.chart_.plotLeft;
    } else if (fits_on_right === true) {
      x = point.plotX + self.chart_.plotLeft;
    } else {
      x = self.chart_.plotLeft;
    }

    return {
      'x': x,
      'y': y
    };
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
beestat.component.chart2.prototype.tooltip_formatter_helper_ = function(title, sections) {
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
            'font-weight': beestat.style.font_weight.bold
          })
          .innerText(item.label);
        tr.appendChild(td_label);

        var td_value = $.createElement('td').innerText(item.value)
          .style({
            'padding-left': beestat.style.size.gutter / 4
          });
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
