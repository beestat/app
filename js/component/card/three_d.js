/**
 * 3D View
 */
beestat.component.card.three_d = function() {
  const self = this;

  // Things that update the scene that don't require a rerender.
  // TODO these probably need moved to the layer instead of here
  beestat.dispatcher.addEventListener(
    [
      'setting.visualize.data_type',
      'setting.visualize.heat_map_type',
      'setting.visualize.heat_map_absolute.temperature.min',
      'setting.visualize.heat_map_absolute.temperature.max',
      'setting.visualize.heat_map_absolute.occupancy.min',
      'setting.visualize.heat_map_absolute.occupancy.max'
    ], self.update_scene_.bind(this));

  beestat.dispatcher.addEventListener('cache.floor_plan', function() {
    self.scene_.rerender();
  });

  /*
   * When a setting is changed clear all of the data. Then rerender which will
   * trigger the loading state. Also do this when the cache changes.
   *
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  const change_function = beestat.debounce(function() {
    self.get_data_(true);
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.three_d__runtime_sensor'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.three_d, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.three_d.prototype.decorate_ = function(parent) {
  this.hide_loading_();

  this.parent_ = parent;

  /*
   * Unfortunate but necessary to get the card to fill the height of the flex
   * container. Everything leading up to the card has to be 100% height.
   */
  parent.style('height', '100%');

  this.contents_ = $.createElement('div')
    .style({
      'height': '100%',
      'background': beestat.style.color.bluegray.base,
      'border-radius': beestat.style.size.border_radius
    });

  if (this.box_shadow_ === true) {
    this.contents_.style('box-shadow', '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)');
  }

  parent.appendChild(this.contents_);

  this.decorate_contents_(this.contents_);
};

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.three_d.prototype.decorate_contents_ = function(parent) {
  const drawing_pane_container = document.createElement('div');

  parent.appendChild(drawing_pane_container);
  this.decorate_drawing_pane_(drawing_pane_container);

  // Decorate everything.
  const controls_container = document.createElement('div');
  Object.assign(controls_container.style, {
    'position': 'absolute',
    // 'margin': 'auto',
    'top': `${beestat.style.size.gutter}px`,
    'left': '50%',
    'width': '300px',
    'margin-left': '-150px',
    'background': beestat.style.color.bluegray.base,
    'padding': `${beestat.style.size.gutter / 2}px`,
    'border-radius': `${beestat.style.size.border_radius}px`
  });
  parent.appendChild(controls_container);
  this.decorate_controls_(controls_container);


  // var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  let required_begin;
  let required_end;
  if (beestat.setting('visualize.range_type') === 'dynamic') {
    required_begin = moment()
      .subtract(
        beestat.setting('visualize.range_dynamic'),
        'day'
      )
      .hour(0)
      .minute(0)
      .second(0);

    required_end = required_begin
      .clone()
      .hour(23)
      .minute(59)
      .second(59);
  } else {
    required_begin = moment(
      beestat.setting('visualize.range_static_begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('visualize.range_static_end') + ' 23:59:59'
    );
  }

  // Don't go before there's data.
/*  required_begin = moment.max(
    required_begin,
    moment.utc(thermostat.data_begin)
  );*/

  // Don't go after now.
/*  required_end = moment.min(
    required_end,
    moment().subtract(1, 'hour')
  );*/

  /**
   * If the needed data exists in the database and the runtime_sensor
   * cache is empty, then query the data. If the needed data does not exist in
   * the database, check every 2 seconds until it does.
   */
  // TODO somewhat problematic because I need to check if data is synced from multiple thermostats now
  // if (beestat.thermostat.data_synced(this.thermostat_id_, required_begin, required_end) === true) {
  const sensor_ids = Object.keys(this.get_sensor_ids_map_());
  if (sensor_ids.length > 0) {
    if (true) {
      if (beestat.cache.data.three_d__runtime_sensor === undefined) {
        // console.log('data is undefined need to load it');
        this.show_loading_('Fetching');

        var value;
        var operator;
        // var value = [
        //   required_begin.format(),
        //   required_end.format()
        // ];
        // var operator = 'between';

        if (beestat.setting('visualize.range_type') === 'dynamic') {
          value = required_begin.format();
          operator = '>=';
        } else {
          value = [
            required_begin.format(),
            required_end.format()
          ];
          operator = 'between';
        }

        const sensor_ids = Object.keys(this.get_sensor_ids_map_());
        // if (sensor_ids.length > 0) {
          const api_call = new beestat.api();
          sensor_ids.forEach(function(sensor_id) {
            api_call.add_call(
              'runtime_sensor',
              'read',
              {
                'attributes': {
                  'sensor_id': sensor_id,
                  'timestamp': {
                    'value': value,
                    'operator': operator
                  }
                }
              },
              'runtime_sensor_' + sensor_id
            );
          });

          api_call.set_callback(function(response) {
            var runtime_sensors = [];
            for (var alias in response) {
              var r = response[alias];
              runtime_sensors = runtime_sensors.concat(r);
            }
            beestat.cache.set('data.three_d__runtime_sensor', runtime_sensors);
          });

          api_call.send();

        // }
      } else if (this.has_data_() === false) {
        console.info('has data false');
        /*chart_container.style('filter', 'blur(3px)');
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
        container.appendChild(no_data);*/
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
  }
};

/**
 * Decorate the drawing pane.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_drawing_pane_ = function(parent) {
  const self = this;

  // Create the scene
  this.scene_ = new beestat.component.scene(
    beestat.setting('visualize.floor_plan_id'),
    this.get_data_()
  );

  // Set the initial date.
  if (this.has_data_() === true) {
    this.update_scene_();
    this.scene_.render($(parent));

    if (beestat.setting('visualize.range_type') === 'dynamic') {
      this.date_m_ = moment()
        .subtract(
          beestat.setting('visualize.range_dynamic'),
          'day'
        )
        .hour(0)
        .minute(0)
        .second(0);
    } else {
      this.date_m_ = moment(
        beestat.setting('visualize.range_static_begin') + ' 00:00:00'
      );
    }

    this.scene_.set_date(this.date_m_);
  } else {
    this.scene_.render($(parent));
  }

  // Manage width of the scene.
  setTimeout(function() {
    if (parent.getBoundingClientRect().width > 0) {
      self.scene_.set_width(parent.getBoundingClientRect().width);
    }
  }, 0);

  beestat.dispatcher.removeEventListener('resize.three_d');
  beestat.dispatcher.addEventListener('resize.three_d', function() {
    self.scene_.set_width(parent.getBoundingClientRect().width);
  });
};

/**
 * Decorate the playback controls.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_controls_ = function(parent) {
  const self = this;

  window.clearInterval(self.interval_);

  // Hoisting
  const range = new beestat.component.input.range();
  const right_container = document.createElement('div');

  const container = document.createElement('div');
  Object.assign(container.style, {
    'display': 'flex',
    'align-items': 'center'
  });
  parent.appendChild(container);

  const left_container = document.createElement('div');
  container.appendChild(left_container);

  const play_tile = new beestat.component.tile()
    .set_icon('play')
    .set_shadow(false)
    .set_text_hover_color(beestat.style.color.green.base)
    .render($(left_container));
  play_tile.addEventListener('click', function() {
    if (self.interval_ === undefined) {
      play_tile
        .set_icon('pause')
        .set_text_hover_color(beestat.style.color.red.base);

      self.interval_ = window.setInterval(function() {
        self.date_m_.add(5, 'minutes');
        self.scene_.set_date(self.date_m_);
        range.set_value(
          ((self.date_m_.hours() * 60) + self.date_m_.minutes()) / 1440 * 288
        );
        right_container.innerText = self.date_m_.format('h:mm a');
      }, 100);
    } else {
      play_tile
        .set_icon('play')
        .set_text_hover_color(beestat.style.color.green.base);
      window.clearInterval(self.interval_);
      delete self.interval_;
    }
  });

  const center_container = document.createElement('div');
  Object.assign(center_container.style, {
    'flex-grow': '1'
  });
  container.appendChild(center_container);

  range
    .set_min(0)
    .set_max(287)
    .set_value(0)
    .render($(center_container));

  right_container.innerText = '12:00 am';
  Object.assign(right_container.style, {
    'width': '70px',
    'text-align': 'right'
  });
  container.appendChild(right_container);

  range.addEventListener('input', function() {
    play_tile
      .set_icon('play')
      .set_text_hover_color(beestat.style.color.green.base);
    window.clearInterval(self.interval_);
    delete self.interval_;

    const minute_of_day = range.get_value() * 5;
    self.date_m_.hours(Math.floor(minute_of_day / 60));
    self.date_m_.minutes(Math.floor(minute_of_day % 60));
    right_container.innerText = self.date_m_.format('h:mm a');
    self.scene_.set_date(self.date_m_);
  });
};

/**
 * Get data. This doesn't directly or indirectly make any API calls, but it
 * caches the data so it doesn't have to loop over everything more than once.
 *
 * @param {boolean} force Force get the data?
 *
 * @return {object} The data.
 */
beestat.component.card.three_d.prototype.get_data_ = function(force) {
  const self = this;
  if (this.data_ === undefined || force === true) {
    const sensor_ids_map = this.get_sensor_ids_map_();

    this.data_ = {
      'metadata': {
        'series': {
          'temperature': {
            'min': Infinity,
            'max': -Infinity
          },
          'occupancy': {
            'min': Infinity,
            'max': -Infinity
          }
        }
      },
      'series': {
        'temperature': {},
        'occupancy': {}
      }
    };

    if (beestat.cache.data.three_d__runtime_sensor !== undefined) {
      // Add to data
      beestat.cache.data.three_d__runtime_sensor.forEach(function(runtime_sensor) {
        if (
          sensor_ids_map[runtime_sensor.sensor_id] !== undefined &&
          runtime_sensor.temperature !== null &&
          runtime_sensor.occupancy !== null
        ) {
          const timestamp_m = moment(runtime_sensor.timestamp);
          const time = timestamp_m.format('HH:mm');

          // Temperature
          if (self.data_.series.temperature[runtime_sensor.sensor_id] === undefined) {
            self.data_.series.temperature[runtime_sensor.sensor_id] = {};
          }
          if (self.data_.series.temperature[runtime_sensor.sensor_id][time] === undefined) {
            self.data_.series.temperature[runtime_sensor.sensor_id][time] = [];
          }
          self.data_.series.temperature[runtime_sensor.sensor_id][time].push(runtime_sensor.temperature);

          // Occupancy
          if (self.data_.series.occupancy[runtime_sensor.sensor_id] === undefined) {
            self.data_.series.occupancy[runtime_sensor.sensor_id] = {};
          }
          if (self.data_.series.occupancy[runtime_sensor.sensor_id][time] === undefined) {
            self.data_.series.occupancy[runtime_sensor.sensor_id][time] = [];
          }
          self.data_.series.occupancy[runtime_sensor.sensor_id][time].push(runtime_sensor.occupancy === true ? 1 : 0);
        }
      });

      // Average data
      for (let key in this.data_.series) {
        for (let sensor_id in this.data_.series[key]) {
          for (let time in this.data_.series[key][sensor_id]) {
            this.data_.series[key][sensor_id][time] = this.data_.series[key][sensor_id][time].reduce(function(a, b) {
              return a + b;
            }) / this.data_.series[key][sensor_id][time].length;

            // Set min/max
            this.data_.metadata.series[key].min = Math.min(
              this.data_.series[key][sensor_id][time],
              this.data_.metadata.series[key].min
            );
            this.data_.metadata.series[key].max = Math.max(
              this.data_.series[key][sensor_id][time],
              this.data_.metadata.series[key].max
            );
          }
        }
      }
    }
  }
  // console.log(this.data_);
  return this.data_;
};

/**
 * Whether or not there is data to display on the chart.
 *
 * @return {boolean} Whether or not there is data to display on the chart.
 */
beestat.component.card.three_d.prototype.has_data_ = function() {
  const data = this.get_data_();
  for (let key in data.series) {
    for (let sensor_id in data.series[key]) {
      if (Object.keys(data.series[key][sensor_id]).length > 0) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.three_d.prototype.get_title_ = function() {
  return '3D View';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.three_d.prototype.decorate_top_right_ = function(parent) {
  const menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      // TODO
      // window.open('https://doc.beestat.io/???');
    }));
};

/**
 * Update the scene with current settings. Anything that doesn't require
 * re-rendering can go here.
 */
beestat.component.card.three_d.prototype.update_scene_ = function() {
  this.scene_.set_data_type(beestat.setting('visualize.data_type'));

  switch (beestat.setting('visualize.heat_map_type')) {
  case 'relative':
    this.scene_.set_heat_map_min(
      this.data_.metadata.series[beestat.setting('visualize.data_type')].min
    );
    this.scene_.set_heat_map_max(
      this.data_.metadata.series[beestat.setting('visualize.data_type')].max
    );
    break;
  case 'absolute':
    this.scene_.set_heat_map_min(
      beestat.setting(
        'visualize.heat_map_absolute.' +
        beestat.setting('visualize.data_type') +
        '.min'
      ) / (beestat.setting('visualize.data_type') === 'occupancy' ? 100 : 1)
    );
    this.scene_.set_heat_map_max(
      beestat.setting(
        'visualize.heat_map_absolute.' +
        beestat.setting('visualize.data_type') +
        '.max'
      ) / (beestat.setting('visualize.data_type') === 'occupancy' ? 100 : 1)
    );
    break;
  }
};

/**
 * Set the floor_plan_id.
 *
 * @param {number} floor_plan_id
 *
 * @return {beestat.component.card.three_d}
 */
beestat.component.card.three_d.prototype.set_floor_plan_id = function(floor_plan_id) {
  this.floor_plan_id_ = floor_plan_id;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Get an object of all the sensor_ids included in the current floor plan. Key
 * is sensor_id, value is true.
 *
 * @return {object}
 */
beestat.component.card.three_d.prototype.get_sensor_ids_map_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const sensor_ids_map = [];
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      if (room.sensor_id !== undefined) {
        sensor_ids_map[room.sensor_id] = true;
      }
    });
  });

  return sensor_ids_map;
};
