/**
 * Scene methods split from scene.js.
 */


/**
 * Add multiple directional lights from different angles to create definition
 * and depth without harsh shadows. This three-point lighting setup gives
 * surfaces varied illumination for better visual depth.
 */
beestat.component.scene.prototype.add_directional_lights_ = function() {
  // Prevent re-initialization if lights already exist
  if (this.directional_lights_ !== undefined) {
    return;
  }

  this.directional_lights_ = [];

  // Key light: Main light from upper front-right (strongest)
  const key_light = new THREE.DirectionalLight(0xffffff, beestat.component.scene.directional_light_intensity);
  key_light.position.set(2000, 3200, 2000);
  this.static_light_group_.add(key_light);
  this.directional_lights_.push(key_light);

  // Fill light: Softer light from upper front-left (balances key light)
  const fill_light = new THREE.DirectionalLight(0xffffff, beestat.component.scene.directional_light_intensity);
  fill_light.position.set(-2000, 2400, 2000);
  this.static_light_group_.add(fill_light);
  this.directional_lights_.push(fill_light);

  // Back light: Mild light from behind (creates rim lighting on edges)
  const back_light = new THREE.DirectionalLight(0xffffff, beestat.component.scene.directional_light_intensity);
  back_light.position.set(0, 2000, -2000);
  this.static_light_group_.add(back_light);
  this.directional_lights_.push(back_light);

  // Top light: Gentle overhead light for roof definition
  const top_light = new THREE.DirectionalLight(0xffffff, beestat.component.scene.directional_light_intensity);
  top_light.position.set(0, 4000, 0);
  this.static_light_group_.add(top_light);
  this.directional_lights_.push(top_light);

  // Add helpers for debugging
  if (this.debug_.directional_light_helpers === true) {
    this.directional_light_helpers_ = [];
    this.directional_lights_.forEach((light) => {
      const helper = new THREE.DirectionalLightHelper(light, 100);
      this.static_light_group_.add(helper);
      this.directional_light_helpers_.push(helper);
    });
  }
};


/**
 * Create static lights group containing ambient and directional fill lights.
 * These lights are always on and provide base illumination.
 */
beestat.component.scene.prototype.add_static_lights_ = function() {
  // Prevent re-initialization
  if (this.static_light_group_ !== undefined) {
    return;
  }

  // Initialize layers object if not already done
  if (this.layers_ === undefined) {
    this.layers_ = {};
  }

  this.static_light_group_ = new THREE.Group();
  this.scene_.add(this.static_light_group_);
  this.layers_['static_lights'] = this.static_light_group_;

  // Add ambient light
  this.ambient_light_ = new THREE.AmbientLight(
    0xffffff,
    beestat.component.scene.ambient_light_intensity
  );
  this.static_light_group_.add(this.ambient_light_);

  // Add directional fill lights
  this.add_directional_lights_();
  this.apply_appearance_rotation_to_lights_();
};


/**
 * Directional sun and moon lights that provide natural lighting. Only
 * visible when the environment layer is enabled. Positions are calculated based
 * on time of day and location.
 */
beestat.component.scene.prototype.get_celestial_shadow_frustum_extent_ = function() {
  const bounding_box = this.get_scene_bounding_box_();
  const plan_width = Math.max(1, Number(bounding_box.right - bounding_box.left));
  const plan_height = Math.max(1, Number(bounding_box.bottom - bounding_box.top));
  const half_span = Math.max(plan_width, plan_height) / 2;
  const environment_padding = Math.max(0, beestat.component.scene.environment_padding || 0);
  const caster_margin = 420;
  // Extra scale keeps long low-angle shadows inside the ortho shadow camera.
  return Math.max(1000, (half_span + environment_padding + caster_margin) * 1.45);
};


/**
 * Configure a directional light shadow camera to cover the current scene size.
 *
 * @param {THREE.DirectionalLight} light
 */
