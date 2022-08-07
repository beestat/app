/**
 * Floor plan room.
 *
 * @param {object} room The room.
 */
beestat.component.floor_plan_entity.room = function() {
  this.walls_ = [];
  this.point_entities_ = [];
  this.enabled_ = true;

  this.snap_lines_ = {
    'x': {},
    'y': {}
  };
  beestat.component.floor_plan_entity.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.room, beestat.component.floor_plan_entity);

/**
 * Decorate
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.prototype.decorate_ = function(parent) {
  this.decorate_polygon_(parent);
  if (this.active_ === true) {
    this.decorate_walls_(parent);
    this.decorate_points_(parent);
    this.update_snap_points_(parent);
  }
};

/**
 * Draw the polygon.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.prototype.decorate_polygon_ = function(parent) {
  const self = this;

  this.polygon_ = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  parent.appendChild(this.polygon_);

  this.polygon_.style.strokeWidth = '2';

  if (this.active_ === true) {
    this.set_draggable_(true);

    this.polygon_.style.cursor = 'pointer';
    this.polygon_.style.fillOpacity = '0.5';
    this.polygon_.style.fill = beestat.style.color.green.light;
    this.polygon_.style.stroke = '#ffffff';
    this.polygon_.style.filter = 'drop-shadow(3px 3px 3px #000000)';
  } else if (this.enabled_ === true) {
    this.polygon_.style.cursor = 'pointer';
    this.polygon_.style.fillOpacity = '0.5';
    this.polygon_.style.fill = beestat.style.color.blue.base;
    this.polygon_.style.stroke = beestat.style.color.gray.base;
  } else {
    this.polygon_.style.cursor = 'default';
    this.polygon_.style.fillOpacity = '0.2';
    this.polygon_.style.fill = beestat.style.color.gray.base;
    this.polygon_.style.stroke = beestat.style.color.gray.dark;
  }

  // Activate room on click if the mouse didn't move.
  if (this.enabled_ === true) {
    this.polygon_.addEventListener('mousedown', function(e) {
      self.mousedown_mouse_ = {
        'x': e.clientX,
        'y': e.clientY
      };
    });
    this.polygon_.addEventListener('mouseup', function(e) {
      if (
        self.mousedown_mouse_ !== undefined &&
        e.clientX === self.mousedown_mouse_.x &&
        e.clientY === self.mousedown_mouse_.y
      ) {
        self.set_active(true);
      }
    });
  }

  this.update_polygon_();
};

/**
 * Update the points attribute of the polygon to match the current data.
 */
beestat.component.floor_plan_entity.prototype.update_polygon_ = function() {
  const points = [];
  this.room_.points.forEach(function(point) {
    points.push(point.x + ',' + point.y);
  });
  this.polygon_.setAttribute('points', points.join(' '));
};

/**
 * Add drag pointx for each point.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.prototype.decorate_points_ = function(parent) {
  const self = this;

  this.room_.points.forEach(function(point) {
    const point_entity = new beestat.component.floor_plan_entity.point(self.floor_plan_, self.state_)
      .set_room(self)
      .set_point(point)
      .render(parent);

    // Update when a point is moved
    point_entity.addEventListener('update', function() {
      self.update_polygon_();
      self.update_walls_();
      self.dispatchEvent('update');
    });

    // When a point is done moving normalize the points
    point_entity.addEventListener('drag_stop', function() {
      self.normalize_points_();
      self.update_points_();
      self.update_walls_();
      self.update_polygon_();
      self.update_snap_points_();
      self.dispatchEvent('update');
    });

    // Activate on click
    point_entity.addEventListener('mousedown', function() {
      point_entity.set_active(true);
    });

    // Add toolbar button on activate.
    point_entity.addEventListener('activate', function() {
      self.floor_plan_.update_toolbar();
    });

    // Activate the currently active point (mostly for rerenders).
    if (self.state_.active_point === point) {
      point_entity.set_active(true);
    }

    self.point_entities_.push(point_entity);
  });
};

/**
 * Update the points to match the current data.
 */
beestat.component.floor_plan_entity.prototype.update_points_ = function() {
  this.point_entities_.forEach(function(point_entity) {
    point_entity.update();
  });
};

