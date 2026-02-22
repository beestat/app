/**
 * Scene methods split from scene.js.
 */


/**
 * Get design count at density 1 for a weather channel.
 *
 * @param {string} density_key
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_weather_design_count_ = function(density_key) {
  switch (density_key) {
  case 'cloud_density':
    return Math.max(1, Number(beestat.component.scene.weather_cloud_max_count || 1));
  case 'rain_density':
    return Math.max(1, Number(beestat.component.scene.weather_rain_max_count || 1));
  case 'snow_density':
    return Math.max(1, Number(beestat.component.scene.weather_snow_max_count || 1));
  default:
    return 1;
  }
};

/**
 * Get design capacity count (density 1) for a weather channel and area.
 *
 * @param {string} density_key
 * @param {number=} opt_area
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_weather_design_capacity_count_ = function(density_key, opt_area) {
  const design_count = this.get_weather_design_count_(density_key);
  const area = Math.max(
    1,
    Number(opt_area || this.weather_area_ || beestat.component.scene.weather_density_unit_area)
  );
  const unit_area = Math.max(1, Number(beestat.component.scene.weather_density_unit_area || 1));
  return Math.max(0, Math.round(design_count * (area / unit_area)));
};

/**
 * Convert density setting to particle count using scene area.
 *
 * @param {string} density_key
 * @param {number=} opt_area
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_weather_count_from_density_ = function(density_key, opt_area) {
  const density = Math.max(0, Number(this.get_scene_setting_(density_key) || 0));
  const design_count = this.get_weather_design_count_(density_key);
  const area = Math.max(
    1,
    Number(opt_area || this.weather_area_ || beestat.component.scene.weather_density_unit_area)
  );
  const unit_area = Math.max(1, Number(beestat.component.scene.weather_density_unit_area || 1));

  return Math.max(0, Math.round(design_count * density * (area / unit_area)));
};

/**
 * Get weather transition profile for visuals.
 *
 * @return {object}
 */
beestat.component.scene.prototype.get_weather_profile_ = function() {
  return {
    'cloud_count': this.get_weather_count_from_density_('cloud_density'),
    'rain_count': this.get_weather_count_from_density_('rain_density'),
    'snow_count': this.get_weather_count_from_density_('snow_density')
  };
};


/**
 * Get dimming multiplier from active cloud density for sun/moon brightness.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_cloud_dimming_factor_ = function() {
  const configured_cloud_count = Math.max(
    1,
    this.get_weather_design_capacity_count_('cloud_density')
  );
  const current_cloud_count = this.current_cloud_count_ === undefined
    ? 0
    : this.current_cloud_count_;
  const cloud_density = Math.max(
    0,
    Math.min(
      1,
      current_cloud_count / configured_cloud_count
    )
  );

  return 1 - (cloud_density * 0.92);
};


/**
 * Get cloud sprite color based on cloud darkness setting.
 *
 * @return {THREE.Color}
 */
beestat.component.scene.prototype.get_cloud_color_ = function() {
  const darkness = Math.max(0, Math.min(2, Number(this.get_scene_setting_('cloud_darkness') || 0)));
  const blend = darkness / 2;
  const base_color = new THREE.Color(0xdce3ee);
  const dark_gray_color = new THREE.Color(0x67717b);
  return base_color.lerp(dark_gray_color, blend);
};


/**
 * Update weather transition targets based on appearance weather.
 */
beestat.component.scene.prototype.update_weather_targets_ = function() {
  this.weather_profile_target_ = this.get_weather_profile_();

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
  const configured_snow_count = this.get_weather_design_capacity_count_('snow_density');
  if (
    this.current_snow_count_ === undefined ||
    configured_snow_count <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      this.current_snow_count_ / configured_snow_count
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
    'target_opacity': config.opacity,
    'static_opacity': config.static_opacity === true,
    'max_wind_angle': config.max_wind_angle || 0,
    'max_wind_speed_scale': config.max_wind_speed_scale || 2,
    'wind_motion_multiplier': config.wind_motion_multiplier || 1
  };
};


/**
 * Update a precipitation system by particle volume only.
 *
 * @param {object} precipitation
 * @param {number} target_count
 * @param {number} delta_seconds
 * @param {number} wind_speed
 * @param {number} wind_direction
 */
