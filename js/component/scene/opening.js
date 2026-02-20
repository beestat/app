/**
 * Scene methods split from scene.js.
 */


/**
 * Build an opening cutter mesh for CSG subtraction.
 *
 * @param {object} group The floor plan group.
 * @param {object} opening The opening.
 * @return {?THREE.Mesh} Opening cutter mesh or null if opening is not cuttable.
 */
beestat.component.scene.prototype.build_opening_cutter_mesh_ = function(group, opening) {
  const opening_line = this.get_opening_line_params_(opening);
  const width = opening_line.width;
  const height = Math.max(1, Number(opening.height || this.get_opening_default_height_(opening.type)));
  const wall_thickness = Number(beestat.component.scene.wall_thickness || 4);
  // Slightly oversize cutter depth so CSG fully clears wall thickness even when
  // a snapped opening is numerically near-coplanar with one wall face.
  const cutter_depth_padding = 4;
  const depth = Math.max(0.5, wall_thickness + cutter_depth_padding);
  const center_z = this.get_opening_center_z_(group, opening, height);

  if (this.csg_cutter_material_ === undefined) {
    this.csg_cutter_material_ = new THREE.MeshBasicMaterial({
      'visible': false
    });
  }

  const geometry = new THREE.BoxGeometry(width, depth, height);
  const cutter = new THREE.Mesh(geometry, this.csg_cutter_material_);
  cutter.position.set(
    opening_line.center_x,
    opening_line.center_y,
    center_z
  );
  cutter.rotation.z = opening_line.rotation_radians;
  cutter.updateMatrix();
  cutter.updateMatrixWorld(true);

  return cutter;
};


/**
 * Whether an opening type should be treated as glass-family geometry.
 * Window reuses glass geometry and only adds a crossbar.
 *
 * @param {string} type
 *
 * @return {boolean}
 */
beestat.component.scene.prototype.is_opening_glass_family_ = function(type) {
  return type === 'window' || type === 'glass';
};


/**
 * Get default opening width by type.
 *
 * @param {string} type
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_opening_default_width_ = function(type) {
  return this.is_opening_glass_family_(type) ? 48 : 36;
};


/**
 * Get default opening height by type.
 *
 * @param {string} type
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_opening_default_height_ = function(type) {
  return this.is_opening_glass_family_(type) ? 60 : 78;
};


/**
 * Get default opening elevation by type.
 *
 * @param {string} type
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_opening_default_elevation_ = function(type) {
  return this.is_opening_glass_family_(type) ? 24 : 0;
};


/**
 * Resolve opening line parameters from endpoint data.
 *
 * @param {object} opening
 *
 * @return {{center_x:number, center_y:number, width:number, rotation_radians:number}}
 */
beestat.component.scene.prototype.get_opening_line_params_ = function(opening) {
  const points = (
    opening.points !== undefined &&
    Array.isArray(opening.points) === true &&
    opening.points.length === 2
  )
    ? opening.points
    : null;

  let p1;
  let p2;
  if (points !== null) {
    p1 = points[0];
    p2 = points[1];
  } else {
    const center_x = Number(opening.x || 0);
    const center_y = Number(opening.y || 0);
    const width = Math.max(12, Number(opening.width || this.get_opening_default_width_(opening.type)));
    const half_width = width / 2;
    p1 = {
      'x': center_x - half_width,
      'y': center_y
    };
    p2 = {
      'x': center_x + half_width,
      'y': center_y
    };
  }

  const dx = Number(p2.x || 0) - Number(p1.x || 0);
  const dy = Number(p2.y || 0) - Number(p1.y || 0);
  return {
    'center_x': (Number(p1.x || 0) + Number(p2.x || 0)) / 2,
    'center_y': (Number(p1.y || 0) + Number(p2.y || 0)) / 2,
    'width': Math.max(12, Math.sqrt((dx * dx) + (dy * dy))),
    'rotation_radians': Math.atan2(dy, dx)
  };
};