/**
 * Add walls between each point.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.prototype.decorate_walls_ = function(parent) {
  const self = this;

  this.room_.points.forEach(function(point, i) {
    const i_1 = i;
    const i_2 = (i + 1) % self.room_.points.length;

    const wall_entity = new beestat.component.floor_plan_entity.wall(self.floor_plan_, self.state_)
      .set_room(self)
      .set_point_1(self.room_.points[i_1])
      .set_point_2(self.room_.points[i_2])
      .render(parent);
    self.walls_.push(wall_entity);

    wall_entity.addEventListener('update', function() {
      self.update_polygon_();
      self.update_points_();
      self.update_walls_();
      self.dispatchEvent('update');
    });

    // Clear any active points on drag start.
    wall_entity.addEventListener('drag_start', function() {
      if (self.active_point_entity_ !== undefined) {
        self.active_point_entity_.set_active(false);
        delete self.active_point_entity_;
      }
    });

    wall_entity.addEventListener('drag_stop', function() {
      self.normalize_points_();
      self.update_polygon_();
      self.update_points_();
      self.update_walls_();
      self.update_snap_points_();
      self.dispatchEvent('update');
    });

    wall_entity.addEventListener('add_point', function() {
      self.rerender();
      self.dispatchEvent('update');
    });

    // Activate on mousedown
    wall_entity.addEventListener('mousedown', function() {
      wall_entity.set_active(true);
    });

    // Add toolbar button on activate.
    wall_entity.addEventListener('activate', function() {
      self.floor_plan_.update_toolbar();
    });

    // Activate the currently active wall (mostly for rerenders).
    if (
      self.state_.active_wall_entity !== undefined &&
      point === self.state_.active_wall_entity.get_point_1()
    ) {
      wall_entity.set_active(true);
    }
  });
};

/**
 * Update the walls to match the current data.
 */
beestat.component.floor_plan_entity.prototype.update_walls_ = function() {
  this.walls_.forEach(function(wall) {
    wall.update();
  });
};

/**
 * Make this room active or not.
 *
 * @param {boolean} active Whether or not the room is active.
 *
 * @return {beestat.component.floor_plan_entity.room} This.
 */
beestat.component.floor_plan_entity.room.prototype.set_active = function(active) {
  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      // Inactivate any other active room.
      if (
        this.state_.active_room_entity !== undefined &&
        this.state_.active_room !== this.room_
      ) {
        this.state_.active_room_entity.set_active(false);
      }

      this.state_.active_room = this.room_;
      this.state_.active_room_entity = this;

      this.dispatchEvent('activate');
      this.update_snap_points_();

      this.bring_to_front_();
    } else {
      delete this.state_.active_room;
      delete this.state_.active_room_entity;

      if (this.state_.active_wall_entity !== undefined) {
        this.state_.active_wall_entity.set_active(false);
      }

      if (this.state_.active_point_entity !== undefined) {
        this.state_.active_point_entity.set_active(false);
      }
    }

    if (this.rendered_ === true) {
      this.rerender();
    }

    this.floor_plan_.update_toolbar();
  }

  return this;
};

/**
 * Pre-generate a list of snappable x/y values.
 */
beestat.component.floor_plan_entity.room.prototype.update_snap_points_ = function() {
  const snap_x = {};
  const snap_y = {};

  // Snap to rooms in this group.
  this.group_.rooms.forEach(function(room) {
    room.points.forEach(function(point) {
      snap_x[point.x + room.x] = true;
      snap_y[point.y + room.y] = true;
    });
  });

  // Snap to rooms in the group under this one.
  const group_below = this.floor_plan_.get_group_below(this.group_);
  if (group_below !== undefined) {
    group_below.rooms.forEach(function(room) {
      room.points.forEach(function(point) {
        snap_x[point.x + room.x] = true;
        snap_y[point.y + room.y] = true;
      });
    });
  }

  this.snap_x_ = Object.keys(snap_x).map(function(key) {
    return Number(key);
  });
  this.snap_y_ = Object.keys(snap_y).map(function(key) {
    return Number(key);
  });
};

/**
 * Get the room.
 *
 * @return {object} The room.
 */
beestat.component.floor_plan_entity.room.prototype.get_room = function() {
  return this.room_;
};

