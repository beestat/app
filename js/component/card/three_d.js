/**
 * 3D View
 */
beestat.component.card.three_d = function() {
  const self = this;

  if (
    beestat.component.card.three_d.active_instance_ !== undefined &&
    beestat.component.card.three_d.active_instance_ !== null &&
    beestat.component.card.three_d.active_instance_ !== this
  ) {
    beestat.component.card.three_d.active_instance_.force_dispose_stale_instance_();
  }
  beestat.component.card.three_d.active_instance_ = this;

  this.disposed_ = false;
  this.rerender_timeout_id_ = undefined;
  this.rerender_pending_delay_ms_ = undefined;
  this.rerender_waiting_for_visibility_ = false;
  this.visibility_observer_ = undefined;
  this.is_in_viewport_ = true;

  this.handle_scene_settings_change_ = function() {
    if (self.disposed_ === true || self.scene_ === undefined) {
      return;
    }
    self.update_scene_();
    self.update_hud_();
  };

  // Things that update the scene that don't require a rerender.
  beestat.dispatcher.addEventListener(
    [
      'setting.visualize.data_type',
      'setting.visualize.heat_map_values',
      'setting.visualize.heat_map_static.temperature.min',
      'setting.visualize.heat_map_static.temperature.max',
      'setting.visualize.heat_map_static.occupancy.min',
      'setting.visualize.heat_map_static.occupancy.max'
    ],
    this.handle_scene_settings_change_
  );

  this.handle_floor_plan_cache_change_ = function() {
    if (self.disposed_ === true) {
      return;
    }
    // Force settings to be rehydrated from persisted floor plan data.
    self.scene_settings_values_ = undefined;
    self.request_rerender(beestat.component.card.three_d.rerender_delay_floor_plan_ms);
  };

  // Rerender the scene when the floor plan changes.
  beestat.dispatcher.addEventListener('cache.floor_plan', this.handle_floor_plan_cache_change_);

  this.handle_runtime_data_change_ = beestat.debounce(function() {
    if (self.disposed_ === true || self.scene_ === undefined) {
      return;
    }
    self.state_.scene_camera_state = self.scene_.get_camera_state();
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.three_d__runtime_sensor',
      'cache.data.three_d__runtime_thermostat'
    ],
    this.handle_runtime_data_change_
  );

  this.handle_thermostat_cache_change_ = function() {
    if (self.disposed_ === true || self.scene_ === undefined) {
      return;
    }
    if (self.get_weather_() !== 'auto') {
      return;
    }
    self.apply_weather_setting_to_scene_(false);
    self.decorate_toolbar_();
  };
  beestat.dispatcher.addEventListener('cache.thermostat', this.handle_thermostat_cache_change_);

  this.scene_settings_menu_open_ = false;
  this.scene_settings_values_ = undefined;
  this.scene_settings_scroll_top_ = 0;
  this.scene_settings_panel_content_ = undefined;
  this.weather_values_ = ['auto', 'sunny', 'overcast', 'rain', 'thunderstorm', 'snow'];

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.three_d, beestat.component.card);

/**
 * Debounce delay in milliseconds for floor plan-triggered rerenders.
 *
 * @type {number}
 */
beestat.component.card.three_d.rerender_delay_floor_plan_ms = 5000;

/**
 * Debounce delay in milliseconds for scene setting-triggered rerenders.
 *
 * @type {number}
 */
beestat.component.card.three_d.rerender_delay_scene_setting_ms = 1000;

/**
 * Minimum time to keep the render loading mask visible (ms).
 *
 * @type {number}
 */
beestat.component.card.three_d.rerender_loading_min_visible_ms = 350;

/**
 * Debug-only weather override.
 * Set to `null` to use the scene-selected weather mode.
 * Set to a weather condition string (e.g. `fog`, `rain`) to force it.
 *
 * @type {?string}
 */
beestat.component.card.three_d.debug_weather_override = null;

/**
 * Scene setting keys that require a full rerender.
 *
 * @type {!Object<string, boolean>}
 */
