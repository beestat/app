/**
 * Floor plan opening (empty, door, window).
 */
beestat.component.floor_plan_entity.opening = function() {
  this.enabled_ = true;
  this.resize_mode_ = null;

  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.opening, beestat.component.floor_plan_entity);

/**
 * Decorate.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.opening.prototype.decorate_ = function(parent) {
  this.decorate_opening_(parent);

  if (this.enabled_ === true) {
    this.set_draggable_(true);
  }
};

/**
 * Build opening visuals.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.opening.prototype.decorate_opening_ = function(parent) {
  const self = this;

  this.path_ = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  this.path_.style.fill = 'none';
  this.path_.style.strokeLinecap = 'round';
  this.path_.style.cursor = this.enabled_ === true ? 'move' : 'default';
  parent.appendChild(this.path_);

  this.left_handle_ = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  this.right_handle_ = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  [this.left_handle_, this.right_handle_].forEach(function(handle, index) {
    handle.setAttribute('width', '8');
    handle.setAttribute('height', '8');
    handle.setAttribute('rx', '1');
    handle.setAttribute('ry', '1');
    handle.style.cursor = 'ew-resize';
    handle.style.strokeWidth = '1';
    parent.appendChild(handle);

    if (self.enabled_ === true) {
      handle.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        self.resize_mode_ = index === 0 ? 'left' : 'right';
        self.mousedown_handler_(e);
      });
      handle.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        self.resize_mode_ = index === 0 ? 'left' : 'right';
        self.mousedown_handler_(e);
      });
    }
  });

  if (this.enabled_ === true) {
    this.path_.addEventListener('click', function(e) {
      e.stopPropagation();
      self.set_active(true);
    });
    this.path_.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      self.set_active(true);
    });
  }

  this.update();
  this.apply_transform_();
};

/**
 * Update visuals.
 */
beestat.component.floor_plan_entity.opening.prototype.update = function() {
  const width = Math.max(12, Number(this.opening_.width || 0));
  const half_width = width / 2;

  this.path_.setAttribute('d', 'M' + (-half_width) + ',0 L' + half_width + ',0');
  this.path_.style.stroke = this.get_opening_color_();
  this.path_.style.strokeWidth = this.active_ === true ? '6' : '4';
  this.path_.style.opacity = this.enabled_ === true ? (this.active_ === true ? '0.95' : '0.7') : '0.3';

  const handles_visible = this.active_ === true && this.enabled_ === true;
  const handle_fill = this.get_opening_color_();
  [this.left_handle_, this.right_handle_].forEach(function(handle) {
    handle.style.visibility = handles_visible === true ? 'visible' : 'hidden';
    handle.style.fill = handle_fill;
    handle.style.stroke = '#ffffff';
  });
  this.left_handle_.setAttribute('x', String(-half_width - 4));
  this.left_handle_.setAttribute('y', '-4');
  this.right_handle_.setAttribute('x', String(half_width - 4));
  this.right_handle_.setAttribute('y', '-4');

  this.set_xy(this.opening_.x, this.opening_.y);
};

/**
 * Handle after mousedown.
 */
beestat.component.floor_plan_entity.opening.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.opening_.x || 0,
    'y': this.opening_.y || 0,
    'width': this.opening_.width || 0
  };
};

/**
 * Handle dragging.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.opening.prototype.after_mousemove_handler_ = function(e) {
  const grid_half = this.floor_plan_.get_grid_pixels() / 2;
  const min_width = 12;

  const dx = ((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale();
  const dy = ((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale();

  if (this.resize_mode_ === 'left' || this.resize_mode_ === 'right') {
    const start_width = Math.max(min_width, Number(this.drag_start_entity_.width || 0));
    const start_left = this.drag_start_entity_.x - (start_width / 2);
    const start_right = this.drag_start_entity_.x + (start_width / 2);

    let next_left = start_left;
    let next_right = start_right;

    if (this.resize_mode_ === 'left') {
      next_left = Math.min(start_left + dx, start_right - min_width);
      next_left = Math.max(-grid_half, next_left);
    } else {
      next_right = Math.max(start_right + dx, start_left + min_width);
      next_right = Math.min(grid_half, next_right);
    }

    const next_width = Math.max(min_width, next_right - next_left);
    const next_x = Math.max(-grid_half + (next_width / 2), Math.min(grid_half - (next_width / 2), (next_left + next_right) / 2));

    this.opening_.width = Math.round(next_width);
    this.opening_.x = Math.round(next_x);
    this.set_xy(this.opening_.x, this.opening_.y);
    this.update();
    return;
  }

  const width = Math.max(min_width, Number(this.opening_.width || 0));
  const half_width = width / 2;
  const next_x = this.drag_start_entity_.x + dx;
  const next_y = this.drag_start_entity_.y + dy;

  this.opening_.x = Math.round(Math.max(-grid_half + half_width, Math.min(grid_half - half_width, next_x)));
  this.opening_.y = Math.round(Math.max(-grid_half, Math.min(grid_half, next_y)));
  this.set_xy(this.opening_.x, this.opening_.y);
};

/**
 * Cleanup after mouseup.
 */
