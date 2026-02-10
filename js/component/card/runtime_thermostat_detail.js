/**
 * Runtime detail card. Shows a graph similar to what ecobee shows with the
 * runtime info for a recent period of time.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for
 */
beestat.component.card.runtime_thermostat_detail = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

  /*
   * When a setting is changed clear all of the data. Then rerender which will
   * trigger the loading state. Also do this when the cache changes.
   *
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    'cache.data.runtime_thermostat_detail__runtime_thermostat',
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.runtime_thermostat_detail, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.runtime_thermostat_detail.prototype.decorate_contents_ = function(parent) {
  var self = this;

  delete this.data_;

  this.charts_ = {
    'equipment': new beestat.component.chart.runtime_thermostat_detail_equipment(
      this.get_data_()
    ),
    'temperature': new beestat.component.chart.runtime_thermostat_detail_temperature(
      this.get_data_()
    )
  };

  var container = $.createElement('div').style({
    'position': 'relative'
  });
  parent.appendChild(container);

  if (this.has_data_() === true) {
    this.decorate_runtime_chips_(container, this.get_data_());
  }

  var chart_container = $.createElement('div');
  container.appendChild(chart_container);

  this.charts_.equipment.render(chart_container);
  this.charts_.temperature.render(chart_container);

  // Sync extremes and crosshair.
  Object.values(this.charts_).forEach(function(source_chart) {
    Object.values(self.charts_).forEach(function(target_chart) {
      target_chart.sync_extremes(source_chart);
      target_chart.sync_crosshair(source_chart);
    });
  });

  /*
   * Keep consistent right margins when a secondary y-axis is toggled on the
   * temperature chart.
   */
  this.charts_.temperature.addEventListener('legend_item_click', function() {
    var need_equipment_margin_right = false;
    this.get_chart().series.forEach(function(series) {
      if (
        series.yAxis.opposite === true &&
        series.visible === true
      ) {
        need_equipment_margin_right = true;
      }
    });

    var options;
    if (need_equipment_margin_right === true) {
      options = {
        'chart': {
          'marginRight': 45
        }
      };
      self.charts_.equipment.update(options);
      self.charts_.temperature.update(options);
    } else {
      options = {
        'chart': {
          'marginRight': 0
        }
      };
      self.charts_.equipment.update(options);
      self.charts_.temperature.update(options);
    }
  });

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var required_begin;
  var required_end;
  if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
    required_begin = moment()
      .subtract(
        beestat.setting('runtime_thermostat_detail_range_dynamic'),
        'day'
      )
      .second(0);

    required_end = moment()
      .subtract(1, 'hour')
      .second(0);
  } else {
    required_begin = moment(
      beestat.setting('runtime_thermostat_detail_range_static_begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('runtime_thermostat_detail_range_static_end') + ' 23:59:59'
    );
  }

  // Don't go before there's data.
  required_begin = moment.max(
    required_begin,
    moment(thermostat.data_begin)
  );

  // Don't go after now.
  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );

  required_end = moment.max(
    required_end,
    moment(thermostat.data_begin)
  );

  /**
   * If the needed data exists in the database and the runtime_thermostat
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  if (beestat.thermostat.data_synced(this.thermostat_id_, required_begin, required_end) === true) {
    if (beestat.cache.data.runtime_thermostat_detail__runtime_thermostat === undefined) {
      this.show_loading_('Fetching');

      var value;
      var operator;

      if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
        value = required_begin.format();
        operator = '>=';
      } else {
        value = [
          required_begin.format(),
          required_end.format()
        ];
        operator = 'between';
      }

      new beestat.api()
        .add_call(
          'runtime_thermostat',
          'read',
          {
            'attributes': {
              'thermostat_id': thermostat.thermostat_id,
              'timestamp': {
                'value': value,
                'operator': operator
              }
            }
          }
        )
        .set_callback(function(response) {
          beestat.cache.set('data.runtime_thermostat_detail__runtime_thermostat', response);
        })
        .send();
    } else if (this.has_data_() === false) {
      chart_container.style('filter', 'blur(3px)');
      var no_data = $.createElement('div');
      no_data.style({
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': '100%',
        'height': '100%',
        'display': 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        'text-align': 'center'
      });
      no_data.innerText('No data to display');
      container.appendChild(no_data);
    }
  } else {
    this.show_loading_('Syncing');
    window.setTimeout(function() {
      new beestat.api()
        .add_call(
          'thermostat',
          'read_id',
          {
            'attributes': {
              'inactive': 0
            }
          },
          'thermostat'
        )
        .set_callback(function(response) {
          beestat.cache.set('thermostat', response);
          self.rerender();
        })
        .send();
    }, 2000);
  }
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.runtime_thermostat_detail.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 1 Day')
    .set_icon('numeric_1_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 1 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('data.runtime_thermostat_detail__runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 1,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 3 Days')
    .set_icon('numeric_3_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 3 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('data.runtime_thermostat_detail__runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 3,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 7 Days')
    .set_icon('numeric_7_box')
    .set_callback(function() {
      if (
        beestat.setting('runtime_thermostat_detail_range_dynamic') !== 7 ||
        beestat.setting('runtime_thermostat_detail_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('data.runtime_thermostat_detail__runtime_thermostat');
        beestat.setting({
          'runtime_thermostat_detail_range_dynamic': 7,
          'runtime_thermostat_detail_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Custom')
    .set_icon('calendar_edit')
    .set_callback(function() {
      (new beestat.component.modal.runtime_thermostat_detail_custom()).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Chart')
    .set_icon('download')
    .set_callback(function() {
      self.charts_.temperature.export();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Reset Zoom')
    .set_icon('magnify_close')
    .set_callback(function() {
      self.charts_.temperature.reset_zoom();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/e499fb13fd4441f4b3f096baca1cb138');
    }));
};

/**
 * Whether or not there is data to display on the chart.
 *
 * @return {boolean} Whether or not there is data to display on the chart.
 */