beestat.component.card.three_d.rerender_required_scene_settings = {
  'tree_enabled': true,
  'star_density': true,
  'light_user_enabled': true
};

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
  this.init_visibility_observer_();
};

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.three_d.prototype.decorate_contents_ = function(parent) {
  // Reset cached runtime data/state tied to prior scene instances.
  delete this.data_;
  this.scene_settings_values_ = undefined;
  window.clearInterval(this.fps_interval_);
  delete this.fps_interval_;

  // Build the 3D drawing surface.
  const drawing_pane_container = document.createElement('div');
  drawing_pane_container.style.overflowX = 'hidden';

  parent.appendChild(drawing_pane_container);
  this.decorate_drawing_pane_(drawing_pane_container);

  // Build always-visible overlay elements (watermark, FPS, toolbar, settings).
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

  // FPS ticker
  const fps_container = document.createElement('div');
  Object.assign(fps_container.style, {
    'position': 'absolute',
    'bottom': `${beestat.style.size.gutter + 24}px`,
    'right': `${beestat.style.size.gutter}px`,
    'font-size': beestat.style.font_size.small,
    'color': 'rgba(255,255,255,0.85)',
    'font-family': 'Consolas, Courier, Monospace',
    'pointer-events': 'none',
    'text-align': 'right'
  });
  parent.appendChild(fps_container);
  this.decorate_fps_ticker_(fps_container);
  this.update_fps_visibility_();

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

  // Scene settings panel
  const scene_settings_container = document.createElement('div');
  Object.assign(scene_settings_container.style, {
    'position': 'absolute',
    'top': `${beestat.style.size.gutter + 52}px`,
    'right': `${beestat.style.size.gutter}px`,
    'min-width': '220px',
    'max-width': '250px',
    'height': '375px',
    'overflow': 'hidden',
    'z-index': 2
  });
  parent.appendChild(scene_settings_container);
  this.decorate_scene_settings_panel_(scene_settings_container);

  // Environment date slider (shown only in environment view)
  const environment_date_container = document.createElement('div');
  Object.assign(environment_date_container.style, {
    'position': 'absolute',
    'left': `${beestat.style.size.gutter}px`,
    'bottom': `${beestat.style.size.gutter}px`,
    'width': '230px'
  });
  parent.appendChild(environment_date_container);
  this.decorate_environment_date_(environment_date_container);

  // Build top-row HUD containers (floors + controls) and legend.
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

  // Resolve the required data range from current visualize date settings.
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

  const sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(this.floor_plan_id_));
  if (sensor_ids.length > 0) {
    // Fetch and cache runtime streams needed by get_data_ when cache is missing.
    if (
      beestat.cache.data.three_d__runtime_sensor === undefined ||
      beestat.cache.data.three_d__runtime_thermostat === undefined
    ) {
      this.show_loading_('Fetching');

      const value = [
        required_begin.format(),
        required_end.format()
      ];
      const operator = 'between';

      const thermostat_ids = Object.keys(beestat.floor_plan.get_thermostat_ids_map(this.floor_plan_id_));
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
  this.ensure_scene_settings_values_();
  this.scene_ = new beestat.component.scene(
    beestat.setting('visualize.floor_plan_id'),
    this.get_data_()
  );

  const initial_width = parent.getBoundingClientRect().width;
  if (this.state_.width === undefined && initial_width > 0) {
    this.state_.width = initial_width;
  }
  if (this.state_.width !== undefined && this.state_.width > 0) {
    this.scene_.set_initial_width(this.state_.width);
  }
  if (this.state_.scene_camera_state !== undefined) {
    this.scene_.set_initial_camera_state(this.state_.scene_camera_state);
  }

  this.scene_.set_scene_settings(this.scene_settings_values_, {
    'rerender': false
  });

  this.scene_.addEventListener('change_active_room', function() {
    self.update_hud_();
  });

  // Set the initial date.
  this.update_scene_();
  this.scene_.render($(parent));

  // Use current local time of day for initial scene lighting.
  const now = moment();
  const current_hour = now.hour();
  const current_minute = now.minute();

  if (beestat.setting('visualize.range_type') === 'dynamic') {
    // Set the date, then apply current time of day
    this.date_m_ = moment()
      .subtract(
        beestat.setting('visualize.range_dynamic'),
        'day'
      )
      .hour(current_hour)
      .minute(current_minute)
      .second(0);
  } else {
    // Set the static date, then apply current time of day
    this.date_m_ = moment(
      beestat.setting('visualize.range_static.begin') + ' 00:00:00'
    )
      .hour(current_hour)
      .minute(current_minute)
      .second(0);
  }

  // Default environment date to today.
  this.environment_date_m_ = moment().startOf('day');
  if (this.get_show_environment_() === true) {
    this.date_m_
      .year(this.environment_date_m_.year())
      .month(this.environment_date_m_.month())
      .date(this.environment_date_m_.date());
  }

  // Set some defaults on the scene.
  this.scene_.set_date(this.date_m_);
  this.scene_.set_labels(
    this.get_show_environment_() === true
      ? false
      : this.get_show_labels_()
  );
  this.scene_.set_room_interaction_enabled(this.get_show_environment_() === false);
  this.scene_.set_auto_rotate(this.get_auto_rotate_());

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  // Set location for celestial light calculations if address is available
  if (
    floor_plan.address_id !== undefined &&
    floor_plan.address_id !== null
  ) {
    const address = beestat.cache.address[floor_plan.address_id];
    if (address !== undefined) {
      this.scene_.set_location(
        address.normalized.metadata.latitude,
        address.normalized.metadata.longitude
      );
    }
  }

  this.apply_layer_visibility_();

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

  beestat.dispatcher.removeEventListener('resize.three_d');
  beestat.dispatcher.addEventListener('resize.three_d', function() {
    self.state_.width = parent.getBoundingClientRect().width;
    self.scene_.set_width(self.state_.width);
  });
};

/**
 * Get (and initialize if needed) persisted scene settings.
 *
 * @return {object|null}
 */
beestat.component.card.three_d.prototype.get_scene_visualize_state_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (floor_plan === undefined || floor_plan.data === undefined) {
    return null;
  }

  if (floor_plan.data.scene === undefined || floor_plan.data.scene === null) {
    floor_plan.data.scene = {};
  }

  // Migrate legacy storage from floor_plan.data.visualize.scene to floor_plan.data.scene.
  if (
    floor_plan.data.visualize !== undefined &&
    floor_plan.data.visualize !== null &&
    floor_plan.data.visualize.scene !== undefined &&
    floor_plan.data.visualize.scene !== null &&
    typeof floor_plan.data.visualize.scene === 'object'
  ) {
    floor_plan.data.scene = Object.assign(
      {},
      floor_plan.data.visualize.scene,
      floor_plan.data.scene
    );
    delete floor_plan.data.visualize.scene;
    this.save_scene_visualize_state_();
  }

  if (typeof floor_plan.data.scene !== 'object') {
    floor_plan.data.scene = {};
  }

  const scene_visualize = floor_plan.data.scene;
  if (scene_visualize.settings === undefined || scene_visualize.settings === null) {
    scene_visualize.settings = {};
  }
  if (scene_visualize.show_group === undefined || scene_visualize.show_group === null) {
    scene_visualize.show_group = {};
  }
  if (scene_visualize.mode === undefined) {
    scene_visualize.mode = 'floor_plan';
  }
  if (scene_visualize.auto_rotate === undefined) {
    scene_visualize.auto_rotate = false;
  }
  if (scene_visualize.show_labels === undefined) {
    scene_visualize.show_labels = true;
  }
  if (scene_visualize.weather === undefined) {
    scene_visualize.weather = 'auto';
  }

  return scene_visualize;
};

/**
 * Persist current floor plan data after scene-visualize changes.
 */
beestat.component.card.three_d.prototype.save_scene_visualize_state_ = function() {
  beestat.floor_plan.queue_data_save_(this.floor_plan_id_, 300);
};

/**
 * Get whether environment mode is enabled.
 *
 * @return {boolean}
 */
beestat.component.card.three_d.prototype.get_show_environment_ = function() {
  if (beestat.user.has_early_access() !== true) {
    return false;
  }
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return false;
  }
  return scene_visualize.mode === 'environment';
};

/**
 * Set environment mode.
 *
 * @param {boolean} show_environment
 */
beestat.component.card.three_d.prototype.set_show_environment_ = function(show_environment) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return;
  }
  scene_visualize.mode = show_environment === true ? 'environment' : 'floor_plan';
  this.save_scene_visualize_state_();
};

/**
 * Get selected weather value.
 *
 * @return {string}
 */
beestat.component.card.three_d.prototype.get_weather_ = function() {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return 'auto';
  }
  const weather = scene_visualize.weather;
  if (this.weather_values_.includes(weather) !== true) {
    scene_visualize.weather = 'auto';
    this.save_scene_visualize_state_();
    return 'auto';
  }
  return weather;
};

/**
 * Set weather value.
 *
 * @param {string} weather
 */
beestat.component.card.three_d.prototype.set_weather_ = function(weather) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return;
  }
  const normalized_weather = this.weather_values_.includes(weather)
    ? weather
    : 'auto';
  scene_visualize.weather = normalized_weather;
  this.save_scene_visualize_state_();
};

