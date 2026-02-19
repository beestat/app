/**
 * Vertex drag point.
 */
beestat.component.floor_plan_entity.point = function() {
  this.snap_lines_ = {};

  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.point, beestat.component.floor_plan_entity);

/**
 * Decorate
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.point.prototype.decorate_ = function(parent) {
  this.decorate_rect_(parent);
  this.set_draggable_(true);
};

/**
 * Update the point position to match the current data.
 */
beestat.component.floor_plan_entity.point.prototype.update = function() {
  this.update_rect_();
};

/**
 * Decorate the rect point.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.point.prototype.decorate_rect_ = function(parent) {
  const self = this;

  const size = 7;

  this.rect_ = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

  // Transform slightly to center the rects on the point.
  this.rect_.setAttribute(
    'transform',
    'translate(' + (size / -2) + ',' + (size / -2) + ')'
  );

  this.rect_.setAttribute('width', size);
  this.rect_.setAttribute('height', size);
  this.rect_.style.stroke = beestat.style.color.gray.base;
  this.rect_.style.cursor = 'pointer';

  this.update_rect_();

  this.rect_.addEventListener('mousedown', function() {
    self.dispatchEvent('mousedown');
  });
  // this.rect_.addEventListener('touchstart', function() {
  //   self.dispatchEvent('mousedown');
  // });

  this.rect_.addEventListener('mouseover', function() {
    self.hover_ = true;
    self.update_rect_();
  });

  this.rect_.addEventListener('mouseout', function() {
    self.hover_ = false;
    self.update_rect_();
  });

  parent.appendChild(this.rect_);
};

/**
 * Update the rect to match the current data.
 */
beestat.component.floor_plan_entity.point.prototype.update_rect_ = function() {
  this.rect_.setAttribute('x', this.point_.x);
  this.rect_.setAttribute('y', this.point_.y);

  const anchor_color = this.get_anchor_color_();
  if (
    this.active_ === true ||
    this.hover_ === true
  ) {
    this.rect_.style.fill = anchor_color;
    this.rect_.style.stroke = '#ffffff';
  } else {
    this.rect_.style.fill = beestat.style.color.gray.light;
    this.rect_.style.stroke = beestat.style.color.gray.base;
  }
};

/**
 * Get anchor color based on the parent entity type.
 *
 * @return {string}
 */
beestat.component.floor_plan_entity.point.prototype.get_anchor_color_ = function() {
  if (
    this.room_ !== undefined &&
    typeof this.room_.get_surface === 'function'
  ) {
    const surface = this.room_.get_surface();
    if (surface !== undefined && surface.color !== undefined) {
      return surface.color;
    }
    return beestat.style.color.gray.dark;
  }

  return beestat.style.color.blue.base;
};

/**
 * Set the point
 *
 * @param {object} point
 *
 * @return {beestat.component.floor_plan_entity.point} This.
 */
beestat.component.floor_plan_entity.point.prototype.set_point = function(point) {
  this.point_ = point;

  return this;
};

/**
 * Get the point
 *
 * @return {object} The point.
 */
beestat.component.floor_plan_entity.point.prototype.get_point = function() {
  return this.point_;
};

/**
 * Set the room the point is part of.
 *
 * @param {beestat.component.floor_plan_entity.room} room
 *
 * @return {beestat.component.floor_plan_entity.point} This.
 */
beestat.component.floor_plan_entity.point.prototype.set_room = function(room) {
  this.room_ = room;

  return this;
};

/**
 * Set the x and y positions of this entity. Clamps to the edges of the grid.
 *
 * @param {number} x The x position of this entity.
 * @param {number} y The y position of this entity.
 * @param {string} event Optional event to fire when done.
 *
 * @return {beestat.component.floor_plan_entity.point} This.
 */
beestat.component.floor_plan_entity.point.prototype.set_xy = function(x, y, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  let clamped_x = x + this.room_.get_x();
  let clamped_y = y + this.room_.get_y();

  if (x !== null) {
    clamped_x = Math.min(clamped_x, (this.floor_plan_.get_grid_pixels() / 2));
    clamped_x = Math.max(clamped_x, -(this.floor_plan_.get_grid_pixels() / 2));
    this.point_.x = Math.round(clamped_x - this.room_.get_x());
  }

  if (y !== null) {
    clamped_y = Math.min(clamped_y, (this.floor_plan_.get_grid_pixels() / 2));
    clamped_y = Math.max(clamped_y, -(this.floor_plan_.get_grid_pixels() / 2));
    this.point_.y = Math.round(clamped_y - this.room_.get_y());
  }

  this.update_rect_();

  this.dispatchEvent(event);

  return this;
};

