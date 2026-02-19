// Ideas
// Surfaces (Sidewalk, Mulch, etc)
// Trees
// When dragging across a DST boundary change the time so the sun doesn't jump


/**
 * Home Scene
 *
 * @param {number} floor_plan_id The floor plan to render.
 * @param {object} data Sensor data.
 */
beestat.component.scene = function(floor_plan_id, data) {
  this.floor_plan_id_ = floor_plan_id;
  this.data_ = data;

  this.label_material_memo_ = [];

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.scene, beestat.component);

/**
 * Render layer index for standard visible meshes.
 *
 * @type {number}
 */
beestat.component.scene.layer_visible = 0;

/**
 * Render layer index for hidden meshes.
 *
 * @type {number}
 */
beestat.component.scene.layer_hidden = 1;

/**
 * Render layer index for room outlines.
 *
 * @type {number}
 */
beestat.component.scene.layer_outline = 2;

/**
 * Roof rise-over-run pitch ratio (0.5 = 6:12 pitch).
 *
 * @type {number}
 */
beestat.component.scene.roof_pitch = 0.5;

/**
 * Roof overhang beyond wall exterior in model units (inches).
 *
 * @type {number}
 */
beestat.component.scene.roof_overhang = 12;

/**
 * Exterior wall thickness in model units (inches).
 *
 * @type {number}
 */
beestat.component.scene.wall_thickness = 4;

/**
 * Extra padding added around the floor plan for environment meshes.
 *
 * @type {number}
 */
beestat.component.scene.environment_padding = 400;

/**
 * Maximum rain particle count at full rain intensity.
 *
 * @type {number}
 */
beestat.component.scene.weather_rain_max_count = 2200;

/**
 * Maximum snow particle count at full snow intensity.
 *
 * @type {number}
 */
beestat.component.scene.weather_snow_max_count = 1500;

/**
 * Maximum cloud sprite count at full cloud intensity.
 *
 * @type {number}
 */
beestat.component.scene.weather_cloud_max_count = 140;

/**
 * Time in seconds for weather effects to fully transition to a new mode.
 *
 * @type {number}
 */
beestat.component.scene.weather_transition_seconds = 2;

/**
 * Default room floor slab thickness in model units (inches).
 *
 * @type {number}
 */
beestat.component.scene.room_floor_thickness = 6;

/**
 * Vertical lift (inches) applied to surfaces so they sit slightly above their
 * base plane and avoid z-fighting.
 *
 * @type {number}
 */
beestat.component.scene.surface_z_lift = 0.75;

/**
 * Default number of decorative trees to place around the environment.
 *
 * @type {number}
 */
beestat.component.scene.environment_tree_count = 14;

/**
 * Toggle tree foliage visibility for environment trees.
 *
 * @type {boolean}
 */
beestat.component.scene.environment_tree_foliage_enabled = true;

/**
 * Debug opacity for round/oval canopies when foliage is visible.
 *
 * @type {number}
 */
beestat.component.scene.debug_tree_canopy_opacity = 1;

/**
 * Keep round/oval branch meshes visible even when foliage is visible.
 *
 * @type {boolean}
 */
beestat.component.scene.debug_show_branches_with_foliage = true;

/**
 * Round/oval primary branch density in branches per height unit.
 *
 * @type {number}
 */
beestat.component.scene.round_tree_branches_per_height = 0.15;

/**
 * Seasonal foliage colors for round/oval trees.
 *
 * @type {{summer: number, fall_early: number, fall_late: number, winter: number}}
 */
beestat.component.scene.tree_foliage_colors = {
  'summer': 0x4f9f2f,
  'fall_early': 0x9a7b2f,
  'fall_late': 0x8b4f1f,
  'winter': 0x6f5f3a
};

/**
 * Inset used when building wall geometry to avoid z-fighting seams.
 *
 * @type {number}
 */
beestat.component.scene.room_wall_inset = 1.5;

/**
 * Default appearance values for floor plans.
 *
 * @type {{rotation: number, roof_color: string, roof_style: string, siding_color: string, ground_color: string, weather: string}}
 */
beestat.component.scene.default_appearance = {
  'rotation': 0,
  'roof_color': '#3a3a3a',
  'roof_style': 'hip',
  'siding_color': '#889aaa',
  'ground_color': '#4a7c3f',
  'weather': 'none'
};
/**
 * Snow cover tint used to blend roof/ground surfaces during snowfall.
 *
 * @type {string}
 */
beestat.component.scene.snow_surface_color = '#f0f0f0';

/**
 * Ambient light intensity for constant scene fill.
 *
 * @type {number}
 */
beestat.component.scene.ambient_light_intensity = 0.25;

/**
 * Directional fill light intensity for static key/fill/rim lights.
 *
 * @type {number}
 */
beestat.component.scene.directional_light_intensity = 0.1;

/**
 * Peak directional sunlight intensity.
 *
 * @type {number}
 */
beestat.component.scene.sun_light_intensity = 0.6;

/**
 * Peak directional moonlight intensity before phase scaling.
 *
 * @type {number}
 */
beestat.component.scene.moon_light_intensity = 0.35;

/**
 * Number of star sprites generated in the sky dome.
 *
 * @type {number}
 */
beestat.component.scene.star_count = 900;

/**
 * Minimum star sprite size.
 *
 * @type {number}
 */
beestat.component.scene.star_min_size = 8;

/**
 * Maximum star sprite size.
 *
 * @type {number}
 */
beestat.component.scene.star_max_size = 34;

/**
 * Sidereal day duration in seconds used for starfield drift.
 *
 * @type {number}
 */
beestat.component.scene.sidereal_day_seconds = 86164.0905;

/**
 * Visual multiplier for subtle star drift (1 = full sidereal motion).
 *
 * @type {number}
 */
beestat.component.scene.star_drift_visual_factor = 0.12;

/**
 * Rerender the scene by removing the primary group, then re-adding it and the
 * floor plan. This avoids having to reconstruct everything and then also
 * having to manually save camera info etc.
 */
beestat.component.scene.prototype.rerender = function() {
  this.scene_.remove(this.main_group_);
  this.add_main_group_();
  this.add_floor_plan_();
  this.apply_appearance_rotation_to_lights_();

  // Ensure everything gets updated with the latest info.
  if (this.rendered_ === true) {
    this.update_();
  }
};

/**
 * Get an appearance value with fallback to default if not set.
 *
 * @param {string} key The appearance key to retrieve.
 *
 * @return {*} The appearance value.
 */
beestat.component.scene.prototype.get_appearance_value_ = function(key) {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  if (floor_plan.data.appearance && floor_plan.data.appearance[key] !== undefined) {
    return floor_plan.data.appearance[key];
  }
  return beestat.component.scene.default_appearance[key];
};

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
 * Set the width of this component.
 *
 * @param {number} width
 */
beestat.component.scene.prototype.set_width = function(width) {
  this.width_ = width;

  this.camera_.aspect = this.width_ / this.height_;
  this.camera_.updateProjectionMatrix();

  this.renderer_.setSize(this.width_, this.height_);
};

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.decorate_ = function(parent) {
  const self = this;

  // Prevent re-initialization if already decorated
  if (this.scene_ !== undefined) {
    return;
  }

  // Dark background to help reduce apparant flicker when resizing
  parent.style('background', '#202a30');

  this.debug_ = {
    'axes': false,
    'directional_light_helpers': false,
    'sun_light_helper': false,
    'moon_light_helper': false,
    'watcher': false,
    'roof_edges': false,
    'straight_skeleton': false
  };

  this.width_ = this.state_.scene_width || 800;
  this.height_ = 500;

  this.add_scene_(parent);
  this.add_renderer_(parent);
  this.add_camera_();
  this.add_controls_(parent);
  this.add_raycaster_(parent);
  this.add_skybox_(parent);
  this.add_static_lights_();

  this.add_main_group_();
  this.add_floor_plan_();

  const animate = function() {
    self.animation_frame_ = window.requestAnimationFrame(animate);
    self.controls_.update();
    self.update_raycaster_();
    self.update_celestial_light_intensities_();
    self.update_weather_();
    self.renderer_.render(self.scene_, self.camera_);
  };
  animate();
};

/**
 * Add the scene. Everything gets added to the scene.
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.scene.prototype.add_scene_ = function(parent) {
  this.scene_ = new THREE.Scene();

  if (this.debug_.axes === true) {
    this.scene_.add(
      new THREE.AxesHelper(800)
        .setColors(
          0xff0000,
          0x00ff00,
          0x0000ff
        )
    );
  }

  if (this.debug_.watcher === true) {
    this.debug_info_ = {};
    this.debug_container_ = $.createElement('div').style({
      'position': 'absolute',
      'top': (beestat.style.size.gutter / 2),
      'left': (beestat.style.size.gutter / 2),
      'padding': (beestat.style.size.gutter / 2),
      'background': 'rgba(0, 0, 0, 0.5)',
      'color': '#fff',
      'font-family': 'Consolas, Courier, Monospace',
      'white-space': 'pre'
    });
    parent.appendChild(this.debug_container_);
  }
};

/**
 * Add the renderer.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_renderer_ = function(parent) {
  this.renderer_ = new THREE.WebGLRenderer({
    'antialias': true
  });

  this.renderer_.setPixelRatio(window.devicePixelRatio);
  this.renderer_.setSize(this.width_, this.height_);

  // Enable shadow maps
  this.renderer_.shadowMap.enabled = true;
  this.renderer_.shadowMap.type = THREE.PCFSoftShadowMap;

  parent[0].appendChild(this.renderer_.domElement);
};

/**
 * Add a camera and point it at the scene.
 */
beestat.component.scene.prototype.add_camera_ = function() {
  const field_of_view = 75;
  const aspect_ratio = window.innerWidth / window.innerHeight;
  const near_plane = 1;
  const far_plane = 100000;

  this.camera_ = new THREE.PerspectiveCamera(
    field_of_view,
    aspect_ratio,
    near_plane,
    far_plane
  );

  this.camera_.layers.enable(beestat.component.scene.layer_visible);
  this.camera_.layers.enable(beestat.component.scene.layer_outline);

  // Base camera position
  const base_x = 500;
  const base_y = 500;
  const base_z = 500;

  this.camera_.position.x = base_x;
  this.camera_.position.y = base_y;
  this.camera_.position.z = base_z;
};

/**
 * Add camera controls.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_controls_ = function(parent) {
  this.controls_ = new THREE.OrbitControls(this.camera_, parent[0]);
  this.controls_.enableDamping = true;
  this.controls_.enablePan = true;
  this.controls_.maxDistance = 1500;
  this.controls_.minDistance = 120;
  this.controls_.maxPolarAngle = Math.PI / 2.1;
};

/**
 * Initialize a click.
 *
 * @param {Event} e
 */
beestat.component.scene.prototype.mousedown_handler_ = function(e) {
  // Don't propagate to things under me.
  e.stopPropagation();

  this.mousemove_handler_ = this.mousemove_handler_.bind(this);
  window.addEventListener('mousemove', this.mousemove_handler_);
  window.addEventListener('touchmove', this.mousemove_handler_);

  this.mouseup_handler_ = this.mouseup_handler_.bind(this);
  window.addEventListener('mouseup', this.mouseup_handler_);
  window.addEventListener('touchend', this.mouseup_handler_);

  this.dragged_ = false;
};

/**
 * Added after mousedown, so when the mouse moves just set dragged = true.
 */
beestat.component.scene.prototype.mousemove_handler_ = function() {
  this.dragged_ = true;
};

/**
 * Set an active mesh if it wasn't a drag.
 */
beestat.component.scene.prototype.mouseup_handler_ = function() {
  window.removeEventListener('mousemove', this.mousemove_handler_);
  window.removeEventListener('touchmove', this.mousemove_handler_);
  window.removeEventListener('mouseup', this.mouseup_handler_);
  window.removeEventListener('touchend', this.mouseup_handler_);

  if (this.dragged_ === false) {
    this.active_mesh_ = this.intersected_mesh_;
    this.dispatchEvent('change_active_room');
    this.update_();
  }
};

