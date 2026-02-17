/**
 * Floor plan tree.
 */
beestat.component.floor_plan_entity.tree = function() {
  this.enabled_ = true;

  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.tree, beestat.component.floor_plan_entity);

/**
 * Decorate
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.tree.prototype.decorate_ = function(parent) {
  this.decorate_circle_(parent);

  if (this.active_ === true) {
    this.decorate_handle_(parent);
  }
};

/**
 * Draw the tree circle.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.tree.prototype.decorate_circle_ = function(parent) {
  const self = this;

  this.circle_ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  this.circle_.style.strokeWidth = '2';
  parent.appendChild(this.circle_);

  if (this.active_ === true) {
    this.set_draggable_(true);
    this.circle_.style.cursor = 'pointer';
    this.circle_.style.fillOpacity = '0.5';
    this.circle_.style.fill = beestat.style.color.green.light;
    this.circle_.style.stroke = '#ffffff';
    this.circle_.style.filter = 'drop-shadow(3px 3px 3px #000000)';
  } else if (this.enabled_ === true) {
    this.circle_.style.cursor = 'pointer';
    this.circle_.style.fillOpacity = '0.5';
    this.circle_.style.fill = beestat.style.color.green.dark;
    this.circle_.style.stroke = beestat.style.color.gray.base;
  } else {
    this.circle_.style.cursor = 'default';
    this.circle_.style.fillOpacity = '0.2';
    this.circle_.style.fill = beestat.style.color.gray.base;
    this.circle_.style.stroke = beestat.style.color.gray.dark;
  }

  if (this.enabled_ === true) {
    const mousedown_handler = function(e) {
      self.mousedown_mouse_ = {
        'x': e.clientX || e.touches[0].clientX,
        'y': e.clientY || e.touches[0].clientY
      };
    };
    this.circle_.addEventListener('mousedown', mousedown_handler);

    const mouseup_handler = function(e) {
      if (
        self.mousedown_mouse_ !== undefined &&
        (e.clientX || e.changedTouches[0].clientX) === self.mousedown_mouse_.x &&
        (e.clientY || e.changedTouches[0].clientY) === self.mousedown_mouse_.y
      ) {
        self.set_active(true);
      }
    };
    this.circle_.addEventListener('mouseup', mouseup_handler);
  }

  this.update_circle_();
};

/**
 * Draw the resize handle for active trees.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.tree.prototype.decorate_handle_ = function(parent) {
  const self = this;

  this.handle_ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  this.handle_.setAttribute('r', 4);
  this.handle_.style.fill = '#ffffff';
  this.handle_.style.stroke = '#ffffff';
  this.handle_.style.cursor = 'ew-resize';
  parent.appendChild(this.handle_);

  this.update_handle_();

  this.handle_.addEventListener('mouseover', function() {
    self.handle_.style.fill = beestat.style.color.green.base;
  });
  this.handle_.addEventListener('mouseout', function() {
    self.handle_.style.fill = '#ffffff';
  });
  this.handle_.addEventListener('mousedown', this.handle_mousedown_handler_.bind(this));
};

/**
 * Update circle and handle geometry.
 */
beestat.component.floor_plan_entity.tree.prototype.update_circle_ = function() {
  this.circle_.setAttribute('cx', 0);
  this.circle_.setAttribute('cy', 0);
  this.circle_.setAttribute('r', Math.max(1, (this.tree_.diameter || 1) / 2));

  this.update_handle_();
};

/**
 * Update the handle position.
 */
beestat.component.floor_plan_entity.tree.prototype.update_handle_ = function() {
  if (this.handle_ !== undefined) {
    this.handle_.setAttribute('cx', Math.max(1, (this.tree_.diameter || 1) / 2));
    this.handle_.setAttribute('cy', 0);
  }
};

/**
 * Set the tree object.
 *
 * @param {object} tree
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_tree = function(tree) {
  this.tree_ = tree;

  this.tree_.tree_id = this.tree_.tree_id || window.crypto.randomUUID();
  this.tree_.x = this.tree_.x || 0;
  this.tree_.y = this.tree_.y || 0;
  this.tree_.height = this.tree_.height || 120;
  this.tree_.diameter = this.tree_.diameter || 72;
  if (['conical', 'round'].includes(this.tree_.type) === false) {
    this.tree_.type = 'round';
  }

  this.x_ = this.tree_.x;
  this.y_ = this.tree_.y;

  return this;
};

/**
 * Set the group this tree belongs to.
 *
 * @param {object} group
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_group = function(group) {
  this.group_ = group;

  return this;
};

/**
 * Set enabled (different than active).
 *
 * @param {boolean} enabled
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_enabled = function(enabled) {
  this.enabled_ = enabled;

  return this;
};

/**
 * Get the tree.
 *
 * @return {object} tree
 */
beestat.component.floor_plan_entity.tree.prototype.get_tree = function() {
  return this.tree_;
};