beestat.component.floor_plan_entity.opening.prototype.after_mouseup_handler_ = function() {
  this.resize_mode_ = null;
  this.update();
};

/**
 * Set opening.
 *
 * @param {object} opening
 *
 * @return {beestat.component.floor_plan_entity.opening}
 */
beestat.component.floor_plan_entity.opening.prototype.set_opening = function(opening) {
  this.opening_ = opening;

  if (this.opening_.opening_id === undefined) {
    this.opening_.opening_id = window.crypto.randomUUID();
  }
  if (this.opening_.type === undefined) {
    this.opening_.type = 'empty';
  }
  if (this.opening_.width === undefined) {
    this.opening_.width = 36;
  }
  if (this.opening_.height === undefined) {
    this.opening_.height = 80;
  }

  this.set_xy(this.opening_.x || 0, this.opening_.y || 0);
  return this;
};

/**
 * Set group.
 *
 * @param {object} group
 *
 * @return {beestat.component.floor_plan_entity.opening}
 */
beestat.component.floor_plan_entity.opening.prototype.set_group = function(group) {
  this.group_ = group;
  return this;
};

/**
 * Get opening.
 *
 * @return {object}
 */
beestat.component.floor_plan_entity.opening.prototype.get_opening = function() {
  return this.opening_;
};

/**
 * Set enabled.
 *
 * @param {boolean} enabled
 *
 * @return {beestat.component.floor_plan_entity.opening}
 */
beestat.component.floor_plan_entity.opening.prototype.set_enabled = function(enabled) {
  this.enabled_ = enabled;
  return this;
};

/**
 * Set x/y with clamping.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} event
 *
 * @return {beestat.component.floor_plan_entity.opening}
 */
beestat.component.floor_plan_entity.opening.prototype.set_xy = function(x, y, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  const grid_half = this.floor_plan_.get_grid_pixels() / 2;
  const half_width = Math.max(12, Number(this.opening_.width || 0)) / 2;

  const clamped_x = Math.max(-grid_half + half_width, Math.min(grid_half - half_width, Number(x || 0)));
  const clamped_y = Math.max(-grid_half, Math.min(grid_half, Number(y || 0)));

  this.opening_.x = Math.round(clamped_x);
  this.opening_.y = Math.round(clamped_y);

  beestat.component.floor_plan_entity.prototype.set_xy.apply(
    this,
    [
      this.opening_.x,
      this.opening_.y
    ]
  );

  this.dispatchEvent(event);
  return this;
};

/**
 * Set active state.
 *
 * @param {boolean} active
 *
 * @return {beestat.component.floor_plan_entity.opening}
 */
beestat.component.floor_plan_entity.opening.prototype.set_active = function(active) {
  if (active === true && this.enabled_ !== true) {
    return this;
  }

  if (active === true) {
    if (this.state_.active_point_entity !== undefined) {
      this.state_.active_point_entity.set_active(false);
    }
    if (this.state_.active_wall_entity !== undefined) {
      this.state_.active_wall_entity.set_active(false);
    }
    if (this.state_.active_tree_entity !== undefined) {
      this.state_.active_tree_entity.set_active(false);
    }
    if (this.state_.active_surface_entity !== undefined) {
      this.state_.active_surface_entity.set_active(false);
    }
    if (this.state_.active_room_entity !== undefined) {
      this.state_.active_room_entity.set_active(false);
    }
  }

  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      if (
        this.state_.active_opening_entity !== undefined &&
        this.state_.active_opening_entity.get_opening() !== this.opening_
      ) {
        this.state_.active_opening_entity.set_active(false);
      }

      this.state_.active_opening_entity = this;
      this.dispatchEvent('activate');
      this.bring_to_front_();
    } else {
      delete this.state_.active_opening_entity;
      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Get color by opening type.
 *
 * @return {string}
 */
beestat.component.floor_plan_entity.opening.prototype.get_opening_color_ = function() {
  switch (this.opening_.type) {
  case 'door':
    return beestat.style.color.green.base;
  case 'window':
    return beestat.style.color.lightblue.light;
  case 'empty':
  default:
    return beestat.style.color.gray.light;
  }
};
