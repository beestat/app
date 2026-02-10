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

beestat.component.scene.layer_visible = 0;
beestat.component.scene.layer_hidden = 1;
beestat.component.scene.layer_outline = 2;

/**
 * 3D Scene configuration constants
 */
beestat.component.scene.roof_pitch = 0.5; // Rise over run (0.5 = 6:12 pitch)
beestat.component.scene.roof_overhang = 12; // Roof overhang beyond walls
beestat.component.scene.wall_thickness = 4;
beestat.component.scene.environment_padding = 100; // Padding around floor plan
beestat.component.scene.room_floor_thickness = 6;
beestat.component.scene.room_wall_inset = 1.5;

/**
 * Brightness of the top-down light. This gives definition to the sides of
 * meshes by lighting the tops. Increase this for more edge definition.
 */
beestat.component.scene.directional_light_top_intensity = 0.25;

/**
 * Brightness of the ambient light. Works with the top light to provide a base
 * level of light to the scene.
 */
beestat.component.scene.ambient_light_intensity = 0.3;

/**
 * Rerender the scene by removing the primary group, then re-adding it and the
 * floor plan. This avoids having to reconstruct everything and then also
 * having to manually save camera info etc.
 */
beestat.component.scene.prototype.rerender = function() {
  this.scene_.remove(this.main_group_);
  this.add_main_group_();
  this.add_floor_plan_();
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

  // Dark background to help reduce apparant flicker when resizing
  parent.style('background', '#202a30');

  this.debug_ = {
    'axes': false,
    'directional_light_top_helper': false,
    'sun_light_helper': true,
    // 'grid': false,
    'watcher': false,
    'roof_edges': true,
    'straight_skeleton': true
  };

  this.width_ = this.state_.scene_width || 800;
  this.height_ = 500;

  this.add_scene_(parent);
  this.add_renderer_(parent);
  this.add_camera_();
  this.add_controls_(parent);
  this.add_raycaster_(parent);
  this.add_skybox_(parent);
  this.add_ambient_light_();
  this.add_directional_light_top_();

  this.add_main_group_();
  this.add_floor_plan_();

  const animate = function() {
    self.animation_frame_ = window.requestAnimationFrame(animate);
    self.controls_.update();
    self.update_raycaster_();
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

  this.camera_.position.x = 400;
  this.camera_.position.y = 400;
  this.camera_.position.z = 400;
};

/**
 * Add camera controls.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_controls_ = function(parent) {
  this.controls_ = new THREE.OrbitControls(this.camera_, parent[0]);
  this.controls_.enableDamping = true;
  this.controls_.enablePan = false;
  this.controls_.maxDistance = 1000;
  this.controls_.minDistance = 400;
  this.controls_.maxPolarAngle = Math.PI / 2.5;
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
      this.intersected_mesh_.material.emissive.setHex(0x000000);
      delete this.intersected_mesh_;
    }

    // Set intersect.
    for (let i = 0; i < intersects.length; i++) {
      if (
        intersects[i].object.type === 'Mesh' &&
        intersects[i].object.userData.is_wall !== true &&
        intersects[i].object.userData.is_roof !== true &&
        intersects[i].object.userData.is_environment !== true
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
 * Consistent directional light that provides definition to the edge of meshes
 * by lighting the top.
 */
beestat.component.scene.prototype.add_directional_light_top_ = function() {
  this.directional_light_top_ = new THREE.DirectionalLight(
    0xffffff,
    beestat.component.scene.directional_light_top_intensity
  );
  this.directional_light_top_.position.set(0, 1000, 0);
  this.scene_.add(this.directional_light_top_);

  if (this.debug_.directional_light_top_helper === true) {
    this.directional_light_top_helper_ = new THREE.DirectionalLightHelper(
      this.directional_light_top_,
      500
    );
    this.scene_.add(this.directional_light_top_helper_);
  }
};

/**
 * Ambient lighting so nothing is shrouded in darkness.
 */
beestat.component.scene.prototype.add_ambient_light_ = function() {
  this.scene_.add(new THREE.AmbientLight(
    0xffffff,
    beestat.component.scene.ambient_light_intensity
  ));
};

/**
 * Directional sun and moon lights that provide natural lighting. Only
 * visible when the environment layer is enabled. Positions are calculated based
 * on time of day and location.
 */
beestat.component.scene.prototype.add_celestial_lights_ = function() {
  // Create celestial group if it doesn't exist
  if (this.celestial_group_ === undefined) {
    this.celestial_group_ = new THREE.Group();
    this.scene_.add(this.celestial_group_);
    this.layers_['celestial'] = this.celestial_group_;
  }

  // Sun light
  this.sun_light_ = new THREE.DirectionalLight(
    0xffffdd, // Slightly warm color for sunlight
    0.6
  );

  // Initial position (will be updated by update_celestial_lights_)
  this.sun_light_.position.set(500, 500, -500);

  // Enable shadow casting
  this.sun_light_.castShadow = true;

  // Configure shadow properties
  this.sun_light_.shadow.mapSize.width = 2048;
  this.sun_light_.shadow.mapSize.height = 2048;
  this.sun_light_.shadow.camera.left = -500;
  this.sun_light_.shadow.camera.right = 500;
  this.sun_light_.shadow.camera.top = 500;
  this.sun_light_.shadow.camera.bottom = -500;
  this.sun_light_.shadow.camera.near = 0.5;
  this.sun_light_.shadow.camera.far = 2000;
  this.sun_light_.shadow.bias = -0.001; // Prevent shadow acne

  // Set target to world origin (0,0,0) so light always points there
  this.sun_light_.target.position.set(0, 0, 0);
  this.scene_.add(this.sun_light_.target);

  this.celestial_group_.add(this.sun_light_);

  if (this.debug_.sun_light_helper === true) {
    this.sun_light_helper_ = new THREE.DirectionalLightHelper(
      this.sun_light_,
      100
    );
    this.celestial_group_.add(this.sun_light_helper_);
  }

  // Moon light
  this.moon_light_ = new THREE.DirectionalLight(
    0xaaccff, // Cool bluish color for moonlight
    0.15
  );

  // Initial position (will be updated by update_celestial_lights_)
  this.moon_light_.position.set(-500, 500, 500);

  // Moon casts shadows too
  this.moon_light_.castShadow = true;

  // Configure shadow properties (same as sun)
  this.moon_light_.shadow.mapSize.width = 2048;
  this.moon_light_.shadow.mapSize.height = 2048;
  this.moon_light_.shadow.camera.left = -500;
  this.moon_light_.shadow.camera.right = 500;
  this.moon_light_.shadow.camera.top = 500;
  this.moon_light_.shadow.camera.bottom = -500;
  this.moon_light_.shadow.camera.near = 0.5;
  this.moon_light_.shadow.camera.far = 2000;
  this.moon_light_.shadow.bias = -0.001;

  // Set target to world origin
  this.moon_light_.target.position.set(0, 0, 0);
  this.scene_.add(this.moon_light_.target);

  this.celestial_group_.add(this.moon_light_);

  if (this.debug_.sun_light_helper === true) {
    this.moon_light_helper_ = new THREE.DirectionalLightHelper(
      this.moon_light_,
      100
    );
    this.celestial_group_.add(this.moon_light_helper_);
  }
};

/**
 * Update sun and moon light positions based on date and location using SunCalc.
 * Adjusts light intensities based on altitude and moon phase.
 *
 * @param {moment} date The date/time to calculate positions for
 * @param {number} latitude Location latitude
 * @param {number} longitude Location longitude
 */
beestat.component.scene.prototype.update_celestial_lights_ = function(date, latitude, longitude) {
  if (
    this.sun_light_ === undefined ||
    this.moon_light_ === undefined ||
    date === undefined ||
    latitude === undefined ||
    longitude === undefined
  ) {
    return;
  }

  const distance = 1000; // Distance from origin for light positioning

  const js_date = date.toDate();

  // === SUN ===
  const sun_position = SunCalc.getPosition(js_date, latitude, longitude);
  const sun_altitude = sun_position.altitude;
  const sun_azimuth = sun_position.azimuth;

  // Convert spherical coordinates to Cartesian
  // SunCalc: azimuth 0=south, π/2=west, π/-π=north, -π/2=east
  // World coords: +X=east, +Y=up, +Z=south, -Z=north
  // DirectionalLight shines FROM position TOWARD origin (0,0,0)
  const sun_x = distance * Math.cos(sun_altitude) * Math.sin(sun_azimuth);
  const sun_y = distance * Math.cos(sun_altitude) * Math.cos(sun_azimuth);
  const sun_z = distance * Math.sin(sun_altitude);

  this.sun_light_.position.set(sun_x, sun_y, sun_z);

  // Adjust sun intensity based on altitude (fade when below horizon)
  let sun_intensity = 0.6;
  if (sun_altitude < 0) {
    // Sun is below horizon, fade out
    sun_intensity = Math.max(0, 0.6 * (1 + sun_altitude / (Math.PI / 6)));
  }

  this.sun_light_.intensity = sun_intensity;
  this.sun_light_.castShadow = sun_intensity > 0.05;

  // === MOON ===
  const moon_position = SunCalc.getMoonPosition(js_date, latitude, longitude);
  const moon_altitude = moon_position.altitude;
  const moon_azimuth = moon_position.azimuth;

  // Get moon illumination (phase)
  const moon_illumination = SunCalc.getMoonIllumination(js_date);
  const moon_fraction = moon_illumination.fraction; // 0 = new moon, 1 = full moon

  // Convert spherical coordinates to Cartesian (same as sun)
  const moon_x = distance * Math.cos(moon_altitude) * Math.sin(moon_azimuth);
  const moon_y = distance * Math.cos(moon_altitude) * Math.cos(moon_azimuth);
  const moon_z = distance * Math.sin(moon_altitude);

  this.moon_light_.position.set(moon_x, moon_y, moon_z);

  // Adjust moon intensity based on altitude and illumination
  let moon_intensity = 0.15 * moon_fraction; // Scaled by moon phase
  if (moon_altitude < 0) {
    // Moon is below horizon, fade out
    moon_intensity = Math.max(0, moon_intensity * (1 + moon_altitude / (Math.PI / 6)));
  }

  this.moon_light_.intensity = moon_intensity;
  this.moon_light_.castShadow = moon_intensity > 0.02;

  // Update debug helpers if enabled
  if (this.debug_.sun_light_helper === true) {
    // Force world matrix update before updating helpers
    this.sun_light_.updateMatrixWorld();
    this.sun_light_.target.updateMatrixWorld();
    this.sun_light_helper_.update();

    this.moon_light_.updateMatrixWorld();
    this.moon_light_.target.updateMatrixWorld();
    this.moon_light_helper_.update();
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

  if (this.debug_.directional_light_top_helper === true) {
    this.directional_light_top_helper_.update();
  }

  // Update celestial lights (sun and moon) based on date and location
  if (this.date_ !== undefined && this.latitude_ !== undefined && this.longitude_ !== undefined) {
    this.update_celestial_lights_(this.date_, this.latitude_, this.longitude_);
  }

  // Update debug watcher
  if (this.debug_.watcher === true) {
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

  const material = new THREE.MeshPhongMaterial({
    'color': color
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

      const material = new THREE.MeshPhongMaterial({
        'color': 0x889aaa
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
 * Add a group containing all of the extruded geometry that can be transformed
 * all together.
 */
beestat.component.scene.prototype.add_main_group_ = function() {
  const bounding_box = beestat.floor_plan.get_bounding_box(this.floor_plan_id_);

  this.main_group_ = new THREE.Group();
  this.main_group_.translateX((bounding_box.right + bounding_box.left) / -2);
  this.main_group_.translateZ((bounding_box.bottom + bounding_box.top) / -2);
  this.main_group_.rotation.x = Math.PI / 2;
  this.scene_.add(this.main_group_);
};

/**
 * Add the floor plan to the scene.
 */
beestat.component.scene.prototype.add_floor_plan_ = function() {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  this.layers_ = {};

  const walls_layer = new THREE.Group();
  self.main_group_.add(walls_layer);
  self.layers_['walls'] = walls_layer;

  floor_plan.data.groups.forEach(function(group) {
    const layer = new THREE.Group();
    self.main_group_.add(layer);
    self.layers_[group.group_id] = layer;
    group.rooms.forEach(function(room) {
      self.add_room_(layer, group, room);
    });
    self.add_walls_(walls_layer, group);
  });

  // Add roofs using straight skeleton
  this.add_roofs_();

  if (this.debug_.roof_edges) {
    this.add_roof_outlines_();
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
beestat.component.scene.prototype.add_roofs_ = function() {
  if (typeof SkeletonBuilder === 'undefined') {
    console.warn('SkeletonBuilder not yet loaded - skipping roof generation');
    return;
  }

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);

  // Create layer for roofs
  const roofs_layer = new THREE.Group();
  this.main_group_.add(roofs_layer);
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

          // Convert to skeleton format
          const ring = roof_polygon.map(function(point) {
            return [point.x, point.y];
          });
          ring.push([roof_polygon[0].x, roof_polygon[0].y]);

          const coordinates = [ring];
          const result = SkeletonBuilder.buildFromPolygon(coordinates);

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

            // Create material - dark gray shingles
            const material = new THREE.MeshPhongMaterial({
              'color': 0x3a3a3a,
              'side': THREE.DoubleSide,
              'flatShading': false
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.is_roof = true;
            mesh.layers.set(beestat.component.scene.layer_visible);
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
 * Add red outline visualization for exposed ceiling areas (future roof locations).
 */
beestat.component.scene.prototype.add_roof_outlines_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);

  // Create layer for roof outlines
  const roof_outlines_layer = new THREE.Group();
  this.main_group_.add(roof_outlines_layer);
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
  if (typeof SkeletonBuilder === 'undefined') {
    console.warn('SkeletonBuilder not yet loaded - skipping skeleton debug visualization');
    return;
  }

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);

  // Create layer for skeleton debug lines
  const skeleton_debug_layer = new THREE.Group();
  this.main_group_.add(skeleton_debug_layer);
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
          const result = SkeletonBuilder.buildFromPolygon(coordinates);

          if (!result) {
            console.warn('SkeletonBuilder returned null for polygon:', simple_polygon);
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
 * Test the SkeletonBuilder library with a simple square polygon.
 */
beestat.component.scene.prototype.test_skeleton_builder_ = function() {
  if (typeof SkeletonBuilder === 'undefined') {
    console.warn('SkeletonBuilder not yet loaded');
    return;
  }

  console.log('Testing SkeletonBuilder...');

  try {
    // Correct format: number[][][] = array of rings, each ring is array of [x,y] points
    // First ring is outer boundary, must be closed (first point repeated at end)
    const square = [
      [  // Outer ring
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0]  // Close the ring by repeating first point
      ]
      // Additional rings here would be holes
    ];

    console.log('Input polygon (correct format):', square);
    const result = SkeletonBuilder.buildFromPolygon(square);

    if (result) {
      console.log('✓ SkeletonBuilder test passed!');
      console.log('  Vertices:', result.vertices.length);
      console.log('  Polygons:', result.polygons.length);
      console.log('  Result:', result);
    } else {
      console.error('✗ SkeletonBuilder test failed - returned null');
    }
  } catch (error) {
    console.error('✗ SkeletonBuilder test threw error:', error);
  }
};

/**
 * Add environment layers (grass and earth strata) below the house.
 */
beestat.component.scene.prototype.add_environment_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const bounding_box = beestat.floor_plan.get_bounding_box(this.floor_plan_id_);
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
  const strata = [
    {'color': 0x4a7c3f, 'thickness': 10},  // Grass (thin layer)
    {'color': 0x5a4a3a, 'thickness': 30},  // Medium brown dirt
    {'color': 0x8b5e3c, 'thickness': 40},  // Light brown dirt
    {'color': 0x6e6e6e, 'thickness': 40}   // Gray bedrock
  ];

  const environment_layer = new THREE.Group();
  this.main_group_.add(environment_layer);
  this.layers_['environment'] = environment_layer;

  strata.forEach(function(stratum) {
    const geometry = new THREE.BoxGeometry(
      plan_width + padding * 2,
      plan_height + padding * 2,
      stratum.thickness
    );
    const material = new THREE.MeshPhongMaterial({'color': stratum.color});
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = center_x;
    mesh.position.y = center_y;
    mesh.position.z = current_z + stratum.thickness / 2;
    mesh.userData.is_environment = true;
    mesh.receiveShadow = true;

    environment_layer.add(mesh);
    current_z += stratum.thickness;
  }, this);

  // Add celestial lights (sun and moon) to the environment layer
  this.add_celestial_lights_();
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
  window.cancelAnimationFrame(this.animation_frame_);
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