/**
 * Get the opening center Z. Opening elevation is measured from the bottom of
 * the room reference plane, matching existing floor-plan behavior.
 *
 * @param {object} group The floor plan group.
 * @param {object} opening The opening.
 * @param {number} height The opening height.
 *
 * @return {number}
 */
beestat.component.scene.prototype.get_opening_center_z_ = function(group, opening, height) {
  const group_elevation = Number(group.elevation || 0);
  const floor_thickness = Number(beestat.component.scene.room_floor_thickness || 0);
  const opening_elevation = Number(
    opening.elevation !== undefined
      ? opening.elevation
      : this.get_opening_default_elevation_(opening.type)
  );
  return -group_elevation - floor_thickness - opening_elevation - (height / 2);
};


/**
 * Add a debug wireframe for an opening cutter.
 *
 * @param {THREE.Group} layer The debug layer.
 * @param {THREE.Mesh} cutter The cutter mesh.
 */
beestat.component.scene.prototype.add_opening_cutter_debug_ = function(layer, cutter) {
  const edges_geometry = new THREE.EdgesGeometry(cutter.geometry);
  const wireframe = new THREE.LineSegments(
    edges_geometry,
    new THREE.LineBasicMaterial({
      'color': 0xff7700
    })
  );
  wireframe.position.copy(cutter.position);
  wireframe.rotation.copy(cutter.rotation);
  wireframe.scale.copy(cutter.scale);
  wireframe.layers.set(beestat.component.scene.layer_visible);

  layer.add(wireframe);
};


/**
 * Subtract opening cutters from wall meshes.
 *
 * @param {THREE.Group} walls_layer The wall mesh layer.
 * @param {object} floor_plan The floor plan data.
 * @param {THREE.Group=} opening_cutter_debug_layer Optional debug cutter layer.
 */
beestat.component.scene.prototype.apply_opening_cuts_ = function(
  walls_layer,
  floor_plan,
  opening_cutter_debug_layer
) {
  if (window.CSG === undefined || typeof window.CSG.subtract !== 'function') {
    return;
  }

  const wall_meshes = walls_layer.children.filter(function(child) {
    return (
      child !== undefined &&
      child.type === 'Mesh' &&
      child.userData !== undefined &&
      child.userData.wall_cuttable === true
    );
  });

  floor_plan.data.groups.forEach(function(group) {
    const openings = group.openings || [];
    if (openings.length === 0) {
      return;
    }

    const group_wall_meshes = wall_meshes.filter(function(mesh) {
      return mesh.userData.group_id === group.group_id;
    });
    if (group_wall_meshes.length === 0) {
      return;
    }

    openings.forEach((opening) => {
      const cutter = this.build_opening_cutter_mesh_(group, opening);
      if (cutter === null) {
        return;
      }

      if (opening_cutter_debug_layer !== undefined) {
        this.add_opening_cutter_debug_(opening_cutter_debug_layer, cutter);
      }

      const cutter_box = new THREE.Box3().setFromObject(cutter);

      group_wall_meshes.forEach(function(wall_mesh) {
        const wall_box = new THREE.Box3().setFromObject(wall_mesh);
        if (wall_box.intersectsBox(cutter_box) !== true) {
          return;
        }

        try {
          wall_mesh.updateMatrix();
          wall_mesh.updateMatrixWorld(true);

          const result_mesh = window.CSG.subtract(wall_mesh, cutter);
          if (
            result_mesh === undefined ||
            result_mesh.geometry === undefined ||
            result_mesh.geometry.attributes === undefined ||
            result_mesh.geometry.attributes.position === undefined ||
            result_mesh.geometry.attributes.position.count === 0
          ) {
            return;
          }

          result_mesh.geometry.computeBoundingBox();
          result_mesh.geometry.computeBoundingSphere();
          result_mesh.geometry.computeVertexNormals();

          const old_geometry = wall_mesh.geometry;
          wall_mesh.geometry = result_mesh.geometry;
          wall_mesh.castShadow = true;
          wall_mesh.receiveShadow = true;
          wall_mesh.layers.set(beestat.component.scene.layer_visible);
          wall_mesh.updateMatrix();
          wall_mesh.updateMatrixWorld(true);

          if (old_geometry !== undefined) {
            old_geometry.dispose();
          }
        } catch (error) {
          // Keep original wall mesh if CSG subtraction fails.
        }
      });

      cutter.geometry.dispose();
    });
  }, this);
};