/**
 * Get normalized thermostat weather condition for auto scene weather.
 *
 * @return {string}
 */
beestat.component.card.three_d.prototype.get_auto_weather_from_thermostat_ = function() {
  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  return beestat.weather.get_settings_(thermostat?.weather?.condition).condition;
};

/**
 * Get a normalized debug weather override condition.
 *
 * @return {?string}
 */
beestat.component.card.three_d.prototype.get_debug_weather_override_condition_ = function() {
  const override = beestat.component.card.three_d.debug_weather_override;
  if (typeof override !== 'string') {
    return null;
  }
  const normalized_override = override.trim().toLowerCase();
  if (normalized_override.length === 0) {
    return null;
  }
  if (normalized_override === 'auto') {
    return this.get_auto_weather_from_thermostat_();
  }
  return beestat.weather.get_settings_(normalized_override).condition;
};

/**
 * Resolve selected weather mode into a weather condition.
 *
 * @param {string} weather
 *
 * @return {string}
 */
beestat.component.card.three_d.prototype.get_weather_condition_from_mode_ = function(weather) {
  const debug_override_condition = this.get_debug_weather_override_condition_();
  if (debug_override_condition !== null) {
    return debug_override_condition;
  }
  if (weather === 'auto') {
    return this.get_auto_weather_from_thermostat_();
  }
  return beestat.weather.get_settings_(weather).condition;
};

/**
 * Get sidebar weather icon for a selected mode.
 *
 * @param {string} weather
 *
 * @return {string}
 */
beestat.component.card.three_d.prototype.get_weather_icon_from_mode_ = function(weather) {
  return beestat.weather.get_icon(this.get_weather_condition_from_mode_(weather));
};

/**
 * Get explicit weather mode list for expanded weather picker.
 *
 * @return {!Array<!{value: string, icon: string, title: string}>}
 */
beestat.component.card.three_d.prototype.get_weather_mode_tiles_ = function() {
  return [
    {'value': 'sunny', 'icon': beestat.weather.get_icon('sunny'), 'title': 'Weather: Sunny'},
    {'value': 'overcast', 'icon': beestat.weather.get_icon('overcast'), 'title': 'Weather: Overcast'},
    {'value': 'rain', 'icon': beestat.weather.get_icon('rain'), 'title': 'Weather: Rain'},
    {'value': 'thunderstorm', 'icon': beestat.weather.get_icon('thunderstorm'), 'title': 'Weather: Thunderstorm'},
    {'value': 'snow', 'icon': beestat.weather.get_icon('snow'), 'title': 'Weather: Snow'}
  ];
};

/**
 * Get whether labels are enabled in floor plan mode.
 *
 * @return {boolean}
 */
beestat.component.card.three_d.prototype.get_show_labels_ = function() {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return true;
  }
  return scene_visualize.show_labels !== false;
};

/**
 * Set labels visibility in floor plan mode.
 *
 * @param {boolean} show_labels
 */
beestat.component.card.three_d.prototype.set_show_labels_ = function(show_labels) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return;
  }
  scene_visualize.show_labels = show_labels === true;
  this.save_scene_visualize_state_();
};

/**
 * Get whether auto-rotate is enabled.
 *
 * @return {boolean}
 */
beestat.component.card.three_d.prototype.get_auto_rotate_ = function() {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return false;
  }
  return scene_visualize.auto_rotate === true;
};

/**
 * Set auto-rotate.
 *
 * @param {boolean} auto_rotate
 */
beestat.component.card.three_d.prototype.set_auto_rotate_ = function(auto_rotate) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return;
  }
  scene_visualize.auto_rotate = auto_rotate === true;
  this.save_scene_visualize_state_();
};

/**
 * Get visibility state for one floor/group layer.
 *
 * @param {number} group_id
 *
 * @return {boolean}
 */
beestat.component.card.three_d.prototype.get_show_group_ = function(group_id) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return true;
  }
  return scene_visualize.show_group[group_id] !== false;
};

/**
 * Set visibility state for one floor/group layer.
 *
 * @param {number} group_id
 * @param {boolean} visible
 */
beestat.component.card.three_d.prototype.set_show_group_ = function(group_id, visible) {
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize === null) {
    return;
  }
  scene_visualize.show_group[group_id] = visible === true;
  this.save_scene_visualize_state_();
};

/**
 * Map weather to scene weather property values.
 *
 * @param {string} weather
 *
 * @return {{
 *   cloud_density: number,
 *   cloud_darkness: number,
 *   fog_density: number,
 *   fog_color: string,
 *   rain_density: number,
 *   snow_density: number,
 *   lightning_frequency: number,
 *   wind_speed: number
 * }}
 */
beestat.component.card.three_d.prototype.get_weather_settings_from_weather_ = function(weather) {
  const condition = this.get_weather_condition_from_mode_(weather);
  return {
    'cloud_density': beestat.weather.get_cloud_density(condition),
    'cloud_darkness': beestat.weather.get_cloud_darkness(condition),
    'fog_density': beestat.weather.get_fog_density(condition),
    'fog_color': beestat.weather.get_fog_color(condition),
    'rain_density': beestat.weather.get_rain_density(condition),
    'snow_density': beestat.weather.get_snow_density(condition),
    'lightning_frequency': beestat.weather.get_lightning_frequency(condition),
    'wind_speed': beestat.weather.get_wind_speed(condition)
  };
};

/**
 * Apply current weather settings to the scene.
 *
 * @param {boolean=} opt_persist Persist weather settings to floor-plan scene data.
 */
beestat.component.card.three_d.prototype.apply_weather_setting_to_scene_ = function(opt_persist) {
  if (this.scene_ === undefined) {
    return;
  }

  this.ensure_scene_settings_values_();
  const weather_settings = this.get_weather_settings_from_weather_(this.get_weather_());
  Object.assign(this.scene_settings_values_, weather_settings);
  const persist = opt_persist === true;
  if (persist === true) {
    const scene_visualize = this.get_scene_visualize_state_();
    if (scene_visualize !== null) {
      const previous_settings_json = JSON.stringify(scene_visualize.settings || {});
      Object.assign(scene_visualize.settings, weather_settings);
      const next_settings_json = JSON.stringify(scene_visualize.settings);
      if (previous_settings_json !== next_settings_json) {
        this.save_scene_visualize_state_();
      }
    }
  }
  this.scene_.set_scene_settings(weather_settings, {
    'rerender': false
  });

  if (this.scene_settings_container_ !== undefined) {
    this.decorate_scene_settings_panel_();
  }
};

/**
 * Ensure local scene settings state exists.
 */
