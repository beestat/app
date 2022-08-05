/**
 * Home Scene
 */
beestat.component.scene = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.scene, beestat.component);

beestat.component.scene.sun_light_intensity = 1;
beestat.component.scene.moon_light_intensity = 0.3;

beestat.component.scene.ambient_light_intensity_base = 0.3;
beestat.component.scene.ambient_light_intensity_sky = 0.4;
beestat.component.scene.turbidity = 10;
beestat.component.scene.rayleigh = 0.5;
beestat.component.scene.mie_coefficient = 0.001;
beestat.component.scene.mie_directional_g = 0.95;
beestat.component.scene.moon_opacity = 0.9;

beestat.component.scene.shadow_map_size = 4096;

/**
 * Rerender the scene by removing the primary group, then re-adding it and the
 * floor plan. This avoids having to reconstruct everything and then also
 * having to manually save camera info etc.
 */
beestat.component.scene.prototype.rerender = function() {
  this.scene_.remove(this.group_);
  this.add_group_();
  this.add_floor_plan_();
};

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.decorate_ = function(parent) {
  const self = this;

  this.debug_ = {
    'axes': false,
    'moon_light_helper': false,
    'sun_light_helper': false,
    'grid': false,
    'watcher': false
  };


  this.add_scene_(parent);
  this.add_renderer_(parent);
  this.add_camera_();
  this.add_controls_(parent);
  this.add_sky_();
  this.add_moon_();
  this.add_moon_light_();
  this.add_sun_light_();
  this.add_ambient_light_();
  this.add_ground_();

  this.add_group_();
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
  this.renderer_.setSize(window.innerWidth / 2.2, window.innerHeight / 2.2);
  this.renderer_.shadowMap.enabled = true;
  this.renderer_.shadowMap.autoUpdate = false;

  /*
   * Added these to make the sky not look like crap.
   * https://threejs.org/examples/webgl_shaders_sky.html
   */
  this.renderer_.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer_.toneMappingExposure = 0.5;

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
  new THREE.OrbitControls(this.camera_, parent[0]); // eslint-disable-line no-new
};

/**
 * Add the sky to the scene. This is a shader that draws on the inside of a
 * box really far away. The size of the sun can be tweaked with the
 * sunAngularDiameterCos shader parameter in threejs.js.
 *
 * The sky material uniforms are configured to make the sky look generally
 * nice. They are tweaked for the eclipse simulation to darken the sky.
 */
beestat.component.scene.prototype.add_sky_ = function() {
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
};

/**
 * Adds a moon sprite to the scene. The scale is set arbitrarily to make it
 * roughly the size of the sun.
 */
beestat.component.scene.prototype.add_moon_ = function() {
  const map = new THREE.TextureLoader().load('img/moon.png');
  const material = new THREE.SpriteMaterial({'map': map});
  const scale = 700;

  this.moon_ = new THREE.Sprite(material);
  this.moon_.scale.set(scale, scale, scale);
  // this.scene_.add(this.moon_);
};

/**
 * Adds a faint moon light so the moon can cast shadows at night.
 */
beestat.component.scene.prototype.add_moon_light_ = function() {
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

  if (this.debug_.moon_light_helper === true) {
    this.directional_light_moon_helper_ = new THREE.DirectionalLightHelper(
      this.directional_light_moon_
    );
    this.scene_.add(this.directional_light_moon_helper_);

    this.directional_light_moon_camera_helper_ = new THREE.CameraHelper(
      this.directional_light_moon_.shadow.camera
    );
    this.scene_.add(this.directional_light_moon_camera_helper_);
  }
};

/**
 * Add a strong sun light to the scene.
 */