/**
 * Add the raycaster.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_raycaster_ = function() {
  const self = this;

  this.raycaster_ = new THREE.Raycaster();
  this.raycaster_.layers.set(beestat.component.scene.layer_visible);

  /**
   * Initialize a pointer representing the raycaster. Initialize it pointing
   * way off screen instead of 0,0 so nothing starts thinking the mouse is
   * over it.
   */
  this.raycaster_pointer_ = new THREE.Vector2(10000, 10000);

  // TODO remove event listener on dispose
  document.addEventListener('mousemove', function(e) {
    const rect = self.renderer_.domElement.getBoundingClientRect();
    self.raycaster_pointer_.x = ( ( e.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    self.raycaster_pointer_.y = - ( ( e.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
  });
  // TODO remove event listener on dispose
  this.renderer_.domElement.addEventListener('mousedown', this.mousedown_handler_.bind(this));
  this.renderer_.domElement.addEventListener('touchstart', this.mousedown_handler_.bind(this));
};

/**
 * Update the raycaster.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.update_raycaster_ = function() {
  if (this.raycaster_ !== undefined) {
    this.raycaster_.setFromCamera(this.raycaster_pointer_, this.camera_);
    const intersects = this.raycaster_.intersectObject(this.scene_);

    // Clear any existing intersects.
    if (this.intersected_mesh_ !== undefined) {
      document.body.style.cursor = '';
      if (
        this.intersected_mesh_.material !== undefined &&
        this.intersected_mesh_.material.emissive !== undefined
      ) {
        this.intersected_mesh_.material.emissive.setHex(0x000000);
      }
      delete this.intersected_mesh_;
    }

    // Set intersect.
    for (let i = 0; i < intersects.length; i++) {
      if (
        intersects[i].object.type === 'Mesh' &&
        intersects[i].object.material !== undefined &&
        intersects[i].object.material.emissive !== undefined &&
        intersects[i].object.userData.is_wall !== true &&
        intersects[i].object.userData.is_surface !== true &&
        intersects[i].object.userData.is_roof !== true &&
        intersects[i].object.userData.is_environment !== true &&
        intersects[i].object.userData.is_celestial_object !== true
      ) {
        this.intersected_mesh_ = intersects[i].object;
        break;
      }
    }

    // Style intersect.
    if (this.intersected_mesh_ !== undefined) {
      this.intersected_mesh_.material.emissive.setHex(0xffffff);
      this.intersected_mesh_.material.emissiveIntensity = 0.1;
      document.body.style.cursor = 'pointer';
    }
  }
};

/**
 * Add a skybox background. Generated using Spacescape with the Unity export
 * settings. After export: bottom is rotated CW 90°; top is roted 90°CCW.
 *
 * nx -> bk
 * ny -> dn
 * nz -> lf
 * px -> ft
 * py -> up
 * pz -> rt
 *
 * @link https://www.mapcore.org/topic/24535-online-tools-to-convert-cubemaps-to-panoramas-and-vice-versa/
 * @link https://jaxry.github.io/panorama-to-cubemap/
 * @link http://alexcpeterson.com/spacescape/
 */
beestat.component.scene.prototype.add_skybox_ = function() {
  const loader = new THREE.CubeTextureLoader();
  loader.setPath('img/visualize/skybox/');
  const texture = loader.load([
    'front.png',
    'back.png',
    'up.png',
    'down.png',
    'right.png',
    'left.png'
  ]);
  this.scene_.background = texture;
};

/**
 * Create a radial glow texture used for the sun halo sprite.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_sun_glow_texture_ = function() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  gradient.addColorStop(0.0, 'rgba(255, 255, 235, 1.0)');
  gradient.addColorStop(0.25, 'rgba(255, 230, 150, 0.75)');
  gradient.addColorStop(0.6, 'rgba(255, 170, 80, 0.25)');
  gradient.addColorStop(1.0, 'rgba(255, 120, 50, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Create a soft star sprite texture.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_star_texture_ = function() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(245, 250, 255, 0.95)');
  gradient.addColorStop(0.65, 'rgba(210, 225, 255, 0.25)');
  gradient.addColorStop(1.0, 'rgba(200, 220, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Create a circular particle texture for snow.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_snow_particle_texture_ = function() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.4, 'rgba(245, 250, 255, 0.9)');
  gradient.addColorStop(1.0, 'rgba(240, 245, 255, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Create a streak-like particle texture for rain.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_rain_particle_texture_ = function() {
  const width = 24;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0.0, 'rgba(170, 200, 255, 0.0)');
  gradient.addColorStop(0.25, 'rgba(185, 210, 255, 0.85)');
  gradient.addColorStop(1.0, 'rgba(170, 200, 255, 0.0)');

  context.fillStyle = gradient;
  context.fillRect(width / 2 - 2, 0, 4, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Create a soft cloud texture used for weather cloud sprites.
 *
 * @return {THREE.Texture}
 */
beestat.component.scene.prototype.create_cloud_texture_ = function() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  const circles = [
    {'x': 0.36, 'y': 0.56, 'r': 0.2},
    {'x': 0.5, 'y': 0.5, 'r': 0.24},
    {'x': 0.64, 'y': 0.56, 'r': 0.2},
    {'x': 0.5, 'y': 0.64, 'r': 0.22}
  ];

  circles.forEach(function(circle) {
    const gradient = context.createRadialGradient(
      size * circle.x,
      size * circle.y,
      0,
      size * circle.x,
      size * circle.y,
      size * circle.r
    );
    gradient.addColorStop(0.0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.55, 'rgba(240,245,255,0.55)');
    gradient.addColorStop(1.0, 'rgba(240,245,255,0.0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size * circle.x, size * circle.y, size * circle.r, 0, Math.PI * 2);
    context.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * Draw the moon phase into the reusable moon canvas texture.
 *
 * @param {number} phase Moon phase from SunCalc (0=new, 0.25=first quarter,
 *   0.5=full, 0.75=last quarter).
 */
beestat.component.scene.prototype.update_moon_phase_texture_ = function(phase) {
  if (this.moon_phase_canvas_ === undefined) {
    this.moon_phase_canvas_ = document.createElement('canvas');
    this.moon_phase_canvas_.width = 256;
    this.moon_phase_canvas_.height = 256;
    this.moon_phase_texture_ = new THREE.CanvasTexture(this.moon_phase_canvas_);
  }

  const canvas = this.moon_phase_canvas_;
  const context = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = 110;

  context.clearRect(0, 0, size, size);

  // Base dark moon disk.
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = '#2f3442';
  context.fill();

  // Lit region generated procedurally from phase (no image assets).
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.clip();

  context.fillStyle = '#dde3ef';
  const terminator = radius * Math.cos(2 * Math.PI * phase);
  const waxing = phase <= 0.5;
  for (let y = -radius; y <= radius; y++) {
    const x_edge = Math.sqrt(Math.max(0, radius * radius - y * y));
    // Curved terminator produces natural crescent/gibbous shapes.
    const x_terminator = terminator * Math.sqrt(Math.max(0, 1 - (y * y) / (radius * radius)));
    let x_start;
    let x_end;
    if (waxing) {
      x_start = Math.max(-x_edge, x_terminator);
      x_end = x_edge;
    } else {
      x_start = -x_edge;
      x_end = Math.min(x_edge, -x_terminator);
    }

    if (x_end > x_start) {
      context.fillRect(center + x_start, center + y, x_end - x_start, 1);
    }
  }
  context.restore();

  // Subtle rim to keep the disk readable on the skybox.
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  context.lineWidth = 2;
  context.stroke();

  this.moon_phase_texture_.needsUpdate = true;
};

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

  // Configure shadow camera frustum
  this.sun_light_.shadow.camera.left = -1000;
  this.sun_light_.shadow.camera.right = 1000;
  this.sun_light_.shadow.camera.top = 1000;
  this.sun_light_.shadow.camera.bottom = -1000;
  this.sun_light_.shadow.camera.near = 0.5;
  this.sun_light_.shadow.camera.far = 5000;
  this.sun_light_.shadow.camera.updateProjectionMatrix();

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

  const sun_core_geometry = new THREE.SphereGeometry(180, 24, 24);
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
  this.sun_glow_sprite_.scale.set(1280, 1280, 1);
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

  // Configure shadow camera frustum
  this.moon_light_.shadow.camera.left = -1000;
  this.moon_light_.shadow.camera.right = 1000;
  this.moon_light_.shadow.camera.top = 1000;
  this.moon_light_.shadow.camera.bottom = -1000;
  this.moon_light_.shadow.camera.near = 0.5;
  this.moon_light_.shadow.camera.far = 5000;
  this.moon_light_.shadow.camera.updateProjectionMatrix();

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
  this.moon_sprite_.scale.set(500, 500, 1);
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
  for (let i = 0; i < beestat.component.scene.star_count; i++) {
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

  // Calculate target intensity for smooth transitions
  this.target_sun_intensity_ = sun_pos.altitude < 0
    ? Math.max(0, beestat.component.scene.sun_light_intensity * (1 + sun_pos.altitude / (Math.PI / 6)))
    : beestat.component.scene.sun_light_intensity;
  this.target_sun_intensity_ *= cloud_dimming;

  // Fade stars out at day and in at night.
  this.target_star_visibility_ = Math.max(
    0,
    Math.min(1, (-sun_pos.altitude - 0.05) / 0.25)
  );

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

  // Lerp factor - lower = smoother but slower, higher = faster but jumpier
  const lerp_factor = 0.05;

  // Lerp sun intensity
  this.sun_light_.intensity += (this.target_sun_intensity_ - this.sun_light_.intensity) * lerp_factor;

  // Lerp moon intensity
  this.moon_light_.intensity += (this.target_moon_intensity_ - this.moon_light_.intensity) * lerp_factor;

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
 * Update the scene based on the currently set date.
 */
beestat.component.scene.prototype.update_ = function() {
  const self = this;

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const time = this.date_.format('HH:mm');

  // Set the color of each room
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      const value_sprite = self.meshes_[room.room_id].userData.sprites.value;
      const icon_sprite = self.meshes_[room.room_id].userData.sprites.icon;

      // Room outline
      if (self.meshes_[room.room_id] === self.active_mesh_) {
        self.meshes_[room.room_id].userData.outline.visible = true;
      } else {
        self.meshes_[room.room_id].userData.outline.visible = false;
      }

      let color;
      if (
        room.sensor_id !== undefined &&
        self.data_.series[self.data_type_][room.sensor_id] !== undefined &&
        self.data_.series[self.data_type_][room.sensor_id][time] !== undefined
      ) {
        const value = self.data_.series[self.data_type_][room.sensor_id][time];

        /**
         * Set the percentage between the min and max. Special case for if min
         * and max are equal to avoid math issues.
         */
        let percentage;
        if (
          self.heat_map_min_ === self.heat_map_max_ &&
          value === self.heat_map_min_
        ) {
          percentage = 0.5;
        } else {
          percentage = Math.min(
            1,
            Math.max(
              0,
              (value - self.heat_map_min_) / (self.heat_map_max_ - self.heat_map_min_)
            )
          );
        }

        color = beestat.style.rgb_to_hex(
          self.gradient_[Math.floor((self.gradient_.length - 1) * percentage)]
        );

        // TODO this technically doesn't handle if both heating and cooling is active in a range
        const sensor = beestat.cache.sensor[room.sensor_id];
        let icon;
        let icon_opacity;
        if (sensor !== undefined) {
          if (
            self.data_.series.compressor_cool_1[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.compressor_cool_1[sensor.thermostat_id][time] > 0
          ) {
            icon = 'snowflake';
            icon_opacity = self.data_.series.compressor_cool_1[sensor.thermostat_id][time];
          } else if (
            self.data_.series.compressor_cool_2[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.compressor_cool_2[sensor.thermostat_id][time] > 0
          ) {
            icon = 'snowflake';
            icon_opacity = self.data_.series.compressor_cool_2[sensor.thermostat_id][time];
          } else if (
            self.data_.series.compressor_heat_1[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.compressor_heat_1[sensor.thermostat_id][time] > 0
          ) {
            icon = 'fire';
            icon_opacity = self.data_.series.compressor_heat_1[sensor.thermostat_id][time];
          } else if (
            self.data_.series.compressor_heat_2[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.compressor_heat_2[sensor.thermostat_id][time] > 0
          ) {
            icon = 'fire';
            icon_opacity = self.data_.series.compressor_heat_2[sensor.thermostat_id][time];
          } else if (
            self.data_.series.auxiliary_heat_1[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.auxiliary_heat_1[sensor.thermostat_id][time] > 0
          ) {
            icon = 'fire';
            icon_opacity = self.data_.series.auxiliary_heat_1[sensor.thermostat_id][time];
          } else if (
            self.data_.series.auxiliary_heat_2[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.auxiliary_heat_2[sensor.thermostat_id][time] > 0
          ) {
            icon = 'fire';
            icon_opacity = self.data_.series.auxiliary_heat_2[sensor.thermostat_id][time];
          } else if (
            self.data_.series.fan[sensor.thermostat_id][time] !== undefined &&
            self.data_.series.fan[sensor.thermostat_id][time] > 0
          ) {
            icon = 'fan';
            icon_opacity = self.data_.series.fan[sensor.thermostat_id][time];
          }
          icon_opacity = Math.round(icon_opacity * 10) / 10;
        }

        // Labels
        if (
          self.labels_ === true ||
          self.meshes_[room.room_id] === self.active_mesh_
        ) {
          switch (self.data_type_) {
          case 'temperature':
            value_sprite.material = self.get_label_material_({
              'type': 'value',
              'value': beestat.temperature({
                'temperature': value,
                'type': 'string',
                'units': true
              })
            });
            icon_sprite.material = self.get_label_material_({
              'type': 'icon',
              'icon': icon,
              'color': 'rgba(255, 255, 255, ' + icon_opacity + ')'
            });
            break;
          case 'occupancy':
            value_sprite.material = self.get_label_material_({
              'type': 'value',
              'value': Math.round(value) + '%'
            });
            icon_sprite.material = self.get_blank_label_material_();
            break;
          }
        } else {
          value_sprite.material = self.get_blank_label_material_();
          icon_sprite.material = self.get_blank_label_material_();
        }
      } else {
        color = beestat.style.color.gray.dark;
        value_sprite.material = self.get_blank_label_material_();
        icon_sprite.material = self.get_blank_label_material_();
      }

      self.meshes_[room.room_id].material.color.setHex(color.replace('#', '0x'));
    });
  });

  // Update celestial lights (sun and moon) based on date and location
  if (this.date_ !== undefined && this.latitude_ !== undefined && this.longitude_ !== undefined) {
    this.update_celestial_lights_(this.date_, this.latitude_, this.longitude_);
  }

  this.update_tree_foliage_season_();

  // Update debug watcher
  if (this.debug_.watcher === true) {
    this.debug_info_.sun_light_intensity = this.sun_light_ !== undefined ? this.sun_light_.intensity.toFixed(3) : 'N/A';
    this.debug_info_.moon_light_intensity = this.moon_light_ !== undefined ? this.moon_light_.intensity.toFixed(3) : 'N/A';
    this.update_debug_();
  }
};

/**
 * Add a room. Room coordinates are absolute.
 *
 * @param {THREE.Group} layer The layer the room belongs to.
 * @param {object} group The group the room belongs to.
 * @param {object} room The room to add.
 */
beestat.component.scene.prototype.add_room_ = function(layer, group, room) {
  const self = this;

  const color = beestat.style.color.gray.dark;

  var clipper_offset = new ClipperLib.ClipperOffset();

  clipper_offset.AddPath(
    room.points,
    ClipperLib.JoinType.jtSquare,
    ClipperLib.EndType.etClosedPolygon
  );
  var clipper_hole = new ClipperLib.Path();
  clipper_offset.Execute(clipper_hole, -beestat.component.scene.room_wall_inset);

  // Just the floor plan
  const extrude_height = beestat.component.scene.room_floor_thickness;

  // Create a shape using the points of the room.
  const shape = new THREE.Shape();
  const first_point = clipper_hole[0].shift();
  shape.moveTo(first_point.x, first_point.y);
  clipper_hole[0].forEach(function(point) {
    shape.lineTo(point.x, point.y);
  });

  // Extrude the shape and create the mesh.
  const extrude_settings = {
    'depth': extrude_height,
    'bevelEnabled': false
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrude_settings
  );

  const material = new THREE.MeshStandardMaterial({
    'color': color,
    'roughness': 0.6,
    'metalness': 0.0
  });
  if (
    room.sensor_id === undefined ||
    beestat.cache.sensor[room.sensor_id] === undefined
  ) {
    const loader = new THREE.TextureLoader();
    loader.load(
      'img/visualize/stripe.png',
      function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.005, 0.005);
        material.map = texture;
        material.needsUpdate = true;
      }
    );
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -extrude_height - (room.elevation || group.elevation);

  // Enable shadow receiving for depth perception
  mesh.receiveShadow = true;

  // Translate the mesh to the room x/y position.
  mesh.translateX(room.x);
  mesh.translateY(room.y);

  // Store a reference to the mesh representing each room.
  if (this.meshes_ === undefined) {
    this.meshes_ = {};
  }

  // Allow me to go from room -> mesh and mesh -> room
  this.meshes_[room.room_id] = mesh;
  mesh.userData.room = room;

  layer.add(mesh);

  // Label
  mesh.userData.sprites = {};

  // Outline
  const edges_geometry = new THREE.EdgesGeometry(geometry);
  const outline = new THREE.LineSegments(
    edges_geometry,
    new THREE.LineBasicMaterial({
      'color': '#ffffff'
    })
  );
  outline.translateX(room.x);
  outline.translateY(room.y);
  outline.position.z = -extrude_height - (room.elevation || group.elevation);
  outline.visible = false;
  outline.layers.set(beestat.component.scene.layer_outline);
  mesh.userData.outline = outline;
  layer.add(outline);

  // Determine where the sprites will go.
  const geojson_polygon = [];
  room.points.forEach(function(point) {
    geojson_polygon.push([
      point.x,
      point.y
    ]);
  });
  const label_point = polylabel([geojson_polygon]);

  [
    'value',
    'icon'
  ].forEach(function(sprite_type) {
    const sprite_material = self.get_blank_label_material_();
    const sprite = new THREE.Sprite(sprite_material);

    // Scale to an appropriate-looking size.
    const scale_x = 0.14;
    const scale_y = scale_x * sprite_material.map.source.data.height / sprite_material.map.source.data.width;
    sprite.scale.set(scale_x, scale_y, 1);

    // Set center of sprite to bottom middle.
    sprite.center.set(0.5, 0);

    /**
     * Some arbitrary small number so the sprite is *just* above the room or
     * when you view from directly above sometimes they disappear.
     */
    const z_offset = 1;

    sprite.position.set(
      room.x + label_point[0],
      room.y + label_point[1],
      mesh.position.z - z_offset
    );
    layer.add(sprite);

    mesh.userData.sprites[sprite_type] = sprite;
  });
};

/**
 * Add a surface. Surface coordinates are relative to surface.x/y.
 *
 * @param {THREE.Group} layer The layer the surface belongs to.
 * @param {object} group The group the surface belongs to.
 * @param {object} surface The surface to add.
 */
beestat.component.scene.prototype.add_surface_ = function(layer, group, surface) {
  if (surface.points === undefined || surface.points.length < 3) {
    return;
  }

  const shape = new THREE.Shape();
  shape.moveTo(surface.points[0].x, surface.points[0].y);
  for (let i = 1; i < surface.points.length; i++) {
    shape.lineTo(surface.points[i].x, surface.points[i].y);
  }
  shape.closePath();

  const color = surface.color || '#9a9a96';
  const height = Math.max(0, Number(surface.height || 0));
  const elevation = surface.elevation || group.elevation || 0;
  const z_lift = beestat.component.scene.surface_z_lift;

  let geometry;
  let mesh_position_z;
  if (height > 0) {
    geometry = new THREE.ExtrudeGeometry(
      shape,
      {
        'depth': height,
        'bevelEnabled': false
      }
    );
    // Keep top of the surface slightly above its base plane.
    mesh_position_z = -height - elevation - z_lift;
  } else {
    geometry = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lies on z=0, so place it just above the base plane.
    mesh_position_z = -elevation - z_lift;
  }

  const material = new THREE.MeshStandardMaterial({
    'color': color,
    'roughness': 0.9,
    'metalness': 0.0,
    'side': THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mesh_position_z;
  mesh.translateX(surface.x || 0);
  mesh.translateY(surface.y || 0);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData.is_environment = true;
  mesh.userData.is_surface = true;
  mesh.userData.base_surface_color = color;

  layer.add(mesh);
};

/**
 * Add all floor-plan surfaces to the environment layer.
 *
 * @param {THREE.Group} layer The environment surfaces layer.
 */
beestat.component.scene.prototype.add_surfaces_to_environment_ = function(layer) {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  floor_plan.data.groups.forEach(function(group) {
    (group.surfaces || []).forEach(function(surface) {
      self.add_surface_(layer, group, surface);
    });
  });
};

/**
 * Add exterior walls for a group. For each room, the room polygon is offset
 * outward by wall_thickness, then the union of all rooms is subtracted. This
 * leaves only exterior wall segments at the correct per-room height.
 *
 * @param {THREE.Group} layer The layer to add walls to.
 * @param {object} group The floor plan group.
 */
beestat.component.scene.prototype.add_walls_ = function(layer, group) {
  const wall_thickness = beestat.component.scene.wall_thickness;

  if (group.rooms.length === 0) {
    return;
  }

  // Convert all room polygons to absolute coordinates.
  const absolute_paths = [];
  group.rooms.forEach(function(room) {
    const absolute_path = [];
    room.points.forEach(function(point) {
      absolute_path.push({
        'x': room.x + point.x,
        'y': room.y + point.y
      });
    });
    absolute_paths.push(absolute_path);
  });

  // Union all room polygons (computed once per group).
  const union_clipper = new ClipperLib.Clipper();
  absolute_paths.forEach(function(path) {
    union_clipper.AddPath(
      path,
      ClipperLib.PolyType.ptSubject,
      true
    );
  });
  const all_rooms_union = new ClipperLib.Paths();
  union_clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    all_rooms_union,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  // For each room, compute exterior-only wall segments.
  for (var i = 0; i < group.rooms.length; i++) {
    const room = group.rooms[i];
    const abs_path = absolute_paths[i];

    // Offset this room's polygon outward by wall_thickness.
    const clipper_offset = new ClipperLib.ClipperOffset();
    clipper_offset.AddPath(
      abs_path,
      ClipperLib.JoinType.jtSquare,
      ClipperLib.EndType.etClosedPolygon
    );
    const outer = new ClipperLib.Paths();
    clipper_offset.Execute(outer, wall_thickness);

    // Subtract the all-rooms union from the outer offset.
    // What remains is only exterior wall segments for this room.
    const diff_clipper = new ClipperLib.Clipper();
    outer.forEach(function(path) {
      diff_clipper.AddPath(path, ClipperLib.PolyType.ptSubject, true);
    });
    all_rooms_union.forEach(function(path) {
      diff_clipper.AddPath(path, ClipperLib.PolyType.ptClip, true);
    });
    const wall_paths = new ClipperLib.Paths();
    diff_clipper.Execute(
      ClipperLib.ClipType.ctDifference,
      wall_paths,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero
    );

    if (wall_paths.length === 0) {
      continue;
    }

    const wall_height = room.height || group.height || 96;
    const elevation = room.elevation || group.elevation || 0;

    // Separate paths into outer boundaries and holes based on area sign.
    // Clipper returns CCW paths (positive area) as outers and CW paths
    // (negative area) as holes.
    const outers = [];
    const hole_paths = [];
    for (var j = 0; j < wall_paths.length; j++) {
      const points = wall_paths[j];
      if (points.length < 3) {
        continue;
      }
      const area = ClipperLib.Clipper.Area(points);
      if (Math.abs(area) < 1) {
        continue;
      }
      if (area > 0) {
        outers.push(points);
      } else {
        hole_paths.push(points);
      }
    }

    // Create a mesh for each outer boundary, attaching any contained holes.
    for (var j = 0; j < outers.length; j++) {
      const outer_points = outers[j];

      const shape = new THREE.Shape();
      shape.moveTo(outer_points[0].x, outer_points[0].y);
      for (var k = 1; k < outer_points.length; k++) {
        shape.lineTo(outer_points[k].x, outer_points[k].y);
      }

      // Add holes that are inside this outer boundary.
      for (var h = 0; h < hole_paths.length; h++) {
        if (
          ClipperLib.Clipper.PointInPolygon(
            hole_paths[h][0],
            outer_points
          ) !== 0
        ) {
          const hole = new THREE.Path();
          hole.moveTo(hole_paths[h][0].x, hole_paths[h][0].y);
          for (var m = 1; m < hole_paths[h].length; m++) {
            hole.lineTo(hole_paths[h][m].x, hole_paths[h][m].y);
          }
          shape.holes.push(hole);
        }
      }

      const geometry = new THREE.ExtrudeGeometry(
        shape,
        {
          'depth': wall_height,
          'bevelEnabled': false
        }
      );

      const siding_color = this.get_appearance_value_('siding_color');
      const material = new THREE.MeshStandardMaterial({
        'color': siding_color,
        'roughness': 0.7,
        'metalness': 0.0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -wall_height - elevation;
      mesh.userData.is_wall = true;
      mesh.layers.set(beestat.component.scene.layer_visible);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      layer.add(mesh);
    }
  }
};

/**
 * Add a helpful debug window that can be refreshed with the contents of
 * this.debug_info_.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_debug_ = function(parent) {
  if (this.debug_.watcher === true) {
    this.debug_info_ = {};
    this.debug_container_ = $.createElement('div').style({
      'position': 'absolute',
      'top': (beestat.style.size.gutter / 2),
      'left': (beestat.style.size.gutter / 2),
      'padding': (beestat.style.size.gutter / 2),
      'background': 'rgba(0, 0, 0, 0.5)',
      'color': '#fff',
      'font-family': 'Consolas, Courier, Monospace',
      'white-space': 'pre'
    });
    parent.appendChild(this.debug_container_);
  }
};

/**
 * Update the debug window.
 */
beestat.component.scene.prototype.update_debug_ = function() {
  if (this.debug_.watcher === true) {
    this.debug_container_.innerHTML(
      JSON.stringify(this.debug_info_, null, 2)
    );
  }
};

/**
 * Get a finite bounding box for scene layout. Empty floor plans can report
 * Infinity bounds; clamp those to a reasonable fallback around origin.
 *
 * @return {{left:number,right:number,top:number,bottom:number,width:number,height:number,x:number,y:number}}
 */
beestat.component.scene.prototype.get_scene_bounding_box_ = function() {
  const bounding_box = beestat.floor_plan.get_bounding_box(this.floor_plan_id_);

  const is_finite_box =
    Number.isFinite(bounding_box.left) &&
    Number.isFinite(bounding_box.right) &&
    Number.isFinite(bounding_box.top) &&
    Number.isFinite(bounding_box.bottom);

  if (is_finite_box === true) {
    return bounding_box;
  }

  const fallback_half_size = 180;
  return {
    'left': -fallback_half_size,
    'right': fallback_half_size,
    'top': -fallback_half_size,
    'bottom': fallback_half_size,
    'width': fallback_half_size * 2,
    'height': fallback_half_size * 2,
    'x': -fallback_half_size,
    'y': -fallback_half_size
  };
};

/**
 * Add a group containing all of the extruded geometry that can be transformed
 * all together.
 */
beestat.component.scene.prototype.add_main_group_ = function() {
  const bounding_box = this.get_scene_bounding_box_();

  // Main group handles orientation and centering
  this.main_group_ = new THREE.Group();

  // Center the floor plan at origin (accounting for bounding box offset)
  this.main_group_.position.set(
    (bounding_box.right + bounding_box.left) / -2,
    0,
    (bounding_box.bottom + bounding_box.top) / -2
  );

  // Apply X rotation to orient the floor plan
  this.main_group_.rotation.x = Math.PI / 2;

  this.scene_.add(this.main_group_);
};

/**
 * Add the floor plan to the scene.
 */
beestat.component.scene.prototype.add_floor_plan_ = function() {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  // Initialize layers if not already done
  if (this.layers_ === undefined) {
    this.layers_ = {};
  }

  // Create floor plan group for walls, rooms, and roofs
  this.floor_plan_group_ = new THREE.Group();
  this.main_group_.add(this.floor_plan_group_);
  this.layers_['floor_plan'] = this.floor_plan_group_;

  const walls_layer = new THREE.Group();
  self.floor_plan_group_.add(walls_layer);
  self.layers_['walls'] = walls_layer;

  floor_plan.data.groups.forEach(function(group) {
    const layer = new THREE.Group();
    self.floor_plan_group_.add(layer);
    self.layers_[group.group_id] = layer;
    group.rooms.forEach(function(room) {
      self.add_room_(layer, group, room);
    });
    self.add_walls_(walls_layer, group);
  });

  // Add roofs using straight skeleton
  this.add_roofs_();

  if (this.debug_.roof_edges) {
    this.add_roof_outline_debug_();
  }

  if (this.debug_.straight_skeleton) {
    this.add_roof_skeleton_debug_();
  }

  this.add_environment_();
};

/**
 * Get the ceiling Z-position for a room.
 *
 * @param {object} group The floor plan group
 * @param {object} room The room
 *
 * @return {number} The ceiling Z position
 */
beestat.component.scene.prototype.get_ceiling_z_ = function(group, room) {
  const elevation = room.elevation || group.elevation || 0;
  const height = room.height || group.height || 96;
  return -(elevation + height);
};

/**
 * Convert room.points (relative coordinates) to absolute coordinates.
 *
 * @param {object} room The room
 *
 * @return {Array} Array of absolute coordinate points {x, y}
 */
beestat.component.scene.prototype.convert_room_to_absolute_polygon_ = function(room) {
  const absolute = [];
  room.points.forEach(function(point) {
    absolute.push({
      'x': room.x + point.x,
      'y': room.y + point.y
    });
  });
  return absolute;
};

/**
 * Compute which ceiling areas are exposed (not covered by floors above).
 *
 * @param {object} floor_plan The floor plan
 *
 * @return {Array} Array of {ceiling_z, polygons[]} for roof outline rendering
 */
beestat.component.scene.prototype.compute_exposed_ceiling_areas_ = function(floor_plan) {
  const self = this;

  // Step 1: Group ceilings by Z-level
  const ceiling_levels = {}; // Key: ceiling_z, Value: array of room polygons

  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      const elevation = room.elevation || group.elevation || 0;

      // Skip basements (below ground)
      if (elevation < 0) {
        return;
      }

      const ceiling_z = self.get_ceiling_z_(group, room);

      if (!ceiling_levels[ceiling_z]) {
        ceiling_levels[ceiling_z] = [];
      }

      ceiling_levels[ceiling_z].push(
        self.convert_room_to_absolute_polygon_(room)
      );
    });
  });

  // Step 2: Sort ceiling levels (ascending Z = highest to lowest)
  const sorted_levels = Object.keys(ceiling_levels)
    .map(z => parseFloat(z))
    .sort((a, b) => a - b);

  const exposed_areas = [];

  // Step 3: For each level, compute exposed area
  sorted_levels.forEach(function(current_ceiling_z, index) {
    const current_polygons = ceiling_levels[current_ceiling_z];

    // Union all rooms at this level
    const union_clipper = new ClipperLib.Clipper();
    current_polygons.forEach(function(polygon) {
      union_clipper.AddPath(polygon, ClipperLib.PolyType.ptSubject, true);
    });

    const ceiling_area = new ClipperLib.Paths();
    union_clipper.Execute(
      ClipperLib.ClipType.ctUnion,
      ceiling_area,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero
    );

    // Compute occlusion from all higher levels
    const occlusion_clipper = new ClipperLib.Clipper();
    let has_occlusion = false;

    for (let i = 0; i < index; i++) {
      const above_ceiling_z = sorted_levels[i];
      const above_polygons = ceiling_levels[above_ceiling_z];

      above_polygons.forEach(function(polygon) {
        occlusion_clipper.AddPath(polygon, ClipperLib.PolyType.ptSubject, true);
        has_occlusion = true;
      });
    }

    let exposed;

    if (!has_occlusion) {
      // Top floor - no occlusion, entire ceiling is exposed
      exposed = ceiling_area;
    } else {
      // Compute union of all occlusion polygons
      const occlusion_area = new ClipperLib.Paths();
      occlusion_clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        occlusion_area,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
      );

      // Subtract occlusion from ceiling
      const diff_clipper = new ClipperLib.Clipper();
      ceiling_area.forEach(function(path) {
        diff_clipper.AddPath(path, ClipperLib.PolyType.ptSubject, true);
      });
      occlusion_area.forEach(function(path) {
        diff_clipper.AddPath(path, ClipperLib.PolyType.ptClip, true);
      });

      exposed = new ClipperLib.Paths();
      diff_clipper.Execute(
        ClipperLib.ClipType.ctDifference,
        exposed,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
      );
    }

    // Filter out tiny polygons (floating-point artifacts)
    const filtered = exposed.filter(function(path) {
      return Math.abs(ClipperLib.Clipper.Area(path)) > 1;
    });

    if (filtered.length > 0) {
      exposed_areas.push({
        'ceiling_z': current_ceiling_z,
        'polygons': filtered
      });
    }
  });

  return exposed_areas;
};

/**
 * Generate 3D roofs using straight skeleton algorithm.
 * Creates sloped roof surfaces with proper ridge lines and hip/valley geometry.
 */
/**
 * Add roofs to the scene based on the configured roof style.
 */
beestat.component.scene.prototype.add_roofs_ = function() {
  const skeleton_builder = this.get_skeleton_builder_();
  const roof_style = this.get_appearance_value_('roof_style');

  if (roof_style === 'flat') {
    this.add_flat_roofs_();
  } else if (roof_style === 'hip' && skeleton_builder !== undefined) {
    this.add_hip_roofs_(skeleton_builder);
  } else {
    if (roof_style === 'hip') {
      this.listen_for_skeleton_builder_ready_();
    }
    this.add_flat_roofs_();
  }
};

/**
 * Add hip roofs using the straight skeleton algorithm.
 *
 * @param {object} skeleton_builder
 */
beestat.component.scene.prototype.add_hip_roofs_ = function(skeleton_builder) {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);
  const roof_color = this.get_appearance_value_('roof_color');

  // Create layer for roofs
  const roofs_layer = new THREE.Group();
  this.floor_plan_group_.add(roofs_layer);
  this.layers_['roof'] = roofs_layer;

  const roof_pitch = beestat.component.scene.roof_pitch;

  // Process each exposed area
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      try {
        // Simplify polygon to handle complex shapes
        const simplified = ClipperLib.Clipper.SimplifyPolygon(
          polygon,
          ClipperLib.PolyFillType.pftNonZero
        );

        simplified.forEach(function(simple_polygon) {
          if (simple_polygon.length < 3) {
            return;
          }

          // Add roof overhang by offsetting polygon outward
          const roof_overhang = beestat.component.scene.roof_overhang;
          const clipper_offset = new ClipperLib.ClipperOffset();
          clipper_offset.AddPath(
            simple_polygon,
            ClipperLib.JoinType.jtMiter,
            ClipperLib.EndType.etClosedPolygon
          );
          const offset_polygons = new ClipperLib.Paths();
          clipper_offset.Execute(offset_polygons, roof_overhang);

          // Use the offset polygon if successful, otherwise use original
          const roof_polygon = (offset_polygons.length > 0) ? offset_polygons[0] : simple_polygon;

          // Add a thin base skirt under the hip roof to give the edge subtle thickness.
          const base_shape = new THREE.Shape();
          base_shape.moveTo(roof_polygon[0].x, roof_polygon[0].y);
          for (let i = 1; i < roof_polygon.length; i++) {
            base_shape.lineTo(roof_polygon[i].x, roof_polygon[i].y);
          }
          base_shape.closePath();

          const hip_roof_base_thickness = 4;
          const base_geometry = new THREE.ExtrudeGeometry(base_shape, {
            'depth': hip_roof_base_thickness,
            'bevelEnabled': false
          });
          const base_material = new THREE.MeshStandardMaterial({
            'color': roof_color,
            'side': THREE.DoubleSide,
            'flatShading': false,
            'roughness': 0.85,
            'metalness': 0.0
          });
          const base_mesh = new THREE.Mesh(base_geometry, base_material);
          // Nudge downward so the top cap doesn't z-fight with hip roof faces.
          base_mesh.position.z = area.ceiling_z + 0.5;
          base_mesh.userData.is_roof = true;
          base_mesh.layers.set(beestat.component.scene.layer_visible);
          base_mesh.castShadow = true;
          base_mesh.receiveShadow = true;
          roofs_layer.add(base_mesh);

          // Convert to skeleton format
          const ring = roof_polygon.map(function(point) {
            return [point.x, point.y];
          });
          ring.push([roof_polygon[0].x, roof_polygon[0].y]);

          const coordinates = [ring];
          const result = skeleton_builder.buildFromPolygon(coordinates);

          if (!result) {
            return;
          }

          // Identify boundary vertices (first N vertices match input polygon)
          const boundary_vertex_count = roof_polygon.length;
          const boundary_set = new Set();
          for (let i = 0; i < boundary_vertex_count; i++) {
            boundary_set.add(i);
          }

          // Helper function to compute distance from point to polygon boundary
          const compute_distance_to_boundary = function(point_x, point_y) {
            let min_distance = Infinity;

            for (let i = 0; i < roof_polygon.length; i++) {
              const p1 = roof_polygon[i];
              const p2 = roof_polygon[(i + 1) % roof_polygon.length];

              // Calculate perpendicular distance from point to line segment
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const length_sq = dx * dx + dy * dy;

              if (length_sq === 0) {
                // Point to point distance
                const dist = Math.sqrt(
                  Math.pow(point_x - p1.x, 2) + Math.pow(point_y - p1.y, 2)
                );
                min_distance = Math.min(min_distance, dist);
                continue;
              }

              // Project point onto line segment
              let t = ((point_x - p1.x) * dx + (point_y - p1.y) * dy) / length_sq;
              t = Math.max(0, Math.min(1, t));

              const closest_x = p1.x + t * dx;
              const closest_y = p1.y + t * dy;

              const dist = Math.sqrt(
                Math.pow(point_x - closest_x, 2) + Math.pow(point_y - closest_y, 2)
              );

              min_distance = Math.min(min_distance, dist);
            }

            return min_distance;
          };

          // Create 3D vertices with heights based on distance from boundary
          const vertices_3d = result.vertices.map(function(vertex, index) {
            const is_boundary = boundary_set.has(index);
            let height = 0;

            if (!is_boundary) {
              // Interior skeleton vertex - raise it based on distance to boundary
              const distance = compute_distance_to_boundary(vertex[0], vertex[1]);
              height = distance * roof_pitch;
            }

            return new THREE.Vector3(
              vertex[0],
              vertex[1],
              area.ceiling_z - height  // Negative Z = higher in world coords
            );
          });

          // Create geometry from skeleton polygons
          result.polygons.forEach(function(face) {
            if (face.length < 3) {
              return;
            }

            // Create triangulated mesh for this face
            const face_vertices = face.map(function(idx) {
              return vertices_3d[idx];
            });

            // Triangulate the face (simple fan triangulation from first vertex)
            const triangles = [];
            for (let i = 1; i < face_vertices.length - 1; i++) {
              triangles.push(
                face_vertices[0],
                face_vertices[i],
                face_vertices[i + 1]
              );
            }

            // Create geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(triangles);
            geometry.computeVertexNormals();

            // Create material - use appearance roof color
            const material = new THREE.MeshStandardMaterial({
              'color': roof_color,
              'side': THREE.DoubleSide,
              'flatShading': false,
              'roughness': 0.8,
              'metalness': 0.0
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.is_roof = true;
            mesh.layers.set(beestat.component.scene.layer_visible);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            roofs_layer.add(mesh);
          });
        });
      } catch (error) {
        console.error('Error generating roof:', error, polygon);
      }
    });
  });
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

/**
 * Add flat roofs to the scene.
 */
beestat.component.scene.prototype.add_flat_roofs_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);
  const roof_color = this.get_appearance_value_('roof_color');

  // Create layer for roofs
  const roofs_layer = new THREE.Group();
  this.floor_plan_group_.add(roofs_layer);
  this.layers_['roof'] = roofs_layer;

  // Process each exposed area
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      try {
        // Simplify polygon to handle complex shapes
        const simplified = ClipperLib.Clipper.SimplifyPolygon(
          polygon,
          ClipperLib.PolyFillType.pftNonZero
        );

        simplified.forEach(function(simple_polygon) {
          if (simple_polygon.length < 3) {
            return;
          }

          // Add roof overhang by offsetting polygon outward
          const roof_overhang = beestat.component.scene.roof_overhang;
          const clipper_offset = new ClipperLib.ClipperOffset();
          clipper_offset.AddPath(
            simple_polygon,
            ClipperLib.JoinType.jtMiter,
            ClipperLib.EndType.etClosedPolygon
          );
          const offset_polygons = new ClipperLib.Paths();
          clipper_offset.Execute(offset_polygons, roof_overhang);

          // Use the offset polygon if successful, otherwise use original
          const roof_polygon = (offset_polygons.length > 0) ? offset_polygons[0] : simple_polygon;

          // Create flat roof shape
          const shape = new THREE.Shape();
          shape.moveTo(roof_polygon[0].x, roof_polygon[0].y);
          for (let i = 1; i < roof_polygon.length; i++) {
            shape.lineTo(roof_polygon[i].x, roof_polygon[i].y);
          }
          shape.closePath();

          // Create extruded geometry to give flat roof some depth
          const flat_roof_depth = 6; // 6 inches of depth
          const geometry = new THREE.ExtrudeGeometry(shape, {
            'depth': flat_roof_depth,
            'bevelEnabled': false
          });

          // Create material - use appearance roof color
          const material = new THREE.MeshStandardMaterial({
            'color': roof_color,
            'side': THREE.DoubleSide,
            'flatShading': false,
            'roughness': 0.9,  // Slightly higher roughness for flat roofs
            'metalness': 0.0
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.z = area.ceiling_z - flat_roof_depth;  // Position so top is at ceiling level
          mesh.userData.is_roof = true;
          mesh.layers.set(beestat.component.scene.layer_visible);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          roofs_layer.add(mesh);
        });
      } catch (error) {
        console.error('Error generating flat roof:', error, polygon);
      }
    });
  });
};

/**
 * Add red outline visualization for exposed ceiling areas (future roof locations).
 */
beestat.component.scene.prototype.add_roof_outline_debug_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);

  // Create layer for roof outlines
  const roof_outlines_layer = new THREE.Group();
  this.floor_plan_group_.add(roof_outlines_layer);
  this.layers_['roof_outlines'] = roof_outlines_layer;

  // Render each exposed area as red outline
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      // Create line points
      const points = [];
      polygon.forEach(function(point) {
        points.push(new THREE.Vector3(point.x, point.y, area.ceiling_z));
      });
      // Close the loop
      points.push(new THREE.Vector3(polygon[0].x, polygon[0].y, area.ceiling_z));

      // Create red line
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        'color': 0xff0000,  // Red
        'linewidth': 2
      });

      const line = new THREE.Line(geometry, material);
      line.layers.set(beestat.component.scene.layer_visible);
      roof_outlines_layer.add(line);
    });
  });
};

