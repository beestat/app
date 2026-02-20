/**
 * Scene methods split from scene.js.
 */


/**
 * Set weather on the floor-plan appearance.
 *
 * @param {string} weather none|sunny|cloudy|rain|snow
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_weather = function(weather) {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (floor_plan.data.appearance === undefined) {
    floor_plan.data.appearance = {};
  }
  floor_plan.data.appearance.weather = weather;
  this.update_weather_targets_();

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};


/**
 * Get weather transition profile for visuals.
 *
 * @param {string} weather
 *
 * @return {object}
 */
beestat.component.scene.prototype.get_weather_profile_ = function(weather) {
  switch (weather) {
  case 'snow':
    return {
      'cloud_count': beestat.component.scene.weather_cloud_max_count,
      'rain_count': 0,
      'snow_count': beestat.component.scene.weather_snow_max_count
    };
  case 'rain':
    return {
      'cloud_count': Math.round(beestat.component.scene.weather_cloud_max_count * 0.92),
      'rain_count': beestat.component.scene.weather_rain_max_count,
      'snow_count': 0
    };
  case 'cloudy':
    return {
      'cloud_count': Math.round(beestat.component.scene.weather_cloud_max_count * 0.72),
      'rain_count': 0,
      'snow_count': 0
    };
  case 'sunny':
  case 'none':
  default:
    return {
      'cloud_count': 0,
      'rain_count': 0,
      'snow_count': 0
    };
  }
};


/**
 * Get dimming multiplier from active cloud density for sun/moon brightness.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_cloud_dimming_factor_ = function() {
  const current_cloud_count = this.current_cloud_count_ === undefined
    ? 0
    : this.current_cloud_count_;
  const cloud_density = Math.max(
    0,
    Math.min(
      1,
      current_cloud_count / beestat.component.scene.weather_cloud_max_count
    )
  );

  return 1 - (cloud_density * 0.92);
};


/**
 * Update weather transition targets based on appearance weather.
 */
beestat.component.scene.prototype.update_weather_targets_ = function() {
  this.weather_profile_target_ = this.get_weather_profile_(this.get_appearance_value_('weather'));

  this.weather_transition_start_profile_ = {
    'cloud_count': this.current_cloud_count_ === undefined ? 0 : this.current_cloud_count_,
    'rain_count': this.current_rain_count_ === undefined ? 0 : this.current_rain_count_,
    'snow_count': this.current_snow_count_ === undefined ? 0 : this.current_snow_count_
  };
  this.weather_transition_start_ms_ = window.performance.now();
};


/**
 * Get current snow cover blend amount (0-1) from precipitation transition.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_snow_cover_blend_ = function() {
  if (
    this.current_snow_count_ === undefined ||
    beestat.component.scene.weather_snow_max_count <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      this.current_snow_count_ / beestat.component.scene.weather_snow_max_count
    )
  );
};


/**
 * Blend roof, ground, and floor-plan surface materials toward snow white.
 *
 * @param {number} snow_blend
 */
beestat.component.scene.prototype.update_snow_surface_colors_ = function(snow_blend) {
  if (this.layers_ === undefined) {
    return;
  }

  // Keep a small amount of base color visible at peak snow for definition.
  const normalized_blend = Math.max(0, Math.min(1, snow_blend));
  const blend = normalized_blend * 0.9;
  const foliage_blend = normalized_blend * 0.75;
  const snow_color = new THREE.Color(beestat.component.scene.snow_surface_color);
  const base_roof_color = new THREE.Color(this.get_appearance_value_('roof_color'));
  const base_ground_color = new THREE.Color(this.get_appearance_value_('ground_color'));

  const roof_color = base_roof_color.clone().lerp(snow_color, blend);
  const ground_color = base_ground_color.clone().lerp(snow_color, blend);

  if (this.layers_.roof !== undefined) {
    this.layers_.roof.traverse(function(object) {
      if (
        object.userData !== undefined &&
        object.userData.is_roof === true &&
        object.material !== undefined &&
        object.material.color !== undefined
      ) {
        object.material.color.copy(roof_color);
      }
    });
  }

  if (this.layers_.environment !== undefined) {
    this.layers_.environment.traverse(function(object) {
      if (
        object.userData !== undefined &&
        object.userData.is_ground === true &&
        object.material !== undefined &&
        object.material.color !== undefined
      ) {
        object.material.color.copy(ground_color);
      }

      if (
        object.userData !== undefined &&
        object.userData.is_surface === true &&
        object.material !== undefined &&
        object.material.color !== undefined
      ) {
        const base_surface_color = new THREE.Color(
          object.userData.base_surface_color || object.material.color.getHex()
        );
        const surface_color = base_surface_color.clone().lerp(snow_color, blend);
        object.material.color.copy(surface_color);
      }

      if (
        object.userData !== undefined &&
        object.userData.is_tree_foliage === true &&
        object.material !== undefined &&
        object.material.color !== undefined
      ) {
        const base_foliage_color = new THREE.Color(
          object.userData.base_tree_foliage_color || object.material.color.getHex()
        );
        const foliage_color = base_foliage_color.clone().lerp(snow_color, foliage_blend);
        object.material.color.copy(foliage_color);
      }
    });
  }
};


