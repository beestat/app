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

// beestat.component.scene.sun_light_intensity = 1;
// beestat.component.scene.moon_light_intensity = 0.3;

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

// beestat.component.scene.ambient_light_intensity_sky = 0.4;
// beestat.component.scene.moon_opacity = 0.9;

// beestat.component.scene.turbidity = 10;
// beestat.component.scene.rayleigh = 0.5;
// beestat.component.scene.mie_coefficient = 0.001;
// beestat.component.scene.mie_directional_g = 0.95;

// beestat.component.scene.turbidity = 14;
// beestat.component.scene.rayleigh = 0.7;
// beestat.component.scene.mie_coefficient = 0.008;
// beestat.component.scene.mie_directional_g = 0.9;

// beestat.component.scene.shadow_map_size = 4096;

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
    // 'directional_light_moon_helper': false,
    // 'directional_light_sun_helper': false,
    'directional_light_top_helper': false,
    // 'grid': false,
    'watcher': false
  };

  this.width_ = this.state_.scene_width || 800;
  this.height_ = 500;

  this.add_scene_(parent);
  // this.add_background_(parent);
  this.add_renderer_(parent);
  this.add_camera_();
  this.add_controls_(parent);
  this.add_skybox_(parent);
  // this.add_sky_();
  // this.add_moon_();
  // this.add_directional_light_moon_();
  // this.add_directional_light_sun_();
  this.add_ambient_light_();
  this.add_directional_light_top_();
  // this.add_ground_();
  // this.add_ground_limited_();

  this.add_main_group_();
  this.add_floor_plan_();








  /**
   * Example of how to do a roof
   *
   * const geometry = new THREE.ConeGeometry(1.5, 1, 4, 1, false, Math.PI/4);
   * const material = new THREE.MeshPhongMaterial({
   *   'color': new THREE.Color(beestat.style.color.gray.dark)
   * });
   * const roof = new THREE.Mesh(
   *   geometry,
   *   material
   * );
   * roof.position.set(
   *   1, 2.5, 1
   * );
   * roof.castShadow = true;
   * roof.receiveShadow = true;
   *
   * this.scene_.add(roof);
   */

  const animate = function() {
    requestAnimationFrame(animate);
    self.controls_.update();
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

  this.renderer_.setSize(this.width_, this.height_);

  // this.renderer_.setSize(window.innerWidth, window.innerHeight);
  // this.renderer_.shadowMap.enabled = true;
  // this.renderer_.shadowMap.autoUpdate = false;

  /*
   * Added these to make the sky not look like crap.
   * https://threejs.org/examples/webgl_shaders_sky.html
   */
  // this.renderer_.toneMapping = THREE.ACESFilmicToneMapping;
  // this.renderer_.toneMappingExposure = 0.5;
  // this.renderer_.toneMappingExposure = 0.2;

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
  const skybox_name = 'cloudy';
  const loader = new THREE.CubeTextureLoader();
  loader.setPath('img/visualize/' + skybox_name + '/');
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
 * Add the sky to the scene. This is a shader that draws on the inside of a
 * box really far away. The size of the sun can be tweaked with the
 * sunAngularDiameterCos shader parameter in threejs.js.
 *
 * The sky material uniforms are configured to make the sky look generally
 * nice. They are tweaked for the eclipse simulation to darken the sky.
 */
/*beestat.component.scene.prototype.add_sky_ = function() {
  this.sky_ = new THREE.Sky();

  // Makes the sky box really big.
  this.sky_.scale.setScalar(4500000);

  this.sky_.material.uniforms.turbidity.value =
    beestat.component.scene.turbidity;

  this.sky_.material.uniforms.rayleigh.value =
    beestat.component.scene.rayleigh;

  this.sky_.material.uniforms.mieCoefficient.value =
    beestat.component.scene.mie_coefficient;

  this.sky_.material.uniforms.mieDirectionalG.value =
    beestat.component.scene.mie_directional_g;

  this.scene_.add(this.sky_);
};*/

/**
 * Adds a moon sprite to the scene. The scale is set arbitrarily to make it
 * roughly the size of the sun.
 */
/*beestat.component.scene.prototype.add_moon_ = function() {
  const map = new THREE.TextureLoader().load('img/moon.png');
  const material = new THREE.SpriteMaterial({'map': map});
  const scale = 700;

  this.moon_ = new THREE.Sprite(material);
  this.moon_.scale.set(scale, scale, scale);
  // this.scene_.add(this.moon_);
};*/

/**
 * Adds a faint moon light so the moon can cast shadows at night.
 */
/*beestat.component.scene.prototype.add_directional_light_moon_ = function() {
  this.directional_light_moon_ = new THREE.DirectionalLight(
    0xfffbab,
    0.2
  );
  this.directional_light_moon_.castShadow = true;
  this.directional_light_moon_.shadow.mapSize.width = beestat.component.scene.shadow_map_size;
  this.directional_light_moon_.shadow.mapSize.height = beestat.component.scene.shadow_map_size;
  this.directional_light_moon_.shadow.camera.left = -1000;
  this.directional_light_moon_.shadow.camera.right = 1000;
  this.directional_light_moon_.shadow.camera.top = 1000;
  this.directional_light_moon_.shadow.camera.bottom = -1000;
  this.directional_light_moon_.shadow.camera.far = 10000;
  // this.scene_.add(this.directional_light_moon_);

  if (this.debug_.directional_light_moon_helper === true) {
    this.directional_light_moon_helper_ = new THREE.DirectionalLightHelper(
      this.directional_light_moon_
    );
    this.scene_.add(this.directional_light_moon_helper_);

    this.directional_light_moon_camera_helper_ = new THREE.CameraHelper(
      this.directional_light_moon_.shadow.camera
    );
    this.scene_.add(this.directional_light_moon_camera_helper_);
  }
};*/

/**
 * Add a strong sun light to the scene.
 */
/*beestat.component.scene.prototype.add_directional_light_sun_ = function() {
  // Directional light to cast shadows.
  this.directional_light_sun_ = new THREE.DirectionalLight(
    0xffffff,
    beestat.component.scene.sun_light_intensity
  );
  this.directional_light_sun_.castShadow = true;
  // this.directional_light_sun_.shadow.bias = -0.00009;
  // this.directional_light_sun_.shadow.radius = 32;
  this.directional_light_sun_.shadow.mapSize.width = beestat.component.scene.shadow_map_size;
  this.directional_light_sun_.shadow.mapSize.height = beestat.component.scene.shadow_map_size;
  this.directional_light_sun_.shadow.camera.left = -1000;
  this.directional_light_sun_.shadow.camera.right = 1000;
  this.directional_light_sun_.shadow.camera.top = 1000;
  this.directional_light_sun_.shadow.camera.bottom = -1000;
  this.directional_light_sun_.shadow.camera.far = 10000;
  this.scene_.add(this.directional_light_sun_);

  if (this.debug_.directional_light_sun_helper === true) {
    this.directional_light_sun_helper_ = new THREE.DirectionalLightHelper(
      this.directional_light_sun_
    );
    this.scene_.add(this.directional_light_sun_helper_);

    this.directional_light_sun_camera_helper_ = new THREE.CameraHelper(
      this.directional_light_sun_.shadow.camera
    );
    this.scene_.add(this.directional_light_sun_camera_helper_);
  }
};*/

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
  /**
   * Base ambient light to keep everything visible (mostly at night). The
   * intensity of this light does not change.
   */
  this.scene_.add(new THREE.AmbientLight(
    0xffffff,
    beestat.component.scene.ambient_light_intensity
  ));
};