/**
 * Override to prevent this from happening if the ctrl key is pressed as that
 * removes a point and should not start a drag.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.point.prototype.mousedown_handler_ = function(e) {
  if (e.ctrlKey === true) {
    const points = this.room_.get_room().points;
    if (points.length > 3) {
      for (let i = 0; i < points.length; i++) {
        if (this.point_ === points[i]) {
          points.splice(i, 1);
          this.dispatchEvent('remove_point');
          break;
        }
      }
    }

    e.stopPropagation();
    return;
  }

  beestat.component.floor_plan_entity.prototype.mousedown_handler_.apply(this, arguments);
};

/**
 * Set an appropriate drag_start_entity_ on mousedown.
 */
beestat.component.floor_plan_entity.point.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.point_.x,
    'y': this.point_.y
  };
};

/**
 * Handle dragging a point around. Snaps to X and Y of other points.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.point.prototype.after_mousemove_handler_ = function(e) {
  const snap_distance = 6;

  // Debug/fix for #387
  if (this.drag_start_entity_ === undefined) {
    console.error('this.drag_start_entity_ is undefined (point)');
    return;
  }

  let desired_x = this.drag_start_entity_.x + (((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale());
  let desired_y = this.drag_start_entity_.y + (((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale());

  if (this.state_.snapping === true) {
    // Vertical
    const point_x = this.room_.get_x() + desired_x;

    if (this.snap_line_x_ !== undefined) {
      this.snap_line_x_.stxle.visibility = 'hidden';
    }

    // Snap x
    const room_snap_x = this.room_.get_snap_x();
    for (let i = 0; i < room_snap_x.length; i++) {
      const snap_x = room_snap_x[i];
      const distance = Math.abs(snap_x - point_x);
      if (distance <= snap_distance) {
        desired_x = snap_x - this.room_.get_x();
        break;
      }
    }

    // Horizontal
    const point_y = this.room_.get_y() + desired_y;

    if (this.snap_line_y_ !== undefined) {
      this.snap_line_y_.style.visibility = 'hidden';
    }

    // Snap Y
    const room_snap_y = this.room_.get_snap_y();
    for (let i = 0; i < room_snap_y.length; i++) {
      const snap_y = room_snap_y[i];
      const distance = Math.abs(snap_y - point_y);
      if (distance <= snap_distance) {
        desired_y = snap_y - this.room_.get_y();
        break;
      }
    }

    this.update_snap_lines_();
  } else {
    this.clear_snap_lines_();
  }

  // Update
  this.set_xy(
    desired_x,
    desired_y
  );
};

/**
 * point what happens when you stop moving the point.
 */
beestat.component.floor_plan_entity.point.prototype.after_mouseup_handler_ = function() {
  this.clear_snap_lines_();
};

/**
 * Update snap lines to match the current data.
 */
beestat.component.floor_plan_entity.point.prototype.update_snap_lines_ = function() {
  /**
   * If the current x matches one of the room snap x positions, then
   * add/update the current snap line. Otherwise remove it.
   */
  const point_x = this.room_.get_x() + this.point_.x;
  if (this.room_.get_snap_x().includes(point_x) === true) {
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
    this.snap_lines_.x.parentNode.removeChild(this.snap_lines_.x);
    delete this.snap_lines_.x;
  }

  /**
   * If the current x matches one of the room snap y positions, then
   * add/update the current snap line. Otherwise remove it.
   */
  const point_y = this.room_.get_y() + this.point_.y;
  if (this.room_.get_snap_y().includes(point_y) === true) {
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
    this.snap_lines_.y.parentNode.removeChild(this.snap_lines_.y);
    delete this.snap_lines_.y;
  }
};

/**
 * Clear all existing snap lines.
 */
beestat.component.floor_plan_entity.point.prototype.clear_snap_lines_ = function() {
  if (this.snap_lines_.x !== undefined) {
    this.snap_lines_.x.parentNode.removeChild(this.snap_lines_.x);
    delete this.snap_lines_.x;
  }
  if (this.snap_lines_.y !== undefined) {
    this.snap_lines_.y.parentNode.removeChild(this.snap_lines_.y);
    delete this.snap_lines_.y;
  }
};

/**
 * Make this point active or not.
 *
 * @param {boolean} active Whether or not the point is active.
 *
 * @return {beestat.component.floor_plan_entity.point} This.
 */
beestat.component.floor_plan_entity.point.prototype.set_active = function(active) {
  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      // Inactivate any other active point.
      if (
        this.state_.active_point_entity !== undefined &&
        this.state_.active_point_entity.get_point() !== this.point_
      ) {
        this.state_.active_point_entity.set_active(false);
      }

      // Inactivate any other active wall.
      if (
        this.state_.active_wall_entity !== undefined
      ) {
        this.state_.active_wall_entity.set_active(false);
      }

      this.state_.active_point_entity = this;

      this.dispatchEvent('activate');
    } else {
      delete this.state_.active_point_entity;

      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Get X
 *
 * @return {number} x
 */
beestat.component.floor_plan_entity.point.prototype.get_x = function() {
  return this.point_.x;
};

/**
 * Get Y
 *
 * @return {number} y
 */
beestat.component.floor_plan_entity.point.prototype.get_y = function() {
  return this.point_.y;
};