beestat.component.scene.prototype.configure_celestial_shadow_camera_ = function(light) {
  const extent = this.get_celestial_shadow_frustum_extent_();
  light.shadow.camera.left = -extent;
  light.shadow.camera.right = extent;
  light.shadow.camera.top = extent;
  light.shadow.camera.bottom = -extent;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = Math.max(5000, extent * 6);
  light.shadow.camera.updateProjectionMatrix();
};


/**
 * Directional sun and moon lights that provide natural lighting. Only
 * visible when the environment layer is enabled. Positions are calculated based
 * on time of day and location.
 */
beestat.component.scene.prototype.add_celestial_lights_ = function() {
  // Prevent re-initialization if lights already exist
  if (this.sun_light_ !== undefined) {
    return;
  }

  // Create celestial group if it doesn't exist
  if (this.celestial_light_group_ === undefined) {
    this.celestial_light_group_ = new THREE.Group();
    this.scene_.add(this.celestial_light_group_);
    this.layers_['celestial'] = this.celestial_light_group_;
  }

  // Sun light
  this.sun_light_ = new THREE.DirectionalLight(
    0xffffdd, // Slightly warm color for sunlight
    beestat.component.scene.sun_light_intensity
  );

  // Initial position (will be updated by update_celestial_lights_)
  this.sun_light_.position.set(500, 500, -500);

  // Enable shadow casting
  this.sun_light_.castShadow = true;
  this.sun_light_.shadow.mapSize.set(2048, 2048);
  this.sun_light_.shadow.bias = -0.001;

  // Configure shadow camera frustum based on scene size.
  this.configure_celestial_shadow_camera_(this.sun_light_);

  // Set target to world origin (0,0,0) so light always points there
  this.sun_light_.target.position.set(0, 0, 0);
  this.scene_.add(this.sun_light_.target);

  this.celestial_light_group_.add(this.sun_light_);

  // Faint arc showing the sun's path across the sky.
  this.sun_path_line_ = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      'color': 0xffe7aa,
      'vertexColors': true,
      'transparent': true,
      'opacity': 0.14,
      'depthWrite': false
    })
  );
  this.sun_path_line_.layers.set(beestat.component.scene.layer_visible);
  this.celestial_light_group_.add(this.sun_path_line_);

  // Visible sun body and glow
  this.sun_visual_group_ = new THREE.Group();
  this.sun_visual_group_.layers.set(beestat.component.scene.layer_visible);
  this.celestial_light_group_.add(this.sun_visual_group_);

  const sun_core_geometry = new THREE.SphereGeometry(146, 24, 24);
  const sun_core_material = new THREE.MeshBasicMaterial({
    'color': 0xffffff,
    'transparent': true,
    'opacity': 1
  });
  this.sun_core_mesh_ = new THREE.Mesh(sun_core_geometry, sun_core_material);
  this.sun_core_mesh_.userData.is_celestial_object = true;
  this.sun_visual_group_.add(this.sun_core_mesh_);

  this.sun_glow_texture_ = this.create_sun_glow_texture_();
  const sun_glow_material = new THREE.SpriteMaterial({
    'map': this.sun_glow_texture_,
    'color': 0xfff0b0,
    'transparent': true,
    'blending': THREE.AdditiveBlending,
    'depthWrite': false,
    'depthTest': true,
    'opacity': 1
  });
  this.sun_glow_sprite_ = new THREE.Sprite(sun_glow_material);
  this.sun_glow_sprite_.userData.is_celestial_object = true;
  this.sun_glow_sprite_.scale.set(1037, 1037, 1);
  this.sun_visual_group_.add(this.sun_glow_sprite_);

  if (this.debug_.sun_light_helper === true) {
    this.sun_light_helper_ = new THREE.DirectionalLightHelper(
      this.sun_light_,
      100
    );
    this.celestial_light_group_.add(this.sun_light_helper_);
  }

  // Moon light
  this.moon_light_ = new THREE.DirectionalLight(
    0xaaccff, // Cool bluish color for moonlight
    beestat.component.scene.moon_light_intensity
  );

  // Initial position (will be updated by update_celestial_lights_)
  this.moon_light_.position.set(-500, 500, 500);

  // Enable shadow casting
  this.moon_light_.castShadow = true;
  this.moon_light_.shadow.mapSize.set(2048, 2048);
  this.moon_light_.shadow.bias = -0.001;

  // Configure shadow camera frustum based on scene size.
  this.configure_celestial_shadow_camera_(this.moon_light_);

  // Set target to world origin
  this.moon_light_.target.position.set(0, 0, 0);
  this.scene_.add(this.moon_light_.target);

  this.celestial_light_group_.add(this.moon_light_);

  // Visible moon disk with procedural phase texture.
  this.moon_visual_group_ = new THREE.Group();
  this.moon_visual_group_.layers.set(beestat.component.scene.layer_visible);
  this.celestial_light_group_.add(this.moon_visual_group_);

  this.update_moon_phase_texture_(0);
  const moon_material = new THREE.SpriteMaterial({
    'map': this.moon_phase_texture_,
    'transparent': true,
    'depthWrite': false,
    'depthTest': true,
    'opacity': 1
  });
  this.moon_sprite_ = new THREE.Sprite(moon_material);
  this.moon_sprite_.userData.is_celestial_object = true;
  this.moon_sprite_.scale.set(405, 405, 1);
  this.moon_visual_group_.add(this.moon_sprite_);

  if (this.debug_.moon_light_helper === true) {
    this.moon_light_helper_ = new THREE.DirectionalLightHelper(
      this.moon_light_,
      100
    );
    this.celestial_light_group_.add(this.moon_light_helper_);
  }

  this.add_stars_();

  this.apply_appearance_rotation_to_lights_();
};