/**
 * Set the date and thus the position of the sun/moon.
 */
beestat.component.scene.prototype.update_ = function() {
  const self = this;

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const time = this.date_.format('HH:mm');

  // Set the color of each room
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
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

        // Labels
        const label_sprite = self.rooms_[room.room_id].userData.label_sprite;
        if (self.labels_ === true) {
          label_sprite.material = self.get_label_material_(
            beestat.temperature({
              'temperature': value,
              'units': true
            })
          );
        } else {
          label_sprite.material = self.get_label_material_();
        }
      } else {
        color = beestat.style.color.gray.dark;
      }

      self.rooms_[room.room_id].material.color.setHex(color.replace('#', '0x'));


    });
  });

  let address;
  if (floor_plan.address_id !== null) { // todo should be undefined?
    address = beestat.cache.address[floor_plan.address_id];
  } else {
    address = {
      'normalized': {
        'metadata': {
          'latitude': 0,
          'longitude': 0
        }
      }
    };
  }


  // After sunset may need to hide the sun light source...or maybe wean it's brightness off or something.

  // TODO TEMP TO KEEP LIGHTING CONSISTENT
  // const date = new Date('2022-08-16 12:00:00');
  // const date = this.date_.toDate();
  /*const date = moment()
    .hour(12)
    .minute(0)
    .second(0)
    .toDate();

  const sun_object_vector = new THREE.Vector3();
  const moon_object_vector = new THREE.Vector3();

  const sun_light_vector = new THREE.Vector3();
  const moon_light_vector = new THREE.Vector3();

  // Get sun and moon positions.
  const sun_position = SunCalc.getPosition(
    date,
    address.normalized.metadata.latitude,
    address.normalized.metadata.longitude
  );
  const moon_position = SunCalc.getMoonPosition(
    date,
    address.normalized.metadata.latitude,
    address.normalized.metadata.longitude
  );
  const moon_illumination = SunCalc.getMoonIllumination(date);

  // Set the position of the vectors.
  sun_object_vector.setFromSphericalCoords(
    10000,
    sun_position.altitude - (Math.PI / 2),
    sun_position.azimuth
  );
  moon_object_vector.setFromSphericalCoords(
    10000,
    moon_position.altitude - (Math.PI / 2),
    moon_position.azimuth
  );
  // Set the position of the vectors.
  sun_light_vector.setFromSphericalCoords(
    5000,
    sun_position.altitude - (Math.PI / 2),
    sun_position.azimuth
  );
  moon_light_vector.setFromSphericalCoords(
    5000,
    moon_position.altitude - (Math.PI / 2),
    moon_position.azimuth
  );

  // TODO This will change based on size distance etc
  const eclipse_begins_distance = 660;
  const sun_moon_distance = sun_object_vector.distanceTo(moon_object_vector);
  const eclipse_percentage = Math.max(
    0,
    (1 - (sun_moon_distance / eclipse_begins_distance))
  );*/

  /*
   * this.ambient_light_sky_.intensity =
   *   beestat.component.scene.ambient_light_intensity_sky * eclipse_multiplier;
   */

  /*
   * this.directional_light_sun_.intensity =
   *   this.directional_light_sun_.intensity * eclipse_multiplier;
   */

  // Set light intensities by altitude and eclipse percentage.
