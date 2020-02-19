/**
 * A chart. Mostly just a wrapper for the Highcharts stuff so the defaults
 * don't have to be set every single time.
 */
beestat.component.chart = function() {
  var self = this;

  this.addEventListener('render', function() {
    self.reflow();
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.chart, beestat.component);

beestat.component.chart.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate. Calls all the option getters and renders the chart.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.chart.prototype.decorate_ = function(parent) {
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
beestat.component.chart.prototype.reset_zoom = function() {
  this.chart_.zoomOut();
};

/**
 * Export the chart to a PNG.
 */
beestat.component.chart.prototype.export = function() {
  this.chart_.exportChartLocal();
};

/**
 * Get the legend options.
 *
 * @return {object} The legend options.
 */
beestat.component.chart.prototype.get_options_legend_ = function() {
  return {
    'enabled': this.get_options_legend_enabled_(),
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
beestat.component.chart.prototype.get_options_legend_labelFormatter_ = function() {
  return function() {
    return beestat.series[this.name].name;
  };
};

/**
 * Get the legend enabled options.
 *
 * @return {Function} The legend enabled options.
 */
beestat.component.chart.prototype.get_options_legend_enabled_ = function() {
  return true;
};

/**
 * Get the plotOptions.
 *
 * @return {object} The plotOptions.
 */
beestat.component.chart.prototype.get_options_plotOptions_ = function() {
  var self = this;

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
      },
      'connectNulls': this.get_options_plotOptions_series_connectNulls_(),
      'events': {
        'legendItemClick': function() {
          // Delay the event dispatch so the series is actually toggled to the correct visibility.
          setTimeout(function() {
            self.dispatchEvent('legend_item_click');
          }, 0);
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
 * Get whether or not to connect nulls.
 *
 * @return {boolean} Whether or not to connect nulls.
 */
beestat.component.chart.prototype.get_options_plotOptions_series_connectNulls_ = function() {
  return false;
};

/**
 * Get the title options.
 *
 * @return {object} The title options.
 */
beestat.component.chart.prototype.get_options_title_ = function() {
  return {
    'text': null
  };
};

/**
 * Get the subtitle options
 *
 * @return {object} The subtitle options.
 */
beestat.component.chart.prototype.get_options_subtitle_ = function() {
  return {
    'text': null
  };
};

/**
 * Get the chart options.
 *
 * @return {object} The chart options.
 */
beestat.component.chart.prototype.get_options_chart_ = function() {
  return {
    'style': {
      'fontFamily': 'Montserrat'
    },
    'spacing': this.get_options_chart_spacing_(),
    // For consistent left spacing on charts with no y-axis values
    'marginLeft': this.get_options_chart_marginLeft_(),
    'marginRight': this.get_options_chart_marginRight_(),
    'zoomType': this.get_options_chart_zoomType_(),
    'panning': true,
    'panKey': 'ctrl',
    'backgroundColor': beestat.style.color.bluegray.base,
    'resetZoomButton': {
      'theme': {
        'display': 'none'
      }
    },
    'height': this.get_options_chart_height_(),
    'events': this.get_options_chart_events_()
  };
};

/**
 * Get the left margin for the chart.
 *
 * @return {number} The left margin for the chart.
 */
beestat.component.chart.prototype.get_options_chart_marginLeft_ = function() {
  return undefined;
};

/**
 * Get the right margin for the chart.
 *
 * @return {number} The right margin for the chart.
 */
beestat.component.chart.prototype.get_options_chart_marginRight_ = function() {
  return undefined;
};

/**
 * Get the spacing for the chart.
 *
 * @return {number} The spacing for the chart.
 */
beestat.component.chart.prototype.get_options_chart_spacing_ = function() {
  return [
    (beestat.style.size.gutter / 2),
    0,
    0,
    0
  ];
};

/**
 * Get the events list for the chart.
 *
 * @return {number} The events list for the chart.
 */
beestat.component.chart.prototype.get_options_chart_events_ = function() {
  return null;
};

/**
 * Get the height of the chart.
 *
 * @return {number} The height of the chart.
 */
beestat.component.chart.prototype.get_options_chart_height_ = function() {
  return null;
};

/**
 * Get the zoomType option. Return null for no zoom.
 *
 * @return {string} The zoom type.
 */
beestat.component.chart.prototype.get_options_chart_zoomType_ = function() {
  return 'x';
};

/**
 * Get the export options.
 *
 * @return {object} The export options.
 */
beestat.component.chart.prototype.get_options_exporting_ = function() {
  return {
    'enabled': false,
    'sourceWidth': 980,
    'scale': 1,
    'filename': this.get_options_exporting_filename_(),
    'chartOptions': {
      'credits': {
        'text': 'beestat.io'
      },
      'title': {
        'align': 'left',
        'text': this.get_options_exporting_chartOptions_title_text_(),
        'margin': beestat.style.size.gutter,
        'style': {
          'color': '#fff',
          'font-weight': beestat.style.font_weight.bold,
          'font-size': beestat.style.font_size.large
        }
      },
      'subtitle': {
        'align': 'left',
        'text': this.get_options_exporting_chartOptions_subtitle_text_(),
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
        ],
        'events': this.get_options_exporting_chart_events_()
      }
    }
  };
};

/**
 * Get the exported chart title.
 *
 * @return {string} The exported chart title.
 */
beestat.component.chart.prototype.get_options_exporting_chartOptions_title_text_ = function() {
  return this.data_.metadata.chart.title;
};

/**
 * Get the exported chart subtitle.
 *
 * @return {string} The exported chart subtitle.
 */
beestat.component.chart.prototype.get_options_exporting_chartOptions_subtitle_text_ = function() {
  return this.data_.metadata.chart.subtitle;
};

/**
 * Get the exported chart filename.
 *
 * @return {string} The exported chart filename.
 */
beestat.component.chart.prototype.get_options_exporting_filename_ = function() {
  var title = this.get_options_exporting_chartOptions_title_text_();
  var subtitle = this.get_options_exporting_chartOptions_subtitle_text_();

  var filename = [];
  if (title !== null) {
    filename.push(title);
  }

  if (subtitle !== null) {
    filename.push('-');
    filename.push(subtitle);
  }

  if (filename.length === 0) {
    filename.push('beestat');
  }

  return filename.join(' ');
};

/**
 * Get the events list for the chart on export.
 *
 * @return {string} The events list for the chart on export.
 */
beestat.component.chart.prototype.get_options_exporting_chart_events_ = function() {
  return null;
};

/**
 * Get the credits options.
 *
 * @return {boolean} The credits options.
 */
beestat.component.chart.prototype.get_options_credits_ = function() {
  return false;
};

/**
 * Get the xAxis options.
 *
 * @return {object} The xAxis options.
 */
beestat.component.chart.prototype.get_options_xAxis_ = function() {
  var self = this;

  return {
    'categories': this.data_.x,
    'lineColor': beestat.style.color.bluegray.light,
    'tickLength': 0,
    'labels': {
      'style': {
        'color': beestat.style.color.gray.base
      },
      'formatter': this.get_options_xAxis_labels_formatter_()
    },
    'crosshair': {
      'width': this.get_options_xAxis_crosshair_width_(),
      'zIndex': 100,
      'color': 'rgba(255, 255, 255, 0.2)',
      'snap': this.get_options_xAxis_crosshair_snap_()
    },
    'events': {
      'afterSetExtremes': function() {
        self.dispatchEvent('after_set_extremes');
      }
    }
  };
};

/**
 * Get the crosshair width.
 *
 * @return {object} The crosshair width.
 */
beestat.component.chart.prototype.get_options_xAxis_crosshair_width_ = function() {
  return 2;
};

/**
 * Get the crosshair snap.
 *
 * @return {object} The crosshair snap.
 */
beestat.component.chart.prototype.get_options_xAxis_crosshair_snap_ = function() {
  return false;
};

/**
 * Get the xAxis label formatter options. Needs to be overridden.
 *
 * @return {object} The xAxis label formatter options.
 */
beestat.component.chart.prototype.get_options_xAxis_labels_formatter_ = function() {
  return null;
};

/**
 * Get the yAxis label formatter options. Needs to be overridden.
 *
 * @return {object} The yAxis label formatter options.
 */
beestat.component.chart.prototype.get_options_yAxis_ = function() {
  return null;
};

/**
 * Get the series options. Needs to be overridden.
 *
 * @return {object} The series options.
 */
beestat.component.chart.prototype.get_options_series_ = function() {
  return null;
};

/**
 * Get the tooltip options.
 *
 * @return {object} The tooltip options.
 */
beestat.component.chart.prototype.get_options_tooltip_ = function() {
  return {
    'shared': true,
    'useHTML': true,
    'borderWidth': 0,
    'shadow': false,
    'backgroundColor': null,
    'followPointer': true,
    'hideDelay': 1,
    'positioner': this.get_options_tooltip_positioner_(),
    'formatter': this.get_options_tooltip_formatter_()
  };
};

/**
 * Get the tooltip formatter. Needs to be overridden.
 *
 * @return {Function} The tooltip formatter.
 */
beestat.component.chart.prototype.get_options_tooltip_formatter_ = function() {
  return null;
};

/**
 * Get the tooltip positioner. Makes sure the tooltip is positioned nicely.
 *
 * @return {Function} The tooltip positioner.
 */
beestat.component.chart.prototype.get_options_tooltip_positioner_ = function() {
  var self = this;
  return function(tooltip_width, tooltip_height, point) {
    return {
      'x': self.get_options_tooltip_positioner_x_(tooltip_width, tooltip_height, point),
      'y': self.get_options_tooltip_positioner_y_(tooltip_width, tooltip_height, point)
    };
  };
};

/**
 * Get the tooltip positioner x value.
 *
 * @param {number} tooltip_width Tooltip width.
 * @param {number} tooltip_height Tooltip height.
 * @param {point} point Highcharts current point.
 *
 * @return {number} The tooltip x value.
 */
beestat.component.chart.prototype.get_options_tooltip_positioner_x_ = function(tooltip_width, tooltip_height, point) {
  var plot_width = this.chart_.plotWidth;

  var fits_on_left = (point.plotX - tooltip_width) > 0;
  var fits_on_right = (point.plotX + tooltip_width) < plot_width;

  var x;
  if (fits_on_left === true) {
    x = point.plotX - tooltip_width + this.chart_.plotLeft;
  } else if (fits_on_right === true) {
    x = point.plotX + this.chart_.plotLeft;
  } else {
    x = this.chart_.plotLeft;
  }

  return x;
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
beestat.component.chart.prototype.get_options_tooltip_positioner_y_ = function(tooltip_width, tooltip_height, point) {
  return 60;
};

/**
 * Get the HTML needed to render a tooltip.
 *
 * @param {string} title The tooltip title.
 * @param {array} sections Data inside the tooltip.
 *
 * @return {string} The tooltip HTML.
 */
beestat.component.chart.prototype.tooltip_formatter_helper_ = function(title, sections) {
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

/**
 * Get the Highcharts chart object.
 *
 * @return {Highcharts} The Highcharts chart object.
 */
beestat.component.chart.prototype.get_chart = function() {
  return this.chart_;
};

/**
 * Sync extremes of this chart with extremes of another chart.
 *
 * @param {beestat.component.chart} source_chart The source chart.
 */
beestat.component.chart.prototype.sync_extremes = function(source_chart) {
  var self = this;

  source_chart.addEventListener('after_set_extremes', function() {
    var extremes = source_chart.get_chart().axes[0].getExtremes();
    self.get_chart().axes[0].setExtremes(
      extremes.min,
      extremes.max,
      undefined,
      false
    );
  });
};

/**
 * Sync crosshair of this chart with crosshair of another chart.
 *
 * @param {beestat.component.chart} source_chart The source chart.
 */
beestat.component.chart.prototype.sync_crosshair = function(source_chart) {
  var self = this;

  [
    'mousemove',
    'touchmove',
    'touchstart'
  ].forEach(function(event_type) {
    source_chart.get_chart().container.addEventListener(
      event_type,
      function(e) {
        var point = self.get_chart().series[0].searchPoint(
          source_chart.get_chart().pointer.normalize(e),
          true
        );
        if (point !== undefined) {
          self.get_chart().tooltip.refresh([point]);
          self.get_chart().xAxis[0].drawCrosshair(e);
        }
      }
    );
  });

  // When I leave the source chart, hide the crosshair and tooltip in this chart.
  source_chart.get_chart().container.addEventListener('mouseout', function() {
    self.get_chart().xAxis[0].hideCrosshair();
    self.get_chart().tooltip.hide(1);
  });
};

/**
 * Reflow the chart; useful if the GUI changes and the chart needs resized.
 *
 * @link https://api.highcharts.com/class-reference/Highcharts.Chart#reflow
 */
beestat.component.chart.prototype.reflow = function() {
  this.chart_.reflow();
};

/**
 * A generic function to update any element of the chart. Elements can be
 * enabled and disabled, moved, re-styled, re-formatted etc.
 *
 * @param {object} options The options to change.
 *
 * @link https://api.highcharts.com/class-reference/Highcharts.Chart#update
 */
beestat.component.chart.prototype.update = function(options) {
  this.chart_.update(options);
};