/**
 * Add stars as non-lighting visual sprites in the sky.
 */
beestat.component.scene.prototype.add_stars_ = function() {
  if (this.star_texture_ === undefined) {
    this.star_texture_ = this.create_star_texture_();
  }

  this.star_group_ = new THREE.Group();
  this.star_group_.layers.set(beestat.component.scene.layer_visible);
  this.celestial_light_group_.add(this.star_group_);

  this.stars_ = [];

  const radius = 4200;
  const star_density = Math.max(0, Number(this.get_scene_setting_('star_density') || 0));
  const star_count = Math.max(0, Math.round(1000 * star_density));
  for (let i = 0; i < star_count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const size =
      beestat.component.scene.star_min_size +
      (Math.pow(Math.random(), 1.7) * (beestat.component.scene.star_max_size - beestat.component.scene.star_min_size));
    const is_twinkle = size >= 20;
    const base_opacity = 0.3 + (Math.random() * 0.7);

    const material = new THREE.SpriteMaterial({
      'map': this.star_texture_,
      'transparent': true,
      'opacity': 0,
      'depthWrite': false,
      'depthTest': true,
      'blending': THREE.AdditiveBlending
    });
    const star = new THREE.Sprite(material);
    star.position.set(x, y, z);
    star.scale.set(size, size, 1);
    star.userData.is_celestial_object = true;
    this.star_group_.add(star);

    this.stars_.push({
      'sprite': star,
      'base_opacity': base_opacity,
      'twinkle': is_twinkle,
      'twinkle_amount': is_twinkle ? (0.06 + (Math.random() * 0.1)) : 0,
      'twinkle_speed': is_twinkle ? (0.8 + (Math.random() * 1.2)) : 0,
      'phase': Math.random() * Math.PI * 2
    });
  }

  this.star_visibility_ = 0;
  this.target_star_visibility_ = 0;
};


/**
 * Update a faint line representing the sun's path for the current date and
 * location.
 *
 * @param {moment} date
 * @param {number} latitude
 * @param {number} longitude
 */
