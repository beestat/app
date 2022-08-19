/**
 * Air Quality card. Shows a chart with comfort profiles, occupancy, and air
 * quality data.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for
 */
beestat.component.card.air_quality_summary = function(thermostat_id) {
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
      'setting.air_quality_summary_range_type',
      'setting.air_quality_summary_range_dynamic',
      'cache.data.air_quality_summary'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.air_quality_summary, beestat.component.card);

beestat.component.card.air_quality_summary.prototype.rerender_on_breakpoint_ = true;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.air_quality_summary.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var container = $.createElement('div').style({
    'position': 'relative'
  });
  parent.appendChild(container);

  var chart_container = $.createElement('div');
  container.appendChild(chart_container);

  this.decorate_chart_(chart_container);

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var required_begin;
  var required_end;
  if (beestat.setting('air_quality_summary_range_type') === 'dynamic') {
    required_begin = moment()
      .subtract(
        beestat.setting('air_quality_summary_range_dynamic'),
        'day'
      )
      .second(0);

    required_end = moment()
      .subtract(1, 'hour')
      .second(0);
  } else {
    required_begin = moment(
      beestat.setting('air_quality_summary_range_static_begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('air_quality_summary_range_static_end') + ' 23:59:59'
    );
  }

  // Don't go before there's data.
  required_begin = moment.max(
    required_begin,
    moment.utc(thermostat.data_begin)
  );

  // Don't go after now.
  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );

  /**
   * If the needed data exists in the database and the runtime_sensor
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  if (beestat.thermostat.data_synced(this.thermostat_id_, required_begin, required_end) === true) {
    if (beestat.cache.data.air_quality_summary === undefined) {
      this.show_loading_('Fetching');

      var value;
      var operator;

      if (beestat.setting('air_quality_summary_range_type') === 'dynamic') {
        value = required_begin.format();
        operator = '>=';
      } else {
        value = [
          required_begin.format(),
          required_end.format()
        ];
        operator = 'between';
      }

      var api_call = new beestat.api();
      Object.values(beestat.cache.sensor).forEach(function(sensor) {
        if (
          sensor.thermostat_id === self.thermostat_id_ &&
          sensor.type === 'thermostat'
        ) {
          api_call.add_call(
            'runtime_sensor',
            'read',
            {
              'attributes': {
                'sensor_id': sensor.sensor_id,
                'timestamp': {
                  'value': value,
                  'operator': operator
                }
              }
            },
            'runtime_sensor_' + sensor.sensor_id
          );
        }
      });

      api_call.set_callback(function(response) {
        var runtime_sensors = [];
        for (var alias in response) {
          var r = response[alias];
          runtime_sensors = runtime_sensors.concat(r);
        }
        beestat.cache.set('data.air_quality_summary', runtime_sensors);
      });

      api_call.send();
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
 * Decorate chart
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.air_quality_summary.prototype.decorate_chart_ = function(parent) {
  var grid_data = {};
  for (var runtime_sensor_id in beestat.cache.data.air_quality_summary) {
    var runtime_sensor = beestat.cache.data.air_quality_summary[runtime_sensor_id];
    var key = moment(runtime_sensor.timestamp).format('d_H');
    if (grid_data[key] === undefined) {
      grid_data[key] = [];
    }
    if (runtime_sensor.air_quality !== null) {
      grid_data[key].push(runtime_sensor.air_quality);
    }
  }

  var table = $.createElement('table');
  table.style({
    'table-layout': 'fixed',
    'border-collapse': 'collapse',
    'width': '100%'
  });

  var tr;
  var td;

  tr = $.createElement('tr');
  tr.appendChild($.createElement('td').style({'width': '50px'}));
  table.appendChild(tr);

  var days_of_week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  var day;
  var hour;

  // Header row
  for (hour = 0; hour < 24; hour++) {
    var meridiem = hour >= 12 ? 'p' : 'a';
    var new_hour = (hour % 12) || 12;

    tr.appendChild(
      $.createElement('td')
        .innerText(new_hour + (beestat.width > 700 ? meridiem : ''))
        .style({
          'text-align': 'center',
          'font-size': beestat.style.font_size.small
        })
    );
  }

  for (day = 0; day < 7; day++) {
    tr = $.createElement('tr');
    table.appendChild(tr);

    td = $.createElement('td')
      .innerHTML(days_of_week[day]);
    tr.appendChild(td);

    for (hour = 0; hour < 24; hour++) {
      var cell_value = grid_data[day + '_' + hour];
      td = $.createElement('td');
      var background = beestat.style.color.bluegray.light;

      if (cell_value !== undefined) {
        var average;
        if (grid_data[day + '_' + hour].length > 0) {
          average = grid_data[day + '_' + hour].reduce(function(a, b) {
            return a + b;
          }) / grid_data[day + '_' + hour].length;
        } else {
          average = 0;
        }

        td.setAttribute('title', Math.round(average));

        // I am normalizing Air Quality between 0 and 100.
        const max_average = 100;
        const colors = [
          beestat.style.color.green.light,
          beestat.style.color.green.base,
          beestat.style.color.green.dark,
          beestat.style.color.yellow.light,
          beestat.style.color.yellow.base,
          beestat.style.color.yellow.dark,
          beestat.style.color.orange.light,
          beestat.style.color.orange.base,
          beestat.style.color.orange.dark,
          beestat.style.color.red.light,
          beestat.style.color.red.base,
          beestat.style.color.red.dark
        ];
        if (average < 1) {
          background = beestat.style.color.bluegray.light;
        } else if (average <= max_average) {
          background = colors[
            Math.floor(average / (max_average / colors.length))
          ];
        } else {
          background = colors[colors.length - 1];
        }
      }

      td.style({
        'height': '20px',
        'background': background
      });

      tr.appendChild(td);
    }
  }

  parent.appendChild(table);
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.air_quality_summary.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 1 Week')
    .set_icon('numeric_1_box')
    .set_callback(function() {
      if (
        beestat.setting('air_quality_summary_range_dynamic') !== 7 ||
        beestat.setting('air_quality_summary_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('data.air_quality_summary');
        beestat.setting({
          'air_quality_summary_range_dynamic': 7,
          'air_quality_summary_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Past 4 Weeks')
    .set_icon('numeric_4_box')
    .set_callback(function() {
      if (
        beestat.setting('air_quality_summary_range_dynamic') !== 28 ||
        beestat.setting('air_quality_summary_range_type') !== 'dynamic'
      ) {
        beestat.cache.delete('data.air_quality_summary');
        beestat.setting({
          'air_quality_summary_range_dynamic': 28,
          'air_quality_summary_range_type': 'dynamic'
        });
      }
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/25a1a894a7f4432ead5831bef48770bd');
    }));
};

/**
 * Whether or not there is data to display on the chart.
 *
 * @return {boolean} Whether or not there is data to display on the chart.
 */
beestat.component.card.air_quality_summary.prototype.has_data_ = function() {
  return beestat.cache.data.air_quality_summary &&
    beestat.cache.data.air_quality_summary.length > 0;
};

/**
 * Get the title of the card.
 *
 * @return {string} Title
 */
beestat.component.card.air_quality_summary.prototype.get_title_ = function() {
  return 'Air Quality Summary';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.air_quality_summary.prototype.get_subtitle_ = function() {
  if (beestat.setting('air_quality_summary_range_type') === 'dynamic') {
    var s = ((beestat.setting('air_quality_summary_range_dynamic') / 7) > 1) ? 's' : '';

    return 'Past ' +
      (beestat.setting('air_quality_summary_range_dynamic') / 7) +
      ' week' +
      s;
  }

  var begin = moment(beestat.setting('air_quality_summary_range_static_begin'))
    .format('MMM D, YYYY');
  var end = moment(beestat.setting('air_quality_summary_range_static_end'))
    .format('MMM D, YYYY');

  return begin + ' to ' + end;
};