/*  this.ambient_light_sky_.intensity = Math.max(
    0,
    beestat.component.scene.ambient_light_intensity_sky * Math.sin(sun_position.altitude) * (1 - eclipse_percentage)
  );*/

  // this.moon_.material.opacity = 0.2;

  /**
   * Mess up the sky during an eclipse
   */

  // Turn down to 0
  /*if (this.sky_ !== undefined) {
    this.sky_.material.uniforms.rayleigh.value =
      beestat.component.scene.rayleigh * (1 - eclipse_percentage);

    // Turn down to almost 0
    this.sky_.material.uniforms.mieCoefficient.value =
      Math.max(
        0.00001,
        beestat.component.scene.mie_coefficient * (1 - eclipse_percentage)
      );

    // Increase to almost 1
    this.sky_.material.uniforms.mieDirectionalG.value =
      Math.max(
        beestat.component.scene.mie_directional_g,
        0.9999 * eclipse_percentage
      );

    this.sky_.material.uniforms.sunPosition.value.copy(sun_object_vector);
  }*/

  /*
   *  this.renderer_.toneMappingExposure = Math.max(
   *  0.1, // Minimum exposure
   *  beestat.component.scene.tone_mapping_exposure * eclipse_multiplier
   *  );
   */

  // Set the brightness of the sun
  /*if (this.directional_light_sun_ !== undefined) {
    this.directional_light_sun_.intensity =
      beestat.component.scene.sun_light_intensity * Math.sin(sun_position.altitude) * (1 - eclipse_percentage);
    this.directional_light_sun_.position.copy(sun_light_vector);
  }

  // Set the brightness of the moon
  if (this.directional_light_moon_ !== undefined) {
    this.directional_light_moon_.intensity =
      beestat.component.scene.moon_light_intensity * moon_illumination.fraction;
    this.directional_light_moon_.position.copy(moon_light_vector);
  }

  if (this.moon_ !== undefined) {
    this.moon_.position.copy(moon_object_vector);
  }*/

  // TODO size of moon based on distance? Might not be worth it haha.

  /*
   * this.directional_light_moon_.intensity = 0;
   * this.directional_light_sun_.intensity = 0;
   */

  // Update the directional light positions

  // Update the position of the sun and moon in the sky
  // this.sky2_.material.uniforms.sunPosition.value.copy(moon_object_vector);

  // Update shadows
  /*this.renderer_.shadowMap.needsUpdate = true;

  if (this.debug_.directional_light_moon_helper === true) {
    this.directional_light_moon_helper_.update();
    this.directional_light_moon_camera_helper_.update();
  }

  if (this.debug_.directional_light_sun_helper === true) {
    this.directional_light_sun_helper_.update();
    this.directional_light_sun_camera_helper_.update();
  }*/

  if (this.debug_.directional_light_top_helper === true) {
    this.directional_light_top_helper_.update();
    // this.directional_light_top_camera_helper_.update();
  }

  // Update debug watcher
  if (this.debug_.watcher === true) {
    // this.debug_info_.date = date;
    this.update_debug_();
  }
};