beestat.component.scene.prototype.update_sun_path_arc_ = function(date, latitude, longitude) {
  if (this.sun_path_line_ === undefined) {
    return;
  }

  const rotation_radians = (this.get_appearance_value_('rotation') * Math.PI) / 180;
  const sun_distance = 4000;
  const start_of_day = date.clone().startOf('day');
  const end_of_day = start_of_day.clone().add(1, 'day');
  const start_ms = start_of_day.valueOf();
  const end_ms = end_of_day.valueOf();
  const sample_count = 72;
  const points = [];

  for (let i = 0; i < sample_count; i++) {
    const t = i / (sample_count - 1);
    const sample_date = new Date(start_ms + (end_ms - start_ms) * t);

    const sun_pos = SunCalc.getPosition(sample_date, latitude, longitude);
    // Convert SunCalc azimuth (south-origin, west-positive) to a north-origin,
    // clockwise bearing, then apply floor-plan north rotation.
    const rotated_azimuth = sun_pos.azimuth + Math.PI + rotation_radians;

    // Extend slightly below horizon so the path doesn't hard-stop at horizon.
    if (sun_pos.altitude > -0.22) {
      points.push(new THREE.Vector3(
        sun_distance * Math.cos(sun_pos.altitude) * Math.sin(rotated_azimuth),
        sun_distance * Math.sin(sun_pos.altitude),
        -sun_distance * Math.cos(sun_pos.altitude) * Math.cos(rotated_azimuth)
      ));
    }
  }

  if (points.length >= 2) {
    const geometry = this.sun_path_line_.geometry;
    geometry.setFromPoints(points);

    // Fade the ends by dimming vertex colors toward each endpoint.
    const colors = [];
    const base = new THREE.Color(0xffe7aa);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const center_weight = Math.pow(Math.sin(Math.PI * t), 1.2);
      const intensity = 0.2 + (0.8 * center_weight);
      const color = base.clone().multiplyScalar(intensity);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    this.sun_path_line_.visible = true;
  } else {
    this.sun_path_line_.geometry.setFromPoints([]);
    this.sun_path_line_.visible = false;
  }
};


/**
 * Static (ambient/directional fill) lights should not rotate with floor-plan
 * appearance. Celestial lights are handled in update_celestial_lights_.
 */
beestat.component.scene.prototype.apply_appearance_rotation_to_lights_ = function() {
  if (this.static_light_group_ !== undefined) {
    this.static_light_group_.rotation.y = 0;
  }
};


/**
 * Update sun and moon light positions based on date and location using SunCalc.
 * Adjusts light intensities based on altitude and moon phase.
 *
 * @param {moment} date The date/time to calculate positions for
 * @param {number} latitude Location latitude
 * @param {number} longitude Location longitude
 * 
 * @link https://www.earthspacelab.com/app/solar-time/
 */