/**
 * Create a precipitation particle system with static particle properties.
 *
 * @param {object} bounds
 * @param {number} max_count
 * @param {object} config
 *
 * @return {object}
 */
beestat.component.scene.prototype.create_precipitation_system_ = function(bounds, max_count, config) {
  const positions = new Float32Array(max_count * 3);
  const speeds = new Float32Array(max_count);
  const drift_x = new Float32Array(max_count);
  const drift_y = new Float32Array(max_count);

  const span_x = bounds.max_x - bounds.min_x;
  const span_y = bounds.max_y - bounds.min_y;
  const span_z = bounds.max_z - bounds.min_z;

  for (let i = 0; i < max_count; i++) {
    const offset = i * 3;
    positions[offset] = bounds.min_x + Math.random() * span_x;
    positions[offset + 1] = bounds.min_y + Math.random() * span_y;
    positions[offset + 2] = bounds.min_z + Math.random() * span_z;

    speeds[i] = config.speed_min + Math.random() * (config.speed_max - config.speed_min);
    drift_x[i] = (Math.random() - 0.5) * config.drift;
    drift_y[i] = (Math.random() - 0.5) * config.drift;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);

  const material = new THREE.PointsMaterial({
    'size': config.size,
    'color': config.color,
    'transparent': true,
    'opacity': 0,
    'depthWrite': false,
    'blending': THREE.NormalBlending,
    'map': config.texture
  });

  const points = new THREE.Points(geometry, material);
  points.layers.set(beestat.component.scene.layer_visible);
  points.userData.is_environment = true;

  return {
    'points': points,
    'bounds': bounds,
    'speeds': speeds,
    'drift_x': drift_x,
    'drift_y': drift_y,
    'max_count': max_count,
    'target_opacity': config.opacity
  };
};


/**
 * Update a precipitation system by particle volume only.
 *
 * @param {object} precipitation
 * @param {number} target_count
 * @param {number} delta_seconds
 */
beestat.component.scene.prototype.update_precipitation_system_ = function(precipitation, target_count, delta_seconds) {
  if (
    precipitation === undefined ||
    precipitation.points === undefined ||
    precipitation.points.geometry === undefined ||
    precipitation.points.material === undefined
  ) {
    return;
  }

  const clamped_count = Math.max(
    0,
    Math.min(precipitation.max_count, Math.round(target_count))
  );
  precipitation.points.geometry.setDrawRange(0, clamped_count);

  if (precipitation.max_count > 0) {
    precipitation.points.material.opacity =
      precipitation.target_opacity * (clamped_count / precipitation.max_count);
  } else {
    precipitation.points.material.opacity = 0;
  }

  if (clamped_count === 0) {
    return;
  }

  const bounds = precipitation.bounds;
  const span_x = bounds.max_x - bounds.min_x;
  const span_y = bounds.max_y - bounds.min_y;
  const span_z = bounds.max_z - bounds.min_z;
  const positions = precipitation.points.geometry.attributes.position.array;

  for (let i = 0; i < clamped_count; i++) {
    const offset = i * 3;
    positions[offset + 2] += precipitation.speeds[i] * delta_seconds;
    positions[offset] += precipitation.drift_x[i] * delta_seconds;
    positions[offset + 1] += precipitation.drift_y[i] * delta_seconds;

    if (
      positions[offset] < bounds.min_x ||
      positions[offset] > bounds.max_x ||
      positions[offset + 1] < bounds.min_y ||
      positions[offset + 1] > bounds.max_y ||
      positions[offset + 2] > bounds.max_z
    ) {
      positions[offset] = bounds.min_x + Math.random() * span_x;
      positions[offset + 1] = bounds.min_y + Math.random() * span_y;
      positions[offset + 2] = bounds.min_z + Math.random() * span_z;
    }
  }

  precipitation.points.geometry.attributes.position.needsUpdate = true;
};


/**
 * Add procedural weather particles based on floor plan appearance.
 *
 * @param {number} center_x
 * @param {number} center_y
 * @param {number} plan_width
 * @param {number} plan_height
 */
