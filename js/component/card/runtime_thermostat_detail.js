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
    [
      'setting.runtime_thermostat_detail_smoothing',
      'setting.runtime_thermostat_detail_range_type',
      'setting.runtime_thermostat_detail_range_dynamic',
      'cache.runtime_thermostat'
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

  var range = {
    'type': beestat.setting('runtime_thermostat_detail_range_type'),
    'dynamic': beestat.setting('runtime_thermostat_detail_range_dynamic'),
    'static_begin': beestat.setting('runtime_thermostat_detail_range_static_begin'),
    'static_end': beestat.setting('runtime_thermostat_detail_range_static_end')
  };

  var data = beestat.runtime_thermostat.get_data(this.thermostat_id_, range);

  data.metadata.chart.title = this.get_title_();
  data.metadata.chart.subtitle = this.get_subtitle_();

  this.charts_ = {
    'equipment': new beestat.component.chart.runtime_thermostat_detail_equipment(data),
    'temperature': new beestat.component.chart.runtime_thermostat_detail_temperature(data)
  };

  this.charts_.equipment.render(parent);
  this.charts_.temperature.render(parent);

  // Sync extremes and crosshair.
  Object.values(this.charts_).forEach(function(source_chart) {
    Object.values(self.charts_).forEach(function(target_chart) {
      if (source_chart !== target_chart) {
        target_chart.sync_extremes(source_chart);
        target_chart.sync_crosshair(source_chart);
      }
    });
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
  if (this.data_synced_(required_begin, required_end) === true) {
    if (
      beestat.cache.runtime_thermostat === undefined ||
      beestat.cache.data.runtime_thermostat_last !== 'runtime_thermostat_detail'
    ) {
      this.show_loading_('Loading Thermostat Detail');

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
    }
  } else {
    this.show_loading_('Syncing Thermostat Detail');
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

  if (beestat.setting('runtime_thermostat_detail_smoothing') === true) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Disable Smothing')
      .set_icon('chart_line')
      .set_callback(function() {
        beestat.setting('runtime_thermostat_detail_smoothing', false);
      }));
  } else {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Enable Smoothing')
      .set_icon('chart_bell_curve')
      .set_callback(function() {
        beestat.setting('runtime_thermostat_detail_smoothing', true);
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
 * Determine whether or not the data to render the desired date range has been
 * synced.
 *
 * @param {moment} required_sync_begin
 * @param {moment} required_sync_end
 *
 * @return {boolean} Whether or not the data is synced.
 */
beestat.component.card.runtime_thermostat_detail.prototype.data_synced_ = function(required_sync_begin, required_sync_end) {
  // Demo can just grab whatever data is there.
  if (window.is_demo === true) {
    return true;
  }

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  return (
    current_sync_begin.isSameOrBefore(required_sync_begin) &&
    current_sync_end.isSameOrAfter(required_sync_end)
  );
};
