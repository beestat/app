/**
 * Wall.
 */
beestat.component.floor_plan_entity.wall = function() {
  this.snap_lines_ = {};

  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.wall, beestat.component.floor_plan_entity);

/**
 * Decorate
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.wall.prototype.decorate_ = function(parent) {
  this.decorate_line_(parent);

  this.set_draggable_(true);

  parent.appendChild(this.path_);
};

/**
 * Decorate path.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.wall.prototype.decorate_line_ = function(parent) {
  const self = this;

  this.path_ = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  this.path_id_ = String(Math.random());
  this.path_.setAttribute('id', this.path_id_);
  this.path_.style.strokeWidth = '6';

  if (this.active_ === true) {
    this.path_.style.stroke = beestat.style.color.green.base;
    this.path_.style.opacity = 0.5;
  } else {
    this.path_.style.stroke = '#ffffff';
    this.path_.style.opacity = 0.2;
  }

  this.path_.addEventListener('mousedown', function() {
    self.dispatchEvent('mousedown');
  });

  this.decorate_text_(parent);

  this.update_line_();

  this.path_.addEventListener('dblclick', this.add_point.bind(this));
};

/**
 * Add a point to the room along this wall.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.wall.prototype.add_point = function(e) {
  this.floor_plan_.save_buffer();

  const room = this.room_.get_room();
  for (let i = 0; i < room.points.length; i++) {
    if (this.point_1_ === room.points[i]) {
      /**
       * First convert the window coordinate space into SVG coordinate space.
       * Then project the clicked point onto the line so the line stays nice
       * and straight.
       */
      let local_point;
      if (e !== undefined) {
        local_point = this.floor_plan_.get_local_point(e);
      } else {
        local_point = {
          'x': room.x + ((this.point_1_.x + this.point_2_.x) / 2),
          'y': room.y + ((this.point_1_.y + this.point_2_.y) / 2)
        };
      }

      const projected_point = this.project_point_(
        {
          'x': (local_point.x - room.x),
          'y': (local_point.y - room.y)
        },
        this.point_1_,
        this.point_2_
      );

      room.points.splice(
        i + 1,
        0,
        projected_point
      );

      const projected_point_entity = new beestat.component.floor_plan_entity.point(
        this.floor_plan_,
        this.state_
      )
        .set_room(room)
        .set_point(projected_point);

      // this.state_.active_point = projected_point;
      this.state_.active_point_entity = projected_point_entity;
      if (this.state_.active_wall_entity !== undefined) {
        this.state_.active_wall_entity.set_active(false);
      }

      this.dispatchEvent('add_point');
      break;
    }
  }
};

/**
 * Update everything to match current data.
 */
beestat.component.floor_plan_entity.wall.prototype.update = function() {
  this.update_line_();
  this.update_text_();
};

/**
 * Update line to match current data.
 */
beestat.component.floor_plan_entity.wall.prototype.update_line_ = function() {
  // Draw the path in a specific direction so the text attached is consistent.
  const x_distance = Math.abs(this.point_1_.x - this.point_2_.x);
  const y_distance = Math.abs(this.point_1_.y - this.point_2_.y);

  let from_point;
  let to_point;
  if (x_distance > y_distance) {
    if (this.point_1_.x < this.point_2_.x) {
      from_point = this.point_1_;
      to_point = this.point_2_;
    } else {
      from_point = this.point_2_;
      to_point = this.point_1_;
    }
  } else {
    if (this.point_2_.y < this.point_1_.y) {
      from_point = this.point_1_;
      to_point = this.point_2_;
    } else {
      from_point = this.point_2_;
      to_point = this.point_1_;
    }
  }

  const path_parts = [];
  path_parts.push('M' + from_point.x + ',' + from_point.y);
  path_parts.push('L' + to_point.x + ',' + to_point.y);
  this.path_.setAttribute('d', path_parts.join(' '));

  if (this.is_horizontal_() === true) {
    this.path_.style.cursor = 'n-resize';
  } else if (this.is_vertical_() === true) {
    this.path_.style.cursor = 'e-resize';
  } else {
    this.path_.style.cursor = 'copy';
  }
};

/**
 * Project a point onto a line.
 *
 * @link https://jsfiddle.net/soulwire/UA6H5/
 * @link https://stackoverflow.com/q/32281168
 *
 * @param {object} p The point.
 * @param {object} a The first point of the line.
 * @param {object} b The second point of the line.
 *
 * @return {object} The projected point.
 */