beestat.component.card.three_d.prototype.ensure_scene_settings_values_ = function() {
  if (this.scene_settings_values_ !== undefined) {
    return;
  }

  const scene_visualize = this.get_scene_visualize_state_();
  this.scene_settings_values_ = Object.assign({}, beestat.component.scene.default_settings);
  if (scene_visualize !== null && scene_visualize.settings !== undefined) {
    Object.assign(this.scene_settings_values_, scene_visualize.settings);
  }
  if (this.scene_settings_values_.seed !== undefined) {
    this.scene_settings_values_.random_seed = this.scene_settings_values_.seed;
    delete this.scene_settings_values_.seed;
  }
  if (
    Number.isFinite(Number(this.scene_settings_values_.random_seed)) !== true ||
    Number(this.scene_settings_values_.random_seed) <= 0
  ) {
    this.scene_settings_values_.random_seed = Math.floor(Math.random() * 2147483646) + 1;
  }
  if (scene_visualize !== null) {
    const normalized_settings = Object.assign({}, this.scene_settings_values_, {
      'seed': this.scene_settings_values_.random_seed
    });
    delete normalized_settings.random_seed;
    const previous_settings_json = JSON.stringify(scene_visualize.settings || {});
    const next_settings_json = JSON.stringify(normalized_settings);
    scene_visualize.settings = normalized_settings;
    if (previous_settings_json !== next_settings_json) {
      this.save_scene_visualize_state_();
    }
  }
};

/**
 * Set one scene setting from the settings panel and force rerender.
 *
 * @param {string} key
 * @param {*} value
 */
beestat.component.card.three_d.prototype.set_scene_setting_from_panel_ = function(key, value) {
  this.ensure_scene_settings_values_();
  this.scene_settings_values_[key] = value;
  const scene_visualize = this.get_scene_visualize_state_();
  if (scene_visualize !== null) {
    const persisted_key = key === 'random_seed' ? 'seed' : key;
    scene_visualize.settings[persisted_key] = value;
    this.save_scene_visualize_state_();
  }

  if (this.scene_ !== undefined) {
    this.scene_.set_scene_settings({
      [key]: value
    }, {
      'rerender': false,
      'source': 'panel'
    });
    if (beestat.component.card.three_d.rerender_required_scene_settings[key] === true) {
      this.request_rerender(beestat.component.card.three_d.rerender_delay_scene_setting_ms);
    }
  }
};

/**
 * Request a full scene rerender after a delay. New requests reset the timer.
 *
 * @param {number} milliseconds
 */
beestat.component.card.three_d.prototype.request_rerender = function(milliseconds) {
  let delay = Number(milliseconds);
  if (Number.isFinite(delay) !== true || delay < 0) {
    delay = 0;
  }
  delay = Math.floor(delay);

  this.rerender_pending_delay_ms_ = delay;
  this.rerender_waiting_for_visibility_ = false;

  if (this.rerender_timeout_id_ !== undefined) {
    window.clearTimeout(this.rerender_timeout_id_);
    this.rerender_timeout_id_ = undefined;
  }

  this.rerender_timeout_id_ = window.setTimeout(function() {
    this.rerender_timeout_id_ = undefined;
    this.rerender_pending_delay_ms_ = undefined;

    if (this.disposed_ === true || this.scene_ === undefined) {
      return;
    }

    if (this.is_scene_in_viewport_() !== true) {
      this.rerender_waiting_for_visibility_ = true;
      return;
    }

    this.show_loading_('Rendering');
    const loading_started_ms = window.performance.now();
    const run_rerender = function() {
      if (this.disposed_ === true || this.scene_ === undefined) {
        this.hide_loading_();
        return;
      }

      try {
        this.scene_.rerender();
        this.apply_layer_visibility_();
        this.update_scene_();
        this.update_hud_();
      } finally {
        const elapsed_ms = window.performance.now() - loading_started_ms;
        const min_visible_ms = Number(
          beestat.component.card.three_d.rerender_loading_min_visible_ms || 0
        );
        const remaining_ms = Math.max(0, min_visible_ms - elapsed_ms);
        window.setTimeout(function() {
          this.hide_loading_();
        }.bind(this), remaining_ms);
      }
    }.bind(this);

    // Yield at least one paint so the loading mask appears before heavy work.
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(function() {
        window.requestAnimationFrame(run_rerender);
      });
    } else {
      window.setTimeout(run_rerender, 16);
    }
  }.bind(this), delay);
};

/**
 * Whether this card is currently visible in the viewport.
 *
 * @return {boolean}
 */
beestat.component.card.three_d.prototype.is_scene_in_viewport_ = function() {
  if (this.contents_ === undefined || this.contents_[0] === undefined) {
    return true;
  }

  const rect = this.contents_[0].getBoundingClientRect();
  const viewport_height = window.innerHeight || document.documentElement.clientHeight;
  const viewport_width = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewport_height &&
    rect.left < viewport_width
  );
};

/**
 * Track whether the card is visible and flush deferred rerenders when visible.
 */
beestat.component.card.three_d.prototype.init_visibility_observer_ = function() {
  if (
    typeof window.IntersectionObserver !== 'function' ||
    this.contents_ === undefined ||
    this.contents_[0] === undefined
  ) {
    return;
  }

  if (this.visibility_observer_ !== undefined) {
    this.visibility_observer_.disconnect();
  }

  this.visibility_observer_ = new window.IntersectionObserver(function(entries) {
    if (entries === undefined || entries.length === 0) {
      return;
    }

    const entry = entries[entries.length - 1];
    this.is_in_viewport_ = entry.isIntersecting === true && entry.intersectionRatio > 0;

    if (this.is_in_viewport_ === true && this.rerender_waiting_for_visibility_ === true) {
      this.rerender_waiting_for_visibility_ = false;
      this.request_rerender(0);
    }
  }.bind(this), {
    'threshold': 0
  });

  this.visibility_observer_.observe(this.contents_[0]);
};

/**
 * Decorate scene settings panel.
 *
 * @param {HTMLDivElement=} parent
 */
