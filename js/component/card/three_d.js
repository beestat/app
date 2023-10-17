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
      'setting.visualize.heat_map_values',
      'setting.visualize.heat_map_static.temperature.min',
      'setting.visualize.heat_map_static.temperature.max',
      'setting.visualize.heat_map_static.occupancy.min',
      'setting.visualize.heat_map_static.occupancy.max'
    ], function() {
      self.update_scene_();
      self.update_hud_();
    });

  // Rerender the scene when the floor plan changes.
  beestat.dispatcher.addEventListener('cache.floor_plan', function() {
    self.scene_.rerender();
    self.update_scene_();
    self.update_hud_();
  });

  const change_function = beestat.debounce(function() {
    self.state_.scene_camera_state = self.scene_.get_camera_state();
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.three_d__runtime_sensor',
      'cache.data.three_d__runtime_thermostat'
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
  delete this.data_;

  const drawing_pane_container = document.createElement('div');
  drawing_pane_container.style.overflowX = 'hidden';

  parent.appendChild(drawing_pane_container);
  this.decorate_drawing_pane_(drawing_pane_container);

  // Watermark
  const watermark_container = document.createElement('div');
  Object.assign(watermark_container.style, {
    'position': 'absolute',
    'height': '20px',
    'bottom': `${beestat.style.size.gutter}px`,
    'right': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(watermark_container);
  this.decorate_watermark_(watermark_container);

  // Toolbar
  const toolbar_container = document.createElement('div');
  Object.assign(toolbar_container.style, {
    'position': 'absolute',
    'width': '1px',
    'top': `${beestat.style.size.gutter}px`,
    'left': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(toolbar_container);
  this.decorate_toolbar_(toolbar_container);

  const top_container = document.createElement('div');
  Object.assign(top_container.style, {
    'display': 'flex',
    'position': 'absolute',
    'width': '100%',
    'top': `${beestat.style.size.gutter}px`,
    'padding-left': '55px',
    'padding-right': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(top_container);

  // Floors
  const floors_container = document.createElement('div');
  Object.assign(floors_container.style, {
    'flex-shrink': '0'
  });
  top_container.appendChild(floors_container);
  this.decorate_floors_(floors_container);

  // Controls
  const controls_container = document.createElement('div');
  Object.assign(controls_container.style, {
    'flex-grow': '1'
  });
  top_container.appendChild(controls_container);
  this.decorate_controls_(controls_container);

  // Legend
  const legend_container = document.createElement('div');
  Object.assign(legend_container.style, {
    'position': 'absolute',
    'top': '50%',
    'margin-top': '-90px',
    'right': `${beestat.style.size.gutter}px`,
    'height': '180px'
  });
  parent.appendChild(legend_container);
  this.decorate_legend_(legend_container);

  let required_begin;
  let required_end;
  if (beestat.setting('visualize.range_type') === 'dynamic') {
    if (
      beestat.setting('visualize.range_dynamic') === 0 ||
      beestat.setting('visualize.range_dynamic') === 1
    ) {
      // Rig "today" and "yesterday" to behave differently.
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
      required_begin = moment()
        .subtract(
          beestat.setting('visualize.range_dynamic'),
          'day'
        )
        .hour(0)
        .minute(0)
        .second(0);

      required_end = moment()
        .subtract(1, 'day')
        .clone()
        .hour(23)
        .minute(59)
        .second(59);
    }
  } else {
    required_begin = moment(
      beestat.setting('visualize.range_static.begin') + ' 00:00:00'
    );
    required_end = moment(
      beestat.setting('visualize.range_static.end') + ' 23:59:59'
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
  const sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_));
  if (sensor_ids.length > 0) {
    if (true) {
      if (
        beestat.cache.data.three_d__runtime_sensor === undefined ||
        beestat.cache.data.three_d__runtime_thermostat === undefined
      ) {
        // console.log('data is undefined need to load it');
        this.show_loading_('Fetching');

        const value = [
          required_begin.format(),
          required_end.format()
        ];
        const operator = 'between';

        const sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_));
        const thermostat_ids = Object.keys(beestat.floor_plan.get_thermostat_ids_map(this.floor_plan_id_));
        // if (sensor_ids.length > 0) {
          const api_call = new beestat.api();

          // Sensor data
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

          // Thermostat data
          thermostat_ids.forEach(function(thermostat_id) {
            api_call.add_call(
              'runtime_thermostat',
              'read',
              {
                'attributes': {
                  'thermostat_id': thermostat_id,
                  'timestamp': {
                    'value': value,
                    'operator': operator
                  }
                }
              },
              'runtime_thermostat_' + thermostat_id
            );
          });

          api_call.set_callback(function(response) {
            let runtime_sensors = [];
            let runtime_thermostats = [];
            for (let alias in response) {
              if (alias.includes('runtime_sensor_') === true) {
                runtime_sensors = runtime_sensors.concat(response[alias]);
              } else {
                runtime_thermostats = runtime_thermostats.concat(response[alias]);
              }
            }
            beestat.cache.set('data.three_d__runtime_sensor', runtime_sensors);
            beestat.cache.set('data.three_d__runtime_thermostat', runtime_thermostats);
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
  if (this.scene_ !== undefined) {
    this.scene_.dispose();
  }
  this.scene_ = new beestat.component.scene(
    beestat.setting('visualize.floor_plan_id'),
    this.get_data_()
  );

  this.scene_.addEventListener('change_active_room', function() {
    self.update_hud_();
  });

  // Set the initial date.
  // if (this.has_data_() === true) {
  this.update_scene_();
  this.scene_.render($(parent));

  if (beestat.setting('visualize.range_type') === 'dynamic') {
    const sensor_ids = Object.keys(
      beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_)
    );
    if (
      beestat.setting('visualize.range_dynamic') === 0 &&
      sensor_ids.length > 0
    ) {
      this.date_m_ = this.get_most_recent_time_with_data_();
    } else {
      this.date_m_ = moment()
        .subtract(
          beestat.setting('visualize.range_dynamic'),
          'day'
        )
        .hour(0)
        .minute(0)
        .second(0);
    }
  } else {
    this.date_m_ = moment(
      beestat.setting('visualize.range_static.begin') + ' 00:00:00'
    );
  }

  // Set some defaults on the scene.
  this.scene_.set_date(this.date_m_);
  this.scene_.set_labels(beestat.setting('visualize.three_d.show_labels'));
  this.scene_.set_auto_rotate(beestat.setting('visualize.three_d.auto_rotate'));

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const groups = Object.values(floor_plan.data.groups);
  groups.forEach(function(group) {
    const setting_key = 'visualize.three_d.show_group.' + group.group_id;
    self.scene_.set_layer_visible(group.group_id, beestat.setting(setting_key) !== false);
  });

  // Manage width of the scene.
  if (this.state_.width === undefined) {
    setTimeout(function() {
      if (parent.getBoundingClientRect().width > 0) {
        self.state_.width = parent.getBoundingClientRect().width;
        self.scene_.set_width(self.state_.width);
      }
    }, 0);
  } else {
    this.scene_.set_width(this.state_.width);
  }

  if (this.state_.scene_camera_state !== undefined) {
    this.scene_.set_camera_state(this.state_.scene_camera_state);
  }

  beestat.dispatcher.removeEventListener('resize.three_d');
  beestat.dispatcher.addEventListener('resize.three_d', function() {
    self.state_.width = parent.getBoundingClientRect().width;
    self.scene_.set_width(self.state_.width);
  });
};

/**
 * Decorate the playback controls.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_controls_ = function(parent) {
  const self = this;

  const active_room = this.scene_.get_active_room_();
  let thermostat_ids;
  if (
    active_room !== null &&
    active_room.sensor_id !== undefined &&
    beestat.cache.sensor[active_room.sensor_id] !== undefined
  ) {
    thermostat_ids = [beestat.cache.sensor[active_room.sensor_id].thermostat_id];
  } else {
    thermostat_ids = Object.keys(
      beestat.floor_plan.get_thermostat_ids_map(this.floor_plan_id_)
    );
  }

  if (parent !== undefined) {
    this.controls_container_ = parent;
  }

  this.controls_container_.innerHTML = '';

  window.clearInterval(self.interval_);
  delete self.interval_;

  // Hoisting
  const range = new beestat.component.input.range();
  const time_container = document.createElement('div');

  range.set_background(this.get_chart_gradient_(thermostat_ids));

  const container = document.createElement('div');
  Object.assign(container.style, {
    'display': 'flex',
    'align-items': 'center'
  });
  this.controls_container_.appendChild(container);

  const left_container = document.createElement('div');
  container.appendChild(left_container);

  const play_tile = new beestat.component.tile()
    .set_icon('play')
    .set_shadow(false)
    .set_text_hover_color(beestat.style.color.gray.base)
    .render($(left_container));
  play_tile.addEventListener('click', function() {
    if (self.interval_ === undefined) {
      play_tile.set_icon('pause');

      self.interval_ = window.setInterval(function() {
        self.date_m_.add(5, 'minutes');
        self.scene_.set_date(self.date_m_);
        range.set_value(
          ((self.date_m_.hours() * 60) + self.date_m_.minutes()) / 1440 * 288
        );
        time_container.innerText = self.date_m_.format('h:mm a');
      }, 100);
    } else {
      play_tile
        .set_icon('play');
      window.clearInterval(self.interval_);
      delete self.interval_;
    }
  });

  const range_container = document.createElement('div');
  Object.assign(range_container.style, {
    'position': 'relative',
    'flex-grow': '1'
  });
  container.appendChild(range_container);

  // Sunrise/Sunset
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (
    floor_plan.address_id !== undefined &&
    floor_plan.address_id !== null
  ) {
    const address = beestat.cache.address[floor_plan.address_id];

    const times = SunCalc.getTimes(
      self.date_m_.toDate(),
      address.normalized.metadata.latitude,
      address.normalized.metadata.longitude
    );

    const sunrise_m = moment(times.sunrise);
    const sunrise_percentage = ((sunrise_m.hours() * 60) + sunrise_m.minutes()) / 1440 * 100;

    const sunset_m = moment(times.sunset);
    const sunset_percentage = ((sunset_m.hours() * 60) + sunset_m.minutes()) / 1440 * 100;

    const sunrise_container = document.createElement('div');
    Object.assign(sunrise_container.style, {
      'position': 'absolute',
      'top': '-10px',
      'left': `${sunrise_percentage}%`
    });
    new beestat.component.icon('white_balance_sunny', 'Sunrise @ ' + sunrise_m.format('h:mm'))
      .set_size(16)
      .set_color(beestat.style.color.yellow.base)
      .render($(sunrise_container));
    range_container.appendChild(sunrise_container);

    const sunset_container = document.createElement('div');
    Object.assign(sunset_container.style, {
      'position': 'absolute',
      'top': '-10px',
      'left': `${sunset_percentage}%`
    });
    new beestat.component.icon('moon_waning_crescent', 'Sunset @ ' + sunset_m.format('h:mm'))
      .set_size(16)
      .set_color(beestat.style.color.purple.base)
      .render($(sunset_container));
    range_container.appendChild(sunset_container);
  }

  // Range input
  range
    .set_min(0)
    .set_max(287)
    .set_value(((self.date_m_.hours() * 60) + self.date_m_.minutes()) / 1440 * 288)
    .render($(range_container));

  time_container.innerText = self.date_m_.format('h:mm a');
  Object.assign(time_container.style, {
    'margin-top': '-8px',
    'text-align': 'right'
  });
  this.controls_container_.appendChild(time_container);

  range.addEventListener('input', function() {
    play_tile.set_icon('play');
    window.clearInterval(self.interval_);
    delete self.interval_;

    const minute_of_day = range.get_value() * 5;
    self.date_m_.hours(Math.floor(minute_of_day / 60));
    self.date_m_.minutes(Math.floor(minute_of_day % 60));
    time_container.innerText = self.date_m_.format('h:mm a');
    self.scene_.set_date(self.date_m_);
  });
};

/**
 * Get a CSS linear gradient style that represents the runtime chart.
 *
 * @param {array} thermostat_ids Which thermostat_ids to include data from.
 *
 * @return {string}
 */
beestat.component.card.three_d.prototype.get_chart_gradient_ = function(thermostat_ids) {
  const data = this.get_data_();

  const background_color_rgb = beestat.style.hex_to_rgb(beestat.style.color.bluegray.base);
  const no_data_color_rgb = beestat.style.hex_to_rgb(beestat.style.color.bluegray.dark);
  const background_color = 'rgba(' + background_color_rgb.r + ',' + background_color_rgb.g + ',' + background_color_rgb.b + ',1)';
  const no_data_color = 'rgba(' + no_data_color_rgb.r + ',' + no_data_color_rgb.g + ',' + no_data_color_rgb.b + ',1)';

  let current_color = background_color;
  const gradient = [
    {
      'color': current_color,
      'position': 0
    }
  ];

  const last_data_m = this.get_most_recent_time_with_data_();

  const date_m = moment();
  for (let i = 0; i < 287; i++) {
    const minute_of_day = i * 5;
    date_m.hours(Math.floor(minute_of_day / 60));
    date_m.minutes(Math.floor(minute_of_day % 60));

    let this_color = background_color;

    if (last_data_m === null || date_m.isAfter(last_data_m) === false) {
      const time = date_m.format('HH:mm');

      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;

      [
        'fan',
        'compressor_heat_1',
        'compressor_heat_2',
        'auxiliary_heat_1',
        'auxiliary_heat_2',
        'compressor_cool_1',
        'compressor_cool_2'
      ].forEach(function(series_code) {
        thermostat_ids.forEach(function(thermostat_id) {
          if (
            data.series[series_code][thermostat_id] !== undefined &&
            data.series[series_code][thermostat_id][time] !== undefined &&
            data.series[series_code][thermostat_id][time] > 0
          ) {
            // Only resets these if there is data to override it.
            if (count > 0) {
              red = 0;
              green = 0;
              blue = 0;
              alpha = 0;
              count = 0;
            }

            const color = beestat.style.hex_to_rgb(beestat.series[series_code].color);
            red += color.r;
            green += color.g;
            blue += color.b;
            alpha += data.series[series_code][thermostat_id][time] / thermostat_ids.length;
            count++;
          }
        });

        let rgb;
        if (count > 0) {
          rgb = {
            'r': red / count,
            'g': green / count,
            'b': blue / count
          };
          alpha /= count;
          this_color = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';
        } else {
          this_color = background_color;
        }
      });
    } else {
      this_color = no_data_color;
    }

    if (this_color !== current_color) {
      gradient.push({
        'color': this_color,
        'position': Math.round(i / 288 * 100 * 10) / 10
      });
      current_color = this_color;
    }
  }

  let gradient_string = ['90deg'];

  for (let i = 0; i < gradient.length; i++) {
    const start = gradient[i].position + '%';
    const end = gradient[i + 1] !== undefined ? gradient[i + 1].position + '%' : '100%';
    gradient_string.push(gradient[i].color + ' ' + start + ' ' + end);
  }

  return 'linear-gradient(' + gradient_string.join(', ') + ')';
};

/**
 * Watermark.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_watermark_ = function(parent) {
  const img = document.createElement('img');
  img.setAttribute('src', 'img/logo.png');
  Object.assign(img.style, {
    'height': '100%',
    'opacity': '0.7'
  });
  parent.appendChild(img);
};

/**
 * Toolbar.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_toolbar_ = function(parent) {
  const self = this;

  const tile_group = new beestat.component.tile_group();

  // Add floor
  tile_group.add_tile(new beestat.component.tile()
    .set_icon('layers')
    .set_shadow(false)
    .set_text_color(beestat.style.color.lightblue.base)
  );

  // Add room
  tile_group.add_tile(new beestat.component.tile()
    .set_icon(beestat.setting('visualize.three_d.show_labels') === false ? 'label_off' : 'label')
    .set_title('Toggle Labels')
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function(e) {
      e.stopPropagation();
      beestat.setting(
        'visualize.three_d.show_labels',
        !beestat.setting('visualize.three_d.show_labels')
      );
      this.set_icon(
        'label' + (beestat.setting('visualize.three_d.show_labels') === false ? '_off' : '')
      );
      self.scene_.set_labels(beestat.setting('visualize.three_d.show_labels'));
    })
  );

  // Add room
  tile_group.add_tile(new beestat.component.tile()
    .set_icon(beestat.setting('visualize.three_d.auto_rotate') === false ? 'restart_off' : 'restart')
    .set_title('Toggle Auto-Rotate')
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function(e) {
      e.stopPropagation();
      beestat.setting(
        'visualize.three_d.auto_rotate',
        !beestat.setting('visualize.three_d.auto_rotate')
      );
      this.set_icon(
        'restart' + (beestat.setting('visualize.three_d.auto_rotate') === false ? '_off' : '')
      );
      self.scene_.set_auto_rotate(beestat.setting('visualize.three_d.auto_rotate'));
    })
  );

  tile_group.render($(parent));
};

/**
 * Floors.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_floors_ = function(parent) {
  const self = this;

  const tile_group = new beestat.component.tile_group();

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const sorted_groups = Object.values(floor_plan.data.groups)
    .sort(function(a, b) {
      return a.elevation > b.elevation;
    });

  let icon_number = 1;
  sorted_groups.forEach(function(group) {
    const button = new beestat.component.tile()
      .set_title(group.name)
      .set_shadow(false)
      .set_text_hover_color(beestat.style.color.lightblue.light)
      .set_text_color(beestat.style.color.lightblue.base);

    let icon;
    if (group.elevation < 0) {
      icon = 'alpha_b';
    } else {
      icon = 'numeric_' + icon_number++;
    }

    const setting_key = 'visualize.three_d.show_group.' + group.group_id;
    button
      .set_icon(icon + (beestat.setting(setting_key) === false ? '' : '_box'))
      .addEventListener('click', function() {
        beestat.setting(
          setting_key,
          beestat.setting(setting_key) === false
        );
        self.scene_.set_layer_visible(group.group_id, beestat.setting(setting_key));
        this.set_icon(
          icon + (beestat.setting(setting_key) === false ? '' : '_box')
        );
      });

    tile_group.add_tile(button);
  });

  tile_group.render($(parent));
};

/**
 * Legend.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_legend_ = function(parent) {
  if (parent !== undefined) {
    this.legend_container_ = parent;
  }

  this.legend_container_.innerHTML = '';

  const gradient = this.get_gradient_();
  const gradient_parts = [
    beestat.style.rgb_to_hex(gradient[0]) + ' 0%',
    beestat.style.rgb_to_hex(gradient[Math.round(gradient.length / 2)]) + ' 50%',
    beestat.style.rgb_to_hex(gradient[gradient.length - 1]) + ' 100%'
  ];

  const gradient_container = document.createElement('div');
  Object.assign(gradient_container.style, {
    'background': 'linear-gradient(0deg, ' + gradient_parts.join(', ') + ')',
    'height': '100%',
    'width': '6px',
    'border-radius': '6px',
    'position': 'relative'
  });
  this.legend_container_.appendChild(gradient_container);

  let units;
  let min = this.get_heat_map_min_();
  let max = this.get_heat_map_max_();

  if (
    min !== Infinity &&
    max !== -Infinity
  ) {
    if (beestat.setting('visualize.data_type') === 'temperature') {
      min = beestat.temperature(min);
      max = beestat.temperature(max);
      units = beestat.setting('units.temperature');
    } else {
      units = '%';
    }

    const min_container = document.createElement('div');
    Object.assign(min_container.style, {
      'position': 'absolute',
      'bottom': '0',
      'right': '10px',
      'font-size': beestat.style.font_size.small
    });
    min_container.innerText = min + units;
    gradient_container.appendChild(min_container);

    const max_container = document.createElement('div');
    Object.assign(max_container.style, {
      'position': 'absolute',
      'top': '0',
      'right': '10px',
      'font-size': beestat.style.font_size.small
    });
    max_container.innerText = max + units;
    gradient_container.appendChild(max_container);
  }
};

/**
 * Get data. This doesn't directly or indirectly make any API calls, but it
 * caches the data so it doesn't have to loop over everything more than once.
 *
 * @param {boolean} force Force get the data?
 *
 * @return {object} The data.
 */
beestat.component.card.three_d.prototype.get_data_ = function() {
  const self = this;
  if (this.data_ === undefined) {
    const sensor_ids_map = beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_);
    const thermostat_ids_map = beestat.floor_plan.get_thermostat_ids_map(this.floor_plan_id_);

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
          },
          'fan': {
            'min': Infinity,
            'max': -Infinity
          },
          'compressor_heat_1': {
            'min': Infinity,
            'max': -Infinity
          },
          'compressor_heat_2': {
            'min': Infinity,
            'max': -Infinity
          },
          'auxiliary_heat_1': {
            'min': Infinity,
            'max': -Infinity
          },
          'auxiliary_heat_2': {
            'min': Infinity,
            'max': -Infinity
          },
          'compressor_cool_1': {
            'min': Infinity,
            'max': -Infinity
          },
          'compressor_cool_2': {
            'min': Infinity,
            'max': -Infinity
          }
        }
      },
      'series': {
        'temperature': {},
        'occupancy': {},
        'fan': {},
        'compressor_heat_1': {},
        'compressor_heat_2': {},
        'auxiliary_heat_1': {},
        'auxiliary_heat_2': {},
        'compressor_cool_1': {},
        'compressor_cool_2': {}
      }
    };

    // Sensors
    if (beestat.cache.data.three_d__runtime_sensor !== undefined) {
      // Add to data
      beestat.cache.data.three_d__runtime_sensor.forEach(function(runtime_sensor) {
        if (sensor_ids_map[runtime_sensor.sensor_id] !== undefined) {
          const timestamp_m = moment(runtime_sensor.timestamp);
          const time = timestamp_m.format('HH:mm');

          // Temperature
          if (runtime_sensor.temperature !== null) {
            if (self.data_.series.temperature[runtime_sensor.sensor_id] === undefined) {
              self.data_.series.temperature[runtime_sensor.sensor_id] = {};
            }
            if (self.data_.series.temperature[runtime_sensor.sensor_id][time] === undefined) {
              self.data_.series.temperature[runtime_sensor.sensor_id][time] = [];
            }
            self.data_.series.temperature[runtime_sensor.sensor_id][time].push(runtime_sensor.temperature);
          }

          // Occupancy
          if (runtime_sensor.occupancy !== null) {
            if (self.data_.series.occupancy[runtime_sensor.sensor_id] === undefined) {
              self.data_.series.occupancy[runtime_sensor.sensor_id] = {};
            }
            if (self.data_.series.occupancy[runtime_sensor.sensor_id][time] === undefined) {
              self.data_.series.occupancy[runtime_sensor.sensor_id][time] = [];
            }
            self.data_.series.occupancy[runtime_sensor.sensor_id][time].push(runtime_sensor.occupancy === true ? 100 : 0);
          }
        }
      });
    }

    // Thermostats
    if (beestat.cache.data.three_d__runtime_thermostat !== undefined) {
      // Add to data
      beestat.cache.data.three_d__runtime_thermostat.forEach(function(runtime_thermostat) {
        if (thermostat_ids_map[runtime_thermostat.thermostat_id] !== undefined) {
          const timestamp_m = moment(runtime_thermostat.timestamp);
          const time = timestamp_m.format('HH:mm');
          [
            'compressor_heat_1',
            'compressor_heat_2',
            'compressor_cool_1',
            'compressor_cool_2'
          ].forEach(function(series_key) {
            const runtime_key = series_key.replace(
              /compressor_(?:heat|cool)/,
              'compressor'
            );
            if (
              runtime_thermostat[runtime_key] !== null
            ) {
              if (self.data_.series[series_key][runtime_thermostat.thermostat_id] === undefined) {
                self.data_.series[series_key][runtime_thermostat.thermostat_id] = {};
              }
              if (self.data_.series[series_key][runtime_thermostat.thermostat_id][time] === undefined) {
                self.data_.series[series_key][runtime_thermostat.thermostat_id][time] = [];
              }
              self.data_.series[series_key][runtime_thermostat.thermostat_id][time].push(
                (
                  runtime_thermostat[runtime_key] > 0 &&
                  runtime_thermostat.compressor_mode === series_key.substring(11, 15)
                ) ? 1 : 0
              );
            }
          });

          [
            'auxiliary_heat_1',
            'auxiliary_heat_2',
            'fan'
          ].forEach(function(key) {
            if (runtime_thermostat[key] !== null) {
              if (self.data_.series[key][runtime_thermostat.thermostat_id] === undefined) {
                self.data_.series[key][runtime_thermostat.thermostat_id] = {};
              }
              if (self.data_.series[key][runtime_thermostat.thermostat_id][time] === undefined) {
                self.data_.series[key][runtime_thermostat.thermostat_id][time] = [];
              }
              self.data_.series[key][runtime_thermostat.thermostat_id][time].push(runtime_thermostat[key] > 0 ? 1 : 0);
            }
          });
        }
      });
    }

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
 * Update the scene with current settings. Anything that doesn't require
 * re-rendering can go here.
 */
beestat.component.card.three_d.prototype.update_scene_ = function() {
  this.scene_.set_data_type(beestat.setting('visualize.data_type'));
  this.scene_.set_gradient(this.get_gradient_());
  this.scene_.set_heat_map_min(this.get_heat_map_min_());
  this.scene_.set_heat_map_max(this.get_heat_map_max_());
};

/**
 * Update the HUD.
 */
beestat.component.card.three_d.prototype.update_hud_ = function() {
  this.decorate_legend_();
  this.decorate_controls_();
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
 * Get the effective minimum heat map value based on the settings.
 *
 * @return {number}
 */
beestat.component.card.three_d.prototype.get_heat_map_min_ = function() {
  if (beestat.setting('visualize.heat_map_values') === 'dynamic') {
    return this.data_.metadata.series[beestat.setting('visualize.data_type')].min;
  }
  return beestat.setting(
    'visualize.heat_map_static.' +
    beestat.setting('visualize.data_type') +
    '.min'
  ) / (beestat.setting('visualize.data_type') === 'occupancy' ? 100 : 1);
};

/**
 * Get the effective maximum heat map value based on the settings.
 *
 * @return {number}
 */
beestat.component.card.three_d.prototype.get_heat_map_max_ = function() {
  if (beestat.setting('visualize.heat_map_values') === 'dynamic') {
    return this.data_.metadata.series[beestat.setting('visualize.data_type')].max;
  }
  return beestat.setting(
    'visualize.heat_map_static.' +
    beestat.setting('visualize.data_type') +
    '.max'
  ) / (beestat.setting('visualize.data_type') === 'occupancy' ? 100 : 1);
};

/**
 * Get the gradient based on the settings.
 *
 * @return {object}
 */
beestat.component.card.three_d.prototype.get_gradient_ = function() {
  if (beestat.setting('visualize.data_type') === 'temperature') {
    return beestat.style.generate_gradient(
      [
        beestat.style.hex_to_rgb(beestat.style.color.blue.dark),
        beestat.style.hex_to_rgb(beestat.style.color.gray.base),
        beestat.style.hex_to_rgb(beestat.style.color.red.dark)
      ],
      100
    );
  } else {
    return beestat.style.generate_gradient(
      [
        beestat.style.hex_to_rgb(beestat.style.color.gray.base),
        beestat.style.hex_to_rgb(beestat.style.color.orange.dark)
      ],
      200
    );
  }
};

beestat.component.card.three_d.prototype.get_most_recent_time_with_data_ = function() {
  const self = this;

  const sensor_ids = Object.keys(
    beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_)
  );
  if (sensor_ids.length > 0) {
    let keys = [];
    sensor_ids.forEach(function(sensor_id) {
      if (self.get_data_().series[beestat.setting('visualize.data_type')][sensor_id] !== undefined) {
        keys = keys.concat(Object.keys(
          self.get_data_().series[beestat.setting('visualize.data_type')][sensor_id]
        ));
      }
    });

    let hour;
    let minute;
    if (keys.length > 0) {
      keys.sort();
      const key_parts = keys[keys.length - 1].split(':');
      hour = key_parts[0];
      minute = key_parts[1];
    } else {
      hour = 0;
      minute = 0;
    }

    return moment()
      .hour(hour)
      .minute(minute)
      .second(0);
  }

  return null;
};
