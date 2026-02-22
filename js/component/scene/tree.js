/**
 * Scene methods split from scene.js.
 */

/**
 * Register a tree mesh for procedural wind bending.
 *
 * @param {THREE.Mesh} mesh
 * @param {{stiffness:number, max_sway_ratio:number}=} options
 */
beestat.component.scene.prototype.register_tree_wind_mesh_ = function(mesh, options) {
  if (
    mesh === undefined ||
    mesh.geometry === undefined ||
    mesh.geometry.attributes === undefined ||
    mesh.geometry.attributes.position === undefined
  ) {
    return;
  }

  const position_attribute = mesh.geometry.attributes.position;
  const source_positions = position_attribute.array;
  if (source_positions === undefined || source_positions.length === 0) {
    return;
  }

  if (this.tree_wind_meshes_ === undefined) {
    this.tree_wind_meshes_ = [];
  }

  const count = position_attribute.count;
  const base_positions = new Float32Array(source_positions.length);
  base_positions.set(source_positions);
  const weights = new Float32Array(count);
  const phase_offsets = new Float32Array(count);

  const mesh_offset_z = Number(mesh.position !== undefined ? mesh.position.z : 0);
  let min_world_z = Infinity;
  let max_world_z = -Infinity;
  for (let i = 0; i < count; i++) {
    const world_z = base_positions[(i * 3) + 2] + mesh_offset_z;
    min_world_z = Math.min(min_world_z, world_z);
    max_world_z = Math.max(max_world_z, world_z);
  }
  const height = Math.max(0.0001, max_world_z - min_world_z);

  for (let i = 0; i < count; i++) {
    const offset = i * 3;
    const x = base_positions[offset];
    const y = base_positions[offset + 1];
    const world_z = base_positions[offset + 2] + mesh_offset_z;
    const height_ratio = (max_world_z - world_z) / height;
    const clamped_ratio = Math.max(0, Math.min(1, height_ratio));

    // Keep trunk/branch bases anchored and increase bending toward tips.
    weights[i] = Math.pow(clamped_ratio, 1.75);
    phase_offsets[i] = ((x * 0.02) + (y * 0.015)) * 0.4;
  }

  const resolved_options = options || {};
  const stiffness = Math.max(0.1, Number(resolved_options.stiffness || 1));
  const max_sway_ratio = Math.max(
    0,
    Number(resolved_options.max_sway_ratio === undefined ? 0.03 : resolved_options.max_sway_ratio)
  );

  this.tree_wind_meshes_.push({
    'mesh': mesh,
    'base_positions': base_positions,
    'weights': weights,
    'phase_offsets': phase_offsets,
    'height': height,
    'stiffness': stiffness,
    'max_sway_ratio': max_sway_ratio,
    'phase_seed': Math.random() * Math.PI * 2
  });
};


/**
 * Update tree vertex sway for current wind speed.
 * Wind direction is single-axis to keep motion physically directional.
 */