/**
 * Add some type of ground for the house to sit on.
 */
/*beestat.component.scene.prototype.add_ground_ = function() {
  const size = 40000;

  const texture = new THREE.TextureLoader().load('img/grass.jpg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1000, 1000);

  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshLambertMaterial({
    // 'map': texture,
    'color': new THREE.Color(beestat.style.color.green.dark),
    'side': THREE.DoubleSide
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x += Math.PI / 2;
  plane.receiveShadow = true;

  this.scene_.add(plane);

  if (this.debug_.grid === true) {
    const grid_size = 100;
    const grid_divisions = grid_size;
    const grid_color_center_line = new THREE.Color(beestat.style.color.lightblue.base);
    const grid_color_grid = new THREE.Color(beestat.style.color.green.base);
    const grid_helper = new THREE.GridHelper(
      grid_size,
      grid_divisions,
      grid_color_center_line,
      grid_color_grid
    );
    this.scene_.add(grid_helper);
  }
};
*/
/*beestat.component.scene.prototype.add_ground_limited_ = function() {
  const height = 24;

  const bounding_box = beestat.floor_plan.get_bounding_box(this.floor_plan_id_);

  const size = Math.max(bounding_box.width, bounding_box.height) + 120;

  // const texture = new THREE.TextureLoader().load('img/grass.jpg');
  // texture.wrapS = THREE.RepeatWrapping;
  // texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set(1000, 1000);

  const geometry = new THREE.BoxGeometry(size, size, height);
  const material = new THREE.MeshLambertMaterial({
    // 'map': texture,
    'color': new THREE.Color(beestat.style.color.green.dark),
    'side': THREE.DoubleSide
  });
  const box = new THREE.Mesh(geometry, material);
  box.translateY(height / -2);
  box.rotation.x += Math.PI / 2;
  // box.receiveShadow = true;

  this.scene_.add(box);

  if (this.debug_.grid === true) {
    const grid_size = 100;
    const grid_divisions = grid_size;
    const grid_color_center_line = new THREE.Color(beestat.style.color.lightblue.base);
    const grid_color_grid = new THREE.Color(beestat.style.color.green.base);
    const grid_helper = new THREE.GridHelper(
      grid_size,
      grid_divisions,
      grid_color_center_line,
      grid_color_grid
    );
    this.scene_.add(grid_helper);
  }
};*/







/**
 * Add a background.
 */
// beestat.component.scene.prototype.add_background_ = function() {
//   this.scene_.background = new THREE.Color(beestat.style.color.bluegray.dark);
// }






/**
 * Add a room. Room coordinates are absolute.
 *
 * @param {THREE.Group} layer The layer the room belongs to.
 * @param {object} group The group the room belongs to.
 * @param {object} room The room to add.
 */