/**
 * Set the room.
 *
 * @param {object} room
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.room.prototype.set_room = function(room) {
  this.room_ = room;
  this.x_ = room.x;
  this.y_ = room.y;

  return this;
};

/**
 * Set the group this room is part of. Used so the room can look at other
 * points in the group for snapping.
 *
 * @param {object} group
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.room.prototype.set_group = function(group) {
  this.group_ = group;

  return this;
};

/**
 * Set the x and y positions of this entity. Clamps to the edges of the grid.
 *
 * @param {number} x The x position of this entity.
 * @param {number} y The y position of this entity.
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.room.prototype.set_xy = function(x, y) {
  let clamped_x = x;
  let clamped_y = y;

  let min_x = 0;
  let max_x = 0;
  let min_y = 0;
  let max_y = 0;
  this.room_.points.forEach(function(point) {
    max_x = Math.max(max_x, point.x);
    max_y = Math.max(max_y, point.y);
  });
  clamped_x = Math.min(x, (this.floor_plan_.get_grid_pixels() / 2) - max_x);
  clamped_y = Math.min(y, (this.floor_plan_.get_grid_pixels() / 2) - max_y);
  clamped_x = Math.max(clamped_x, -(this.floor_plan_.get_grid_pixels() / 2) + min_x);
  clamped_y = Math.max(clamped_y, -(this.floor_plan_.get_grid_pixels() / 2) + min_y);

  this.room_.x = Math.round(clamped_x);
  this.room_.y = Math.round(clamped_y);

  this.dispatchEvent('update');

  return beestat.component.floor_plan_entity.prototype.set_xy.apply(
    this,
    [
      clamped_x,
      clamped_y
    ]
  );
};

/**
 * Normalize the points so that they always fill the top and left. This
 * prevents weird stuff like a polygon existing at 0,0 but the points all
 * being shifted really far off which causes other issues.
 */
beestat.component.floor_plan_entity.room.prototype.normalize_points_ = function() {
  const x_values = [];
  const y_values = [];

  this.room_.points.forEach(function(point) {
    x_values.push(point.x);
    y_values.push(point.y);
  });

  const min_x = Math.min.apply(null, x_values);
  const min_y = Math.min.apply(null, y_values);

  this.room_.points.forEach(function(point) {
    point.x -= min_x;
    point.y -= min_y;
  });

  this.set_xy(this.x_ + min_x, this.y_ + min_y);
};

/**
 * Set an appropriate drag_start_entity_ on mousedown.
 */
beestat.component.floor_plan_entity.room.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'x': this.x_,
    'y': this.y_
  };
};

/**
 * point dragging the room around. Snaps to X and Y of other points.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.room.prototype.after_mousemove_handler_ = function(e) {
  const self = this;

  let desired_x = this.drag_start_entity_.x + ((e.clientX - this.drag_start_mouse_.x) * this.floor_plan_.get_scale());
  let desired_y = this.drag_start_entity_.y + ((e.clientY - this.drag_start_mouse_.y) * this.floor_plan_.get_scale());

  // Snap
  if (this.state_.snapping === true) {
    const snap_distance = 6;
    this.room_.points.forEach(function(point) {
      const point_x = point.x + desired_x;
      const point_y = point.y + desired_y;

      // Snap X
      for (let i = 0; i < self.snap_x_.length; i++) {
        const snap_x = self.snap_x_[i];
        const distance = Math.abs(snap_x - point_x);
        if (distance <= snap_distance) {
          desired_x = snap_x - point.x;
          break;
        }
      }

      // Snap Y
      for (let i = 0; i < self.snap_y_.length; i++) {
        const snap_y = self.snap_y_[i];
        const distance = Math.abs(snap_y - point_y);
        if (distance <= snap_distance) {
          desired_y = snap_y - point.y;
          break;
        }
      }
    });

    this.update_snap_lines_();
  } else {
    this.clear_snap_lines_();
  }

  this.set_xy(
    desired_x,
    desired_y
  );
};

/**
 * What happens when you stop moving the room.
 */
beestat.component.floor_plan_entity.room.prototype.after_mouseup_handler_ = function() {
  if (this.dragged_ === true) {
    this.clear_snap_lines_();
    this.update_snap_points_();
    this.dispatchEvent('update');
  }
};

/**
 * Update snap lines to match the current data.
 */