beestat.component.card.three_d.prototype.decorate_scene_settings_panel_ = function(parent) {
  if (parent !== undefined) {
    this.scene_settings_container_ = parent;
  }
  if (this.scene_settings_container_ === undefined) {
    return;
  }

  if (this.scene_settings_panel_content_ !== undefined) {
    this.scene_settings_scroll_top_ = this.scene_settings_panel_content_.scrollTop;
  } else {
    this.scene_settings_scroll_top_ = this.scene_settings_container_.scrollTop;
  }

  this.scene_settings_container_.innerHTML = '';
  this.scene_settings_panel_content_ = undefined;
  if (
    this.get_show_environment_() !== true ||
    this.scene_settings_menu_open_ !== true
  ) {
    this.scene_settings_container_.style.display = 'none';
    this.update_fps_visibility_();
    return;
  }
  this.scene_settings_container_.style.display = 'block';

  this.ensure_scene_settings_values_();

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    'background': 'rgba(32, 42, 48, 0.94)',
    'border': '1px solid rgba(255,255,255,0.16)',
    'border-radius': `${beestat.style.size.border_radius}px`,
    'padding': '10px',
    'color': '#fff',
    'font-size': beestat.style.font_size.small,
    'display': 'flex',
    'flex-direction': 'column',
    'grid-gap': '8px',
    'height': '100%',
    'overflow-y': 'auto',
    'box-sizing': 'border-box'
  });
  panel.addEventListener('scroll', () => {
    this.scene_settings_scroll_top_ = panel.scrollTop;
  });
  this.scene_settings_container_.appendChild(panel);
  this.scene_settings_panel_content_ = panel;
  this.scene_settings_container_.scrollTop = this.scene_settings_scroll_top_;
  panel.scrollTop = this.scene_settings_scroll_top_;
  const restore_scroll = () => {
    this.scene_settings_container_.scrollTop = this.scene_settings_scroll_top_;
    panel.scrollTop = this.scene_settings_scroll_top_;
  };
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      restore_scroll();
      window.requestAnimationFrame(restore_scroll);
    });
  } else {
    window.setTimeout(restore_scroll, 0);
  }

  const get_title_case_label = (key) => {
    return key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const add_boolean_setting = (label, key) => {
    const row = document.createElement('label');
    Object.assign(row.style, {
      'display': 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'grid-gap': '10px'
    });
    const text = document.createElement('span');
    text.innerText = label;
    row.appendChild(text);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.scene_settings_values_[key] === true;
    Object.assign(input.style, {
      'visibility': 'visible',
      'appearance': 'auto',
      '-webkit-appearance': 'checkbox',
      'accent-color': beestat.style.color.lightblue.base,
      'width': '16px',
      'height': '16px',
      'margin': '0'
    });
    input.addEventListener('change', () => {
      this.set_scene_setting_from_panel_(key, input.checked === true);
    });
    row.appendChild(input);
    panel.appendChild(row);
  };

  const add_number_setting = (label, key, min, max, step) => {
    const row = document.createElement('label');
    Object.assign(row.style, {
      'display': 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'grid-gap': '10px'
    });
    const text = document.createElement('span');
    text.innerText = label;
    row.appendChild(text);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(this.scene_settings_values_[key]);
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    Object.assign(input.style, {
      'width': '62px',
      'background': '#1a242a',
      'color': '#fff',
      'border': '1px solid rgba(255,255,255,0.2)',
      'border-radius': '4px',
      'padding': '2px 4px'
    });
    input.addEventListener('change', () => {
      const parsed = Number(input.value);
      if (Number.isFinite(parsed) !== true) {
        input.value = String(this.scene_settings_values_[key]);
        return;
      }
      const clamped = Math.max(min, Math.min(max, parsed));
      const normalized = step >= 1 ? Math.round(clamped) : clamped;
      input.value = String(normalized);
      this.set_scene_setting_from_panel_(key, normalized);
    });
    row.appendChild(input);
    panel.appendChild(row);
  };

  const add_separator = () => {
    const separator = document.createElement('div');
    Object.assign(separator.style, {
      'height': '1px',
      'background': 'rgba(255,255,255,0.16)',
      'margin': '2px 0'
    });
    panel.appendChild(separator);
  };
  const add_section_title = (title) => {
    const heading = document.createElement('div');
    Object.assign(heading.style, {
      'font-size': '11px',
      'letter-spacing': '0.06em',
      'text-transform': 'uppercase',
      'color': 'rgba(255,255,255,0.75)',
      'margin-top': '2px'
    });
    heading.innerText = title;
    panel.appendChild(heading);
  };

  // Weather
  add_section_title('Weather');
  add_number_setting(get_title_case_label('cloud_density'), 'cloud_density', 0, 2, 0.1);
  add_number_setting(get_title_case_label('cloud_darkness'), 'cloud_darkness', 0, 2, 0.1);
  add_number_setting(get_title_case_label('fog_density'), 'fog_density', 0, 2, 0.1);
  add_number_setting(get_title_case_label('rain_density'), 'rain_density', 0, 2, 0.1);
  add_number_setting(get_title_case_label('snow_density'), 'snow_density', 0, 2, 0.1);
  add_number_setting(get_title_case_label('lightning_frequency'), 'lightning_frequency', 0, 2, 0.1);

  add_separator();
  add_section_title('Wind');
  add_number_setting(get_title_case_label('wind_speed'), 'wind_speed', 0, 2, 0.1);
  add_number_setting(get_title_case_label('wind_direction'), 'wind_direction', 0, 360, 1);

  add_separator();

  // Tree
  add_section_title('Tree');
  add_boolean_setting(get_title_case_label('tree_enabled'), 'tree_enabled');
  add_boolean_setting(get_title_case_label('tree_wobble'), 'tree_wobble');

  add_separator();

  // Light / Sky
  add_section_title('Light / Sky');
  add_number_setting(get_title_case_label('star_density'), 'star_density', 0, 2, 0.1);
  add_boolean_setting(get_title_case_label('light_user_enabled'), 'light_user_enabled');
  add_boolean_setting(get_title_case_label('light_user_cast_shadows'), 'light_user_cast_shadows');
  this.update_fps_visibility_();
};

/**
 * Apply saved layer visibility (environment/floor plan/floors) to the current
 * scene. Used after initial draw and after scene rerenders.
 */
beestat.component.card.three_d.prototype.apply_layer_visibility_ = function() {
  if (this.scene_ === undefined) {
    return;
  }

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (floor_plan === undefined) {
    return;
  }

  const show_environment = this.get_show_environment_();
  if (show_environment === false) {
    this.weather_menu_open_ = false;
    this.scene_settings_menu_open_ = false;
  }

  this.scene_.set_layer_visible('walls', show_environment);
  this.scene_.set_layer_visible('roof', show_environment);
  this.scene_.set_layer_visible('environment', show_environment);
  this.scene_.set_layer_visible('openings', show_environment);
  this.scene_.set_layer_visible('light_sources', show_environment);

  Object.values(floor_plan.data.groups).forEach((group) => {
    const group_visible = this.get_show_group_(group.group_id);
    this.scene_.set_layer_visible(
      group.group_id,
      group_visible
    );
  });

  this.scene_.set_labels(
    show_environment === true
      ? false
      : this.get_show_labels_()
  );
  this.scene_.set_room_interaction_enabled(show_environment === false);

  this.update_environment_date_visibility_();

  if (this.controls_container_ !== undefined) {
    this.decorate_controls_();
  }
  if (this.legend_container_ !== undefined) {
    this.decorate_legend_();
  }
  if (this.toolbar_container_ !== undefined) {
    this.decorate_toolbar_();
  }
  if (this.scene_settings_container_ !== undefined) {
    this.decorate_scene_settings_panel_();
  }
  this.update_fps_visibility_();
};