/**
 * Add red wireframe boxes to visualize opening placement in 3D.
 *
 * @param {THREE.Group} layer The layer to add opening debug to.
 * @param {object} group The floor plan group.
 */
beestat.component.scene.prototype.add_openings_debug_ = function(layer, group) {
  if (group.openings === undefined || group.openings.length === 0) {
    return;
  }

  const wall_thickness = beestat.component.scene.wall_thickness;

  group.openings.forEach(function(opening) {
    const opening_line = this.get_opening_line_params_(opening);
    const width = opening_line.width;
    const height = Math.max(1, Number(opening.height || this.get_opening_default_height_(opening.type)));
    const center_z = this.get_opening_center_z_(group, opening, height);

    const geometry = new THREE.BoxGeometry(
      width,
      wall_thickness,
      height
    );

    const edges_geometry = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      edges_geometry,
      new THREE.LineBasicMaterial({
        'color': 0xff0000
      })
    );

    wireframe.position.x = opening_line.center_x;
    wireframe.position.y = opening_line.center_y;
    wireframe.position.z = center_z;
    wireframe.rotation.z = opening_line.rotation_radians;
    wireframe.layers.set(beestat.component.scene.layer_visible);

    layer.add(wireframe);
  }, this);
};


/**
 * Add 3D opening fixtures.
 *
 * @param {THREE.Group} layer The layer to add fixtures to.
 * @param {object} group The floor plan group.
 */
