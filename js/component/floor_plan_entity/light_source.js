/**
 * Floor plan light source.
 */
beestat.component.floor_plan_entity.light_source = function() {
  this.enabled_ = true;
  this.snap_lines_ = {};

  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.light_source, beestat.component.floor_plan_entity);

/**
 * Decorate.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.light_source.prototype.decorate_ = function(parent) {
  this.decorate_circle_(parent);

  if (this.active_ === true && this.enabled_ === true) {
    this.set_draggable_(true);
    this.update_snap_points_();
  }
};

/**
 * Draw the light-source circle.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.light_source.prototype.decorate_circle_ = function(parent) {
  const self = this;

  this.circle_ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  this.circle_.setAttribute('r', 7);
  this.circle_.style.strokeWidth = '2';
  parent.appendChild(this.circle_);

  const fill_color = '#f0cf59';

  if (this.active_ === true) {
    this.circle_.style.cursor = 'pointer';
    this.circle_.style.fillOpacity = '0.7';
    this.circle_.style.fill = fill_color;
    this.circle_.style.stroke = '#ffffff';
    this.circle_.style.filter = 'brightness(1.15)';
  } else if (this.enabled_ === true) {
    this.circle_.style.cursor = 'pointer';
    this.circle_.style.fillOpacity = '0.58';
    this.circle_.style.fill = fill_color;
    this.circle_.style.stroke = beestat.style.color.gray.base;
    this.circle_.style.filter = 'none';
  } else {
    this.circle_.style.cursor = 'default';
    this.circle_.style.fillOpacity = '0.25';
    this.circle_.style.fill = beestat.style.color.gray.base;
    this.circle_.style.stroke = beestat.style.color.gray.dark;
    this.circle_.style.filter = 'none';
  }

  if (this.enabled_ === true) {
    this.circle_.addEventListener('click', function(e) {
      e.stopPropagation();
      self.set_active(true);
    });
  }

  this.update_circle_();
};

/**
 * Update circle geometry.
 */
beestat.component.floor_plan_entity.light_source.prototype.update_circle_ = function() {
  this.circle_.setAttribute('cx', 0);
  this.circle_.setAttribute('cy', 0);
};

/**
 * Set light source.
 *
 * @param {object} light_source
 *
 * @return {beestat.component.floor_plan_entity.light_source}
 */
beestat.component.floor_plan_entity.light_source.prototype.set_light_source = function(light_source) {
  this.light_source_ = light_source;

  this.light_source_.light_source_id = this.light_source_.light_source_id || window.crypto.randomUUID();
  this.light_source_.x = Number(this.light_source_.x || 0);
  this.light_source_.y = Number(this.light_source_.y || 0);
  this.light_source_.elevation = Number(this.light_source_.elevation !== undefined ? this.light_source_.elevation : 84);
  if (this.light_source_.name === undefined) {
    this.light_source_.name = '';
  }
  this.light_source_.intensity = ['dim', 'normal', 'bright'].includes(this.light_source_.intensity)
    ? this.light_source_.intensity
    : 'normal';
  this.light_source_.temperature_k = Math.max(1000, Math.min(12000, Math.round(Number(this.light_source_.temperature_k || 4000))));

  this.x_ = this.light_source_.x;
  this.y_ = this.light_source_.y;

  return this;
};

/**
 * Set group.
 *
 * @param {object} group
 *
 * @return {beestat.component.floor_plan_entity.light_source}
 */
beestat.component.floor_plan_entity.light_source.prototype.set_group = function(group) {
  this.group_ = group;
  return this;
};

/**
 * Set enabled.
 *
 * @param {boolean} enabled
 *
 * @return {beestat.component.floor_plan_entity.light_source}
 */
beestat.component.floor_plan_entity.light_source.prototype.set_enabled = function(enabled) {
  this.enabled_ = enabled;
  return this;
};

/**
 * Get light source.
 *
 * @return {object}
 */
beestat.component.floor_plan_entity.light_source.prototype.get_light_source = function() {
  return this.light_source_;
};

/**
 * Set active state.
 *
 * @param {boolean} active
 *
 * @return {beestat.component.floor_plan_entity.light_source}
 */