beestat.component.card.runtime_thermostat_detail.prototype.has_data_ = function() {
  var data = this.get_data_();
  for (var series_code in data.metadata.series) {
    if (
      series_code !== 'dummy' &&
      data.metadata.series[series_code].active === true
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Get data. This doesn't directly or indirectly make any API calls, but it
 * caches the data so it doesn't have to loop over everything more than once.
 *
 * @return {object} The data.
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_data_ = function() {
  if (this.data_ === undefined) {
    var range = {
      'type': beestat.setting('runtime_thermostat_detail_range_type'),
      'dynamic': beestat.setting('runtime_thermostat_detail_range_dynamic'),
      'static_begin': beestat.setting('runtime_thermostat_detail_range_static_begin'),
      'static_end': beestat.setting('runtime_thermostat_detail_range_static_end')
    };

    this.data_ = beestat.runtime_thermostat.get_data(
      this.thermostat_id_,
      range,
      'runtime_thermostat_detail__runtime_thermostat'
    );

    this.data_.metadata.chart.title = this.get_title_();
    this.data_.metadata.chart.subtitle = this.get_subtitle_();
  }

  return this.data_;
};

/**
 * Get the title of the card.
 *
 * @return {string} Title
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_title_ = function() {
  return 'Thermostat Detail';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_subtitle_ = function() {
  if (beestat.setting('runtime_thermostat_detail_range_type') === 'dynamic') {
    var s = (beestat.setting('runtime_thermostat_detail_range_dynamic') > 1) ? 's' : '';

    return 'Past ' +
      beestat.setting('runtime_thermostat_detail_range_dynamic') +
      ' day' +
      s;
  }

  var begin = moment(beestat.setting('runtime_thermostat_detail_range_static_begin'))
    .format('MMM D, YYYY');
  var end = moment(beestat.setting('runtime_thermostat_detail_range_static_end'))
    .format('MMM D, YYYY');

  return begin + ' to ' + end;
};

/**
 * Decorate runtime chips above the chart showing totals for the selected
 * time range.
 *
 * @param {rocket.Elements} parent
 * @param {object} data
 */
beestat.component.card.runtime_thermostat_detail.prototype.decorate_runtime_chips_ = function(parent, data) {
  var totals = data.metadata.totals;

  var radius = beestat.style.size.border_radius + 'px';
  var has_chips = false;

  var chip_container = $.createElement('div').style({
    'display': 'flex',
    'flex-wrap': 'wrap',
    'margin-bottom': (beestat.style.size.gutter / 2) + 'px'
  });

  var create_chip = function(label, label_color, segments) {
    if (segments.length === 0) {
      return;
    }

    has_chips = true;

    var chip = $.createElement('span').style({
      'display': 'inline-flex',
      'border-radius': radius,
      'overflow': 'hidden',
      'font-size': beestat.style.font_size.normal,
      'margin-right': '8px',
      'margin-bottom': '4px'
    });

    var label_el = $.createElement('span').style({
      'background-color': label_color,
      'color': '#fff',
      'padding': '2px 8px',
      'font-weight': beestat.style.font_weight.bold
    });
    label_el.innerText(label);
    chip.appendChild(label_el);

    segments.forEach(function(segment) {
      var value = $.createElement('span').style({
        'background-color': segment.color,
        'color': '#fff',
        'padding': '2px 8px'
      });
      value.innerText(segment.text);
      chip.appendChild(value);
    });

    chip_container.appendChild(chip);
  };

  // Cool
  var cool_segments = [];
  if (totals.compressor_cool_1 > 0) {
    cool_segments.push({
      'text': beestat.time(totals.compressor_cool_1),
      'color': beestat.series.compressor_cool_1.color
    });
  }
  if (totals.compressor_cool_2 > 0) {
    cool_segments.push({
      'text': beestat.time(totals.compressor_cool_2),
      'color': beestat.series.compressor_cool_2.color
    });
  }
  create_chip(
    beestat.series.compressor_cool_1.name.replace(/\d/, ''), 
    beestat.series.compressor_cool_1.color,
    cool_segments
  );

  // Heat
  var heat_segments = [];
  if (totals.compressor_heat_1 > 0) {
    heat_segments.push({
      'text': beestat.time(totals.compressor_heat_1),
      'color': beestat.series.compressor_heat_1.color
    });
  }
  if (totals.compressor_heat_2 > 0) {
    heat_segments.push({
      'text': beestat.time(totals.compressor_heat_2),
      'color': beestat.series.compressor_heat_2.color
    });
  }
  create_chip(
    beestat.series.compressor_heat_1.name.replace(/\d/, ''),
    beestat.series.compressor_heat_1.color,
    heat_segments
  );

  // Aux
  var aux_segments = [];
  if (totals.auxiliary_heat_1 > 0) {
    aux_segments.push({
      'text': beestat.time(totals.auxiliary_heat_1),
      'color': beestat.series.auxiliary_heat_1.color
    });
  }
  if (totals.auxiliary_heat_2 > 0) {
    aux_segments.push({
      'text': beestat.time(totals.auxiliary_heat_2),
      'color': beestat.series.auxiliary_heat_2.color
    });
  }
  create_chip(
    beestat.series.auxiliary_heat_1.name.replace(/\d/, ''),
    beestat.series.auxiliary_heat_1.color,
    aux_segments
  );

  // Fan
  if (totals.fan > 0) {
    create_chip(beestat.series.fan.name, beestat.series.fan.color, [{
      'text': beestat.time(totals.fan),
      'color': beestat.series.fan.color
    }]);
  }

  // Accessory (individual types as segments)
  var accessory_segments = [];
  ['humidifier', 'dehumidifier', 'ventilator', 'economizer'].forEach(function(type) {
    if (totals[type] > 0) {
      accessory_segments.push({
        'text': beestat.series[type].name + ' ' + beestat.time(totals[type]),
        'color': beestat.series[type].color
      });
    }
  });
  create_chip('Accessory', beestat.series.humidifier.color, accessory_segments);

  if (has_chips === true) {
    parent.appendChild(chip_container);
  }
};