beestat.component.scene.prototype.add_opening_fixtures_ = function(layer, group) {
  if (group.openings === undefined || group.openings.length === 0) {
    return;
  }

  const wall_thickness = Number(beestat.component.scene.wall_thickness || 4);
  const frame_thickness = Math.max(1, wall_thickness * 0.3);

  if (this.opening_frame_material_ === undefined) {
    this.opening_frame_material_ = new THREE.MeshStandardMaterial({
      'color': 0xf5f7fb,
      'roughness': 0.92,
      'metalness': 0.0
    });
  }
  if (this.window_pane_material_ === undefined) {
    this.window_pane_material_ = new THREE.MeshPhysicalMaterial({
      'color': 0xbfe6ff,
      'transparent': true,
      'opacity': 0.95,
      'roughness': 0.12,
      'metalness': 0.0,
      'reflectivity': 0.35,
      'clearcoat': 0.3,
      'clearcoatRoughness': 0.12,
      'transmission': 0.15
    });
  }

  group.openings.forEach(function(opening) {
    const is_glass_family = this.is_opening_glass_family_(opening.type);
    if (opening.type !== 'door' && is_glass_family !== true) {
      return;
    }

    const opening_line = this.get_opening_line_params_(opening);
    const width = opening_line.width;
    const height = Math.max(1, Number(opening.height || this.get_opening_default_height_(opening.type)));
    const center_z = this.get_opening_center_z_(group, opening, height);

    const fixture_group = new THREE.Group();
    fixture_group.position.set(
      opening_line.center_x,
      opening_line.center_y,
      center_z
    );
    fixture_group.rotation.z = opening_line.rotation_radians;

    const side_geometry = new THREE.BoxGeometry(frame_thickness, wall_thickness, height);
    const left_side = new THREE.Mesh(side_geometry, this.opening_frame_material_);
    left_side.position.x = -(width / 2) + (frame_thickness / 2);
    left_side.castShadow = true;
    left_side.receiveShadow = true;
    left_side.userData.is_opening = true;
    fixture_group.add(left_side);

    const right_side = new THREE.Mesh(side_geometry, this.opening_frame_material_);
    right_side.position.x = (width / 2) - (frame_thickness / 2);
    right_side.castShadow = true;
    right_side.receiveShadow = true;
    right_side.userData.is_opening = true;
    fixture_group.add(right_side);

    const top_geometry = new THREE.BoxGeometry(width, wall_thickness, frame_thickness);
    const top_frame = new THREE.Mesh(top_geometry, this.opening_frame_material_);
    top_frame.position.z = (height / 2) - (frame_thickness / 2);
    top_frame.castShadow = true;
    top_frame.receiveShadow = true;
    top_frame.userData.is_opening = true;
    fixture_group.add(top_frame);

    if (is_glass_family === true) {
      const bottom_frame = new THREE.Mesh(top_geometry, this.opening_frame_material_);
      bottom_frame.position.z = -(height / 2) + (frame_thickness / 2);
      bottom_frame.castShadow = true;
      bottom_frame.receiveShadow = true;
      bottom_frame.userData.is_opening = true;
      fixture_group.add(bottom_frame);

      // Keep pane nearly flush to the inner frame; only leave a tiny inset to
      // avoid edge z-fighting/flicker.
      const pane_inset = 0.05;
      const pane_width = Math.max(6, width - (frame_thickness * 2) - pane_inset);
      const pane_height = Math.max(6, height - (frame_thickness * 2) - pane_inset);
      const pane_depth = Math.max(0.25, wall_thickness * 0.18);
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(pane_width, pane_depth, pane_height),
        this.window_pane_material_
      );
      pane.castShadow = false;
      pane.receiveShadow = false;
      pane.userData.is_opening = true;
      fixture_group.add(pane);

      if (opening.type === 'window') {
        const divider_thickness = Math.max(1.4, frame_thickness * 0.7);
        const divider_overhang = Math.max(0.35, wall_thickness * 0.12);
        const divider_depth = wall_thickness + (divider_overhang * 2);
        const divider = new THREE.Mesh(
          new THREE.BoxGeometry(
            pane_width,
            divider_depth,
            divider_thickness
          ),
          this.opening_frame_material_
        );
        divider.position.z = 0;
        // Keep centered so the mullion protrudes equally from front/back faces.
        divider.position.y = 0;
        divider.castShadow = true;
        divider.receiveShadow = true;
        divider.userData.is_opening = true;
        fixture_group.add(divider);
      }
    } else if (opening.type === 'door') {
      const bottom_frame = new THREE.Mesh(top_geometry, this.opening_frame_material_);
      bottom_frame.position.z = -(height / 2) + (frame_thickness / 2);
      bottom_frame.castShadow = true;
      bottom_frame.receiveShadow = true;
      bottom_frame.userData.is_opening = true;
      fixture_group.add(bottom_frame);

      const door_clearance = 0.25;
      const door_width = Math.max(10, width - (frame_thickness * 2) - door_clearance);
      const door_height = Math.max(12, height - (frame_thickness * 2) - door_clearance);
      const door_depth = Math.max(0.6, wall_thickness * 0.35);
      const raw_door_color = String(opening.color || '#7a573b').toLowerCase();
      const door_color = ['#2d2d2d', '#3f3f3f'].includes(raw_door_color)
        ? '#4a4a4a'
        : raw_door_color;
      const door_material = new THREE.MeshStandardMaterial({
        'color': door_color,
        'roughness': 0.72,
        'metalness': 0.0
      });
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(door_width, door_depth, door_height),
        door_material
      );
      door.position.z = 0;
      door.castShadow = true;
      door.receiveShadow = true;
      door.userData.is_opening = true;
      fixture_group.add(door);

    }

    layer.add(fixture_group);
  }, this);
};