beestat.component.scene.prototype.add_weather_ = function(center_x, center_y, plan_width, plan_height) {
  const padding = beestat.component.scene.environment_padding + 120;
  const bounds = {
    'min_x': center_x - ((plan_width + padding * 2) / 2),
    'max_x': center_x + ((plan_width + padding * 2) / 2),
    'min_y': center_y - ((plan_height + padding * 2) / 2),
    'max_y': center_y + ((plan_height + padding * 2) / 2),
    'min_z': -780,
    'max_z': 140
  };

  this.weather_group_ = new THREE.Group();
  this.weather_group_.userData.is_environment = true;
  this.environment_group_.add(this.weather_group_);

  if (this.cloud_texture_ === undefined) {
    this.cloud_texture_ = this.create_cloud_texture_();
  }

  if (this.snow_particle_texture_ === undefined) {
    this.snow_particle_texture_ = this.create_snow_particle_texture_();
  }
  if (this.rain_particle_texture_ === undefined) {
    this.rain_particle_texture_ = this.create_rain_particle_texture_();
  }

  const cloud_count = beestat.component.scene.weather_cloud_max_count;
  const cloud_opacity = 0.2;
  const cloud_bounds = {
    'min_x': bounds.min_x - 260,
    'max_x': bounds.max_x + 260,
    'min_y': bounds.min_y - 260,
    'max_y': bounds.max_y + 260,
    'z': -760
  };

  this.cloud_bounds_ = cloud_bounds;
  this.cloud_sprites_ = [];
  this.cloud_motion_ = [];

  for (let i = 0; i < cloud_count; i++) {
    const cloud_material = new THREE.SpriteMaterial({
      'map': this.cloud_texture_,
      'color': 0xdce3ee,
      'transparent': true,
      'opacity': 0,
      'depthWrite': false,
      'depthTest': true
    });

    const cloud = new THREE.Sprite(cloud_material);
    cloud.position.set(
      cloud_bounds.min_x + Math.random() * (cloud_bounds.max_x - cloud_bounds.min_x),
      cloud_bounds.min_y + Math.random() * (cloud_bounds.max_y - cloud_bounds.min_y),
      cloud_bounds.z + (Math.random() * 130)
    );
    const cloud_size = 520 + Math.random() * 560;
    cloud.scale.set(cloud_size, cloud_size * 0.6, 1);
    cloud.layers.set(beestat.component.scene.layer_visible);
    cloud.userData.is_environment = true;
    this.weather_group_.add(cloud);
    this.cloud_sprites_.push(cloud);
    this.cloud_motion_.push({
      'base_x': cloud.position.x,
      'base_y': cloud.position.y,
      'base_z': cloud.position.z,
      'base_scale_x': cloud.scale.x,
      'base_scale_y': cloud.scale.y,
      'base_opacity': cloud_opacity,
      'phase': Math.random() * Math.PI * 2,
      'pulse_speed': 0.36 + (Math.random() * 0.32),
      'scale_wobble_x': 0.03 + (Math.random() * 0.03),
      'scale_wobble_y': 0.025 + (Math.random() * 0.025),
      'opacity_wobble': 0.05 + (Math.random() * 0.05),
      'wiggle_x': 10 + (Math.random() * 16),
      'wiggle_y': 8 + (Math.random() * 14),
      'wiggle_z': 3 + (Math.random() * 5),
      'wiggle_freq_x': 1.8 + (Math.random() * 1.6),
      'wiggle_freq_y': 1.5 + (Math.random() * 1.3),
      'wiggle_freq_z': 1.2 + (Math.random() * 1.1)
    });
  }

  this.rain_particles_ = this.create_precipitation_system_(
    bounds,
    beestat.component.scene.weather_rain_max_count,
    {
      'size': 11,
      'color': 0xa8c7ff,
      'opacity': 0.7,
      'speed_min': 280,
      'speed_max': 430,
      'drift': 28,
      'texture': this.rain_particle_texture_
    }
  );
  this.weather_group_.add(this.rain_particles_.points);

  this.snow_particles_ = this.create_precipitation_system_(
    bounds,
    beestat.component.scene.weather_snow_max_count,
    {
      'size': 10,
      'color': 0xffffff,
      'opacity': 0.75,
      'speed_min': 18,
      'speed_max': 44,
      'drift': 12,
      'texture': this.snow_particle_texture_
    }
  );
  this.weather_group_.add(this.snow_particles_.points);

  this.weather_last_update_ms_ = window.performance.now();

  const initial_weather_profile = this.get_weather_profile_(this.get_appearance_value_('weather'));
  this.weather_profile_target_ = initial_weather_profile;
  this.current_cloud_count_ = initial_weather_profile.cloud_count;
  this.current_rain_count_ = initial_weather_profile.rain_count;
  this.current_snow_count_ = initial_weather_profile.snow_count;
  this.update_weather_targets_();
  this.update_snow_surface_colors_(this.get_snow_cover_blend_());
};