/**
 * Visualize the straight skeleton for each roof polygon with debug lines.
 */
beestat.component.scene.prototype.add_roof_skeleton_debug_ = function() {
  const skeleton_builder = this.get_skeleton_builder_();
  if (skeleton_builder === undefined) {
    return;
  }

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);

  // Create layer for skeleton debug lines
  const skeleton_debug_layer = new THREE.Group();
  this.floor_plan_group_.add(skeleton_debug_layer);
  this.layers_['roof_skeleton_debug'] = skeleton_debug_layer;

  let total_polygons = 0;
  let successful_skeletons = 0;

  // Process each exposed area
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      total_polygons++;

      try {
        // Simplify polygon to remove self-intersections and clean up topology
        // This splits complex polygons (L-shapes, T-shapes) into simpler ones
        const simplified = ClipperLib.Clipper.SimplifyPolygon(
          polygon,
          ClipperLib.PolyFillType.pftNonZero
        );

        // SimplifyPolygon can return multiple polygons if the original was self-intersecting
        simplified.forEach(function(simple_polygon) {
          if (simple_polygon.length < 3) {
            return;
          }

          // Convert ClipperLib format {x, y} to SkeletonBuilder format [[x, y], ...]
          const ring = simple_polygon.map(function(point) {
            return [point.x, point.y];
          });
          // Close the ring by repeating the first point
          ring.push([simple_polygon[0].x, simple_polygon[0].y]);

          // Build the straight skeleton
          const coordinates = [ring];  // Array of rings (outer ring only, no holes)
          const result = skeleton_builder.buildFromPolygon(coordinates);

          if (!result) {
            return;
          }

          successful_skeletons++;

          // Visualize each skeleton polygon face with blue lines
          result.polygons.forEach(function(face) {
            if (face.length < 2) {
              return;
            }

            // Create line points from the face vertices
            const points = [];
            face.forEach(function(vertex_index) {
              const vertex = result.vertices[vertex_index];
              points.push(new THREE.Vector3(vertex[0], vertex[1], area.ceiling_z));
            });
            // Close the loop
            const first_vertex = result.vertices[face[0]];
            points.push(new THREE.Vector3(first_vertex[0], first_vertex[1], area.ceiling_z));

            // Create blue line for skeleton edges
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
              'color': 0x00ffff,  // Cyan
              'linewidth': 1
            });

            const line = new THREE.Line(geometry, material);
            line.layers.set(beestat.component.scene.layer_visible);
            skeleton_debug_layer.add(line);
          });
        }); // End simplified.forEach
      } catch (error) {
        console.error('Error building skeleton for polygon:', error, polygon);
      }
    });
  });

};