beestat.component.scene.prototype.add_sun_light_ = function() {
  // Directional light to cast shadows.
  this.directional_light_sun_ = new THREE.DirectionalLight(
    0xffffff,
    beestat.component.scene.sun_light_intensity
  );
  this.directional_light_sun_.castShadow = true;
  this.directional_light_sun_.shadow.bias = -0.00009;
  this.directional_light_sun_.shadow.mapSize.width = beestat.component.scene.shadow_map_size;
  this.directional_light_sun_.shadow.mapSize.height = beestat.component.scene.shadow_map_size;
  this.directional_light_sun_.shadow.camera.left = -1000;
  this.directional_light_sun_.shadow.camera.right = 1000;
  this.directional_light_sun_.shadow.camera.top = 1000;
  this.directional_light_sun_.shadow.camera.bottom = -1000;
  this.directional_light_sun_.shadow.camera.far = 10000;
  this.scene_.add(this.directional_light_sun_);

  if (this.debug_.sun_light_helper === true) {
    this.directional_light_sun_helper_ = new THREE.DirectionalLightHelper(
      this.directional_light_sun_
    );
    this.scene_.add(this.directional_light_sun_helper_);

    this.directional_light_sun_camera_helper_ = new THREE.CameraHelper(
      this.directional_light_sun_.shadow.camera
    );
    this.scene_.add(this.directional_light_sun_camera_helper_);
  }
};

/**
 * Add ambient lighting so everything is always somewhat visible.
 */
beestat.component.scene.prototype.add_ambient_light_ = function() {
  /**
   * Base ambient light to keep everything visible (mostly at night). The
   * intensity of this light does not change.
   */
  this.scene_.add(new THREE.AmbientLight(
    0xffffff,
    beestat.component.scene.ambient_light_intensity_base
  ));

  /**
   * Ambient light from the sun/moon. Ths intensity of this light changes
   * based on the time of day.
   */
  this.ambient_light_sky_ = new THREE.AmbientLight(
    0xffffff,
    beestat.component.scene.ambient_light_intensity_sky
  );
  this.scene_.add(this.ambient_light_sky_);
};

/**
 * Set the date and thus the position of the sun/moon.
 *
 * @param {Date} date
 */
beestat.component.scene.prototype.set_date = function(date) {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];
  const address = beestat.cache.address[thermostat.address_id];

  // After sunset may need to hide the sun light source...or maybe wean it's brightness off or something.

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
  );

  /*
   * this.ambient_light_sky_.intensity =
   *   beestat.component.scene.ambient_light_intensity_sky * eclipse_multiplier;
   */

  /*
   * this.directional_light_sun_.intensity =
   *   this.directional_light_sun_.intensity * eclipse_multiplier;
   */

  // Set light intensities by altitude and eclipse percentage.
  this.ambient_light_sky_.intensity = Math.max(
    0,
    beestat.component.scene.ambient_light_intensity_sky * Math.sin(sun_position.altitude) * (1 - eclipse_percentage)
  );

  this.moon_.material.opacity = 0.2;

  /**
   * Mess up the sky during an eclipse
   */

  // Turn down to 0
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

  /*
   *  this.renderer_.toneMappingExposure = Math.max(
   *  0.1, // Minimum exposure
   *  beestat.component.scene.tone_mapping_exposure * eclipse_multiplier
   *  );
   */

  // Set the brightness of the sun
  this.directional_light_sun_.intensity =
    beestat.component.scene.sun_light_intensity * Math.sin(sun_position.altitude) * (1 - eclipse_percentage);

  // Set the brightness of the moon
  this.directional_light_moon_.intensity =
    beestat.component.scene.moon_light_intensity * moon_illumination.fraction;

  // TODO size of moon based on distance? Might not be worth it haha.

  /*
   * this.directional_light_moon_.intensity = 0;
   * this.directional_light_sun_.intensity = 0;
   */

  // Update the directional light positions
  this.directional_light_sun_.position.copy(sun_light_vector);
  this.directional_light_moon_.position.copy(moon_light_vector);

  // Update the position of the sun and moon in the sky
  this.sky_.material.uniforms.sunPosition.value.copy(sun_object_vector);
  this.moon_.position.copy(moon_object_vector);
  // this.sky2_.material.uniforms.sunPosition.value.copy(moon_object_vector);

  // Update shadows
  this.renderer_.shadowMap.needsUpdate = true;

  if (this.debug_.moon_light_helper === true) {
    this.directional_light_moon_helper_.update();
    this.directional_light_moon_camera_helper_.update();
  }

  if (this.debug_.sun_light_helper === true) {
    this.directional_light_sun_helper_.update();
    this.directional_light_sun_camera_helper_.update();
  }



  // Update debug watcher
  if (this.debug_.watcher === true) {
    this.debug_info_.date = date;
    this.update_debug_();
  }
};

/**
 * Add some type of ground for the house to sit on.
 */
