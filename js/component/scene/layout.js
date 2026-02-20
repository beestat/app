/**
 * Scene methods split from scene.js.
 */


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

  let opening_cutter_debug_layer;
  if (this.debug_.opening_cutters === true) {
    opening_cutter_debug_layer = new THREE.Group();
    this.floor_plan_group_.add(opening_cutter_debug_layer);
    this.layers_['opening_cutters_debug'] = opening_cutter_debug_layer;
  }

  this.apply_opening_cuts_(
    walls_layer,
    floor_plan,
    opening_cutter_debug_layer
  );

  const openings_layer = new THREE.Group();
  this.floor_plan_group_.add(openings_layer);
  this.layers_['openings'] = openings_layer;
  floor_plan.data.groups.forEach(function(group) {
    self.add_opening_fixtures_(openings_layer, group);
  });

  this.light_sources_ = [];
  const light_sources_layer = new THREE.Group();
  this.floor_plan_group_.add(light_sources_layer);
  this.layers_['light_sources'] = light_sources_layer;
  floor_plan.data.groups.forEach(function(group) {
    self.add_light_sources_(light_sources_layer, group);
  });

  if (this.debug_.openings === true) {
    const openings_debug_layer = new THREE.Group();
    this.floor_plan_group_.add(openings_debug_layer);
    this.layers_['openings_debug'] = openings_debug_layer;

    floor_plan.data.groups.forEach(function(group) {
      self.add_openings_debug_(openings_debug_layer, group);
    });
  }

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