beestat.component.scene.prototype.update_precipitation_system_ = function(
  precipitation,
  target_count,
  delta_seconds,
  wind_speed,
  wind_direction
) {
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

  if (precipitation.static_opacity === true) {
    precipitation.points.material.opacity = precipitation.target_opacity;
  } else if (precipitation.max_count > 0) {
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
  const clamped_wind_speed = Math.max(0, Math.min(2, Number(wind_speed || 0)));
  const clamped_wind_direction = Math.max(0, Math.min(360, Number(wind_direction || 0)));
  const wind_direction_radians = THREE.MathUtils.degToRad(clamped_wind_direction);
  const wind_x = Math.cos(wind_direction_radians);
  const wind_y = Math.sin(wind_direction_radians);
  const max_wind_angle = Number(precipitation.max_wind_angle || 0);
  const wind_angle = (clamped_wind_speed / 2) * max_wind_angle;
  const wind_angle_radians = THREE.MathUtils.degToRad(wind_angle);
  const vertical_scale = Math.cos(wind_angle_radians);
  const horizontal_scale = Math.sin(wind_angle_radians);
  const max_wind_speed_scale = Math.max(
    1,
    Number(precipitation.max_wind_speed_scale || 2)
  );
  const wind_speed_scale = 1 + ((clamped_wind_speed / 2) * (max_wind_speed_scale - 1));
  const wind_motion_multiplier = Math.max(0, Number(precipitation.wind_motion_multiplier || 1));
  const direction_velocity_x = horizontal_scale * wind_x;
  const direction_velocity_y = horizontal_scale * wind_y;
  const direction_velocity_z = vertical_scale;

  for (let i = 0; i < clamped_count; i++) {
    const offset = i * 3;
    const speed = precipitation.speeds[i] * delta_seconds * wind_speed_scale * wind_motion_multiplier;
    positions[offset + 2] += speed * direction_velocity_z;
    positions[offset] += speed * direction_velocity_x;
    positions[offset + 1] += speed * direction_velocity_y;
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
 * Ensure the lightning flash light exists in the weather group.
 */
beestat.component.scene.prototype.ensure_lightning_flash_light_ = function() {
  if (this.weather_group_ === undefined) {
    return;
  }
  if (this.lightning_flash_light_ !== undefined) {
    return;
  }

  this.lightning_flash_light_ = new THREE.PointLight(0xe7f0ff, 0, 7000, 2);
  this.lightning_flash_light_.castShadow = false;
  this.lightning_flash_light_.userData.is_environment = true;
  this.weather_group_.add(this.lightning_flash_light_);
};


/**
 * Schedule the next lightning strike-cluster timestamp.
 *
 * @param {number} now_ms
 * @param {number} lightning_frequency
 */
beestat.component.scene.prototype.schedule_next_lightning_cluster_ = function(now_ms, lightning_frequency) {
  if (lightning_frequency <= 0) {
    this.lightning_next_strike_ms_ = undefined;
    return;
  }

  const base_interval_ms = 15000 / lightning_frequency;
  const jitter_ratio = 0.25;
  const jitter = ((Math.random() * 2) - 1) * base_interval_ms * jitter_ratio;
  const next_interval_ms = Math.max(300, base_interval_ms + jitter);
  this.lightning_next_strike_ms_ = now_ms + next_interval_ms;
};


/**
 * Sync lightning timing state after lightning frequency changes without rerender.
 *
 * @param {number} previous_frequency
 * @param {number} current_frequency
 */
beestat.component.scene.prototype.sync_lightning_schedule_for_frequency_change_ = function(
  previous_frequency,
  current_frequency
) {
  const previous = Math.max(0, Math.min(2, Number(previous_frequency || 0)));
  const current = Math.max(0, Math.min(2, Number(current_frequency || 0)));
  const now_ms = window.performance.now();

  if (current <= 0) {
    if (this.lightning_flash_light_ !== undefined) {
      this.lightning_flash_light_.intensity = 0;
    }
    this.lightning_flash_remaining_s_ = 0;
    this.lightning_next_strike_ms_ = undefined;
    this.lightning_next_pulse_ms_ = undefined;
    this.lightning_cluster_pulses_remaining_ = 0;
    this.lightning_cluster_anchor_ = null;
    return;
  }

  // Turning lightning on should feel immediate even though strike cadence is stochastic.
  if (previous <= 0 && current > 0) {
    this.lightning_next_strike_ms_ = now_ms + (120 + (Math.random() * 420));
    this.lightning_next_pulse_ms_ = undefined;
    this.lightning_cluster_pulses_remaining_ = 0;
    this.lightning_cluster_anchor_ = null;
    this.lightning_cluster_frequency_ = current;
    return;
  }

  // For active lightning, apply new frequency promptly rather than waiting for old cadence.
  if (Math.abs(current - previous) > 0.0001) {
    this.lightning_cluster_frequency_ = current;
    this.schedule_next_lightning_cluster_(now_ms, current);
    if (this.lightning_next_strike_ms_ !== undefined) {
      this.lightning_next_strike_ms_ = Math.min(
        this.lightning_next_strike_ms_,
        now_ms + (350 + (Math.random() * 650))
      );
    }
  }
};


/**
 * Trigger one lightning pulse.
 *
 * @param {number} now_ms
 * @param {number} lightning_frequency
 */
beestat.component.scene.prototype.trigger_lightning_pulse_ = function(now_ms, lightning_frequency) {
  this.ensure_lightning_flash_light_();
  if (this.lightning_flash_light_ === undefined) {
    return;
  }

  // First pulse in a cluster chooses the strike anchor; follow-up pulses jitter
  // around it to mimic rapid branch/fork illumination.
  if (this.lightning_cluster_anchor_ === undefined || this.lightning_cluster_anchor_ === null) {
    let anchor_x = 0;
    let anchor_y = 0;
    let anchor_z = -700;
    if (this.cloud_bounds_ !== undefined) {
      anchor_x = this.cloud_bounds_.min_x + (Math.random() * (this.cloud_bounds_.max_x - this.cloud_bounds_.min_x));
      anchor_y = this.cloud_bounds_.min_y + (Math.random() * (this.cloud_bounds_.max_y - this.cloud_bounds_.min_y));
      anchor_z = Number(this.cloud_bounds_.z || -700) + (Math.random() * 90);
    }
    this.lightning_cluster_anchor_ = {
      'x': anchor_x,
      'y': anchor_y,
      'z': anchor_z
    };
  }
  const jitter_radius = 60;
  const anchor = this.lightning_cluster_anchor_;
  const x = anchor.x + ((Math.random() * 2 - 1) * jitter_radius);
  const y = anchor.y + ((Math.random() * 2 - 1) * jitter_radius);
  const z = anchor.z + ((Math.random() * 2 - 1) * 18);
  this.lightning_flash_light_.position.set(x, y, z);

  const total_pulses = Math.max(1, Number(this.lightning_cluster_total_pulses_ || 1));
  const remaining_pulses = Math.max(0, Number(this.lightning_cluster_pulses_remaining_ || 0));
  const pulse_index = Math.max(1, total_pulses - remaining_pulses);
  const sequence_fade = Math.max(0.52, 1 - ((pulse_index - 1) * 0.08));
  const cluster_peak_scale = Number(this.lightning_cluster_peak_scale_ === undefined
    ? 1
    : this.lightning_cluster_peak_scale_);
  const pulse_variation = 0.58 + (Math.random() * 1.0);

  this.lightning_flash_duration_s_ = 0.045 + (Math.random() * 0.095);
  this.lightning_flash_remaining_s_ = this.lightning_flash_duration_s_;
  this.lightning_flash_peak_intensity_ =
    (8.5 + (Math.random() * 7.5)) *
    (0.8 + (0.28 * lightning_frequency)) *
    cluster_peak_scale *
    pulse_variation *
    sequence_fade;
};


/**
 * Start a lightning strike cluster (1-3 rapid pulses).
 *
 * @param {number} now_ms
 * @param {number} lightning_frequency
 */
beestat.component.scene.prototype.start_lightning_cluster_ = function(now_ms, lightning_frequency) {
  const pulse_roll = Math.random();
  let pulse_count;
  // Most strikes are multi-pulse, with occasional 5-6 pulse storms.
  if (pulse_roll < 0.1) {
    pulse_count = 1;
  } else if (pulse_roll < 0.45) {
    pulse_count = 2;
  } else if (pulse_roll < 0.75) {
    pulse_count = 3;
  } else if (pulse_roll < 0.9) {
    pulse_count = 4;
  } else if (pulse_roll < 0.97) {
    pulse_count = 5;
  } else {
    pulse_count = 6;
  }
  this.lightning_cluster_total_pulses_ = pulse_count;
  this.lightning_cluster_pulses_remaining_ = pulse_count;
  this.lightning_cluster_peak_scale_ = 0.72 + (Math.random() * 0.96);
  this.lightning_cluster_anchor_ = null;
  this.lightning_next_pulse_ms_ = now_ms;
  this.lightning_cluster_frequency_ = lightning_frequency;
};


/**
 * Update lightning flash timing and intensity.
 *
 * @param {number} now_ms
 * @param {number} delta_seconds
 */
beestat.component.scene.prototype.update_lightning_ = function(now_ms, delta_seconds) {
  const lightning_frequency = Math.max(
    0,
    Math.min(2, Number(this.get_scene_setting_('lightning_frequency') || 0))
  );

  if (lightning_frequency <= 0) {
    if (this.lightning_flash_light_ !== undefined) {
      this.lightning_flash_light_.intensity = 0;
    }
    this.lightning_flash_remaining_s_ = 0;
    this.lightning_next_strike_ms_ = undefined;
    this.lightning_next_pulse_ms_ = undefined;
    this.lightning_cluster_pulses_remaining_ = 0;
    this.lightning_cluster_anchor_ = null;
    return;
  }

  if (this.lightning_next_strike_ms_ === undefined) {
    this.schedule_next_lightning_cluster_(now_ms, lightning_frequency);
  }

  this.ensure_lightning_flash_light_();
  if (this.lightning_flash_light_ === undefined) {
    return;
  }

  if (
    this.lightning_flash_remaining_s_ !== undefined &&
    this.lightning_flash_remaining_s_ > 0
  ) {
    this.lightning_flash_remaining_s_ = Math.max(
      0,
      this.lightning_flash_remaining_s_ - delta_seconds
    );

    const duration = Math.max(0.001, Number(this.lightning_flash_duration_s_ || 0.2));
    const progress = 1 - (this.lightning_flash_remaining_s_ / duration);
    const decay = Math.pow(Math.max(0, 1 - progress), 2.3);
    const micro_flicker = 0.86 + (Math.random() * 0.28);
    this.lightning_flash_light_.intensity =
      Math.max(0, Number(this.lightning_flash_peak_intensity_ || 0)) * decay * micro_flicker;

    if (this.lightning_flash_remaining_s_ <= 0) {
      this.lightning_flash_light_.intensity = 0;
      if (
        this.lightning_cluster_pulses_remaining_ !== undefined &&
        this.lightning_cluster_pulses_remaining_ > 0
      ) {
        const intra_cluster_gap_ms = 45 + (Math.random() * 160);
        this.lightning_next_pulse_ms_ = now_ms + intra_cluster_gap_ms;
      }
    }
    return;
  }

  this.lightning_flash_light_.intensity = 0;

  if (now_ms >= this.lightning_next_strike_ms_) {
    this.start_lightning_cluster_(now_ms, lightning_frequency);
    this.schedule_next_lightning_cluster_(now_ms, lightning_frequency);
  }

  if (
    this.lightning_cluster_pulses_remaining_ !== undefined &&
    this.lightning_cluster_pulses_remaining_ > 0 &&
    this.lightning_next_pulse_ms_ !== undefined &&
    now_ms >= this.lightning_next_pulse_ms_
  ) {
    this.lightning_cluster_pulses_remaining_--;
    this.trigger_lightning_pulse_(
      now_ms,
      this.lightning_cluster_frequency_ === undefined
        ? lightning_frequency
        : this.lightning_cluster_frequency_
    );
    if (this.lightning_cluster_pulses_remaining_ <= 0) {
      this.lightning_cluster_anchor_ = null;
    }
  }
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
  // Compute world-space weather bounds from floor-plan extents.
  const padding = beestat.component.scene.environment_padding + 120;
  const weather_span_multiplier = 1.25;
  const weather_width = (plan_width + (padding * 2)) * weather_span_multiplier;
  const weather_height = (plan_height + (padding * 2)) * weather_span_multiplier;
  const bounds = {
    'min_x': center_x - (weather_width / 2),
    'max_x': center_x + (weather_width / 2),
    'min_y': center_y - (weather_height / 2),
    'max_y': center_y + (weather_height / 2),
    'min_z': -780,
    'max_z': 140
  };
  this.weather_area_ = Math.max(
    1,
    (bounds.max_x - bounds.min_x) * (bounds.max_y - bounds.min_y)
  );

  // Create the root weather group attached to the environment.
  this.weather_group_ = new THREE.Group();
  this.weather_group_.userData.is_environment = true;
  this.environment_group_.add(this.weather_group_);

  // Lazily create shared particle/sprite textures.
  if (this.cloud_texture_ === undefined) {
    this.cloud_texture_ = this.create_cloud_texture_();
  }

  if (this.snow_particle_texture_ === undefined) {
    this.snow_particle_texture_ = this.create_snow_particle_texture_();
  }
  if (this.rain_particle_texture_ === undefined) {
    this.rain_particle_texture_ = this.create_rain_particle_texture_();
  }

  const configured_cloud_count = this.get_weather_count_from_density_(
    'cloud_density',
    this.weather_area_
  );
  const cloud_capacity = Math.max(
    this.get_weather_design_capacity_count_('cloud_density', this.weather_area_),
    configured_cloud_count
  );
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

  // Pre-build cloud sprites and motion profiles.
  for (let i = 0; i < cloud_capacity; i++) {
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

  // Build precipitation systems (rain and snow) at design-capacity scale.
  this.rain_particles_ = this.create_precipitation_system_(
    bounds,
    Math.max(
      this.get_weather_design_capacity_count_('rain_density', this.weather_area_),
      this.get_weather_count_from_density_('rain_density', this.weather_area_)
    ),
    {
      'size': 11,
      'color': 0xa8c7ff,
      'opacity': 0.5,
      'static_opacity': true,
      'speed_min': 280,
      'speed_max': 430,
      'drift': 28,
      'texture': this.rain_particle_texture_,
      'max_wind_angle': 45,
      'max_wind_speed_scale': 2
    }
  );
  this.weather_group_.add(this.rain_particles_.points);

  this.snow_particles_ = this.create_precipitation_system_(
    bounds,
    Math.max(
      this.get_weather_design_capacity_count_('snow_density', this.weather_area_),
      this.get_weather_count_from_density_('snow_density', this.weather_area_)
    ),
    {
      'size': 10,
      'color': 0xffffff,
      'opacity': 0.75,
      'speed_min': 18,
      'speed_max': 44,
      'drift': 12,
      'texture': this.snow_particle_texture_,
      'max_wind_angle': 75,
      'max_wind_speed_scale': 3,
      'wind_motion_multiplier': 2.5
    }
  );
  this.weather_group_.add(this.snow_particles_.points);

  // Pre-create lightning resources and initialize weather transition state.
  // Pre-create lightning light so the first strike doesn't hitch on creation.
  this.ensure_lightning_flash_light_();
  if (this.lightning_flash_light_ !== undefined) {
    this.lightning_flash_light_.intensity = 0;
  }

  this.weather_last_update_ms_ = window.performance.now();

  const initial_weather_profile = this.get_weather_profile_();
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
  // Resolve frame delta and exit early on invalid/zero elapsed time.
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

  // Read wind controls from scene settings.
  const wind_speed = Math.max(0, Math.min(2, Number(this.get_scene_setting_('wind_speed') || 0)));
  const wind_direction = Math.max(0, Math.min(360, Number(this.get_scene_setting_('wind_direction') || 0)));

  // Initialize weather transition targets and lerp state.
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

  // Update cloud sprites (density, color, scale breathing, and positional wiggle).
  if (this.cloud_sprites_ !== undefined && this.cloud_motion_ !== undefined) {
    const now_seconds = now_ms / 1000;
    const cloud_color = this.get_cloud_color_();
    const cloud_normalization_count = Math.max(
      1,
      this.get_weather_design_capacity_count_('cloud_density')
    );
    const cloud_density = Math.max(
      0,
      Math.min(
        1,
        this.current_cloud_count_ / cloud_normalization_count
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
        if (sprite.material.color !== undefined) {
          sprite.material.color.copy(cloud_color);
        }
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

  // Update precipitation + lightning systems, then re-apply snow cover tinting.
  this.update_precipitation_system_(
    this.rain_particles_,
    this.current_rain_count_,
    delta_seconds,
    wind_speed,
    wind_direction
  );
  this.update_precipitation_system_(
    this.snow_particles_,
    this.current_snow_count_,
    delta_seconds,
    wind_speed,
    wind_direction
  );
  this.update_lightning_(now_ms, delta_seconds);
  this.update_snow_surface_colors_(this.get_snow_cover_blend_());

  // Keep sun/moon lighting aligned with current date/location in environment mode.
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