/**
 * Decorate environment date controls.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_environment_date_ = function(parent) {
  const self = this;
  window.clearInterval(this.environment_date_interval_);
  delete this.environment_date_interval_;

  this.environment_date_container_ = parent;
  this.environment_date_container_.innerHTML = '';

  const header = document.createElement('div');
  Object.assign(header.style, {
    'display': 'flex',
    'justify-content': 'space-between',
    'align-items': 'center',
    'margin-bottom': '4px',
    'color': '#fff',
    'font-size': beestat.style.font_size.small
  });
  this.environment_date_container_.appendChild(header);

  this.environment_month_label_ = document.createElement('div');
  Object.assign(this.environment_month_label_.style, {
    'font-weight': beestat.style.font_weight.bold
  });
  header.appendChild(this.environment_month_label_);

  const controls_right = document.createElement('div');
  Object.assign(controls_right.style, {
    'display': 'flex',
    'align-items': 'center',
    'grid-gap': '8px'
  });
  header.appendChild(controls_right);

  this.environment_date_play_tile_ = new beestat.component.tile()
    .set_icon('play')
    .set_size('small')
    .set_shadow(false)
    .set_background_color('transparent')
    .set_text_color('#fff')
    .set_text_hover_color(beestat.style.color.lightblue.light)
    .render($(controls_right));
  this.environment_date_play_tile_.addEventListener('click', function() {
    if (self.environment_date_interval_ === undefined) {
      self.environment_date_play_tile_.set_icon('pause');
      self.environment_date_interval_ = window.setInterval(function() {
        const current = self.environment_date_m_.clone();
        const next = current.add(1, 'day').startOf('day');
        const wrapped = next.year() !== year_start.year() ? year_start.clone() : next;
        const day_index = wrapped.diff(year_start, 'days');
        self.environment_date_slider_.set_value(day_index);
        self.set_environment_date_(wrapped);
      }, 140);
    } else {
      window.clearInterval(self.environment_date_interval_);
      delete self.environment_date_interval_;
      self.environment_date_play_tile_.set_icon('play');
    }
  });

  const today_icon_container = document.createElement('div');
  controls_right.appendChild(today_icon_container);
  new beestat.component.tile()
    .set_icon('calendar-today')
    .set_size('small')
    .set_shadow(false)
    .set_background_color('transparent')
    .set_text_color('#fff')
    .set_text_hover_color(beestat.style.color.lightblue.light)
    .render($(today_icon_container))
    .addEventListener('click', function() {
      const today_date = moment().startOf('day');
      const day_index = today_date.diff(year_start, 'days');
      self.environment_date_slider_.set_value(day_index);
      self.set_environment_date_(today_date);
    });

  const slider_container = document.createElement('div');
  this.environment_date_container_.appendChild(slider_container);

  const year_start = moment().startOf('year');
  const today = moment().startOf('day');
  const day_index_today = today.diff(year_start, 'days');
  const max_day_index = year_start.clone().endOf('year').diff(year_start, 'days');

  this.environment_date_slider_ = new beestat.component.input.range()
    .set_min(0)
    .set_max(max_day_index)
    .set_value(day_index_today)
    .set_background(
      'linear-gradient(90deg, ' +
      beestat.style.color.bluegray.base +
      ' 0% 100%)'
    )
    .render($(slider_container));

  this.environment_date_slider_.addEventListener('input', function() {
    if (self.environment_date_interval_ !== undefined) {
      window.clearInterval(self.environment_date_interval_);
      delete self.environment_date_interval_;
      self.environment_date_play_tile_.set_icon('play');
    }
    const day_index = parseInt(self.environment_date_slider_.get_value(), 10);
    const selected_date = year_start.clone().add(day_index, 'days').startOf('day');
    self.set_environment_date_(selected_date);
  });

  this.set_environment_date_(today);
  this.update_environment_date_visibility_();
};

/**
 * Set the current environment date used for celestial calculations while
 * preserving the current time-of-day.
 *
 * @param {moment} date_m
 */
beestat.component.card.three_d.prototype.set_environment_date_ = function(date_m) {
  if (this.date_m_ === undefined) {
    return;
  }

  this.environment_date_m_ = date_m.clone().startOf('day');
  this.date_m_
    .year(this.environment_date_m_.year())
    .month(this.environment_date_m_.month())
    .date(this.environment_date_m_.date());

  if (this.environment_month_label_ !== undefined) {
    this.environment_month_label_.innerText = this.environment_date_m_.format('MMMM D');
  }

  if (this.scene_ !== undefined) {
    this.scene_.set_date(this.date_m_);
  }

  this.update_sunrise_sunset_markers_();
};

/**
 * Toggle visibility of environment date controls based on environment view.
 */
beestat.component.card.three_d.prototype.update_environment_date_visibility_ = function() {
  if (this.environment_date_container_ === undefined) {
    return;
  }

  const show_environment_controls = this.get_show_environment_();
  this.environment_date_container_.style.display = show_environment_controls ? 'block' : 'none';

  if (show_environment_controls === false && this.environment_date_interval_ !== undefined) {
    window.clearInterval(this.environment_date_interval_);
    delete this.environment_date_interval_;
    if (this.environment_date_play_tile_ !== undefined) {
      this.environment_date_play_tile_.set_icon('play');
    }
  }
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

  const show_environment = this.get_show_environment_();
  if (show_environment === true) {
    range.set_background(
      'linear-gradient(90deg, ' +
      beestat.style.color.bluegray.base +
      ' 0% 100%)'
    );
  } else {
    range.set_background(this.get_chart_gradient_(thermostat_ids));
  }

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
      }, 70);
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
  this.range_container_ = range_container;

  // Sunrise/Sunset markers
  this.sunrise_marker_container_ = document.createElement('div');
  Object.assign(this.sunrise_marker_container_.style, {
    'position': 'absolute',
    'top': '-10px',
    'display': 'none'
  });
  range_container.appendChild(this.sunrise_marker_container_);
  this.sunrise_marker_icon_ = new beestat.component.icon('white_balance_sunny')
    .set_size(16)
    .set_color(beestat.style.color.yellow.base)
    .render($(this.sunrise_marker_container_));

  this.sunset_marker_container_ = document.createElement('div');
  Object.assign(this.sunset_marker_container_.style, {
    'position': 'absolute',
    'top': '-10px',
    'display': 'none'
  });
  range_container.appendChild(this.sunset_marker_container_);
  this.sunset_marker_icon_ = new beestat.component.icon('moon_waning_crescent')
    .set_size(16)
    .set_color(beestat.style.color.purple.base)
    .render($(this.sunset_marker_container_));

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

  this.update_sunrise_sunset_markers_();
};