beestat.component.scene.prototype.update_tree_wind_ = function() {
  if (this.tree_wind_meshes_ === undefined || this.tree_wind_meshes_.length === 0) {
    return;
  }

  const wind_speed = Math.max(0, Math.min(5, Number(this.get_scene_setting_('wind_speed') || 0)));
  const wind_direction = Math.max(0, Math.min(360, Number(this.get_scene_setting_('wind_direction') || 0)));
  const tree_wobble_enabled = this.get_scene_setting_('tree_wobble') !== false;
  // Keep overall tree effect lower than prior tuning while preserving responsiveness.
  const wind_strength = wind_speed * 0.5;
  const time_seconds = window.performance.now() / 1000;
  const wind_radians = THREE.MathUtils.degToRad(wind_direction);
  const wind_direction_x = Math.cos(wind_radians);
  const wind_direction_y = Math.sin(wind_radians);
  const gust = 0.78 + (0.22 * Math.sin(time_seconds * 0.16));

  for (let i = 0; i < this.tree_wind_meshes_.length; i++) {
    const wind_mesh = this.tree_wind_meshes_[i];
    const mesh = wind_mesh.mesh;
    if (
      mesh === undefined ||
      mesh.geometry === undefined ||
      mesh.geometry.attributes === undefined ||
      mesh.geometry.attributes.position === undefined
    ) {
      continue;
    }

    const position_attribute = mesh.geometry.attributes.position;
    const positions = position_attribute.array;
    const base_positions = wind_mesh.base_positions;
    const weights = wind_mesh.weights;
    const phase_offsets = wind_mesh.phase_offsets;
    const count = position_attribute.count;

    if (tree_wobble_enabled !== true || wind_strength <= 0) {
      for (let vertex_index = 0; vertex_index < count; vertex_index++) {
        const offset = vertex_index * 3;
        positions[offset] = base_positions[offset];
        positions[offset + 1] = base_positions[offset + 1];
        positions[offset + 2] = base_positions[offset + 2];
      }
      position_attribute.needsUpdate = true;
      continue;
    }

    const max_sway = wind_mesh.height * wind_mesh.max_sway_ratio * (wind_strength / wind_mesh.stiffness);
    const steady_lean = max_sway * 0.28;
    const oscillation_strength = max_sway * (0.58 + (0.24 * gust));
    const frequency = (0.75 + (wind_strength * 0.42)) / Math.max(0.25, wind_mesh.stiffness);

    for (let vertex_index = 0; vertex_index < count; vertex_index++) {
      const offset = vertex_index * 3;
      const weight = weights[vertex_index];
      const phase = (time_seconds * frequency) + wind_mesh.phase_seed + phase_offsets[vertex_index];
      const oscillation =
        Math.sin(phase) +
        (Math.sin((phase * 2.1) + 0.6) * 0.25);
      const along_wind = (steady_lean + (oscillation * oscillation_strength)) * weight;

      positions[offset] = base_positions[offset] + (wind_direction_x * along_wind);
      positions[offset + 1] = base_positions[offset + 1] + (wind_direction_y * along_wind);
      positions[offset + 2] = base_positions[offset + 2];
    }

    position_attribute.needsUpdate = true;
  }
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
  collar.receiveShadow = false;
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
  this.register_tree_wind_mesh_(trunk, {
    'stiffness': 2.4,
    'max_sway_ratio': 0.01
  });
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
    foliage_mesh.receiveShadow = false;
    foliage_mesh.userData.is_environment = true;
    foliage_mesh.userData.is_tree_foliage = true;
    foliage_mesh.userData.base_tree_foliage_color = foliage_mesh.material.color.getHex();
    tree.add(foliage_mesh);
    this.register_tree_wind_mesh_(foliage_mesh, {
      'stiffness': 1.1,
      'max_sway_ratio': 0.045
    });

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
  const segments = Math.max(1, Math.round(height / 12));
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
    segments
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
  mesh.castShadow = config.cast_shadow !== false;
  mesh.receiveShadow = config.receive_shadow === true;
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
      // Same circular profile as round, but start lower to elongate canopy.
      const oval_start = Math.max(0, Math.min(0.9999, profile_start_ratio - 0.2));
      const oval_span = Math.max(0.0001, 1 - oval_start);
      const oval_u = (x - oval_start) / oval_span;
      const oval_t = (oval_u * 2) - 1;
      return x < oval_start || x > 1
        ? 0
        : Math.max(0, Math.min(1, Math.sqrt(Math.max(0, 1 - (oval_t * oval_t)))));
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
 * @param {string=} canopy_shape Canopy profile passed only to get_branch_length().
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
  const canopy_profile_start_ratio = Math.max(0, Math.min(0.9999, round_canopy_start_ratio));

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
    'control_count': 6,
    'max_drift': 8,
    'direction_jitter': 3,
    'taper_start_ratio': 0.35,
    'taper_max_ratio': 0.72,
    'material': wood_material,
    'receive_shadow': true
  });
  const trunk = trunk_stick.mesh;
  trunk.position.z = -(trunk_height / 2) + Math.max(0.7, trunk_radius_bottom * 0.14);
  tree.add(trunk);
  this.register_tree_wind_mesh_(trunk, {
    'stiffness': 2.2,
    'max_sway_ratio': 0.012
  });
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
    // Derive where canopy profile actually begins from the active branch-length
    // function so canopy bottom matches branches for all shapes.
    let canopy_geometry_start_ratio = canopy_profile_start_ratio;
    const canopy_start_samples = 40;
    const canopy_start_threshold = 0.005;
    for (let sample_index = 0; sample_index <= canopy_start_samples; sample_index++) {
      const sample_ratio = (sample_index / canopy_start_samples) * canopy_profile_start_ratio;
      const sample_length = self.get_branch_length(
        canopy_shape,
        sample_ratio,
        canopy_profile_start_ratio
      );
      if (sample_length > canopy_start_threshold) {
        canopy_geometry_start_ratio = sample_ratio;
        break;
      }
    }

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const normalized_height = Math.max(0, Math.min(1, (z + 1) / 2));
      // Sample canopy directly in the same profile range as branches.
      const canopy_ratio =
        canopy_geometry_start_ratio +
        (normalized_height * (1 - canopy_geometry_start_ratio));
      const canopy_z = -trunk_height * canopy_ratio;
      // Avoid exact-zero sampling at the profile start to prevent rare base pinches.
      const canopy_sample_ratio = Math.min(1, Math.max(
        canopy_ratio,
        canopy_geometry_start_ratio + 0.012
      ));
      const base_factor = Math.max(
        0,
        Math.min(1, self.get_branch_length(canopy_shape, canopy_sample_ratio, canopy_profile_start_ratio))
      );
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
      // Minimal base guard in the first canopy slice to avoid rare pinches
      // without materially changing taller-tree profiles.
      const base_cover_t = Math.max(0, Math.min(1, normalized_height / 0.12));
      const min_radius_for_base_cover =
        trunk_radius_bottom * 0.18 * (1 - base_cover_t);
      // Ensure the canopy retains a small cap around the tip so trunk never pokes through.
      const top_cover_t = Math.max(0, Math.min(1, (canopy_ratio - 0.84) / 0.16));
      const min_radius_for_tip_cover = trunk_radius_bottom * 0.55 * top_cover_t;
      const covered_radius = Math.max(
        radius,
        min_radius_for_base_cover,
        min_radius_for_tip_cover
      );
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
  const recursive_depth_limit = Math.max(
    0,
    Math.round(Number(beestat.component.scene.fixed_tree_branch_depth || 0))
  );
  const children_per_branch = 1;
  if (has_foliage === true && this.tree_foliage_meshes_ === undefined) {
    this.tree_foliage_meshes_ = [];
  }
  if (has_foliage === true && this.tree_branch_groups_ === undefined) {
    this.tree_branch_groups_ = [];
  }

  const min_sub_branch_fork_angle_radians = THREE.MathUtils.degToRad(15);
  const max_sub_branch_fork_angle_radians = THREE.MathUtils.degToRad(30);
  const recent_primary_branch_angle_limit = 10;
  const get_angle_distance = function(angle_a, angle_b) {
    return Math.abs(Math.atan2(Math.sin(angle_a - angle_b), Math.cos(angle_a - angle_b)));
  };
  const get_weighted_primary_branch_theta = function(existing_angles) {
    if (existing_angles.length === 0) {
      return Math.random() * Math.PI * 2;
    }

    const candidate_count = Math.max(18, Math.min(56, branch_count * 4));
    const candidates = [];
    let total_weight = 0;
    for (let i = 0; i < candidate_count; i++) {
      const theta = Math.random() * Math.PI * 2;
      let min_distance = Math.PI;
      for (let j = 0; j < existing_angles.length; j++) {
        min_distance = Math.min(min_distance, get_angle_distance(theta, existing_angles[j]));
      }
      // Any angle is possible, but wider gaps get a higher chance.
      const normalized_distance = min_distance / Math.PI;
      const weight = 0.08 + Math.pow(normalized_distance, 2.4);
      total_weight += weight;
      candidates.push({
        'theta': theta,
        'weight': weight
      });
    }

    let pick = Math.random() * total_weight;
    for (let i = 0; i < candidates.length; i++) {
      pick -= candidates[i].weight;
      if (pick <= 0) {
        return candidates[i].theta;
      }
    }

    return candidates[candidates.length - 1].theta;
  };
  const get_primary_branch_direction = function(existing_angles) {
    const theta = get_weighted_primary_branch_theta(existing_angles);
    const upward_bias = -(0.34 + (Math.random() * 0.26));
    return {
      'theta': theta,
      'direction': new THREE.Vector3(Math.cos(theta), Math.sin(theta), upward_bias).normalize()
    };
  };
  const get_forked_child_direction = function(parent_direction, child_index, child_count) {
    const parent = parent_direction.clone().normalize();
    const world_up = new THREE.Vector3(0, 0, 1);
    let fork_axis = new THREE.Vector3().crossVectors(parent, world_up);
    if (fork_axis.lengthSq() < 1e-6) {
      fork_axis = new THREE.Vector3().crossVectors(parent, new THREE.Vector3(1, 0, 0));
    }
    fork_axis.normalize();

    const side = child_count <= 1 ? 1 : (child_index % 2 === 0 ? -1 : 1);
    const fork_angle =
      min_sub_branch_fork_angle_radians +
      (Math.random() * (max_sub_branch_fork_angle_radians - min_sub_branch_fork_angle_radians));
    const forked = parent.clone().applyQuaternion(
      new THREE.Quaternion().setFromAxisAngle(fork_axis, side * fork_angle)
    );
    // Add a small roll around the parent axis so forks don't look planar.
    const roll_angle = (Math.random() - 0.5) * THREE.MathUtils.degToRad(8);
    forked.applyQuaternion(
      new THREE.Quaternion().setFromAxisAngle(parent, roll_angle)
    );
    return forked.normalize();
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
      'control_count': 6,
      'max_drift': length * 0.24,
      'direction_jitter': length * 0.12,
      'straight_start_ratio': 0.2,
      'taper_start_ratio': 0.2,
      'taper_max_ratio': 1,
      'material': wood_material,
      'receive_shadow': false
    });
    const branch = branch_stick.mesh;
    branch.position.copy(base).addScaledVector(direction, (length / 2) - (radius_bottom * 0.45));
    branch.quaternion.setFromUnitVectors(branch_axis, direction);
    branches.add(branch);
    branch.updateMatrixWorld(true);
    self.register_tree_wind_mesh_(branch, {
      'stiffness': 1.7,
      'max_sway_ratio': 0.02
    });

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

    for (let j = 0; j < children_per_branch; j++) {
      const attach_ratio = children_per_branch <= 1
        ? 0.6
        : 0.35 + (j / (children_per_branch - 1)) * 0.3;
      const attach_point = get_stick_point_world(parent_branch, attach_ratio);
      const child_length = parent_branch.length * 0.62;
      const child_radius_bottom = Math.max(0.15, parent_branch.radius_bottom * 0.62);
      const child_direction = get_forked_child_direction(
        parent_branch.direction,
        j,
        children_per_branch
      );
      const child_branch = create_branch(
        attach_point,
        child_direction,
        child_length,
        child_radius_bottom
      );
      if (child_branch === null) {
        continue;
      }
      add_sub_branches(child_branch, depth + 1);
    }
  };

  const primary_branch_angles = [];
  for (let i = 0; i < branch_count; i++) {
    const base_height_ratio = branch_height_samples[i];
    const base_height = trunk_height * base_height_ratio;
    const base_offset = this.sample_stick_curve_offset_(trunk_stick.curve, base_height);
    const branch_length_factor = this.get_branch_length(
      canopy_shape,
      base_height_ratio,
      canopy_profile_start_ratio,
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
    const primary_direction_result = get_primary_branch_direction(primary_branch_angles);
    const primary_direction = primary_direction_result.direction;

    const primary_branch = create_branch(
      base,
      primary_direction,
      branch_length,
      branch_radius_bottom
    );
    if (primary_branch === null) {
      continue;
    }
    primary_branch_angles.push(primary_direction_result.theta);
    if (primary_branch_angles.length > recent_primary_branch_angle_limit) {
      primary_branch_angles.shift();
    }
    add_sub_branches(primary_branch, 0);
  }

  if (has_foliage === true) {
    const canopy_seed = this.get_seed_from_parts_([
      this.active_tree_seed_ === undefined ? this.get_scene_setting_('random_seed') : this.active_tree_seed_,
      'canopy'
    ]);
    const canopy_result = this.with_random_seed_(canopy_seed, function() {
      return create_canopy_from_branch_function_();
    });
    const canopy_mesh = canopy_result.mesh;
    canopy_mesh.castShadow = true;
    canopy_mesh.receiveShadow = false;
    canopy_mesh.userData.is_environment = true;
    foliage.add(canopy_mesh);
    this.tree_foliage_meshes_.push(canopy_mesh);
    this.register_tree_wind_mesh_(canopy_mesh, {
      'stiffness': 1.0,
      'max_sway_ratio': 0.04
    });
  }

  if (has_foliage === true) {
    this.tree_branch_groups_.push(branches);
  }
  branches.visible =
    this.debug_.hide_tree_branches !== true;
  tree.add(branches);
  if (has_foliage === true) {
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