beestat.component.scene.prototype.update_celestial_lights_ = function(date, latitude, longitude) {
  const sun_distance = 4000;
  const moon_distance = 3920;
  const js_date = date.toDate();
  const rotation_radians = (this.get_appearance_value_('rotation') * Math.PI) / 180;

  // Sun
  const sun_pos = SunCalc.getPosition(js_date, latitude, longitude);
  // Convert SunCalc azimuth (south-origin, west-positive) to a north-origin,
  // clockwise bearing, then apply floor-plan north rotation.
  const rotated_sun_azimuth = sun_pos.azimuth + Math.PI + rotation_radians;
  this.sun_light_.position.set(
    sun_distance * Math.cos(sun_pos.altitude) * Math.sin(rotated_sun_azimuth),   // East-West
    sun_distance * Math.sin(sun_pos.altitude),                                // Up-Down (altitude)
    -sun_distance * Math.cos(sun_pos.altitude) * Math.cos(rotated_sun_azimuth)   // North-South
  );

  if (this.sun_visual_group_ !== undefined) {
    this.sun_visual_group_.position.copy(this.sun_light_.position);
    this.sun_visual_group_.visible = true;
    this.sun_visual_horizon_fade_ = Math.max(0, Math.min(1, (sun_pos.altitude + 0.15) / 0.3));
  }

  const cloud_dimming = this.get_cloud_dimming_factor_();

  // Calculate target intensity for smooth transitions.
  // Keep most of the falloff near the horizon so direct highlights don't look
  // "full sun" once the sun disk visually fades.
  const sun_horizon_visibility = Math.max(
    0,
    Math.min(1, (sun_pos.altitude + 0.06) / 0.18)
  );
  const sun_intensity_factor = Math.pow(sun_horizon_visibility, 1.7);
  this.target_sun_intensity_ =
    beestat.component.scene.sun_light_intensity * sun_intensity_factor;
  this.target_sun_intensity_ *= cloud_dimming;

  // Fade stars out at day and in at night.
  this.target_star_visibility_ = Math.max(
    0,
    Math.min(1, (-sun_pos.altitude - 0.05) / 0.25)
  );

  const interior_night_factor = Math.max(
    0,
    Math.min(1, (-sun_pos.altitude + 0.03) / 0.3)
  );
  this.target_interior_light_intensity_ =
    beestat.component.scene.interior_light_intensity * interior_night_factor;
  const max_sun_intensity = Math.max(0.0001, Number(beestat.component.scene.sun_light_intensity || 0.0001));
  const normalized_sun_brightness = Math.max(
    0,
    Math.min(1, this.target_sun_intensity_ / max_sun_intensity)
  );
  const user_light_on_brightness_threshold = 0.34;
  const user_light_off_brightness_threshold = 0.42;
  if (this.user_lights_on_ === undefined) {
    this.user_lights_on_ = normalized_sun_brightness <= user_light_on_brightness_threshold;
  }
  if (this.user_lights_on_ === true) {
    if (normalized_sun_brightness >= user_light_off_brightness_threshold) {
      this.user_lights_on_ = false;
    }
  } else if (normalized_sun_brightness <= user_light_on_brightness_threshold) {
    this.user_lights_on_ = true;
  }
  this.target_light_source_intensity_multiplier_ = this.user_lights_on_ === true ? 1 : 0;

  // Moon
  const moon_pos = SunCalc.getMoonPosition(js_date, latitude, longitude);
  // Keep moon conversion consistent with the sun conversion.
  const rotated_moon_azimuth = moon_pos.azimuth + Math.PI + rotation_radians;
  const moon_illumination = SunCalc.getMoonIllumination(js_date);
  const moon_fraction = moon_illumination.fraction;
  const moon_phase = moon_illumination.phase;
  this.moon_light_.position.set(
    moon_distance * Math.cos(moon_pos.altitude) * Math.sin(rotated_moon_azimuth),    // East-West
    moon_distance * Math.sin(moon_pos.altitude),                                  // Up-Down (altitude)
    -moon_distance * Math.cos(moon_pos.altitude) * Math.cos(rotated_moon_azimuth)    // North-South
  );
  if (this.moon_visual_group_ !== undefined) {
    let moon_front_direction;
    if (this.camera_ !== undefined) {
      moon_front_direction = this.camera_.position.clone().sub(this.moon_light_.position).normalize();
    } else {
      moon_front_direction = this.moon_light_.position.clone().normalize().negate();
    }
    this.moon_visual_group_.position.copy(
      this.moon_light_.position.clone().add(moon_front_direction.multiplyScalar(20))
    );
    this.moon_visual_group_.visible = true;
    this.moon_visual_horizon_fade_ = Math.max(0, Math.min(1, (moon_pos.altitude + 0.12) / 0.24));

    if (this.last_moon_phase_ === undefined || Math.abs(this.last_moon_phase_ - moon_phase) > 0.002) {
      this.last_moon_phase_ = moon_phase;
      this.update_moon_phase_texture_(moon_phase);
    }
  }
  const moon_intensity = beestat.component.scene.moon_light_intensity * moon_fraction;

  this.update_sun_path_arc_(date, latitude, longitude);

  // Calculate target intensity for smooth transitions
  // Moon is only visible when sun is below horizon
  if (sun_pos.altitude >= 0) {
    this.target_moon_intensity_ = 0;
  } else {
    this.target_moon_intensity_ = moon_pos.altitude < 0
      ? Math.max(0, moon_intensity * (1 + moon_pos.altitude / (Math.PI / 6)))
      : moon_intensity;
  }
  this.target_moon_intensity_ *= cloud_dimming;

  // Update helpers
  if (this.debug_.sun_light_helper) {
    this.sun_light_.updateMatrixWorld();
    this.sun_light_.target.updateMatrixWorld();
    this.sun_light_helper_.update();
  }
  if (this.debug_.moon_light_helper) {
    this.moon_light_.updateMatrixWorld();
    this.moon_light_.target.updateMatrixWorld();
    this.moon_light_helper_.update();
  }
};


