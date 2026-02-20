/**
 * Floor plan opening (empty, door, window) represented as a line segment with
 * two draggable endpoints.
 */
beestat.component.floor_plan_entity.opening = function() {
  this.enabled_ = true;
  this.point_entities_ = [];
  this.snap_lines_ = {
    'x': {},
    'y': {}
  };

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

  if (this.active_ === true) {
    this.decorate_points_(parent);
    this.update_snap_points_();
  }

  if (this.enabled_ === true && this.active_ === true) {
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
  this.path_id_ = String(Math.random());
  this.path_.setAttribute('id', this.path_id_);
  this.path_.style.fill = 'none';
  this.path_.style.strokeLinecap = 'round';
  this.path_.style.cursor = this.enabled_ === true ? 'pointer' : 'default';
  parent.appendChild(this.path_);

  this.text_ = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  this.text_.style.fontFamily = 'Montserrat';
  this.text_.style.fontWeight = '300';
  this.text_.style.fontSize = '11px';
  this.text_.style.fill = '#ffffff';
  this.text_.style.textAnchor = 'middle';
  this.text_.style.letterSpacing = '-0.5px';
  this.text_.setAttribute('dy', '1.1em');

  this.text_path_ = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
  this.text_path_.setAttribute('href', '#' + this.path_id_);
  this.text_path_.setAttribute('startOffset', '50%');
  this.text_.appendChild(this.text_path_);
  parent.appendChild(this.text_);

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
};

/**
 * Update visuals.
 */
beestat.component.floor_plan_entity.opening.prototype.update = function() {
  if (
    this.opening_ === undefined ||
    this.opening_.points === undefined ||
    Array.isArray(this.opening_.points) !== true ||
    this.opening_.points.length < 2
  ) {
    return;
  }

  this.opening_.width = Math.round(this.get_opening_width_());
  const center = this.get_center_();
  this.opening_.x = Math.round(center.x);
  this.opening_.y = Math.round(center.y);

  if (
    this.path_ === undefined ||
    this.text_ === undefined ||
    this.text_path_ === undefined
  ) {
    return;
  }

  this.update_line_();
  this.update_text_();
  this.update_points_();
};

/**
 * Add endpoint drag points.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.opening.prototype.decorate_points_ = function(parent) {
  const self = this;

  this.opening_.points.forEach(function(point) {
    const point_entity = new beestat.component.floor_plan_entity.point(self.floor_plan_, self.state_)
      .set_room(self)
      .set_point(point)
      .render(parent);

    point_entity.addEventListener('lesser_update', function() {
      self.update();
    });

    point_entity.addEventListener('update', function() {
      self.update();
      self.update_snap_points_();
      self.dispatchEvent('update');
    });

    point_entity.addEventListener('mousedown', function() {
      point_entity.set_active(true);
    });
    point_entity.addEventListener('touchstart', function() {
      point_entity.set_active(true);
    });

    point_entity.addEventListener('activate', function() {
      self.floor_plan_.update_toolbar();
    });

    if (
      self.state_.active_point_entity !== undefined &&
      self.state_.active_point_entity.get_point() === point
    ) {
      point_entity.set_active(true);
    }

    self.point_entities_.push(point_entity);
  });
};

/**
 * Update endpoint drag points.
 */
beestat.component.floor_plan_entity.opening.prototype.update_points_ = function() {
  this.point_entities_.forEach(function(point_entity) {
    point_entity.update();
  });
};

/**
 * Update line path.
 */
beestat.component.floor_plan_entity.opening.prototype.update_line_ = function() {
  const p1 = this.opening_.points[0];
  const p2 = this.opening_.points[1];
  this.path_.setAttribute('d', 'M' + p1.x + ',' + p1.y + ' L' + p2.x + ',' + p2.y);
  this.path_.style.stroke = this.get_opening_color_();
  this.path_.style.strokeWidth = this.active_ === true ? '6' : '4';
  this.path_.style.opacity = this.enabled_ === true ? (this.active_ === true ? '0.95' : '0.7') : '0.3';
};

/**
 * Update length text.
 */
beestat.component.floor_plan_entity.opening.prototype.update_text_ = function() {
  if (this.active_ !== true) {
    this.text_.style.display = 'none';
    this.text_path_.textContent = '';
    return;
  }

  this.text_.style.display = 'block';
  const length = this.get_opening_width_();

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
    const length_inches = Math.round(length % 12);
    length_string = length_feet + '\'' + ' ' + length_inches + '"';
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
 * Get opening width.
 *
 * @return {number}
 */
beestat.component.floor_plan_entity.opening.prototype.get_opening_width_ = function() {
  const p1 = this.opening_.points[0];
  const p2 = this.opening_.points[1];
  const dx = Number(p2.x || 0) - Number(p1.x || 0);
  const dy = Number(p2.y || 0) - Number(p1.y || 0);
  return Math.sqrt((dx * dx) + (dy * dy));
};

/**
 * Get line center.
 *
 * @return {{x:number,y:number}}
 */
beestat.component.floor_plan_entity.opening.prototype.get_center_ = function() {
  const p1 = this.opening_.points[0];
  const p2 = this.opening_.points[1];
  return {
    'x': (Number(p1.x || 0) + Number(p2.x || 0)) / 2,
    'y': (Number(p1.y || 0) + Number(p2.y || 0)) / 2
  };
};

/**
 * Handle after mousedown.
 */
beestat.component.floor_plan_entity.opening.prototype.after_mousedown_handler_ = function() {
  this.drag_start_entity_ = {
    'p1': {
      'x': Number(this.opening_.points[0].x || 0),
      'y': Number(this.opening_.points[0].y || 0)
    },
    'p2': {
      'x': Number(this.opening_.points[1].x || 0),
      'y': Number(this.opening_.points[1].y || 0)
    }
  };
};

/**
 * Handle dragging.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.opening.prototype.after_mousemove_handler_ = function(e) {
  const grid_half = this.floor_plan_.get_grid_pixels() / 2;
  const snap_distance = 6;

  let desired_dx = ((e.clientX || e.touches[0].clientX) - this.drag_start_mouse_.x) * this.floor_plan_.get_scale();
  let desired_dy = ((e.clientY || e.touches[0].clientY) - this.drag_start_mouse_.y) * this.floor_plan_.get_scale();

  if (this.state_.snapping === true) {
    const snap_x_values = this.get_snap_x();
    const snap_y_values = this.get_snap_y();
    const points = [
      {
        'x': this.drag_start_entity_.p1.x + desired_dx,
        'y': this.drag_start_entity_.p1.y + desired_dy
      },
      {
        'x': this.drag_start_entity_.p2.x + desired_dx,
        'y': this.drag_start_entity_.p2.y + desired_dy
      }
    ];

    let best_snap_delta_x;
    let best_snap_distance_x = Number.POSITIVE_INFINITY;
    let best_snap_delta_y;
    let best_snap_distance_y = Number.POSITIVE_INFINITY;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      for (let j = 0; j < snap_x_values.length; j++) {
        const snap_x = snap_x_values[j];
        const distance_x = Math.abs(snap_x - point.x);
        if (distance_x <= snap_distance && distance_x < best_snap_distance_x) {
          best_snap_distance_x = distance_x;
          best_snap_delta_x = snap_x - point.x;
        }
      }

      for (let j = 0; j < snap_y_values.length; j++) {
        const snap_y = snap_y_values[j];
        const distance_y = Math.abs(snap_y - point.y);
        if (distance_y <= snap_distance && distance_y < best_snap_distance_y) {
          best_snap_distance_y = distance_y;
          best_snap_delta_y = snap_y - point.y;
        }
      }
    }

    if (best_snap_delta_x !== undefined) {
      desired_dx += best_snap_delta_x;
    }
    if (best_snap_delta_y !== undefined) {
      desired_dy += best_snap_delta_y;
    }

    this.update_snap_lines_();
  } else {
    this.clear_snap_lines_();
  }

  let applied_dx = desired_dx;
  let applied_dy = desired_dy;

  const min_dx = -grid_half - Math.min(this.drag_start_entity_.p1.x, this.drag_start_entity_.p2.x);
  const max_dx = grid_half - Math.max(this.drag_start_entity_.p1.x, this.drag_start_entity_.p2.x);
  const min_dy = -grid_half - Math.min(this.drag_start_entity_.p1.y, this.drag_start_entity_.p2.y);
  const max_dy = grid_half - Math.max(this.drag_start_entity_.p1.y, this.drag_start_entity_.p2.y);

  applied_dx = Math.max(min_dx, Math.min(max_dx, applied_dx));
  applied_dy = Math.max(min_dy, Math.min(max_dy, applied_dy));

  this.opening_.points[0].x = Math.round(this.drag_start_entity_.p1.x + applied_dx);
  this.opening_.points[0].y = Math.round(this.drag_start_entity_.p1.y + applied_dy);
  this.opening_.points[1].x = Math.round(this.drag_start_entity_.p2.x + applied_dx);
  this.opening_.points[1].y = Math.round(this.drag_start_entity_.p2.y + applied_dy);

  this.update();
};

/**
 * Cleanup after mouseup.
 */
beestat.component.floor_plan_entity.opening.prototype.after_mouseup_handler_ = function() {
  if (this.dragged_ === true) {
    this.clear_snap_lines_();
    this.update_snap_points_();
  }
};

/**
 * Update snap lines to match the opening points.
 */
beestat.component.floor_plan_entity.opening.prototype.update_snap_lines_ = function() {
  const self = this;

  let current_snap_x = {};
  this.opening_.points.forEach(function(point) {
    current_snap_x[point.x] = true;
  });

  for (let x in this.snap_lines_.x) {
    if (current_snap_x[x] === undefined) {
      this.snap_lines_.x[x].parentNode.removeChild(this.snap_lines_.x[x]);
      delete this.snap_lines_.x[x];
    }
  }

  current_snap_x = Object.keys(current_snap_x).map(function(key) {
    return Number(key);
  });

  const intersected_snap_x = this.get_snap_x().filter(function(x) {
    return current_snap_x.includes(x) === true;
  });

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
  this.opening_.points.forEach(function(point) {
    current_snap_y[point.y] = true;
  });

  for (let y in this.snap_lines_.y) {
    if (current_snap_y[y] === undefined) {
      this.snap_lines_.y[y].parentNode.removeChild(this.snap_lines_.y[y]);
      delete this.snap_lines_.y[y];
    }
  }

  current_snap_y = Object.keys(current_snap_y).map(function(key) {
    return Number(key);
  });

  const intersected_snap_y = this.get_snap_y().filter(function(y) {
    return current_snap_y.includes(y) === true;
  });

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
 * Clear all snap lines.
 */
beestat.component.floor_plan_entity.opening.prototype.clear_snap_lines_ = function() {
  for (let x in this.snap_lines_.x) {
    this.snap_lines_.x[x].parentNode.removeChild(this.snap_lines_.x[x]);
    delete this.snap_lines_.x[x];
  }
  for (let y in this.snap_lines_.y) {
    this.snap_lines_.y[y].parentNode.removeChild(this.snap_lines_.y[y]);
    delete this.snap_lines_.y[y];
  }
};

/**
 * Pre-generate a list of snappable x/y values.
 */
beestat.component.floor_plan_entity.opening.prototype.update_snap_points_ = function() {
  const self = this;
  const snap_x = {};
  const snap_y = {};

  const append_shapes = function(shapes, skip_self_opening) {
    if (Array.isArray(shapes) !== true) {
      return;
    }

    shapes.forEach(function(shape) {
      if (shape.editor_hidden === true || Array.isArray(shape.points) !== true) {
        return;
      }
      if (
        skip_self_opening === true &&
        self.opening_ !== undefined &&
        shape.opening_id !== undefined &&
        self.opening_.opening_id !== undefined &&
        shape.opening_id === self.opening_.opening_id
      ) {
        return;
      }
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
    });
  };

  append_shapes(this.group_.rooms, false);
  append_shapes(this.group_.surfaces, false);
  append_shapes(this.group_.openings, true);

  const group_below = this.floor_plan_.get_group_below(this.group_);
  if (group_below !== undefined) {
    append_shapes(group_below.rooms, false);
    append_shapes(group_below.surfaces, false);
    append_shapes(group_below.openings, false);
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
beestat.component.floor_plan_entity.opening.prototype.get_snap_x = function() {
  return this.snap_x_ || [];
};

/**
 * Get snap y values.
 *
 * @return {number[]}
 */
beestat.component.floor_plan_entity.opening.prototype.get_snap_y = function() {
  return this.snap_y_ || [];
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
  if (this.opening_.height === undefined) {
    this.opening_.height = (this.opening_.type === 'window' || this.opening_.type === 'glass') ? 42 : 78;
  }
  if (this.opening_.elevation === undefined) {
    this.opening_.elevation = (this.opening_.type === 'window' || this.opening_.type === 'glass') ? 36 : 0;
  }

  const default_width = (this.opening_.type === 'window' || this.opening_.type === 'glass') ? 48 : 36;
  const width = Math.max(12, Number(this.opening_.width || default_width));
  const center_x = Number(this.opening_.x || 0);
  const center_y = Number(this.opening_.y || 0);

  if (
    this.opening_.points === undefined ||
    Array.isArray(this.opening_.points) !== true ||
    this.opening_.points.length !== 2
  ) {
    this.opening_.points = [
      {
        'x': Math.round(center_x - (width / 2)),
        'y': Math.round(center_y)
      },
      {
        'x': Math.round(center_x + (width / 2)),
        'y': Math.round(center_y)
      }
    ];
  }

  this.update();
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
 * Set center x/y for this opening by translating both points.
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

  const center = this.get_center_();
  const target_x = x === null ? center.x : Number(x || 0);
  const target_y = y === null ? center.y : Number(y || 0);

  const grid_half = this.floor_plan_.get_grid_pixels() / 2;
  const min_point_x = Math.min(Number(this.opening_.points[0].x || 0), Number(this.opening_.points[1].x || 0));
  const max_point_x = Math.max(Number(this.opening_.points[0].x || 0), Number(this.opening_.points[1].x || 0));
  const min_point_y = Math.min(Number(this.opening_.points[0].y || 0), Number(this.opening_.points[1].y || 0));
  const max_point_y = Math.max(Number(this.opening_.points[0].y || 0), Number(this.opening_.points[1].y || 0));

  let dx = target_x - center.x;
  let dy = target_y - center.y;

  dx = Math.max(-grid_half - min_point_x, Math.min(grid_half - max_point_x, dx));
  dy = Math.max(-grid_half - min_point_y, Math.min(grid_half - max_point_y, dy));

  this.opening_.points[0].x = Math.round(Number(this.opening_.points[0].x || 0) + dx);
  this.opening_.points[0].y = Math.round(Number(this.opening_.points[0].y || 0) + dy);
  this.opening_.points[1].x = Math.round(Number(this.opening_.points[1].x || 0) + dx);
  this.opening_.points[1].y = Math.round(Number(this.opening_.points[1].y || 0) + dy);

  this.update();
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
      this.floor_plan_.update_toolbar();
    }
    if (this.state_.active_wall_entity !== undefined) {
      this.state_.active_wall_entity.set_active(false);
      this.floor_plan_.update_toolbar();
    }
    if (this.state_.active_tree_entity !== undefined) {
      this.state_.active_tree_entity.set_active(false);
      this.floor_plan_.update_toolbar();
    }
    if (this.state_.active_surface_entity !== undefined) {
      this.state_.active_surface_entity.set_active(false);
      this.floor_plan_.update_toolbar();
    }
    if (this.state_.active_room_entity !== undefined) {
      this.state_.active_room_entity.set_active(false);
      this.floor_plan_.update_toolbar();
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
      this.update_snap_points_();
      this.bring_to_front_();
    } else {
      delete this.state_.active_opening_entity;
      this.clear_snap_lines_();

      if (this.state_.active_point_entity !== undefined) {
        this.state_.active_point_entity.set_active(false);
      }

      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Get shape-like room proxy used by point entity logic.
 *
 * @return {object}
 */
beestat.component.floor_plan_entity.opening.prototype.get_room = function() {
  return this.opening_;
};

/**
 * Get color by opening type.
 *
 * @return {string}
 */
beestat.component.floor_plan_entity.opening.prototype.get_opening_color_ = function() {
  switch (this.opening_.type) {
  case 'door':
  case 'garage':
    return beestat.style.color.green.base;
  case 'window':
  case 'glass':
    return beestat.style.color.lightblue.light;
  case 'empty':
  default:
    return beestat.style.color.gray.light;
  }
};