/**
 * Reposition and retitle sunrise/sunset markers for the current date.
 */
beestat.component.card.three_d.prototype.update_sunrise_sunset_markers_ = function() {
  if (
    this.range_container_ === undefined ||
    this.sunrise_marker_container_ === undefined ||
    this.sunset_marker_container_ === undefined
  ) {
    return;
  }

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (
    floor_plan === undefined ||
    floor_plan.address_id === undefined ||
    floor_plan.address_id === null ||
    beestat.cache.address[floor_plan.address_id] === undefined
  ) {
    this.sunrise_marker_container_.style.display = 'none';
    this.sunset_marker_container_.style.display = 'none';
    return;
  }

  const address = beestat.cache.address[floor_plan.address_id];
  const times = SunCalc.getTimes(
    this.date_m_.toDate(),
    address.normalized.metadata.latitude,
    address.normalized.metadata.longitude
  );

  const sunrise_m = moment(times.sunrise);
  const sunrise_percentage = ((sunrise_m.hours() * 60) + sunrise_m.minutes()) / 1440 * 100;
  this.sunrise_marker_container_.style.left = `${sunrise_percentage}%`;
  this.sunrise_marker_container_.style.display = 'block';
  this.sunrise_marker_container_.setAttribute('title', 'Sunrise @ ' + sunrise_m.format('h:mm'));

  const sunset_m = moment(times.sunset);
  const sunset_percentage = ((sunset_m.hours() * 60) + sunset_m.minutes()) / 1440 * 100;
  this.sunset_marker_container_.style.left = `${sunset_percentage}%`;
  this.sunset_marker_container_.style.display = 'block';
  this.sunset_marker_container_.setAttribute('title', 'Sunset @ ' + sunset_m.format('h:mm'));
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
 * FPS ticker.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_fps_ticker_ = function(parent) {
  const self = this;
  this.fps_container_ = parent;

  const set_text = function() {
    const fps = (
      self.scene_ !== undefined &&
      typeof self.scene_.get_fps === 'function'
    )
      ? self.scene_.get_fps()
      : 0;
    self.fps_container_.innerText = fps + ' FPS';
  };

  set_text();
  window.clearInterval(this.fps_interval_);
  this.fps_interval_ = window.setInterval(set_text, 250);
};

/**
 * Show FPS only while scene settings are open.
 */
beestat.component.card.three_d.prototype.update_fps_visibility_ = function() {
  if (this.fps_container_ === undefined) {
    return;
  }

  const show = (
    this.get_show_environment_() === true &&
    this.scene_settings_menu_open_ === true
  );
  this.fps_container_.style.display = show ? 'block' : 'none';
};

/**
 * Toolbar.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.three_d.prototype.decorate_toolbar_ = function(parent) {
  const self = this;
  if (parent !== undefined) {
    this.toolbar_container_ = parent;
  }
  this.toolbar_container_.innerHTML = '';

  // Build the primary toolbar tile group.
  const tile_group = new beestat.component.tile_group();

  // Add floor
  tile_group.add_tile(new beestat.component.tile()
    .set_icon('layers')
    .set_shadow(false)
    .set_text_color(beestat.style.color.lightblue.base)
  );

  const show_environment = this.get_show_environment_();

  // View mode toggle (floor plan vs environment).
  // Toggle between environment view and floor plan view.
  if (beestat.user.has_early_access() === true) {
    const view_toggle_tile = new beestat.component.tile()
      .set_icon(show_environment === false ? 'floor_plan' : 'home')
      .set_title('Toggle View')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function(e) {
        e.stopPropagation();
        const new_value = !self.get_show_environment_();
        self.set_show_environment_(new_value);

        this.set_icon(new_value ? 'home' : 'floor_plan');
        self.apply_layer_visibility_();
      });

    tile_group.add_tile(view_toggle_tile);
  }

  // Auto-rotate
  tile_group.add_tile(new beestat.component.tile()
    .set_icon(this.get_auto_rotate_() === false ? 'restart_off' : 'restart')
    .set_title('Toggle Auto-Rotate')
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function(e) {
      e.stopPropagation();
      const next_auto_rotate = self.get_auto_rotate_() !== true;
      self.set_auto_rotate_(next_auto_rotate);
      this.set_icon(
        'restart' + (next_auto_rotate === true ? '' : '_off')
      );
      self.scene_.set_auto_rotate(next_auto_rotate);
    })
  );

  // Weather controls (environment view only)
  if (show_environment === true) {
    const selected_mode = this.get_weather_();

    tile_group.add_tile(new beestat.component.tile()
      .set_icon(this.get_weather_icon_from_mode_(selected_mode))
      .set_title('Weather')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(this.weather_menu_open_ === true ? beestat.style.color.lightblue.base : beestat.style.color.bluegray.base)
      .set_background_hover_color(this.weather_menu_open_ === true ? beestat.style.color.lightblue.light : beestat.style.color.bluegray.light)
      .addEventListener('click', function(e) {
        e.stopPropagation();
        self.weather_menu_open_ = self.weather_menu_open_ !== true;
        self.decorate_toolbar_();
      })
    );
  }

  if (show_environment === true) {
    tile_group.add_tile(new beestat.component.tile()
      .set_icon('tune')
      .set_title('Scene Settings')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(this.scene_settings_menu_open_ === true ? beestat.style.color.lightblue.base : beestat.style.color.bluegray.base)
      .set_background_hover_color(this.scene_settings_menu_open_ === true ? beestat.style.color.lightblue.light : beestat.style.color.bluegray.light)
      .addEventListener('click', function(e) {
        e.stopPropagation();
        self.scene_settings_menu_open_ = self.scene_settings_menu_open_ !== true;
        self.decorate_toolbar_();
        self.decorate_scene_settings_panel_();
        self.update_fps_visibility_();
      })
    );
  }

  // Labels (hidden while environment view is on)
  if (show_environment === false) {
    tile_group.add_tile(new beestat.component.tile()
      .set_icon(this.get_show_labels_() === false ? 'label_off' : 'label')
      .set_title('Toggle Labels')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function(e) {
        e.stopPropagation();
        const next_show_labels = self.get_show_labels_() !== true;
        self.set_show_labels_(next_show_labels);
        this.set_icon(
          'label' + (next_show_labels === true ? '' : '_off')
        );
        self.scene_.set_labels(next_show_labels);
      })
    );
  }

  tile_group.render($(this.toolbar_container_));

  // Render weather quick-select popup anchored to the Weather tile.
  if (show_environment === true && this.weather_menu_open_ === true) {
    const weather_tile_element = this.toolbar_container_.querySelector('[title=\"Weather\"]');
    if (weather_tile_element !== null) {
      const toolbar_rect = this.toolbar_container_.getBoundingClientRect();
      const weather_tile_rect = weather_tile_element.getBoundingClientRect();
      const selected_mode = this.get_weather_();
      const weather_modes = this.get_weather_mode_tiles_();

      const popup = document.createElement('div');
      Object.assign(popup.style, {
        'position': 'absolute',
        'left': `${Math.round(weather_tile_rect.right - toolbar_rect.left + 6)}px`,
        'top': `${Math.round(weather_tile_rect.top - toolbar_rect.top - 2)}px`,
        'display': 'flex',
        'flex-direction': 'row',
        'align-items': 'center',
        'grid-gap': '4px',
        'padding': '2px'
      });
      this.toolbar_container_.appendChild(popup);

      weather_modes.forEach((mode) => {
        const is_selected = mode.value === selected_mode;
        const tile = new beestat.component.tile()
          .set_icon(mode.icon)
          .set_title(mode.title)
          .set_text_color(is_selected ? beestat.style.color.gray.dark : beestat.style.color.gray.light)
          .set_background_color(is_selected ? beestat.style.color.bluegray.light : beestat.style.color.bluegray.base)
          .set_background_hover_color(is_selected ? beestat.style.color.bluegray.light : beestat.style.color.bluegray.light);

        if (is_selected === false) {
          tile.addEventListener('click', (e) => {
            e.stopPropagation();
            this.set_weather_(mode.value);
            this.apply_weather_setting_to_scene_(true);
            this.weather_menu_open_ = false;
            this.decorate_toolbar_();
          });
        }

        tile.render($(popup));
      });

      const auto_selected = selected_mode === 'auto';
      const auto_tile = new beestat.component.tile()
        .set_text('Auto')
        .set_title('Weather: Auto')
        .set_text_color(auto_selected ? beestat.style.color.gray.dark : beestat.style.color.gray.light)
        .set_background_color(auto_selected ? beestat.style.color.bluegray.light : beestat.style.color.bluegray.base)
        .set_background_hover_color(beestat.style.color.bluegray.light);

      if (auto_selected === false) {
        auto_tile.addEventListener('click', (e) => {
          e.stopPropagation();
          this.set_weather_('auto');
          this.apply_weather_setting_to_scene_(true);
          this.weather_menu_open_ = false;
          this.decorate_toolbar_();
        });
      }

      auto_tile.render($(popup));
    }
  }
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
      return (a.elevation || 0) - (b.elevation || 0);
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

    button
      .set_icon(icon + (self.get_show_group_(group.group_id) === false ? '' : '_box'))
      .addEventListener('click', function() {
        const next_visible = self.get_show_group_(group.group_id) !== true;
        self.set_show_group_(group.group_id, next_visible);
        self.scene_.set_layer_visible(group.group_id, next_visible);
        this.set_icon(
          icon + (next_visible === true ? '_box' : '')
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

  // Hide runtime gradient legend in environment view.
  if (this.get_show_environment_() === true) {
    this.legend_container_.innerHTML = '';
    this.legend_container_.style.display = 'none';
    return;
  }

  this.legend_container_.style.display = 'block';
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
 * @return {object} The data.
 */
beestat.component.card.three_d.prototype.get_data_ = function() {
  const self = this;
  if (this.data_ === undefined) {
    // Initialize sensor/thermostat inclusion maps and output containers.
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

    // Fold raw sensor runtime rows into per-sensor/per-minute series buckets.
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

    // Fold thermostat runtime rows into per-thermostat/per-minute equipment series.
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

    // Average each minute bucket and update global min/max metadata.
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
  this.scene_settings_values_ = undefined;

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

/**
 * Get the most recent data timestamp available for the active sensor set.
 *
 * @return {moment}
 */
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

/**
 * Remove global listeners registered by this card instance.
 */
beestat.component.card.three_d.prototype.remove_global_listeners_ = function() {
  beestat.dispatcher.removeEventListener(
    'setting.visualize.data_type',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'setting.visualize.heat_map_values',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'setting.visualize.heat_map_static.temperature.min',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'setting.visualize.heat_map_static.temperature.max',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'setting.visualize.heat_map_static.occupancy.min',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'setting.visualize.heat_map_static.occupancy.max',
    this.handle_scene_settings_change_
  );
  beestat.dispatcher.removeEventListener(
    'cache.floor_plan',
    this.handle_floor_plan_cache_change_
  );
  beestat.dispatcher.removeEventListener(
    'cache.data.three_d__runtime_sensor',
    this.handle_runtime_data_change_
  );
  beestat.dispatcher.removeEventListener(
    'cache.data.three_d__runtime_thermostat',
    this.handle_runtime_data_change_
  );
  beestat.dispatcher.removeEventListener(
    'cache.thermostat',
    this.handle_thermostat_cache_change_
  );
  beestat.dispatcher.removeEventListener('resize.three_d');
};

/**
 * Shared teardown path for stale-instance disposal and normal disposal.
 */
beestat.component.card.three_d.prototype.teardown_ = function() {
  if (this.rerender_timeout_id_ !== undefined) {
    window.clearTimeout(this.rerender_timeout_id_);
    this.rerender_timeout_id_ = undefined;
    this.rerender_pending_delay_ms_ = undefined;
  }
  this.rerender_waiting_for_visibility_ = false;
  if (this.visibility_observer_ !== undefined) {
    this.visibility_observer_.disconnect();
    this.visibility_observer_ = undefined;
  }
  this.hide_loading_();
  window.clearInterval(this.fps_interval_);
  delete this.fps_interval_;
  this.remove_global_listeners_();

  if (this.scene_ !== undefined) {
    this.scene_.dispose();
    delete this.scene_;
  }
};

/**
 * Force teardown for stale card instances that were not formally disposed.
 */
beestat.component.card.three_d.prototype.force_dispose_stale_instance_ = function() {
  if (this.disposed_ === true) {
    return;
  }

  this.disposed_ = true;
  this.teardown_();
};

/**
 * Dispose.
 */
beestat.component.card.three_d.prototype.dispose = function() {
  this.disposed_ = true;
  this.teardown_();
  if (beestat.component.card.three_d.active_instance_ === this) {
    delete beestat.component.card.three_d.active_instance_;
  }

  beestat.component.card.prototype.dispose.apply(this, arguments);
};
