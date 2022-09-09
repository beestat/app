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
    // 'grid': false,
    'watcher': false
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
  this.raycaster_pointer_ = new THREE.Vector2();

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
      if (intersects[i].object.type === 'Mesh') {
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
    'bevelEnabled': false
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrude_settings
  );
  const material = new THREE.MeshPhongMaterial({
    'color': color
  });
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
  // mesh.userData.room_id = room.room_id;
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
  this.layers_[layer_name].traverse(function(child) {
    child.layers.set(
      visible === true
        ? beestat.component.scene.layer_visible
        : beestat.component.scene.layer_hidden
    );
  });

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

    // Debug red background
    // context.fillStyle = 'rgba(255, 0, 0, 0.2)';
    // context.fillRect(0, 0, canvas.width, canvas.height);

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