beestat.component.floor_plan_entity.light_source.prototype.set_active = function(active) {
  if (active === true && this.enabled_ !== true) {
    return this;
  }

  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      if (
        this.state_.active_light_source_entity !== undefined &&
        this.state_.active_light_source_entity.get_light_source().light_source_id !== this.light_source_.light_source_id
      ) {
        this.state_.active_light_source_entity.set_active(false);
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
      if (this.state_.active_opening_entity !== undefined) {
        this.state_.active_opening_entity.set_active(false);
      }
      if (this.state_.active_tree_entity !== undefined) {
        this.state_.active_tree_entity.set_active(false);
      }

      this.state_.active_light_source_entity = this;
      this.dispatchEvent('activate');
      this.update_snap_points_();
      this.bring_to_front_();
    } else {
      delete this.state_.active_light_source_entity;
      this.clear_snap_lines_();
      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Set position and clamp to grid.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} event
 *
 * @return {beestat.component.floor_plan_entity.light_source}
 */
beestat.component.floor_plan_entity.light_source.prototype.set_xy = function(x, y, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  const half_grid = this.floor_plan_.get_grid_pixels() / 2;
  let clamped_x = Math.round(Number(x || 0));
  let clamped_y = Math.round(Number(y || 0));
  clamped_x = Math.min(clamped_x, half_grid);
  clamped_x = Math.max(clamped_x, -half_grid);
  clamped_y = Math.min(clamped_y, half_grid);
  clamped_y = Math.max(clamped_y, -half_grid);

  this.light_source_.x = clamped_x;
  this.light_source_.y = clamped_y;

  this.dispatchEvent(event);

  return beestat.component.floor_plan_entity.prototype.set_xy.apply(this, [clamped_x, clamped_y]);
};

/**
 * Drag start.
 */
beestat.component.floor_plan_entity.light_source.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.light_source_.x,
    'y': this.light_source_.y
  };
};

/**
 * Drag move with snap-point behavior.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.light_source.prototype.after_mousemove_handler_ = function(e) {
  if (this.drag_start_entity_ === undefined) {
    return;
  }

  const snap_distance = 6;
  let desired_x = this.drag_start_entity_.x + (((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale());
  let desired_y = this.drag_start_entity_.y + (((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale());

  if (this.state_.snapping === true) {
    let best_x;
    let best_x_distance = Number.POSITIVE_INFINITY;
    let best_y;
    let best_y_distance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.get_snap_x().length; i++) {
      const candidate_x = this.get_snap_x()[i];
      const distance_x = Math.abs(candidate_x - desired_x);
      if (distance_x <= snap_distance && distance_x < best_x_distance) {
        best_x = candidate_x;
        best_x_distance = distance_x;
      }
    }
    for (let i = 0; i < this.get_snap_y().length; i++) {
      const candidate_y = this.get_snap_y()[i];
      const distance_y = Math.abs(candidate_y - desired_y);
      if (distance_y <= snap_distance && distance_y < best_y_distance) {
        best_y = candidate_y;
        best_y_distance = distance_y;
      }
    }

    if (best_x !== undefined) {
      desired_x = best_x;
    }
    if (best_y !== undefined) {
      desired_y = best_y;
    }

    this.update_snap_lines_();
  } else {
    this.clear_snap_lines_();
  }

  this.set_xy(desired_x, desired_y);
};

/**
 * Drag stop.
 */
beestat.component.floor_plan_entity.light_source.prototype.after_mouseup_handler_ = function() {
  if (this.dragged_ === true) {
    this.clear_snap_lines_();
    this.update_snap_points_();
  }
};

/**
 * Pre-generate snap points.
 */
beestat.component.floor_plan_entity.light_source.prototype.update_snap_points_ = function() {
  const self = this;
  const snap_x = {};
  const snap_y = {};

  const append_shapes = function(shapes, skip_self_light_source) {
    if (Array.isArray(shapes) !== true) {
      return;
    }

    shapes.forEach(function(shape) {
      if (shape.editor_hidden === true) {
        return;
      }

      if (
        skip_self_light_source === true &&
        shape.light_source_id !== undefined &&
        self.light_source_ !== undefined &&
        self.light_source_.light_source_id === shape.light_source_id
      ) {
        return;
      }

      if (Array.isArray(shape.points) === true) {
        shape.points.forEach(function(point) {
          const is_opening = shape.opening_id !== undefined;
          const absolute_x = is_opening
            ? Number(point.x || 0)
            : Number(point.x || 0) + Number(shape.x || 0);
          const absolute_y = is_opening
            ? Number(point.y || 0)
            : Number(point.y || 0) + Number(shape.y || 0);
          snap_x[absolute_x] = true;
          snap_y[absolute_y] = true;
        });
      } else {
        snap_x[Number(shape.x || 0)] = true;
        snap_y[Number(shape.y || 0)] = true;
      }
    });
  };

  append_shapes(this.group_.rooms, false);
  append_shapes(this.group_.surfaces, false);
  append_shapes(this.group_.openings, false);
  append_shapes(this.group_.light_sources, true);

  const group_below = this.floor_plan_.get_group_below(this.group_);
  if (group_below !== undefined) {
    append_shapes(group_below.rooms, false);
    append_shapes(group_below.surfaces, false);
    append_shapes(group_below.openings, false);
    append_shapes(group_below.light_sources, false);
  }

  this.snap_x_ = Object.keys(snap_x).map(function(key) {
    return Number(key);
  });
  this.snap_y_ = Object.keys(snap_y).map(function(key) {
    return Number(key);
  });
};

