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
    self.get_data_(true);
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'setting.runtime_thermostat_detail_range_type',
      'setting.runtime_thermostat_detail_range_dynamic',
      'cache.runtime_thermostat',
      'cache.thermostat'
    ],
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
    moment(thermostat.first_connected)
  );

  // Don't go after now.
  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );

  /**
   * If the needed data exists in the database and the runtime_thermostat
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  if (beestat.thermostat.data_synced(this.thermostat_id_, required_begin, required_end) === true) {
    if (
      beestat.cache.runtime_thermostat === undefined ||
      beestat.cache.data.runtime_thermostat_last !== 'runtime_thermostat_detail'
    ) {
      this.show_loading_('Loading');

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
          beestat.cache.set('data.runtime_thermostat_last', 'runtime_thermostat_detail');
          beestat.cache.set('runtime_thermostat', response);
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
    setTimeout(function() {
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
        beestat.cache.delete('runtime_thermostat');
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
        beestat.cache.delete('runtime_thermostat');
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
        beestat.cache.delete('runtime_thermostat');
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

  if (this.has_data_() === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Download Chart')
      .set_icon('download')
      .set_callback(function() {
        self.charts_.temperature.export();
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Reset Zoom')
      .set_icon('magnify_minus')
      .set_callback(function() {
        self.charts_.temperature.reset_zoom();
      }));
  }

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
 * @param {boolean} force Force get the data?
 *
 * @return {object} The data.
 */
beestat.component.card.runtime_thermostat_detail.prototype.get_data_ = function(force) {
  if (this.data_ === undefined || force === true) {
    var range = {
      'type': beestat.setting('runtime_thermostat_detail_range_type'),
      'dynamic': beestat.setting('runtime_thermostat_detail_range_dynamic'),
      'static_begin': beestat.setting('runtime_thermostat_detail_range_static_begin'),
      'static_end': beestat.setting('runtime_thermostat_detail_range_static_end')
    };

    this.data_ = beestat.runtime_thermostat.get_data(this.thermostat_id_, range);

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