/**
 * Smoothly interpolate celestial light intensities towards their targets.
 * Called every frame to create smooth transitions instead of instant jumps.
 */
beestat.component.scene.prototype.update_celestial_light_intensities_ = function() {
  if (this.sun_light_ === undefined || this.moon_light_ === undefined) {
    return;
  }

  // Initialize current intensities if not set
  if (this.target_sun_intensity_ === undefined) {
    this.target_sun_intensity_ = 0;
  }
  if (this.target_moon_intensity_ === undefined) {
    this.target_moon_intensity_ = 0;
  }
  if (this.target_interior_light_intensity_ === undefined) {
    const hour = this.date_ !== undefined ? Number(this.date_.format('H')) : 12;
    this.target_interior_light_intensity_ = (
      (hour >= 19 || hour <= 5)
        ? beestat.component.scene.interior_light_intensity
        : 0
    );
  }
  if (this.target_light_source_intensity_multiplier_ === undefined) {
    const hour = this.date_ !== undefined ? Number(this.date_.format('H')) : 12;
    this.target_light_source_intensity_multiplier_ = (hour >= 19 || hour <= 5) ? 1 : 0;
  }

  // Lerp factor - lower = smoother but slower, higher = faster but jumpier
  const lerp_factor = 0.05;

  // Lerp sun intensity
  this.sun_light_.intensity += (this.target_sun_intensity_ - this.sun_light_.intensity) * lerp_factor;

  // Lerp moon intensity
  this.moon_light_.intensity += (this.target_moon_intensity_ - this.moon_light_.intensity) * lerp_factor;

  if (this.interior_lights_ !== undefined) {
    this.interior_lights_.forEach((light) => {
      light.intensity += (this.target_interior_light_intensity_ - light.intensity) * lerp_factor;
    });
  }
  if (Array.isArray(this.light_sources_) === true) {
    this.light_sources_.forEach((light) => {
      const base_intensity = Number(light.userData.base_intensity || 0);
      const target_intensity = base_intensity * this.target_light_source_intensity_multiplier_;
      light.intensity += (target_intensity - light.intensity) * lerp_factor;
    });
  }
  // Match visible sun brightness to actual sun light intensity, with smooth
  // fade at/under the horizon.
  if (this.sun_core_mesh_ !== undefined && this.sun_glow_sprite_ !== undefined) {
    const max_sun_intensity = beestat.component.scene.sun_light_intensity;
    const intensity_ratio = max_sun_intensity > 0
      ? Math.max(0, Math.min(1, this.sun_light_.intensity / max_sun_intensity))
      : 0;
    const horizon_fade = this.sun_visual_horizon_fade_ !== undefined
      ? this.sun_visual_horizon_fade_
      : 1;
    const visual_strength = intensity_ratio * horizon_fade;

    this.sun_core_mesh_.material.opacity = Math.min(1, (0.65 + visual_strength * 0.8) * visual_strength);
    this.sun_glow_sprite_.material.opacity = Math.min(1, (0.45 + visual_strength * 1.4) * visual_strength);
  }

  if (this.moon_sprite_ !== undefined) {
    const max_moon_intensity = beestat.component.scene.moon_light_intensity;
    const moon_intensity_ratio = max_moon_intensity > 0
      ? Math.max(0, Math.min(1, this.moon_light_.intensity / max_moon_intensity))
      : 0;
    const moon_horizon_fade = this.moon_visual_horizon_fade_ !== undefined
      ? this.moon_visual_horizon_fade_
      : 1;
    const moon_visual_strength = moon_intensity_ratio * moon_horizon_fade;

    this.moon_sprite_.material.opacity = Math.min(1, 0.2 + (moon_visual_strength * 0.95));
  }

  this.update_stars_();
};