/**
 * Get the straight-skeleton runtime when it has finished initializing.
 *
 * @return {object|undefined}
 */
beestat.component.scene.prototype.get_skeleton_builder_ = function() {
  if (window.SkeletonBuilderInitialized === true) {
    return window.SkeletonBuilder;
  }
  return undefined;
};

/**
 * If the skeleton runtime is still loading, listen for readiness and rerender
 * once so hip roofs replace fallback flat roofs.
 */
beestat.component.scene.prototype.listen_for_skeleton_builder_ready_ = function() {
  const self = this;

  if (this.skeleton_builder_ready_handler_ !== undefined) {
    return;
  }

  this.skeleton_builder_ready_handler_ = function() {
    if (self.skeleton_builder_ready_handler_ !== undefined) {
      window.removeEventListener('skeleton_builder_ready', self.skeleton_builder_ready_handler_);
      delete self.skeleton_builder_ready_handler_;
    }

    if (self.rendered_ === true) {
      self.rerender();
    }
  };

  window.addEventListener('skeleton_builder_ready', this.skeleton_builder_ready_handler_);
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
 * Build a radial alpha texture used for soft tree-ground contact decals.
 *
 * @return {?THREE.CanvasTexture}
 */
beestat.component.scene.prototype.create_tree_ground_contact_texture_ = function() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (context === null) {
    return null;
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.06,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  context.clearRect(0, 0, size, size);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
};

/**
 * Get shared material for soft trunk-to-ground blending.
 *
 * @return {THREE.MeshBasicMaterial}
 */
beestat.component.scene.prototype.get_tree_ground_contact_material_ = function() {
  if (this.tree_ground_contact_material_ !== undefined) {
    return this.tree_ground_contact_material_;
  }

  const texture = this.create_tree_ground_contact_texture_();
  this.tree_ground_contact_material_ = new THREE.MeshBasicMaterial({
    'color': 0x1a1208,
    'map': texture,
    'transparent': true,
    'opacity': 0.3,
    'depthWrite': false,
    'polygonOffset': true,
    'polygonOffsetFactor': -1,
    'polygonOffsetUnits': -2,
    'side': THREE.DoubleSide
  });

  return this.tree_ground_contact_material_;
};

/**
 * Add stylized root collar + soft contact shadow to blend tree base into terrain.
 *
 * @param {THREE.Group} tree
 * @param {number} trunk_radius
 * @param {number} trunk_color
 */
beestat.component.scene.prototype.add_tree_ground_contact_ = function(tree, trunk_radius, trunk_color) {
  const base_radius = Math.max(0.8, trunk_radius);
  const collar_height = Math.max(1.8, base_radius * 0.8);
  const collar_geometry = new THREE.CylinderGeometry(
    Math.max(1.1, base_radius * 1.5),
    Math.max(1.6, base_radius * 2.2),
    collar_height,
    7
  );
  collar_geometry.rotateX(-Math.PI / 2);
  const collar_color = new THREE.Color(trunk_color);
  collar_color.multiplyScalar(0.84 + (Math.random() * 0.08));
  const collar = new THREE.Mesh(
    collar_geometry,
    new THREE.MeshStandardMaterial({
      'color': collar_color,
      'roughness': 1.0,
      'metalness': 0.0
    })
  );
  collar.position.z = (collar_height / 2) - (Math.max(0.2, base_radius * 0.08));
  collar.rotation.z = Math.random() * Math.PI * 2;
  collar.castShadow = true;
  collar.receiveShadow = true;
  collar.userData.is_environment = true;
  tree.add(collar);

  const contact_radius = Math.max(2, base_radius * 2.05);
  const contact_geometry = new THREE.CircleGeometry(contact_radius, 14);
  const contact = new THREE.Mesh(
    contact_geometry,
    this.get_tree_ground_contact_material_()
  );
  contact.position.z = 0.06;
  contact.castShadow = false;
  contact.receiveShadow = false;
  contact.userData.is_environment = true;
  tree.add(contact);
};

/**
 * Create a low-poly conical tree with slight procedural variation.
 *
 * @param {number} height Total tree height.
 * @param {number} max_diameter Maximum foliage diameter.
 * @param {boolean} has_foliage Whether foliage should be rendered.
 *
 * @return {THREE.Group}
 */
beestat.component.scene.prototype.create_conical_tree_ = function(height, max_diameter, has_foliage) {
  const clamped_height = Math.max(40, height || 120);
  const clamped_diameter = Math.max(18, max_diameter || 48);
  const tree = new THREE.Group();
  tree.userData.is_environment = true;
  tree.userData.is_tree = true;

  const trunk_height_ratio = 0.2 + (Math.random() * 0.08);
  const trunk_height = clamped_height * trunk_height_ratio;
  const trunk_radius_top = Math.max(1.2, clamped_diameter * (0.045 + (Math.random() * 0.015)));
  const trunk_radius_bottom = trunk_radius_top * (1.25 + (Math.random() * 0.2));
  const trunk_geometry = new THREE.CylinderGeometry(
    trunk_radius_top,
    trunk_radius_bottom,
    trunk_height,
    6
  );
  trunk_geometry.rotateX(-Math.PI / 2);
  const trunk_material = new THREE.MeshStandardMaterial({
    'color': 0x5d4226,
    'roughness': 0.9,
    'metalness': 0.0
  });
  const trunk = new THREE.Mesh(trunk_geometry, trunk_material);
  trunk.position.z = -(trunk_height / 2) + Math.max(0.6, trunk_radius_bottom * 0.1);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.userData.is_environment = true;
  tree.add(trunk);
  this.add_tree_ground_contact_(tree, trunk_radius_bottom, 0x5d4226);

  if (has_foliage === false) {
    return tree;
  }

  const clamp01 = function(value) {
    return Math.max(0, Math.min(1, value));
  };

  const crown_height_target = Math.max(10, clamped_height - trunk_height);
  const base_foliage_color = new THREE.Color(0x2f7d2d);
  const base_hsl = {};
  base_foliage_color.getHSL(base_hsl);
  const tree_foliage_color = new THREE.Color().setHSL(
    clamp01(base_hsl.h + ((Math.random() - 0.5) * 0.03)),
    clamp01(base_hsl.s + ((Math.random() - 0.5) * 0.08)),
    clamp01(base_hsl.l + ((Math.random() - 0.5) * 0.08))
  );
  const foliage_material = new THREE.MeshStandardMaterial({
    'color': tree_foliage_color,
    'roughness': 0.85,
    'metalness': 0.0,
    'flatShading': true
  });
  const max_tilt_radians = Math.PI * 0.02;
  const max_segments = 10;
  let previous_apex_height = null;
  let previous_radius = null;
  let previous_segment_height = null;

  for (let i = 0; i < max_segments; i++) {
    let segment_height;
    let segment_base_height;
    if (i === 0) {
      segment_height = crown_height_target * (0.34 + (Math.random() * 0.14));
      segment_base_height = trunk_height * (0.9 + (Math.random() * 0.08));
    } else {
      segment_height = previous_segment_height * (0.94 + (Math.random() * 0.02));
      segment_height = Math.max(8, segment_height);
      const overlap = previous_segment_height * (0.5 + ((Math.random() - 0.5) * 0.06));
      segment_base_height = previous_apex_height - overlap;
    }

    const progress = Math.max(
      0,
      Math.min(1, (segment_base_height - trunk_height) / Math.max(1, crown_height_target))
    );
    const radius_variation = 0.9 + (Math.random() * 0.16);
    let radius = Math.max(
      2,
      ((clamped_diameter / 2) * (1 - (progress * 0.75))) * radius_variation
    );
    if (previous_radius !== null) {
      const overlap = previous_apex_height - segment_base_height;
      const previous_overlap_ratio = Math.max(
        0,
        Math.min(1, overlap / previous_segment_height)
      );
      const previous_overlap_radius = previous_radius * previous_overlap_ratio;
      const min_radius_for_overlap = previous_overlap_radius * (1.06 + (Math.random() * 0.05));
      const max_radius_for_taper = previous_radius * (0.94 + (Math.random() * 0.03));
      radius = Math.max(radius, min_radius_for_overlap);
      radius = Math.min(radius, max_radius_for_taper);
      if (radius < min_radius_for_overlap) {
        radius = min_radius_for_overlap;
      }
    }
    radius = Math.max(2, radius);

    const foliage_geometry = new THREE.ConeGeometry(radius, segment_height, 6);
    foliage_geometry.rotateX(-Math.PI / 2);
    const cone_material = foliage_material.clone();
    cone_material.color.offsetHSL(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.03,
      (Math.random() - 0.5) * 0.03
    );
    const foliage_mesh = new THREE.Mesh(foliage_geometry, cone_material);
    foliage_mesh.position.z = -(segment_base_height + (segment_height / 2));
    const tilt_direction = Math.random() * Math.PI * 2;
    const tilt_amount = Math.random() * max_tilt_radians;
    foliage_mesh.rotation.x = Math.cos(tilt_direction) * tilt_amount;
    foliage_mesh.rotation.y = Math.sin(tilt_direction) * tilt_amount;
    foliage_mesh.rotation.z = (Math.random() - 0.5) * 0.2;
    foliage_mesh.castShadow = true;
    foliage_mesh.receiveShadow = true;
    foliage_mesh.userData.is_environment = true;
    foliage_mesh.userData.is_tree_foliage = true;
    foliage_mesh.userData.base_tree_foliage_color = foliage_mesh.material.color.getHex();
    tree.add(foliage_mesh);

    previous_apex_height = segment_base_height + segment_height;
    previous_radius = radius;
    previous_segment_height = segment_height;

    if (previous_apex_height >= clamped_height) {
      break;
    }
  }

  return tree;
};

/**
 * Sample XY offset from a stick curve at a height measured from the stick base.
 *
 * @param {{controls: Array<{x: number, y: number}>, height: number}} curve
 * @param {number} height_from_base
 *
 * @return {{x: number, y: number}}
 */
beestat.component.scene.prototype.sample_stick_curve_offset_ = function(curve, height_from_base) {
  if (
    curve === undefined ||
    curve.controls === undefined ||
    curve.controls.length < 2 ||
    curve.height === undefined ||
    curve.height <= 0
  ) {
    return {'x': 0, 'y': 0};
  }

  const t = Math.max(0, Math.min(1, height_from_base / curve.height));
  const scaled = t * (curve.controls.length - 1);
  const index = Math.floor(scaled);
  const next_index = Math.min(curve.controls.length - 1, index + 1);
  const blend = scaled - index;

  return {
    'x': THREE.MathUtils.lerp(curve.controls[index].x, curve.controls[next_index].x, blend),
    'y': THREE.MathUtils.lerp(curve.controls[index].y, curve.controls[next_index].y, blend)
  };
};

/**
 * Create a low-poly tapered stick mesh with slight bend.
 *
 * @param {object} config
 *
 * @return {{mesh: THREE.Mesh, curve: {controls: Array<{x: number, y: number}>, height: number}, radius_top: number, radius_bottom: number, height: number}}
 */
beestat.component.scene.prototype.create_stick_mesh_ = function(config) {
  const height = Math.max(1, config.height || 10);
  const radius_bottom = Math.max(0.15, config.radius_bottom || 1);
  const taper_end_ratio = config.taper_end_ratio === undefined
    ? null
    : Math.max(0, Math.min(1, config.taper_end_ratio));
  const taper_max_ratio = config.taper_max_ratio === undefined
    ? null
    : Math.max(0, Math.min(1, config.taper_max_ratio));
  const resolved_top_ratio = taper_max_ratio === null
    ? taper_end_ratio
    : (1 - taper_max_ratio);
  const radius_top = Math.max(
    0,
    resolved_top_ratio === null
      ? (config.radius_top === undefined ? (radius_bottom * 0.7) : config.radius_top)
      : (radius_bottom * resolved_top_ratio)
  );
  const radial_segments = Math.max(3, config.radial_segments || 7);
  const height_segments = Math.max(1, config.height_segments || 6);
  const control_count = Math.max(2, config.control_count || 5);
  const max_drift = Math.max(0, config.max_drift || 0);
  const direction_jitter = config.direction_jitter || (radius_bottom * 0.15);
  const straight_start_ratio = Math.max(0, Math.min(0.9, config.straight_start_ratio || 0));
  const taper_start_ratio = Math.max(0, Math.min(0.95, config.taper_start_ratio || 0));

  const controls = [{'x': 0, 'y': 0}];
  let drift_x = 0;
  let drift_y = 0;
  for (let i = 1; i < control_count; i++) {
    const progress = i / (control_count - 1);
    drift_x += (Math.random() - 0.5) * direction_jitter;
    drift_y += (Math.random() - 0.5) * direction_jitter;
    const drift_length = Math.sqrt((drift_x * drift_x) + (drift_y * drift_y));
    const drift_limit = max_drift * progress;
    if (drift_length > drift_limit && drift_length > 0) {
      const scale = drift_limit / drift_length;
      drift_x *= scale;
      drift_y *= scale;
    }
    controls.push({'x': drift_x, 'y': drift_y});
  }

  const curve = {
    'controls': controls,
    'height': height
  };

  const geometry = new THREE.CylinderGeometry(
    radius_bottom,
    radius_bottom,
    height,
    radial_segments,
    height_segments
  );
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const vertex_z = position.getZ(i);
    const height_from_base = (height / 2) - vertex_z;
    const height_ratio = Math.max(0, Math.min(1, height_from_base / height));
    const taper_progress = height_ratio <= taper_start_ratio
      ? 0
      : (height_ratio - taper_start_ratio) / Math.max(0.0001, 1 - taper_start_ratio);
    const target_radius = THREE.MathUtils.lerp(radius_bottom, radius_top, taper_progress);
    const taper_scale = target_radius / radius_bottom;
    position.setX(i, position.getX(i) * taper_scale);
    position.setY(i, position.getY(i) * taper_scale);

    const offset = this.sample_stick_curve_offset_(curve, height_from_base);
    if (straight_start_ratio > 0) {
      const straight_height = height * straight_start_ratio;
      const bend_blend = height_from_base <= straight_height
        ? (height_from_base / Math.max(0.0001, straight_height))
        : 1;
      position.setX(i, position.getX(i) + (offset.x * bend_blend));
      position.setY(i, position.getY(i) + (offset.y * bend_blend));
    } else {
      position.setX(i, position.getX(i) + offset.x);
      position.setY(i, position.getY(i) + offset.y);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, config.material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.is_environment = true;

  return {
    'mesh': mesh,
    'curve': curve,
    'radius_top': radius_top,
    'radius_bottom': radius_bottom,
    'height': height
  };
};

/**
 * Get round/oval branch count from tree height.
 *
 * @param {number} height Total tree height.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_round_tree_branch_count_ = function(height) {
  return Math.max(1, Math.round(beestat.component.scene.round_tree_branches_per_height * Math.max(0, height || 0)));
};

/**
 * Get normalized branch length factor f(x) for round/oval trees.
 *
 * `x` is normalized distance from trunk base to top in [0, 1]:
 * - 0 = trunk base (ground side)
 * - 1 = trunk top
 *
 * @param {string} tree_type round|oval
 * @param {number} x Normalized distance up trunk [0, 1]
 * @param {number} profile_start_ratio Lower bound for canopy profile in [0, 1).
 *   Lower values use more trunk height, higher values use less.
 *
 * @return {number} Branch length factor in [0, 1]
 */
beestat.component.scene.prototype.get_branch_length = function(tree_type, x, profile_start_ratio = 0.5) {
  switch (tree_type) {
    case 'oval':
      // Oval equation over x in [start, 1] with softer top taper than round.
      // u = (x - start) / (1 - start), t = 2u - 1, base = sqrt(max(0, 1 - t^2))
      const oval_start = Math.max(0, Math.min(0.95, profile_start_ratio));
      const oval_span = Math.max(0.0001, 1 - oval_start);
      const oval_u = (x - oval_start) / oval_span;
      const oval_t = (oval_u * 2) - 1;
      return x < oval_start || x > 1
        ? 0
        : Math.max(0, Math.min(1, Math.pow(Math.sqrt(Math.max(0, 1 - (oval_t * oval_t))), 0.82)));
    case 'round':
    default:
      // Round equation over x in [start, 1] using a true circle cross-section:
      // u = (x - start) / (1 - start), t = 2u - 1, f(x) = sqrt(max(0, 1 - t^2))
      // `start` lowers from 0.5 toward 0 for wide/short trees.
      const start = Math.max(0, Math.min(0.9999, profile_start_ratio));
      const span = Math.max(0.0001, 1 - start);
      const u = (x - start) / span;
      const t = (u * 2) - 1;
      return x < start || x > 1
        ? 0
        : Math.max(0, Math.min(1, Math.sqrt(Math.max(0, 1 - (t * t)))));
  }
};


/**
 * Create a low-poly round canopy tree scaffold (trunk + first-level branches).
 *
 * @param {number} height Total tree height.
 * @param {number} max_diameter Maximum canopy diameter.
 * @param {boolean} has_foliage Whether foliage should be rendered.
 *
 * @return {THREE.Group}
 */
beestat.component.scene.prototype.create_round_tree_ = function(height, max_diameter, has_foliage, canopy_shape = 'round') {
  const self = this;
  const tree = new THREE.Group();
  tree.userData.is_environment = true;
  tree.userData.is_tree = true;
  const max_canopy_radius = Math.max(0.5, max_diameter / 2);
  // Use more of trunk height for round profiles when canopy is wide/short.
  // If height == diameter, start reaches 0 (full [0, 1] range).
  const round_canopy_span_ratio = Math.max(0, Math.min(1, max_diameter / Math.max(1, height)));
  const round_canopy_start_ratio = Math.max(0, 1 - round_canopy_span_ratio);
  // Oval canopies should generally occupy more trunk height than round canopies.
  const oval_canopy_start_ratio = Math.max(0, round_canopy_start_ratio - 0.18);
  const foliage_enabled = has_foliage === true;

  const wood_material = new THREE.MeshStandardMaterial({
    'color': 0x6a4d2f,
    'roughness': 0.9,
    'metalness': 0.0,
    'flatShading': true
  });

  const trunk_height = height;
  const trunk_radius_bottom = Math.max(1.5, trunk_height * 0.03);
  const trunk_stick = this.create_stick_mesh_({
    'height': trunk_height,
    'radius_bottom': trunk_radius_bottom,
    'radial_segments': 7,
    'height_segments': 8,
    'control_count': 6,
    'max_drift': 8,
    'direction_jitter': 3,
    'taper_start_ratio': 0.35,
    'taper_max_ratio': 0.72,
    'material': wood_material
  });
  const trunk = trunk_stick.mesh;
  trunk.position.z = -(trunk_height / 2) + Math.max(0.7, trunk_radius_bottom * 0.14);
  tree.add(trunk);
  this.add_tree_ground_contact_(tree, trunk_radius_bottom, 0x6a4d2f);

  // Single branch layer: starts halfway up trunk and thins/shortens toward the top.
  const branch_count = this.get_round_tree_branch_count_(height);
  const branches = new THREE.Group();
  branches.userData.is_environment = true;
  const branch_axis = new THREE.Vector3(0, 0, -1);
  const foliage = new THREE.Group();
  foliage.userData.is_environment = true;
  const canopy_opacity = beestat.component.scene.debug_tree_canopy_opacity;
  const foliage_material = new THREE.MeshStandardMaterial({
    'color': 0x4f9f2f,
    'roughness': 0.82,
    'metalness': 0.0,
    'flatShading': true,
    'transparent': canopy_opacity < 1,
    'opacity': canopy_opacity,
    'depthWrite': canopy_opacity >= 1,
    'side': THREE.DoubleSide
  });
  const create_canopy_from_branch_function_ = function() {
    const center_height = trunk_height * 0.7;
    const center_offset_raw = self.sample_stick_curve_offset_(trunk_stick.curve, center_height);
    const top_offset = self.sample_stick_curve_offset_(trunk_stick.curve, trunk_height);
    // Base canopy center; upper canopy vertices are additionally aligned per-vertex to trunk tip.
    const center_offset = {
      'x': THREE.MathUtils.lerp(center_offset_raw.x, top_offset.x, 0.45),
      'y': THREE.MathUtils.lerp(center_offset_raw.y, top_offset.y, 0.45)
    };
    const center = new THREE.Vector3(center_offset.x, center_offset.y, -center_height);
    const base_radius = Math.max(4, max_canopy_radius * 0.96);
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const positions = geometry.attributes.position;
    const irregularity = 0.08 + (Math.random() * 0.08);
    const noise_phase_a = Math.random() * Math.PI * 2;
    const noise_phase_b = Math.random() * Math.PI * 2;
    const noise_phase_c = Math.random() * Math.PI * 2;
    const noise_freq_a = 2.7 + (Math.random() * 1.2);
    const noise_freq_b = 2.3 + (Math.random() * 1.2);
    const noise_freq_c = 1.2 + (Math.random() * 0.9);
    const lobe_count = 2 + Math.floor(Math.random() * 4);
    const lobe_amplitude = 0.05 + (Math.random() * 0.08);
    const lobe_phase = Math.random() * Math.PI * 2;
    const squash_x = 0.93 + (Math.random() * 0.14);
    const squash_y = 0.93 + (Math.random() * 0.14);
    const z_wobble = trunk_height * (0.007 + (Math.random() * 0.007));
    const tip_cap_strength = trunk_radius_bottom * (0.85 + (Math.random() * 0.45));
    const tip_round_power = 1.6 + (Math.random() * 1.1);
    const tip_bump_strength = 0.16 + (Math.random() * 0.24);
    const canopy_drift_theta = Math.random() * Math.PI * 2;
    const canopy_drift_radius = max_canopy_radius * 0.02;
    const canopy_drift_x = Math.cos(canopy_drift_theta) * canopy_drift_radius;
    const canopy_drift_y = Math.sin(canopy_drift_theta) * canopy_drift_radius;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const normalized_height = Math.max(0, Math.min(1, (z + 1) / 2));
      // Keep canopy vertices distributed across the active profile band instead
      // of collapsing many points to zero-radius regions.
      const profile_start_ratio = canopy_shape === 'oval'
        ? oval_canopy_start_ratio
        : round_canopy_start_ratio;
      const mapped_ratio = profile_start_ratio + (normalized_height * (1 - profile_start_ratio));
      // Slightly cap the top sample for oval canopies to avoid a sharp apex.
      const canopy_ratio = canopy_shape === 'oval' ? Math.min(0.985, mapped_ratio) : mapped_ratio;
      const canopy_z = -trunk_height * canopy_ratio;
      const base_factor = Math.max(0, Math.min(1, self.get_branch_length(canopy_shape, canopy_ratio, profile_start_ratio)));
      const canopy_factor = base_factor;

      const radial_length = Math.sqrt((x * x) + (y * y));
      const hx = radial_length > 0.0001 ? x / radial_length : 1;
      const hy = radial_length > 0.0001 ? y / radial_length : 0;
      const theta = Math.atan2(hy, hx);

      const noise =
        (Math.sin((hx * noise_freq_a) + (hy * (noise_freq_b - 0.4)) + (canopy_ratio * (noise_freq_a + noise_freq_b)) + noise_phase_a) * 0.5) +
        (Math.cos((hx * (noise_freq_b + 0.3)) - (hy * noise_freq_a) - (canopy_ratio * (noise_freq_b + 1.6)) + noise_phase_b) * 0.35) +
        (Math.sin((canopy_ratio * (noise_freq_c + 6.6)) + (hx * noise_freq_c) + noise_phase_c) * 0.15);
      const lobe = 1 + (Math.sin((theta * lobe_count) + (canopy_ratio * 4.4) + lobe_phase) * lobe_amplitude);
      const organic_scale = canopy_factor <= 0 ? 1 : (1 + (noise * irregularity));
      const radius = base_radius * canopy_factor * organic_scale * lobe;
      // Ensure the canopy retains a small cap around the tip so trunk never pokes through.
      const top_cover_t = Math.max(0, Math.min(1, (canopy_ratio - 0.84) / 0.16));
      const min_radius_for_tip_cover = trunk_radius_bottom * 0.55 * top_cover_t;
      const covered_radius = Math.max(radius, min_radius_for_tip_cover);
      const radius_x = covered_radius * squash_x;
      const radius_y = covered_radius * squash_y;
      const canopy_z_offset = Math.sin((theta * (lobe_count + 1)) + lobe_phase) * z_wobble * canopy_factor;
      const top_alignment_t = Math.max(0, Math.min(1, (canopy_ratio - 0.72) / 0.28));
      const center_x = THREE.MathUtils.lerp(
        center.x + canopy_drift_x,
        top_offset.x,
        top_alignment_t
      );
      const center_y = THREE.MathUtils.lerp(
        center.y + canopy_drift_y,
        top_offset.y,
        top_alignment_t
      );
      const top_center_weight = Math.pow(Math.max(0, 1 - radial_length), tip_round_power);
      const tip_bump = 0.5 + (0.5 * Math.sin((theta * (lobe_count + 2)) + lobe_phase + noise_phase_c));
      const tip_cap_lift = tip_cap_strength * top_cover_t * top_center_weight * (1 + (tip_bump * tip_bump_strength));
      const capped_z_offset = canopy_z_offset * (1 - (top_cover_t * 0.85));

      positions.setXYZ(
        i,
        center_x + (hx * radius_x),
        center_y + (hy * radius_y),
        canopy_z + capped_z_offset - tip_cap_lift
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const canopy_mesh = new THREE.Mesh(geometry, foliage_material.clone());
    canopy_mesh.userData.is_tree_foliage = true;
    canopy_mesh.userData.base_tree_foliage_color = canopy_mesh.material.color.getHex();
    return {
      'mesh': canopy_mesh
    };
  };
  const branch_height_samples = [];
  const recursive_depth_limit = 2;
  const children_per_branch = 2;
  if (foliage_enabled === true && this.tree_foliage_meshes_ === undefined) {
    this.tree_foliage_meshes_ = [];
  }
  if (foliage_enabled === true && this.tree_branch_groups_ === undefined) {
    this.tree_branch_groups_ = [];
  }

  const initial_branch_direction = new THREE.Vector3(1, 0, -0.2).normalize();
  const branch_rotation_axis = new THREE.Vector3(0, 0, 1);
  const get_next_branch_direction = function(previous_direction) {
    const direction = previous_direction.clone().multiplyScalar(-1);
    const angle_offset = (Math.PI / 18) + (Math.random() * ((Math.PI / 4) - (Math.PI / 18)));
    direction.applyQuaternion(
      new THREE.Quaternion().setFromAxisAngle(
        branch_rotation_axis,
        (Math.random() < 0.5 ? -1 : 1) * angle_offset
      )
    );
    // Keep branches more strongly biased upward in this scene's coordinate system (-Z is up).
    direction.z = -Math.max(0.34, Math.abs(direction.z));
    return direction.normalize();
  };
  for (let i = 0; i < branch_count; i++) {
    const stratified = branch_count <= 1 ? 0.5 : (i / (branch_count - 1));
    const jittered = stratified + ((Math.random() - 0.5) * 0.25 / branch_count);
    branch_height_samples.push(Math.max(0, Math.min(1, jittered)));
  }
  for (let i = branch_height_samples.length - 1; i > 0; i--) {
    const swap_index = Math.floor(Math.random() * (i + 1));
    const temp = branch_height_samples[i];
    branch_height_samples[i] = branch_height_samples[swap_index];
    branch_height_samples[swap_index] = temp;
  }

  const get_stick_point_world = function(branch_info, ratio) {
    const clamped_ratio = Math.max(0, Math.min(1, ratio));
    const along_height = branch_info.length * clamped_ratio;
    const local_offset = self.sample_stick_curve_offset_(branch_info.stick.curve, along_height);
    const local_point = new THREE.Vector3(
      local_offset.x,
      local_offset.y,
      (branch_info.length / 2) - along_height
    );
    return branch_info.mesh.localToWorld(local_point);
  };

  const create_branch = function(base, direction, length, radius_bottom) {
    const horizontal_direction_length = Math.sqrt(
      (direction.x * direction.x) + (direction.y * direction.y)
    );
    if (horizontal_direction_length > 0) {
      const base_horizontal_radius = Math.sqrt((base.x * base.x) + (base.y * base.y));
      const max_length_from_diameter =
        (max_canopy_radius - base_horizontal_radius) / horizontal_direction_length;
      if (Number.isFinite(max_length_from_diameter) === true) {
        length = Math.max(0, Math.min(length, max_length_from_diameter));
      }
    }
    length = Math.max(0, length);
    if (length < 1) {
      return null;
    }

    const branch_stick = self.create_stick_mesh_({
      'height': length,
      'radius_bottom': radius_bottom,
      'radial_segments': 7,
      'height_segments': 6,
      'control_count': 6,
      'max_drift': length * 0.24,
      'direction_jitter': length * 0.12,
      'straight_start_ratio': 0.2,
      'taper_start_ratio': 0.2,
      'taper_max_ratio': 1,
      'material': wood_material
    });
    const branch = branch_stick.mesh;
    branch.position.copy(base).addScaledVector(direction, (length / 2) - (radius_bottom * 0.45));
    branch.quaternion.setFromUnitVectors(branch_axis, direction);
    branches.add(branch);
    branch.updateMatrixWorld(true);

    return {
      'mesh': branch,
      'stick': branch_stick,
      'length': length,
      'radius_bottom': radius_bottom,
      'direction': direction.clone()
    };
  };

  const add_sub_branches = function(parent_branch, depth) {
    if (depth >= recursive_depth_limit) {
      return;
    }

    let previous_child_direction = parent_branch.direction;
    for (let j = 0; j < children_per_branch; j++) {
      const attach_ratio = children_per_branch <= 1
        ? 0.6
        : 0.35 + (j / (children_per_branch - 1)) * 0.3;
      const attach_point = get_stick_point_world(parent_branch, attach_ratio);
      const child_length = parent_branch.length * 0.62;
      const child_radius_bottom = Math.max(0.15, parent_branch.radius_bottom * 0.62);
      const child_direction = get_next_branch_direction(previous_child_direction);
      const child_branch = create_branch(
        attach_point,
        child_direction,
        child_length,
        child_radius_bottom
      );
      if (child_branch === null) {
        continue;
      }
      previous_child_direction = child_direction;
      add_sub_branches(child_branch, depth + 1);
    }
  };

  let previous_primary_direction = initial_branch_direction;
  for (let i = 0; i < branch_count; i++) {
    const base_height_ratio = branch_height_samples[i];
    const base_height = trunk_height * base_height_ratio;
    const base_offset = this.sample_stick_curve_offset_(trunk_stick.curve, base_height);
    const branch_profile_start_ratio = canopy_shape === 'oval'
      ? oval_canopy_start_ratio
      : round_canopy_start_ratio;
    const branch_length_factor = this.get_branch_length(
      canopy_shape,
      base_height_ratio,
      branch_profile_start_ratio,
    );
    const branch_length = max_canopy_radius * branch_length_factor;
    if (branch_length <= 0) {
      continue;
    }
    const branch_radius_bottom = Math.max(0.35, trunk_radius_bottom * (0.42 - (base_height_ratio * 0.26)));
    const base = new THREE.Vector3(
      base_offset.x,
      base_offset.y,
      trunk.position.z + (trunk_height / 2) - base_height
    );
    const primary_direction = get_next_branch_direction(previous_primary_direction);

    const primary_branch = create_branch(
      base,
      primary_direction,
      branch_length,
      branch_radius_bottom
    );
    if (primary_branch === null) {
      continue;
    }
    previous_primary_direction = primary_direction;
    add_sub_branches(primary_branch, 0);
  }

  if (foliage_enabled === true) {
    const canopy_result = create_canopy_from_branch_function_();
    const canopy_mesh = canopy_result.mesh;
    canopy_mesh.castShadow = true;
    canopy_mesh.receiveShadow = true;
    canopy_mesh.userData.is_environment = true;
    foliage.add(canopy_mesh);
    this.tree_foliage_meshes_.push(canopy_mesh);
  }

  if (foliage_enabled === true) {
    this.tree_branch_groups_.push(branches);
  }
  branches.visible = foliage_enabled !== true;
  tree.add(branches);
  if (foliage_enabled === true) {
    tree.add(foliage);
  }

  return tree;
};

/**
 * Create a low-poly oval canopy tree.
 *
 * @param {number} height Total tree height.
 * @param {number} max_diameter Maximum canopy diameter.
 * @param {boolean} has_foliage Whether foliage should be rendered.
 *
 * @return {THREE.Group}
 */
beestat.component.scene.prototype.create_oval_tree_ = function(height, max_diameter, has_foliage) {
  return this.create_round_tree_(height, max_diameter, has_foliage, 'oval');
};

/**
 * Get seasonal foliage color and visibility from current date.
 *
 * @return {{color: THREE.Color, visible: boolean}}
 */
beestat.component.scene.prototype.get_tree_foliage_state_ = function() {
  const colors = beestat.component.scene.tree_foliage_colors;
  const summer = new THREE.Color(colors.summer);
  const fall_early = new THREE.Color(colors.fall_early);
  const fall_late = new THREE.Color(colors.fall_late);
  const winter = new THREE.Color(colors.winter);

  if (this.date_ === undefined || typeof this.date_.month !== 'function') {
    return {
      'color': summer,
      'visible': true
    };
  }

  const month = this.date_.month() + 1; // 1-12
  const day = this.date_.date();
  const day_ratio = Math.max(0, Math.min(1, (day - 1) / 30));
  const color = summer.clone();
  const visible = month >= 4 && month <= 10;

  if (month === 9) {
    color.lerp(fall_early, day_ratio);
  } else if (month === 10) {
    color.copy(fall_early).lerp(fall_late, day_ratio);
  } else if (visible === false) {
    color.copy(winter);
  } else {
    color.copy(summer);
  }

  return {
    'color': color,
    'visible': visible
  };
};

/**
 * Apply seasonal foliage appearance to round/oval canopy meshes.
 */
beestat.component.scene.prototype.update_tree_foliage_season_ = function() {
  const has_foliage_meshes = this.tree_foliage_meshes_ !== undefined && this.tree_foliage_meshes_.length > 0;
  const has_branch_groups = this.tree_branch_groups_ !== undefined && this.tree_branch_groups_.length > 0;
  if (has_foliage_meshes === false && has_branch_groups === false) {
    return;
  }

  const state = this.get_tree_foliage_state_();
  if (has_foliage_meshes === true) {
    for (let i = 0; i < this.tree_foliage_meshes_.length; i++) {
      const mesh = this.tree_foliage_meshes_[i];
      if (mesh === undefined || mesh.material === undefined) {
        continue;
      }
      mesh.material.color.copy(state.color);
      mesh.userData.base_tree_foliage_color = state.color.getHex();
      mesh.material.opacity = beestat.component.scene.debug_tree_canopy_opacity;
      mesh.material.transparent = beestat.component.scene.debug_tree_canopy_opacity < 1;
      mesh.material.depthWrite = beestat.component.scene.debug_tree_canopy_opacity >= 1;
      mesh.material.needsUpdate = true;
      mesh.visible = state.visible;
    }
  }

  if (has_branch_groups === true) {
    for (let i = 0; i < this.tree_branch_groups_.length; i++) {
      const branch_group = this.tree_branch_groups_[i];
      if (branch_group !== undefined) {
        // Hide branches when canopy is visible; show them when canopy is not visible.
        branch_group.visible = state.visible !== true;
      }
    }
  }
};

/**
 * Add trees from floor plan data.
 *
 * @param {number} ground_surface_z
 */
beestat.component.scene.prototype.add_trees_ = function(ground_surface_z) {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const tree_group = new THREE.Group();
  tree_group.userData.is_environment = true;
  this.environment_group_.add(tree_group);
  this.tree_foliage_meshes_ = [];
  this.tree_branch_groups_ = [];

  const foliage_enabled = beestat.component.scene.environment_tree_foliage_enabled;

  const trees = [];
  floor_plan.data.groups.forEach(function(group) {
    if (Array.isArray(group.trees) === true) {
      group.trees.forEach(function(tree) {
        trees.push(tree);
      });
    }
  });

  trees.forEach(function(tree_data) {
    const tree_type = ['conical', 'round', 'oval'].includes(tree_data.type)
      ? tree_data.type
      : 'round';
    const tree_height = Math.max(1, Number(tree_data.height || 0));
    const tree_diameter = Math.max(1, Number(tree_data.diameter || 0));
    const tree_x = Number(tree_data.x || 0);
    const tree_y = Number(tree_data.y || 0);

    let tree;
    if (tree_type === 'conical') {
      tree = this.create_conical_tree_(tree_height, tree_diameter, foliage_enabled);
    } else if (tree_type === 'oval') {
      tree = this.create_oval_tree_(tree_height, tree_diameter, foliage_enabled);
    } else {
      tree = this.create_round_tree_(tree_height, tree_diameter, foliage_enabled);
    }

    tree.position.set(tree_x, tree_y, ground_surface_z);
    tree.rotation.z = 0;
    tree_group.add(tree);
  }, this);

  this.update_tree_foliage_season_();
};

/**
 * Add environment layers (grass and earth strata) below the house.
 */
beestat.component.scene.prototype.add_environment_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const bounding_box = this.get_scene_bounding_box_();
  const center_x = (bounding_box.right + bounding_box.left) / 2;
  const center_y = (bounding_box.bottom + bounding_box.top) / 2;
  const plan_width = bounding_box.right - bounding_box.left;
  const plan_height = bounding_box.bottom - bounding_box.top;

  // Find the minimum elevation to position the ground flush with the lowest floor.
  let min_elevation = 0;
  floor_plan.data.groups.forEach(function(group) {
    const elevation = group.elevation || 0;
    if (elevation < min_elevation) {
      min_elevation = elevation;
    }
  });

  // Position the ground flush with the base of the house (hides any below-ground structures).
  let current_z = 0;

  const padding = beestat.component.scene.environment_padding;
  const ground_color = this.get_appearance_value_('ground_color');
  const strata = [
    {'color': ground_color, 'thickness': 10, 'roughness': 0.95},
    {'color': 0x4a3f35, 'thickness': 60, 'roughness': 0.85},
    {'color': 0x6b5d4f, 'thickness': 60, 'roughness': 0.85},
    {'color': 0x4a3f35, 'thickness': 60, 'roughness': 0.85}
  ];

  // Create environment group for ground strata
  this.environment_group_ = new THREE.Group();
  this.main_group_.add(this.environment_group_);
  this.layers_['environment'] = this.environment_group_;

  this.environment_surface_group_ = new THREE.Group();
  this.environment_surface_group_.userData.is_environment = true;
  this.environment_group_.add(this.environment_surface_group_);
  this.add_surfaces_to_environment_(this.environment_surface_group_);

  strata.forEach(function(stratum, index) {
    const geometry = new THREE.BoxGeometry(
      plan_width + padding * 2,
      plan_height + padding * 2,
      stratum.thickness
    );
    const material = new THREE.MeshStandardMaterial({
      'color': stratum.color,
      'roughness': stratum.roughness,
      'metalness': 0.0
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = center_x;
    mesh.position.y = center_y;
    mesh.position.z = current_z + stratum.thickness / 2;
    mesh.userData.is_environment = true;
    if (index === 0) {
      mesh.userData.is_ground = true;
    }
    mesh.receiveShadow = true;

    this.environment_group_.add(mesh);
    current_z += stratum.thickness;
  }, this);

  const ground_surface_z = 0;
  this.add_trees_(ground_surface_z);

  // Add celestial lights (sun and moon) - toggled with environment visibility
  this.add_celestial_lights_();
  this.add_weather_(center_x, center_y, plan_width, plan_height);
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
 * Set the current date.
 *
 * @param {moment} date
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_date = function(date) {
  this.date_ = date;

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};

/**
 * Set the location for celestial light calculations.
 *
 * @param {number} latitude
 * @param {number} longitude
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_location = function(latitude, longitude) {
  this.latitude_ = latitude;
  this.longitude_ = longitude;

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};

/**
 * Set the type of data this scene is visualizing.
 *
 * @param {string} data_type temperature|occupancy
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_data_type = function(data_type) {
  this.data_type_ = data_type;

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};

/**
 * Set the min value of the heat map.
 *
 * @param {string} heat_map_min
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_heat_map_min = function(heat_map_min) {
  this.heat_map_min_ = heat_map_min;

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};

/**
 * Set the max value of the heat map.
 *
 * @param {string} heat_map_max
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_heat_map_max = function(heat_map_max) {
  this.heat_map_max_ = heat_map_max;

  if (this.rendered_ === true) {
    this.update_();
  }

  return this;
};

/**
 * Set the visibility of a layer.
 *
 * @param {string} layer_name
 * @param {boolean} visible
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_layer_visible = function(layer_name, visible) {
  this.layers_[layer_name].traverse(function(child) {
    child.layers.set(
      visible === true
        ? beestat.component.scene.layer_visible
        : beestat.component.scene.layer_hidden
    );
  });

  // When toggling environment, also toggle celestial lights
  if (layer_name === 'environment' && this.layers_['celestial'] !== undefined) {
    this.layers_['celestial'].traverse(function(child) {
      child.layers.set(
        visible === true
          ? beestat.component.scene.layer_visible
          : beestat.component.scene.layer_hidden
      );
    });
  }

  return this;
};

/**
 * Set whether or not auto-rotate is enabled.
 *
 * @param {boolean} auto_rotate
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_auto_rotate = function(auto_rotate) {
  this.controls_.autoRotate = auto_rotate;

  return this;
};

/**
 * Set whether or not labels are enabled.
 *
 * @param {boolean} labels
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_labels = function(labels) {
  this.labels_ = labels;

  this.update_();

  return this;
};

/**
 * Set the gradient.
 *
 * @param {boolean} gradient
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_gradient = function(gradient) {
  this.gradient_ = gradient;

  return this;
};

/**
 * Get the state of the camera.
 *
 * @return {object}
 */
beestat.component.scene.prototype.get_camera_state = function() {
  return this.camera_.matrix.toArray();
};

/**
 * Restore the state of the camera.
 *
 * @param {object} camera_state
 */
beestat.component.scene.prototype.set_camera_state = function(camera_state) {
  this.camera_.matrix.fromArray(camera_state);
  this.camera_.matrix.decompose(
    this.camera_.position,
    this.camera_.quaternion,
    this.camera_.scale
  );
};

/**
 * Get a material representing a label. Memoizes the result so the material
 * can be re-used.
 *
 * @param {object} args
 *
 * @return {THREE.Material}
 */
beestat.component.scene.prototype.get_label_material_ = function(args) {
  let memo_key;

  switch (args.type) {
  case 'value':
    memo_key = [
      args.type,
      args.value
    ].join('|');
    break;
  case 'icon':
    memo_key = [
      args.type,
      args.icon,
      args.color
    ].join('|');
    break;
  }

  if (this.label_material_memo_[memo_key] === undefined) {
    /**
     * Increasing the size of the canvas increases the resolution of the texture
     * and thus makes it less blurry.
     */
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = 100 * scale;
    canvas.height = 55 * scale;

    const context = canvas.getContext('2d');

    const font_size = canvas.height / 2;
    switch (args.type) {
    case 'value': {
      context.font = '700 ' + font_size + 'px Montserrat';
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.fillText(
        args.value,
        canvas.width / 2,
        canvas.height
      );
      break;
    }
    case 'icon': {
      const icon_scale = 2.5;
      const icon_size = 24 * icon_scale;

      context.fillStyle = args.color;
      context.translate((canvas.width / 2) - (icon_size / 2), 0);
      context.fill(this.get_icon_path_(args.icon, icon_scale));
      break;
    }
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.anisotropy = this.renderer_.capabilities.getMaxAnisotropy();

    const material = new THREE.SpriteMaterial({
      'map': texture,
      'sizeAttenuation': false
    });

    this.label_material_memo_[memo_key] = material;
  }

  return this.label_material_memo_[memo_key];
};

/**
 * Get a blank label.
 *
 * @return {THREE.Material}
 */
beestat.component.scene.prototype.get_blank_label_material_ = function() {
  return this.get_label_material_({
    'type': 'value',
    'value': ''
  });
};

/**
 * Get an icon path for placing on a canvas texture.
 *
 * @param {string} icon
 * @param {int} scale
 *
 * @return {Path2D}
 */
beestat.component.scene.prototype.get_icon_path_ = function(icon, scale = 4) {
  const icons = {
    'snowflake': 'M20.79,13.95L18.46,14.57L16.46,13.44V10.56L18.46,9.43L20.79,10.05L21.31,8.12L19.54,7.65L20,5.88L18.07,5.36L17.45,7.69L15.45,8.82L13,7.38V5.12L14.71,3.41L13.29,2L12,3.29L10.71,2L9.29,3.41L11,5.12V7.38L8.5,8.82L6.5,7.69L5.92,5.36L4,5.88L4.47,7.65L2.7,8.12L3.22,10.05L5.55,9.43L7.55,10.56V13.45L5.55,14.58L3.22,13.96L2.7,15.89L4.47,16.36L4,18.12L5.93,18.64L6.55,16.31L8.55,15.18L11,16.62V18.88L9.29,20.59L10.71,22L12,20.71L13.29,22L14.7,20.59L13,18.88V16.62L15.5,15.17L17.5,16.3L18.12,18.63L20,18.12L19.53,16.35L21.3,15.88L20.79,13.95M9.5,10.56L12,9.11L14.5,10.56V13.44L12,14.89L9.5,13.44V10.56Z',
    'fire': 'M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z',
    'fan': 'M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z'
  };

  const icon_path = new Path2D(icons[icon]);
  const svg_matrix = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  ).createSVGMatrix();
  const transform = svg_matrix.scale(scale);
  const scaled_path = new Path2D();
  scaled_path.addPath(icon_path, transform);

  return scaled_path;
};

beestat.component.scene.prototype.dispose = function() {
  if (this.skeleton_builder_ready_handler_ !== undefined) {
    window.removeEventListener('skeleton_builder_ready', this.skeleton_builder_ready_handler_);
    delete this.skeleton_builder_ready_handler_;
  }

  // Cancel animation loop
  window.cancelAnimationFrame(this.animation_frame_);

  // Dispose of controls
  if (this.controls_ !== undefined) {
    this.controls_.dispose();
  }

  // Dispose of renderer
  if (this.renderer_ !== undefined) {
    this.renderer_.dispose();
  }

  if (this.sun_glow_texture_ !== undefined) {
    this.sun_glow_texture_.dispose();
  }
  if (this.snow_particle_texture_ !== undefined) {
    this.snow_particle_texture_.dispose();
  }
  if (this.rain_particle_texture_ !== undefined) {
    this.rain_particle_texture_.dispose();
  }
  if (this.cloud_texture_ !== undefined) {
    this.cloud_texture_.dispose();
  }
  if (this.moon_phase_texture_ !== undefined) {
    this.moon_phase_texture_.dispose();
  }
  if (this.star_texture_ !== undefined) {
    this.star_texture_.dispose();
  }

  // Clean up THREE.js scene resources
  if (this.scene_ !== undefined) {
    this.scene_.traverse(function(object) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(function(material) {
            material.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
    });
  }

  beestat.component.prototype.dispose.apply(this, arguments);
};

/**
 * Get the currently active room.
 *
 * @return {object}
 */
beestat.component.scene.prototype.get_active_room_ = function() {
  if (this.active_mesh_ !== undefined) {
    return this.active_mesh_.userData.room;
  }

  return null;
};