/**
 * Set active state.
 *
 * @param {boolean} active
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_active = function(active) {
  if (active === true && this.enabled_ !== true) {
    return this;
  }

  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      if (
        this.state_.active_tree_entity !== undefined &&
        this.state_.active_tree_entity.get_tree().tree_id !== this.tree_.tree_id
      ) {
        this.state_.active_tree_entity.set_active(false);
      }

      if (this.state_.active_point_entity !== undefined) {
        this.state_.active_point_entity.set_active(false);
      }
      if (this.state_.active_wall_entity !== undefined) {
        this.state_.active_wall_entity.set_active(false);
      }
      if (this.state_.active_room_entity !== undefined) {
        this.state_.active_room_entity.set_active(false);
      }
      if (this.state_.active_surface_entity !== undefined) {
        this.state_.active_surface_entity.set_active(false);
      }

      this.state_.active_tree_entity = this;
      this.dispatchEvent('activate');
      this.bring_to_front_();
    } else {
      delete this.state_.active_tree_entity;
      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Set center position. Clamps to the grid bounds.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} event lesser_update|update
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_xy = function(x, y, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  const radius = Math.max(1, (this.tree_.diameter || 1) / 2);
  const half_grid = this.floor_plan_.get_grid_pixels() / 2;

  let clamped_x = Math.round(x);
  let clamped_y = Math.round(y);
  clamped_x = Math.min(clamped_x, half_grid - radius);
  clamped_x = Math.max(clamped_x, -half_grid + radius);
  clamped_y = Math.min(clamped_y, half_grid - radius);
  clamped_y = Math.max(clamped_y, -half_grid + radius);

  this.tree_.x = clamped_x;
  this.tree_.y = clamped_y;

  this.dispatchEvent(event);

  return beestat.component.floor_plan_entity.prototype.set_xy.apply(this, [clamped_x, clamped_y]);
};

/**
 * Set tree diameter. Clamps to the grid bounds.
 *
 * @param {number} diameter
 * @param {string} event lesser_update|update
 *
 * @return {beestat.component.floor_plan_entity.tree} This.
 */
beestat.component.floor_plan_entity.tree.prototype.set_diameter = function(diameter, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  const half_grid = this.floor_plan_.get_grid_pixels() / 2;
  const max_radius = Math.max(
    1,
    Math.min(
      half_grid - Math.abs(this.tree_.x),
      half_grid - Math.abs(this.tree_.y)
    )
  );

  const clamped_diameter = Math.min(
    Math.max(1, Math.round(diameter)),
    Math.round(max_radius * 2)
  );

  this.tree_.diameter = clamped_diameter;

  if (this.rendered_ === true) {
    this.update_circle_();
  }

  this.dispatchEvent(event);

  return this;
};

/**
 * Drag start setup for tree center dragging.
 */
beestat.component.floor_plan_entity.tree.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.tree_.x,
    'y': this.tree_.y
  };
};

/**
 * Drag move handler for tree center dragging.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.tree.prototype.after_mousemove_handler_ = function(e) {
  if (this.drag_start_entity_ === undefined) {
    return;
  }

  const desired_x = this.drag_start_entity_.x + (((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale());
  const desired_y = this.drag_start_entity_.y + (((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale());

  this.set_xy(desired_x, desired_y);
};

/**
 * Handle mousedown for tree resize.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.tree.prototype.handle_mousedown_handler_ = function(e) {
  e.stopPropagation();

  this.resize_mousemove_handler_ = this.handle_mousemove_handler_.bind(this);
  this.resize_mouseup_handler_ = this.handle_mouseup_handler_.bind(this);

  window.addEventListener('mousemove', this.resize_mousemove_handler_);
  window.addEventListener('touchmove', this.resize_mousemove_handler_);
  window.addEventListener('mouseup', this.resize_mouseup_handler_);
  window.addEventListener('touchend', this.resize_mouseup_handler_);

  this.resize_dragged_ = false;
};

/**
 * Handle mousemove for tree resize.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.tree.prototype.handle_mousemove_handler_ = function(e) {
  const local_point = this.floor_plan_.get_local_point(e);
  const distance = Math.sqrt(
    Math.pow(local_point.x - this.tree_.x, 2) +
    Math.pow(local_point.y - this.tree_.y, 2)
  );
  const diameter = distance * 2;

  if (this.resize_dragged_ === false) {
    this.floor_plan_.save_buffer();
    this.resize_dragged_ = true;
  }

  this.set_diameter(diameter);
};

/**
 * Handle mouseup for tree resize.
 */
beestat.component.floor_plan_entity.tree.prototype.handle_mouseup_handler_ = function() {
  window.removeEventListener('mousemove', this.resize_mousemove_handler_);
  window.removeEventListener('touchmove', this.resize_mousemove_handler_);
  window.removeEventListener('mouseup', this.resize_mouseup_handler_);
  window.removeEventListener('touchend', this.resize_mouseup_handler_);

  if (this.resize_dragged_ === true) {
    this.dispatchEvent('update');
  }
};