/**
 * Update star visibility and subtle twinkle.
 */
beestat.component.scene.prototype.update_stars_ = function() {
  if (this.stars_ === undefined || this.stars_.length === 0) {
    return;
  }

  if (this.target_star_visibility_ === undefined) {
    this.target_star_visibility_ = 0;
  }
  if (this.star_visibility_ === undefined) {
    this.star_visibility_ = 0;
  }

  this.star_visibility_ += (this.target_star_visibility_ - this.star_visibility_) * 0.06;
  const visibility = Math.max(0, Math.min(1, this.star_visibility_));
  const now_seconds = window.performance.now() / 1000;

  if (this.star_group_ !== undefined) {
    if (this.date_ !== undefined && typeof this.date_.valueOf === 'function') {
      // Apparent star motion is westward due to Earth's eastward rotation.
      const sidereal_phase = (
        (this.date_.valueOf() / 1000) % beestat.component.scene.sidereal_day_seconds
      ) / beestat.component.scene.sidereal_day_seconds;
      this.star_group_.rotation.y = -sidereal_phase * Math.PI * 2 * beestat.component.scene.star_drift_visual_factor;
    }
    this.star_group_.visible = visibility > 0.005;
  }

  for (let i = 0; i < this.stars_.length; i++) {
    const star = this.stars_[i];
    let twinkle = 1;
    if (star.twinkle === true) {
      twinkle = 1 + (Math.sin((now_seconds * star.twinkle_speed) + star.phase) * star.twinkle_amount);
    }
    star.sprite.material.opacity = Math.max(
      0,
      Math.min(
        1,
        star.base_opacity * visibility * twinkle
      )
    );
  }
};


/**
 * Convert color temperature in Kelvin to RGB color.
 *
 * @param {number} temperature_k
 *
 * @return {THREE.Color}
 */
beestat.component.scene.prototype.get_light_color_from_temperature_ = function(temperature_k) {
  const kelvin = Math.max(1000, Math.min(12000, Number(temperature_k || 4000)));
  const temp = kelvin / 100;

  let red;
  let green;
  let blue;

  if (temp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    blue = temp <= 19 ? 0 : (138.5177312231 * Math.log(temp - 10) - 305.0447927307);
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }

  const clamp_channel = function(value) {
    return Math.max(0, Math.min(255, Number(value || 0)));
  };

  return new THREE.Color(
    clamp_channel(red) / 255,
    clamp_channel(green) / 255,
    clamp_channel(blue) / 255
  );
};


/**
 * Add floor-plan light sources.
 *
 * @param {THREE.Group} layer The layer to add light sources to.
 * @param {object} group The floor plan group.
 */