beestat.component.floor_plan_entity.wall.prototype.project_point_ = function(p, a, b) {
  var atob = {'x': b.x - a.x,
    'y': b.y - a.y};
  var atop = {'x': p.x - a.x,
    'y': p.y - a.y};
  var len = (atob.x * atob.x) + (atob.y * atob.y);
  var dot = (atop.x * atob.x) + (atop.y * atob.y);
  var t = Math.min(1, Math.max(0, dot / len));

  dot = ((b.x - a.x) * (p.y - a.y)) - ((b.y - a.y) * (p.x - a.x));

  return {
    'x': Math.round(a.x + (atob.x * t)),
    'y': Math.round(a.y + (atob.y * t))
  };
};

/**
 * Decorate the wall length.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.wall.prototype.decorate_text_ = function(parent) {
  this.text_ = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  this.text_.style.fontFamily = 'Montserrat';
  this.text_.style.fontWeight = '300';
  this.text_.style.fill = '#ffffff';
  this.text_.style.textAnchor = 'middle';
  this.text_.style.letterSpacing = '-0.5px';
  this.text_.setAttribute('dy', '1.1em');

  this.text_path_ = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
  this.text_path_.setAttribute('href', '#' + this.path_id_);
  this.text_path_.setAttribute('startOffset', '50%');
  this.text_.appendChild(this.text_path_);

  this.update_text_();

  parent.appendChild(this.text_);
};

/**
 * Update the wall length to match the current data.
 */
beestat.component.floor_plan_entity.wall.prototype.update_text_ = function() {
  // Set the string content
  const length = this.get_length_();

  // Shrink the font slightly for short walls.
  if (length < 24) {
    this.text_.style.fontSize = '6px';
  } else if (length < 48) {
    this.text_.style.fontSize = '8px';
  } else {
    this.text_.style.fontSize = '11px';
  }

  let length_string;
  if (beestat.setting('units.distance') === 'ft') {
    const length_feet = Math.floor(length / 12);
    const length_inches = length % 12;

    let length_parts = [];
    length_parts.push(length_feet + '\'');
    length_parts.push(length_inches + '"');

    length_string = length_parts.join(' ');
  } else {
    length_string = beestat.distance({
      'distance': length,
      'units': true,
      'round': 2
    });
  }

  this.text_path_.textContent = length_string;
};

/**
 * Set the first point. Assume this is the position of the wall.
 *
 * @param {object} point_1
 *
 * @return {beestat.component.floor_plan_entity.wall} This.
 */
beestat.component.floor_plan_entity.wall.prototype.set_point_1 = function(point_1) {
  this.point_1_ = point_1;

  return this;
};

/**
 * Get point_1.
 *
 * @return {object} point_1
 */
beestat.component.floor_plan_entity.wall.prototype.get_point_1 = function() {
  return this.point_1_;
};

/**
 * Set the second point
 *
 * @param {object} point_2
 *
 * @return {beestat.component.floor_plan_entity.wall} This.
 */
beestat.component.floor_plan_entity.wall.prototype.set_point_2 = function(point_2) {
  this.point_2_ = point_2;

  return this;
};

/**
 * Get point_2.
 *
 * @return {object} point_2
 */
beestat.component.floor_plan_entity.wall.prototype.get_point_2 = function() {
  return this.point_2_;
};

/**
 * Set the room the wall is part of.
 *
 * @param {beestat.component.floor_plan_entity.room} room
 *
 * @return {beestat.component.floor_plan_entity.wall} This.
 */
beestat.component.floor_plan_entity.wall.prototype.set_room = function(room) {
  this.room_ = room;

  return this;
};

/**
 * Set the x and y positions of this entity. This just updates the points as
 * the entity itself is not translated. Clamps to the edges of the grid.
 *
 * @param {number} x The x position of this entity.
 * @param {number} y The y position of this entity.
 * @param {string} event Optional event to fire when done.
 *
 * @return {beestat.component.floor_plan_entity.wall} This.
 */
beestat.component.floor_plan_entity.wall.prototype.set_xy = function(x, y, event = 'lesser_update') {
  if (event === 'update') {
    this.floor_plan_.save_buffer();
  }

  let clamped_x = x + this.room_.get_x();
  let clamped_y = y + this.room_.get_y();

  if (x !== null) {
    clamped_x = Math.min(clamped_x, (this.floor_plan_.get_grid_pixels() / 2));
    clamped_x = Math.max(clamped_x, -(this.floor_plan_.get_grid_pixels() / 2));

    this.point_1_.x = Math.round(clamped_x - this.room_.get_x());
    this.point_2_.x = Math.round(clamped_x - this.room_.get_x());
  }

  if (y !== null) {
    clamped_y = Math.min(clamped_y, (this.floor_plan_.get_grid_pixels() / 2));
    clamped_y = Math.max(clamped_y, -(this.floor_plan_.get_grid_pixels() / 2));

    this.point_1_.y = Math.round(clamped_y - this.room_.get_y());
    this.point_2_.y = Math.round(clamped_y - this.room_.get_y());
  }

  this.dispatchEvent(event);

  return this;
};