beestat.component.floor_plan_entity.room.prototype.update_snap_lines_ = function() {
  const self = this;

  let current_snap_x = {};
  this.room_.points.forEach(function(point) {
    current_snap_x[point.x + self.room_.x] = true;
  });

  // Remove any snap lines that no longer exist.
  for (let x in this.snap_lines_.x) {
    if (current_snap_x[x] === undefined) {
      this.snap_lines_.x[x].parentNode.removeChild(this.snap_lines_.x[x]);
      delete this.snap_lines_.x[x];
    }
  }

  current_snap_x = Object.keys(current_snap_x).map(function(key) {
    return Number(key);
  });

  const intersected_snap_x = this.snap_x_.filter(function(x) {
    return current_snap_x.includes(x) === true;
  });

  // Add any new snap lines.
  intersected_snap_x.forEach(function(x) {
    if (self.snap_lines_.x[x] === undefined) {
      self.snap_lines_.x[x] = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      self.snap_lines_.x[x].style.strokeDasharray = '7, 3';
      self.snap_lines_.x[x].style.stroke = beestat.style.color.yellow.base;
      self.snap_lines_.x[x].setAttribute('x1', x);
      self.snap_lines_.x[x].setAttribute('x2', x);
      self.snap_lines_.x[x].setAttribute('y1', self.floor_plan_.get_grid_pixels() / -2);
      self.snap_lines_.x[x].setAttribute('y2', self.floor_plan_.get_grid_pixels() / 2);
      self.floor_plan_.get_g().appendChild(self.snap_lines_.x[x]);
    }
  });

  let current_snap_y = {};
  this.room_.points.forEach(function(point) {
    current_snap_y[point.y + self.room_.y] = true;
  });

  // Remove any snap lines that no longer exist.
  for (let y in this.snap_lines_.y) {
    if (current_snap_y[y] === undefined) {
      this.snap_lines_.y[y].parentNode.removeChild(this.snap_lines_.y[y]);
      delete this.snap_lines_.y[y];
    }
  }

  current_snap_y = Object.keys(current_snap_y).map(function(key) {
    return Number(key);
  });

  const intersected_snap_y = this.snap_y_.filter(function(y) {
    return current_snap_y.includes(y) === true;
  });

  // Add any new snap lines.
  intersected_snap_y.forEach(function(y) {
    if (self.snap_lines_.y[y] === undefined) {
      self.snap_lines_.y[y] = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      self.snap_lines_.y[y].style.strokeDasharray = '7, 3';
      self.snap_lines_.y[y].style.stroke = beestat.style.color.yellow.base;
      self.snap_lines_.y[y].setAttribute('y1', y);
      self.snap_lines_.y[y].setAttribute('y2', y);
      self.snap_lines_.y[y].setAttribute('x1', self.floor_plan_.get_grid_pixels() / -2);
      self.snap_lines_.y[y].setAttribute('x2', self.floor_plan_.get_grid_pixels() / 2);
      self.floor_plan_.get_g().appendChild(self.snap_lines_.y[y]);
    }
  });
};

/**
 * Clear all existing snap lines.
 */
beestat.component.floor_plan_entity.room.prototype.clear_snap_lines_ = function() {
  for (var x in this.snap_lines_.x) {
    this.snap_lines_.x[x].parentNode.removeChild(this.snap_lines_.x[x]);
    delete this.snap_lines_.x[x];
  }
  for (var y in this.snap_lines_.y) {
    this.snap_lines_.y[y].parentNode.removeChild(this.snap_lines_.y[y]);
    delete this.snap_lines_.y[y];
  }
};

/**
 * Get Snap X
 *
 * @return {array} Snap X
 */
beestat.component.floor_plan_entity.room.prototype.get_snap_x = function() {
  return this.snap_x_;
};

/**
 * Get Snap Y
 *
 * @return {array} Snap Y
 */
beestat.component.floor_plan_entity.room.prototype.get_snap_y = function() {
  return this.snap_y_;
};

/**
 * Set enabled (different than active)
 *
 * @param {boolean} enabled
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.room.prototype.set_enabled = function(enabled) {
  this.enabled_ = enabled;

  return this;
};

// Keeping this around as I may use it.
// https://stackoverflow.com/a/16283349
/*beestat.component.floor_plan_entity.room.prototype.get_centroid_ = function () {
  var x = 0,
      y = 0,
      i,
      j,
      f,
      point1,
      point2;

  for (i = 0, j = this.room_.points.length - 1; i < this.room_.points.length; j=i,i++) {
      point1 = this.room_.points[i];
      point2 = this.room_.points[j];
      f = point1.x * point2.y - point2.x * point1.y;
      x += (point1.x + point2.x) * f;
      y += (point1.y + point2.y) * f;
  }

  const area = Math.abs(
    ClipperLib.Clipper.Area(this.room_.points)
  );

  f = area * 6;

  return {'x': x / f, 'y': y / f};
};*/