beestat.component.scene.prototype.add_room_ = function(layer, group, room) {
  const color = beestat.style.color.gray.dark;

  var clipper_offset = new ClipperLib.ClipperOffset();

  clipper_offset.AddPath(
    room.points,
    ClipperLib.JoinType.jtSquare,
    ClipperLib.EndType.etClosedPolygon
  );
  var clipper_hole = new ClipperLib.Path();
  clipper_offset.Execute(clipper_hole, -1.5);

  // Full height
  // const extrude_height = (room.height || group.height) - 3;

  // Just the floor plan
  const extrude_height = 6;




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
    'bevelEnabled': false,
    // 'bevelThickness': 1,
    // 'bevelSize': 1,
    // 'bevelOffset': 1,
    // 'bevelSegments': 5
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrude_settings
  );
  // const material = new THREE.MeshBasicMaterial({
  const material = new THREE.MeshPhongMaterial({
    'color': color,
    // 'transparent': true,
    // 'opacity': 0.5
  });
  // material.opacity = 0.5;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -extrude_height - (room.elevation || group.elevation);

  // Translate the mesh to the room x/y position.
  mesh.translateX(room.x);
  mesh.translateY(room.y);

  // Shadows are neat.
  mesh.castShadow = true;
  // mesh.receiveShadow = true;

  // Add the mesh to the group.
  this.main_group_.add(mesh);

  // Store a reference to the mesh representing each room.
  if (this.rooms_ === undefined) {
    this.rooms_ = {};
  }
  this.rooms_[room.room_id] = mesh;

  layer.add(mesh);

  /**
   * LABEL
   */
  const label_material = this.get_label_material_();
  const label_sprite = new THREE.Sprite(label_material);

  // Scale to an appropriate-looking size.
  const scale_x = 0.16;
  const scale_y = scale_x * label_material.map.source.data.height / label_material.map.source.data.width;
  label_sprite.scale.set(scale_x, scale_y, 1);

  // Set center of sprite to bottom middle.
  label_sprite.center.set(0.5, 0);

  // Determine where the sprite will go.
  const geojson_polygon = [];
  room.points.forEach(function(point) {
    geojson_polygon.push([
      point.x,
      point.y
    ]);
  });
  const label_point = polylabel([geojson_polygon]);

  /**
   * Some arbitrary small number so the sprite is *just* above the room or
   * when you view from directly above sometimes they disappear.
   */
  const z_offset = 1;

  label_sprite.position.set(
    room.x + label_point[0],
    room.y + label_point[1],
    mesh.position.z - z_offset
  );
  layer.add(label_sprite);

  mesh.userData.label_sprite = label_sprite;
  /**
   * LABEL
   */
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
  // this.floor_plan_center_x_ = ;
  // this.floor_plan_center_y_ = (bounding_box.bottom + bounding_box.top) / 2;

  // this.view_box_.x = center_x - (this.view_box_.width / 2);
  // this.view_box_.y = center_y - (this.view_box_.height / 2);

  this.main_group_ = new THREE.Group();
  this.main_group_.translateX((bounding_box.right + bounding_box.left) / -2);
  this.main_group_.translateZ((bounding_box.bottom + bounding_box.top) / -2);
  // this.main_group_.rotation.x = -Math.PI / 2;
  //
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
  floor_plan.data.groups.forEach(function(group, i) {
    const layer = new THREE.Group();
    self.main_group_.add(layer);
    self.layers_['group_' + i] = layer;
    group.rooms.forEach(function(room) {
      self.add_room_(layer, group, room);
    });
  });
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
  this.layers_[layer_name].visible = visible;

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
 * @param {string} text
 *
 * @return {THREE.Material}
 */
beestat.component.scene.prototype.get_label_material_ = function(text = '') {
  if (this.label_material_memo_[text] === undefined) {
    /**
     * Increasing the size of the canvas increases the resolution of the texture
     * and thus makes it less blurry.
     */
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 30;

    const context = canvas.getContext('2d');

    // Debug red background
    // context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    // context.fillRect(0, 0, canvas.width, canvas.height);

    const font_size = canvas.height;
    context.font = 'bold ' + font_size + 'px Montserrat';
    context.fillStyle = '#fff';
    context.textAlign = 'center';
    context.fillText(
      text,
      canvas.width / 2,
      canvas.height
    );

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      'map': texture,
      'sizeAttenuation': false
    });

    this.label_material_memo_[text] = material;
  }

  return this.label_material_memo_[text];
};