beestat.component.scene.prototype.add_light_sources_ = function(layer, group) {
  if (this.get_scene_setting_('light_user_enabled') !== true) {
    return;
  }

  if (Array.isArray(group.light_sources) !== true || group.light_sources.length === 0) {
    return;
  }
  if (Array.isArray(this.light_sources_) !== true) {
    this.light_sources_ = [];
  }

  if (this.debug_.light_source_orbs === true) {
    if (this.light_source_marker_geometry_ === undefined) {
      this.light_source_marker_geometry_ = new THREE.SphereGeometry(2.2, 12, 12);
    }
    if (this.light_source_glow_geometry_ === undefined) {
      this.light_source_glow_geometry_ = new THREE.SphereGeometry(6, 16, 16);
    }
    if (this.light_source_marker_material_ === undefined) {
      this.light_source_marker_material_ = new THREE.MeshStandardMaterial({
        'roughness': 0.2,
        'metalness': 0.05
      });
    }
    if (this.light_source_glow_material_ === undefined) {
      this.light_source_glow_material_ = new THREE.MeshBasicMaterial({
        'transparent': true,
        'opacity': 0.28,
        'depthWrite': false,
        'blending': THREE.AdditiveBlending
      });
    }
  }

  const group_elevation = Number(group.elevation || 0);
  const floor_thickness = Number(beestat.component.scene.room_floor_thickness || 0);
  const user_light_cast_shadows = this.get_scene_setting_('light_user_cast_shadows') === true;

  group.light_sources.forEach(function(light_source) {
    const x = Number(light_source.x || 0);
    const y = Number(light_source.y || 0);
    const elevation = Number(light_source.elevation !== undefined ? light_source.elevation : 72);
    const z = -group_elevation - floor_thickness - elevation;
    let intensity_level = 2;
    if (light_source.intensity === 'dim') {
      intensity_level = 1;
    } else if (light_source.intensity === 'bright') {
      intensity_level = 3;
    }
    const light_intensity = 0.9 * intensity_level;
    const light_color = this.get_light_color_from_temperature_(light_source.temperature_k);

    if (this.debug_.light_source_orbs === true) {
      const marker = new THREE.Mesh(
        this.light_source_marker_geometry_,
        this.light_source_marker_material_.clone()
      );
      marker.material.color.copy(light_color);
      marker.material.emissive.copy(light_color);
      marker.material.emissiveIntensity = 0.9 + (intensity_level * 0.35);
      marker.position.set(x, y, z);
      marker.castShadow = false;
      marker.receiveShadow = false;
      marker.userData.is_light_source = true;
      layer.add(marker);

      const glow = new THREE.Mesh(
        this.light_source_glow_geometry_,
        this.light_source_glow_material_.clone()
      );
      glow.material.color.copy(light_color);
      glow.material.opacity = 0.15 + (intensity_level * 0.08);
      glow.position.set(x, y, z);
      glow.castShadow = false;
      glow.receiveShadow = false;
      glow.userData.is_light_source = true;
      layer.add(glow);
    }

    const light = new THREE.PointLight(light_color, light_intensity, 240, 2);
    light.userData.base_intensity = light_intensity;
    light.intensity = light_intensity * Number(this.target_light_source_intensity_multiplier_ || 0);
    light.position.set(x, y, z);
    light.castShadow = user_light_cast_shadows;
    if (user_light_cast_shadows === true) {
      light.shadow.mapSize.width = 512;
      light.shadow.mapSize.height = 512;
      light.shadow.bias = -0.0012;
      light.shadow.normalBias = 0.025;
      light.shadow.radius = 2;
      light.shadow.camera.near = 1;
      light.shadow.camera.far = 240;
    }
    light.userData.is_light_source = true;
    layer.add(light);
    this.light_sources_.push(light);
  }, this);
};


/**
 * Add warm interior point lights, one per room. Lights are invisible and their
 * intensity is animated based on night/day state.
 *
 * @param {object} floor_plan The floor plan data.
 */
beestat.component.scene.prototype.add_interior_lights_ = function(floor_plan) {
  this.interior_lights_ = [];
  this.interior_light_group_ = new THREE.Group();
  this.floor_plan_group_.add(this.interior_light_group_);
  this.layers_['interior_lights'] = this.interior_light_group_;
  let shadowed_light_count = 0;

  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach((room) => {
      if (room.points === undefined || room.points.length < 3) {
        return;
      }

      const geojson_polygon = [];
      room.points.forEach(function(point) {
        geojson_polygon.push([
          point.x,
          point.y
        ]);
      });
      const light_point = polylabel([geojson_polygon]);

      const group_elevation = Number(group.elevation || 0);
      const room_height = Number(room.height || group.height || 96);
      const room_elevation = Number(room.elevation !== undefined ? room.elevation : group_elevation);

      const light = new THREE.PointLight(0xffd79a, 0, 170, 2);
      light.position.set(
        Number(room.x || 0) + light_point[0],
        Number(room.y || 0) + light_point[1],
        -room_elevation - (room_height * 0.45)
      );
      if (shadowed_light_count < beestat.component.scene.interior_light_shadow_max) {
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.bias = -0.0012;
        light.shadow.normalBias = 0.025;
        light.shadow.radius = 2;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 220;
        shadowed_light_count++;
      } else {
        light.castShadow = false;
      }

      this.interior_light_group_.add(light);
      this.interior_lights_.push(light);
    });
  }, this);
};

