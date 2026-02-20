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
beestat.component.scene.moon_light_intensity = 0.13125;

/**
 * Peak per-room interior light intensity used at night.
 *
 * @type {number}
 */
beestat.component.scene.interior_light_intensity = 0.9;

/**
 * Max number of interior point lights allowed to cast shadows.
 *
 * @type {number}
 */
beestat.component.scene.interior_light_shadow_max = 1;

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
    'straight_skeleton': false,
    'openings': false,
    'opening_cutters': false,
    'hide_tree_branches': false,
    'light_source_orbs': false
  };
  this.room_interaction_enabled_ = true;

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

  this.fps_ = 0;
  this.fps_frame_count_ = 0;
  this.fps_last_sample_ms_ = window.performance.now();

  const animate = function() {
    self.animation_frame_ = window.requestAnimationFrame(animate);
    self.fps_frame_count_++;
    const now_ms = window.performance.now();
    const elapsed_ms = now_ms - self.fps_last_sample_ms_;
    if (elapsed_ms >= 500) {
      self.fps_ = Math.round((self.fps_frame_count_ * 1000) / elapsed_ms);
      self.fps_frame_count_ = 0;
      self.fps_last_sample_ms_ = now_ms;
    }
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
 * Set whether room floor meshes can be hovered/selected.
 *
 * @param {boolean} enabled
 *
 * @return {beestat.component.scene}
 */
beestat.component.scene.prototype.set_room_interaction_enabled = function(enabled) {
  this.room_interaction_enabled_ = enabled !== false;

  if (this.room_interaction_enabled_ !== true) {
    if (this.intersected_mesh_ !== undefined) {
      if (
        this.intersected_mesh_.material !== undefined &&
        this.intersected_mesh_.material.emissive !== undefined
      ) {
        this.intersected_mesh_.material.emissive.setHex(0x000000);
      }
      delete this.intersected_mesh_;
    }
    if (this.active_mesh_ !== undefined) {
      delete this.active_mesh_;
    }
    document.body.style.cursor = '';
    if (this.rendered_ === true) {
      this.update_();
    }
  }

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
 * Get the current sampled frame rate.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_fps = function() {
  return Number(this.fps_ || 0);
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
  if (this.csg_cutter_material_ !== undefined) {
    this.csg_cutter_material_.dispose();
  }
  if (this.opening_frame_material_ !== undefined) {
    this.opening_frame_material_.dispose();
  }
  if (this.window_pane_material_ !== undefined) {
    this.window_pane_material_.dispose();
  }
  if (this.light_source_marker_material_ !== undefined) {
    this.light_source_marker_material_.dispose();
  }
  if (this.light_source_glow_material_ !== undefined) {
    this.light_source_glow_material_.dispose();
  }
  if (this.light_source_marker_geometry_ !== undefined) {
    this.light_source_marker_geometry_.dispose();
  }
  if (this.light_source_glow_geometry_ !== undefined) {
    this.light_source_glow_geometry_.dispose();
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