/**
 * Handle dragging a wall around. Snaps to X and Y of other handles.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.wall.prototype.after_mousemove_handler_ = function(e) {
  const snap_distance = 6;

  if (this.is_vertical_() === true) {
    let desired_x = this.drag_start_entity_.x + (((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale());

    if (this.state_.snapping === true) {
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
      this.update_snap_lines_();
    } else {
      this.clear_snap_lines_();
    }

    this.set_xy(
      desired_x,
      null
    );
  } else if (this.is_horizontal_() === true) {
    let desired_y = this.drag_start_entity_.y + (((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale());

    if (this.state_.snapping === true) {
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

    this.set_xy(
      null,
      desired_y
    );
  }
};

/**
 * Handle what happens when you stop moving the wall.
 */
beestat.component.floor_plan_entity.wall.prototype.after_mouseup_handler_ = function() {
  this.clear_snap_lines_();
};

/**
 * Override to prevent this from happening if the ctrl key is pressed as that
 * adds a point and should not start a drag.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.wall.prototype.mousedown_handler_ = function(e) {
  if (e.ctrlKey === true) {
    e.stopPropagation();
    return;
  }

  beestat.component.floor_plan_entity.prototype.mousedown_handler_.apply(this, arguments);
};

/**
 * Set an appropriate drag_start_entity_ on mousedown.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.wall.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.point_1_.x,
    'y': this.point_1_.y
  };
};

/**
 * Update snap lines to match the current data.
 */
beestat.component.floor_plan_entity.wall.prototype.update_snap_lines_ = function() {
  /**
   * If the current x matches one of the room snap x positions, then
   * add/update the current snap line. Otherwise remove it.
   */
  if (this.is_vertical_() === true) {
    const point_x = this.room_.get_x() + this.point_1_.x;
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
  }

  /**
   * If the current x matches one of the room snap y positions, then
   * add/update the current snap line. Otherwise remove it.
   */
  if (this.is_horizontal_() === true) {
    const point_y = this.room_.get_y() + this.point_1_.y;
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
  }
};

/**
 * Clear all existing snap lines.
 */
beestat.component.floor_plan_entity.wall.prototype.clear_snap_lines_ = function() {
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
 * Get the midpoint of the wall.
 *
 * @return {number} The midpoint of the wall.
 */
beestat.component.floor_plan_entity.wall.prototype.get_midpoint_ = function() {
  return {
    'x': (this.point_1_.x + this.point_2_.x) / 2,
    'y': (this.point_1_.y + this.point_2_.y) / 2
  };
};

/**
 * Get the midpoint of the wall.
 *
 * @return {number} The midpoint of the wall.
 */
beestat.component.floor_plan_entity.wall.prototype.get_length_ = function() {
  return Math.round(Math.hypot(
    this.point_2_.x - this.point_1_.x,
    this.point_2_.y - this.point_1_.y
  ));
};

/**
 * Get whether or not this wall is horizontal.
 *
 * @return {boolean} Whether or not this wall is horizontal.
 */
beestat.component.floor_plan_entity.wall.prototype.is_horizontal_ = function() {
  return Math.abs(this.point_1_.y - this.point_2_.y) === 0;
};

/**
 * Get whether or not this wall is vertical.
 *
 * @return {boolean} Whether or not this wall is vertical.
 */
beestat.component.floor_plan_entity.wall.prototype.is_vertical_ = function() {
  return Math.abs(this.point_1_.x - this.point_2_.x) === 0;
};

/**
 * Make this wall active or not.
 *
 * @param {boolean} active Whether or not the wall is active.
 *
 * @return {beestat.component.floor_plan_entity.wall} This.
 */
beestat.component.floor_plan_entity.wall.prototype.set_active = function(active) {
  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      // Inactivate any other active wall.
      if (this.state_.active_wall_entity !== undefined) {
        this.state_.active_wall_entity.set_active(false);
      }

      this.state_.active_wall_entity = this;

      // Deactivate the active point.
      if (this.state_.active_point_entity !== undefined) {
        this.state_.active_point_entity.set_active(false);
      }

      this.dispatchEvent('activate');
    } else {
      delete this.state_.active_wall_entity;

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
beestat.component.floor_plan_entity.wall.prototype.get_x = function() {
  return this.is_vertical_() === true ? this.point_1_.x : null;
};

/**
 * Get Y
 *
 * @return {number} y
 */
beestat.component.floor_plan_entity.wall.prototype.get_y = function() {
  return this.is_horizontal_() === true ? this.point_1_.y : null;
};