/**
 * Get snap x values.
 *
 * @return {number[]}
 */
beestat.component.floor_plan_entity.light_source.prototype.get_snap_x = function() {
  return this.snap_x_ || [];
};

/**
 * Get snap y values.
 *
 * @return {number[]}
 */
beestat.component.floor_plan_entity.light_source.prototype.get_snap_y = function() {
  return this.snap_y_ || [];
};

/**
 * Update snap lines.
 */
beestat.component.floor_plan_entity.light_source.prototype.update_snap_lines_ = function() {
  const point_x = this.light_source_.x;
  if (this.get_snap_x().includes(point_x) === true) {
    if (this.snap_lines_.x === undefined) {
      this.snap_lines_.x = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.snap_lines_.x.style.strokeDasharray = '7, 3';
      this.snap_lines_.x.style.stroke = beestat.style.color.yellow.base;
      this.snap_lines_.x.setAttribute('y1', this.floor_plan_.get_grid_pixels() / -2);
      this.snap_lines_.x.setAttribute('y2', this.floor_plan_.get_grid_pixels() / 2);
      this.floor_plan_.get_g().appendChild(this.snap_lines_.x);
    }
    this.snap_lines_.x.setAttribute('x1', point_x);
    this.snap_lines_.x.setAttribute('x2', point_x);
  } else if (this.snap_lines_.x !== undefined) {
    if (this.snap_lines_.x.parentNode !== undefined && this.snap_lines_.x.parentNode !== null) {
      this.snap_lines_.x.parentNode.removeChild(this.snap_lines_.x);
    }
    delete this.snap_lines_.x;
  }

  const point_y = this.light_source_.y;
  if (this.get_snap_y().includes(point_y) === true) {
    if (this.snap_lines_.y === undefined) {
      this.snap_lines_.y = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.snap_lines_.y.style.strokeDasharray = '7, 3';
      this.snap_lines_.y.style.stroke = beestat.style.color.yellow.base;
      this.snap_lines_.y.setAttribute('x1', this.floor_plan_.get_grid_pixels() / -2);
      this.snap_lines_.y.setAttribute('x2', this.floor_plan_.get_grid_pixels() / 2);
      this.floor_plan_.get_g().appendChild(this.snap_lines_.y);
    }
    this.snap_lines_.y.setAttribute('y1', point_y);
    this.snap_lines_.y.setAttribute('y2', point_y);
  } else if (this.snap_lines_.y !== undefined) {
    if (this.snap_lines_.y.parentNode !== undefined && this.snap_lines_.y.parentNode !== null) {
      this.snap_lines_.y.parentNode.removeChild(this.snap_lines_.y);
    }
    delete this.snap_lines_.y;
  }
};

/**
 * Clear snap lines.
 */
beestat.component.floor_plan_entity.light_source.prototype.clear_snap_lines_ = function() {
  if (this.snap_lines_.x !== undefined) {
    if (this.snap_lines_.x.parentNode !== undefined && this.snap_lines_.x.parentNode !== null) {
      this.snap_lines_.x.parentNode.removeChild(this.snap_lines_.x);
    }
    delete this.snap_lines_.x;
  }
  if (this.snap_lines_.y !== undefined) {
    if (this.snap_lines_.y.parentNode !== undefined && this.snap_lines_.y.parentNode !== null) {
      this.snap_lines_.y.parentNode.removeChild(this.snap_lines_.y);
    }
    delete this.snap_lines_.y;
  }
};