/**
 * Animate weather particles (snow/rain) each frame.
 */
beestat.component.scene.prototype.update_weather_ = function() {
  const now_ms = window.performance.now();
  if (this.weather_last_update_ms_ === undefined) {
    this.weather_last_update_ms_ = now_ms;
    return;
  }

  const delta_seconds = Math.min(0.05, (now_ms - this.weather_last_update_ms_) / 1000);
  this.weather_last_update_ms_ = now_ms;
  if (delta_seconds <= 0) {
    return;
  }

  if (this.weather_profile_target_ === undefined) {
    this.update_weather_targets_();
  }

  if (this.weather_transition_start_profile_ === undefined) {
    this.weather_transition_start_profile_ = {
      'cloud_count': this.current_cloud_count_ === undefined ? 0 : this.current_cloud_count_,
      'rain_count': this.current_rain_count_ === undefined ? 0 : this.current_rain_count_,
      'snow_count': this.current_snow_count_ === undefined ? 0 : this.current_snow_count_
    };
  }
  if (this.weather_transition_start_ms_ === undefined) {
    this.weather_transition_start_ms_ = now_ms;
  }

  const transition_duration_ms = Math.max(
    1,
    beestat.component.scene.weather_transition_seconds * 1000
  );
  const transition_t = Math.max(
    0,
    Math.min(
      1,
      (now_ms - this.weather_transition_start_ms_) / transition_duration_ms
    )
  );

  const transition = function(start, target) {
    return start + ((target - start) * transition_t);
  };

  this.current_cloud_count_ = transition(
    this.weather_transition_start_profile_.cloud_count,
    this.weather_profile_target_.cloud_count
  );
  this.current_rain_count_ = transition(
    this.weather_transition_start_profile_.rain_count,
    this.weather_profile_target_.rain_count
  );
  this.current_snow_count_ = transition(
    this.weather_transition_start_profile_.snow_count,
    this.weather_profile_target_.snow_count
  );

  if (this.cloud_sprites_ !== undefined && this.cloud_motion_ !== undefined) {
    const now_seconds = now_ms / 1000;
    const cloud_density = Math.max(
      0,
      Math.min(
        1,
        this.current_cloud_count_ / beestat.component.scene.weather_cloud_max_count
      )
    );
    for (let i = 0; i < this.cloud_sprites_.length; i++) {
      const sprite = this.cloud_sprites_[i];
      const motion = this.cloud_motion_[i];
      const phase = now_seconds * motion.pulse_speed + motion.phase;

      // Shape/size breathing plus transition growth/shrink.
      const scale_x_wobble = 1 + (Math.sin(phase) * motion.scale_wobble_x);
      const scale_y_wobble = 1 + (Math.cos(phase * 0.87) * motion.scale_wobble_y);
      const cloud_scale_transition = 0.72 + (0.28 * cloud_density);
      sprite.scale.set(
        motion.base_scale_x * scale_x_wobble * cloud_scale_transition,
        motion.base_scale_y * scale_y_wobble * cloud_scale_transition,
        1
      );

      // Subtle random-looking positional wiggle.
      sprite.position.x = motion.base_x + Math.sin(phase * motion.wiggle_freq_x) * motion.wiggle_x;
      sprite.position.y = motion.base_y + Math.cos(phase * motion.wiggle_freq_y) * motion.wiggle_y;
      sprite.position.z = motion.base_z + Math.sin(phase * motion.wiggle_freq_z) * motion.wiggle_z;

      // Slight opacity shifting.
      if (sprite.material !== undefined) {
        sprite.material.opacity = Math.max(
          0,
          Math.min(
            1,
            (motion.base_opacity + Math.sin(phase * 0.72) * motion.opacity_wobble) * cloud_density
          )
        );
      }
    }
  }

  this.update_precipitation_system_(this.rain_particles_, this.current_rain_count_, delta_seconds);
  this.update_precipitation_system_(this.snow_particles_, this.current_snow_count_, delta_seconds);
  this.update_snow_surface_colors_(this.get_snow_cover_blend_());

  if (
    this.date_ !== undefined &&
    this.latitude_ !== undefined &&
    this.longitude_ !== undefined &&
    this.sun_light_ !== undefined &&
    this.moon_light_ !== undefined
  ) {
    this.update_celestial_lights_(this.date_, this.latitude_, this.longitude_);
  }
};

