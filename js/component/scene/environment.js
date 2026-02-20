/**
 * Scene methods split from scene.js.
 */


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
        // Debug override can force branch meshes hidden at all times.
        branch_group.visible = this.debug_.hide_tree_branches !== true && state.visible !== true;
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