beestat.component.scene.prototype.add_ground_ = function() {
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







/**
 * Add a background.
 */
/*
 * beestat.component.scene.prototype.add_background_ = function() {
 *   this.scene_.background = new THREE.Color(beestat.style.color.bluegray.dark);
 * }
 */





/**
 * Add a room. Room coordinates are absolute.
 *
 * @param {object} group The group the room belongs to.
 * @param {object} room The room to add.
 */
beestat.component.scene.prototype.add_room_ = function(group, room) {
  const color = new THREE.Color(beestat.style.color.blue.base);

  var clipper_offset = new ClipperLib.ClipperOffset();

  clipper_offset.AddPath(room.points, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  var clipper_hole = new ClipperLib.Path();
  // var offsetted_paths = new ClipperLib.Path();
  clipper_offset.Execute(clipper_hole, -5);

  room.height = 12 * 1;

  // Create a shape using the points of the room.
  const shape = new THREE.Shape();
  const first_point = room.points[0];
  shape.moveTo(first_point.x, first_point.y);
  room.points.forEach(function(point) {
    shape.lineTo(point.x, point.y);
  });


  // FLOOR
  const floor = shape.clone();
  const floor_geometry = new THREE.ShapeGeometry(floor);
  const floor_material = new THREE.MeshLambertMaterial({
    'color': color,
    'side': THREE.DoubleSide
  });
  const floor_mesh = new THREE.Mesh(floor_geometry, floor_material);
  floor_mesh.position.z = ((room.elevation || group.elevation) + room.height) * -1;

  // Translate the floor_mesh to the room x/y position.
  floor_mesh.translateX(room.x);
  floor_mesh.translateY(room.y);
  floor_mesh.translateZ(room.height - 1);

  // floor.rotation.x += Math.PI/2;

  // Shadows are neat.
  floor_mesh.castShadow = true;
  floor_mesh.receiveShadow = true;

  // Add the mesh to the group.
  this.group_.add(floor_mesh);





  // Create a hole
  const hole = new THREE.Shape();
  const hole_first_point = clipper_hole[0].shift();
  hole.moveTo(hole_first_point.x, hole_first_point.y);
  clipper_hole[0].forEach(function(point) {
    hole.lineTo(point.x, point.y);
  });

  // Hole
  // const hole = shape.clone();
  shape.holes.push(hole);

/*  var paths = [[{x:30,y:30},{x:130,y:30},{x:130,y:130},{x:30,y:130}],
                   [{x:60,y:60},{x:60,y:100},{x:100,y:100},{x:100,y:60}]];
  var scale = 100;
  ClipperLib.JS.ScaleUpPaths(paths, scale);
  // Possibly ClipperLib.Clipper.SimplifyPolygons() here
  // Possibly ClipperLib.Clipper.CleanPolygons() here
  var co = new ClipperLib.ClipperOffset(2, 0.25);

  // ClipperLib.EndType = {etOpenSquare: 0, etOpenRound: 1, etOpenButt: 2, etClosedPolygon: 3, etClosedLine : 4 };
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  var offsetted_paths = new ClipperLib.Paths();
  co.Execute(offsetted_paths, -10 * scale);*/



  // Extrude the shape and create the mesh.
  const extrude_settings = {
    'depth': room.height,
    'bevelEnabled': false
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrude_settings
  );
  const material = new THREE.MeshPhongMaterial({
    // 'color': new THREE.Color(beestat.style.color.red.base)
    'color': color
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = ((room.elevation || group.elevation) + room.height) * -1;

  // Translate the mesh to the room x/y position.
  mesh.translateX(room.x);
  mesh.translateY(room.y);

  // Shadows are neat.
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Add the mesh to the group.
  this.group_.add(mesh);
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
 * Add a group containing all of the extruded geometry.
 */
beestat.component.scene.prototype.add_group_ = function() {
  this.group_ = new THREE.Group();
  // this.group_.rotation.x = -Math.PI / 2;
  //
  this.group_.rotation.x = Math.PI / 2;
  this.scene_.add(this.group_);
};

/**
 * Add the floor plan to the scene.
 */
beestat.component.scene.prototype.add_floor_plan_ = function() {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[1];
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      self.add_room_(group, room);
    });
  });
};
