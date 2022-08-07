/**
 * SVG Document
 *
 * @param {number} floor_plan_id The floor_plan_id to show.
 * @param {object} state Shared state.
 */
beestat.component.floor_plan = function(floor_plan_id, state) {
  this.toolbar_buttons_ = {};
  this.floor_plan_id_ = floor_plan_id;

  beestat.component.apply(this, arguments);

  /**
   * Override this component's state with a state common to all floor plan
   * entities.
   */
  this.state_ = state;
};
beestat.extend(beestat.component.floor_plan, beestat.component);

/**
 * Render the SVG document to the parent.
 *
 * @param {rocket.Elements} parent
 *
 * @return {beestat.component.floor_plan} This
 */
beestat.component.floor_plan.prototype.render = function(parent) {
  const self = this;

  this.parent_ = parent;

  this.svg_ = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  this.defs_ = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  this.svg_.appendChild(this.defs_);

  this.g_ = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  this.svg_.appendChild(this.g_);

  this.add_grid_();

  this.width_ = this.state_.floor_plan_width || 800;
  this.height_ = 500;

  this.svg_.setAttribute('width', this.width_);
  this.svg_.setAttribute('height', this.height_);

  this.svg_.style.background = beestat.style.color.bluegray.dark;
  this.svg_.style.userSelect = 'none';

  this.set_zoomable_();
  this.set_draggable_();

  if (this.state_.floor_plan_view_box === undefined) {
    this.view_box_ = {
      'x': 0,
      'y': 0,
      'width': this.width_,
      'height': this.height_
    };
  } else {
    this.view_box_ = this.state_.floor_plan_view_box;
  }
  this.update_view_box_();

  this.toolbar_container_ = $.createElement('div');
  this.toolbar_container_.style({
    'position': 'absolute',
    'top': beestat.style.size.gutter,
    'left': beestat.style.size.gutter + (beestat.style.size.gutter / 2),
    'width': '40px'
  });
  parent.appendChild(this.toolbar_container_);

  this.floors_container_ = $.createElement('div');
  this.floors_container_.style({
    'position': 'absolute',
    'top': beestat.style.size.gutter,
    'left': 40 + beestat.style.size.gutter + (beestat.style.size.gutter / 2)
  });
  parent.appendChild(this.floors_container_);

  this.update_toolbar();

  this.infobox_container_ = $.createElement('div');
  this.infobox_container_.style({
    'position': 'absolute',
    'color': beestat.style.color.gray.base,
    'top': beestat.style.size.gutter,
    'right': beestat.style.size.gutter,
    'line-height': 32,
    'user-select': 'none'
  });
  parent.appendChild(this.infobox_container_);

  this.update_infobox();

  parent.appendChild(this.svg_);

  this.keydown_handler_ = function(e) {
    if (e.target.nodeName === 'BODY') {
      if (e.key === 'Escape') {
        if (self.state_.active_room !== undefined) {
          self.clear_room_();
        }
      } else if (e.key === 'Delete') {
        if (self.state_.active_point !== undefined) {
          self.remove_point_();
        } else if (self.state_.active_room !== undefined) {
          self.remove_room_();
        }
      } else if (e.key.toLowerCase() === 'r') {
        if (e.ctrlKey === false) {
          self.add_room_();
        }
      } else if (e.key.toLowerCase() === 's') {
        self.toggle_snapping_();
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true
      ) {
        self.state_.copied_room = beestat.clone(self.state_.active_room);
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true
      ) {
        if (self.state_.copied_room !== undefined) {
          self.add_room_(self.state_.copied_room);
        }
      } else if (
        e.key.toLowerCase() === 'z' &&
        e.ctrlKey === true
      ) {
        console.log('undo');
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        const entity =
          self.state_.active_point_entity ||
          self.state_.active_wall_entity ||
          self.state_.active_room_entity;

        if (entity !== undefined) {
          const x = entity.get_x();
          const y = entity.get_y();

          switch (e.key) {
          case 'ArrowLeft':
            entity.set_xy(x === null ? null : x - 1, y);
            break;
          case 'ArrowRight':
            entity.set_xy(x === null ? null : x + 1, y);
            break;
          case 'ArrowUp':
            entity.set_xy(x, y === null ? null : y - 1);
            break;
          case 'ArrowDown':
            entity.set_xy(x, y === null ? null : y + 1);
            break;
          }
        }
      }
    }
  };

  window.addEventListener('keydown', this.keydown_handler_);

  this.rendered_ = true;

  return this;
};

/**
 * Update the view box with the current values. Cap so the grid doesn't go out
 * of view.
 */
beestat.component.floor_plan.prototype.update_view_box_ = function() {
  // Cap x/y pan
  const min_x = this.grid_pixels_ / -2;
  const max_x = (this.grid_pixels_ / 2) - (this.width_ * this.get_scale());
  this.view_box_.x = Math.min(Math.max(this.view_box_.x, min_x), max_x);

  const min_y = this.grid_pixels_ / -2;
  const max_y = (this.grid_pixels_ / 2) - (this.height_ * this.get_scale());
  this.view_box_.y = Math.min(Math.max(this.view_box_.y, min_y), max_y);

  this.svg_.setAttribute(
    'viewBox',
    this.view_box_.x + ' ' + this.view_box_.y + ' ' + this.view_box_.width + ' ' + this.view_box_.height
  );

  this.state_.floor_plan_view_box = this.view_box_;
};

/**
 * Add a helpful grid.
 */
beestat.component.floor_plan.prototype.add_grid_ = function() {
  const pixels_per_small_grid = 12;
  const small_grids_per_large_grid = 10;
  const pixels_per_large_grid = pixels_per_small_grid * small_grids_per_large_grid;

  const large_grid_repeat = 100;
  this.grid_pixels_ = pixels_per_large_grid * large_grid_repeat;

  const grid_small_pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  grid_small_pattern.setAttribute('id', 'grid_small');
  grid_small_pattern.setAttribute('width', pixels_per_small_grid);
  grid_small_pattern.setAttribute('height', pixels_per_small_grid);
  grid_small_pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  this.defs_.appendChild(grid_small_pattern);

  const grid_small_path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  grid_small_path.setAttribute('d', 'M ' + pixels_per_small_grid + ' 0 L 0 0 0 ' + pixels_per_small_grid);
  grid_small_path.setAttribute('fill', 'none');
  grid_small_path.setAttribute('stroke', beestat.style.color.bluegreen.dark);
  grid_small_path.setAttribute('stroke-width', '0.5');
  grid_small_pattern.appendChild(grid_small_path);

  const grid_large_pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  grid_large_pattern.setAttribute('id', 'grid_large');
  grid_large_pattern.setAttribute('width', pixels_per_large_grid);
  grid_large_pattern.setAttribute('height', pixels_per_large_grid);
  grid_large_pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  this.defs_.appendChild(grid_large_pattern);

  const grid_large_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  grid_large_rect.setAttribute('width', pixels_per_large_grid);
  grid_large_rect.setAttribute('height', pixels_per_large_grid);
  grid_large_rect.setAttribute('fill', 'url("#grid_small")');
  grid_large_pattern.appendChild(grid_large_rect);

  const grid_large_path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  grid_large_path.setAttribute('d', 'M ' + pixels_per_large_grid + ' 0 L 0 0 0 ' + pixels_per_large_grid);
  grid_large_path.setAttribute('fill', 'none');
  grid_large_path.setAttribute('stroke', beestat.style.color.bluegreen.dark);
  grid_large_path.setAttribute('stroke-width', '1');
  grid_large_pattern.appendChild(grid_large_path);

  const grid_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  grid_rect.setAttribute('x', this.grid_pixels_ / -2);
  grid_rect.setAttribute('y', this.grid_pixels_ / -2);
  grid_rect.setAttribute('width', this.grid_pixels_);
  grid_rect.setAttribute('height', this.grid_pixels_);
  grid_rect.setAttribute('fill', 'url("#grid_large")');
  this.g_.appendChild(grid_rect);
};

/**
 * Make the SVG document zoomable.
 */
beestat.component.floor_plan.prototype.set_zoomable_ = function() {
  const self = this;

  this.wheel_handler_ = function(e) {
    if (
      e.ctrlKey === true &&
      self.parent_[0].contains(e.target)
    ) {
      e.preventDefault();

      if (e.wheelDelta < 0) {
        self.zoom_out_(e);
      } else {
        self.zoom_in_(e);
      }
    }
  };

  window.addEventListener('wheel', this.wheel_handler_, {'passive': false});
};

/**
 * Make the SVG document draggabe.
 */
beestat.component.floor_plan.prototype.set_draggable_ = function() {
  const self = this;

  const mousedown_handler = function(e) {
    // Prevent things underneath from also dragging.
    e.stopPropagation();

    self.drag_start_mouse_ = {
      'x': e.clientX,
      'y': e.clientY
    };

    self.drag_start_pan_ = {
      'x': self.view_box_.x,
      'y': self.view_box_.y
    };

    self.dragging_ = true;
  };

  this.mousemove_handler_ = function(e) {
    if (self.dragging_ === true) {
      const dx = (e.clientX - self.drag_start_mouse_.x);
      const dy = (e.clientY - self.drag_start_mouse_.y);
      self.view_box_.x = self.drag_start_pan_.x - (dx * self.get_scale());
      self.view_box_.y = self.drag_start_pan_.y - (dy * self.get_scale());
      self.update_view_box_();
    }
  };

  this.mouseup_handler_ = function(e) {
    // Deselect when clicking on the background.
    if (
      self.parent_.contains(e.target) &&
      self.drag_start_mouse_ !== undefined &&
      e.clientX === self.drag_start_mouse_.x &&
      e.clientY === self.drag_start_mouse_.y
    ) {
      self.clear_room_();
    }

    self.dragging_ = false;
  };

  this.svg_.addEventListener('mousedown', mousedown_handler.bind(this));

  window.addEventListener('mousemove', this.mousemove_handler_);
  window.addEventListener('mouseup', this.mouseup_handler_);
};

/**
 * Get the root group so other things can put stuff here.
 *
 * @return {SVGGElement} The root group.
 */
beestat.component.floor_plan.prototype.get_g = function() {
  return this.g_;
};

/**
 * Get the scale.
 *
 * @return {SVGGElement} The scale.
 */
beestat.component.floor_plan.prototype.get_scale = function() {
  return this.view_box_.width / this.width_;
};

/**
 * Get the grid pixels.
 *
 * @return {SVGGElement} The scale.
 */
beestat.component.floor_plan.prototype.get_grid_pixels = function() {
  return this.grid_pixels_;
};

/**
 * Convert from screen (global) coordinates to svg (local) coordinates.
 *
 * @param {Event} e
 *
 * @return {SVGPoint} A point in the SVG local coordinate space.
 */
beestat.component.floor_plan.prototype.get_local_point = function(e) {
  const global_point = this.svg_.createSVGPoint();
  global_point.x = e.clientX;
  global_point.y = e.clientY;

  return global_point.matrixTransform(
    this.svg_.getScreenCTM().inverse()
  );
};

/**
 * Remove this component from the page.
 */
beestat.component.floor_plan.prototype.dispose = function() {
  if (this.rendered_ === true) {
    window.removeEventListener('keydown', this.keydown_handler_);
    window.removeEventListener('wheel', this.wheel_handler_);
    window.removeEventListener('mousemove', this.mousemove_handler_);
    window.removeEventListener('mouseup', this.mouseup_handler_);
    this.rendered_ = false;
  }
};

/**
 * Update the toolbar to match the current state.
 */
beestat.component.floor_plan.prototype.update_toolbar = function() {
  const self = this;

  if (this.button_group_ !== undefined) {
    this.button_group_.dispose();
  }

  if (this.button_group_floors_ !== undefined) {
    this.button_group_floors_.dispose();
  }

  this.button_group_ = new beestat.component.tile_group();

  // Add floor
  this.button_group_.add_button(new beestat.component.tile()
    .set_icon('layers')
    .set_text_color(beestat.style.color.lightblue.base)
  );

  // Add room
  this.button_group_.add_button(new beestat.component.tile()
    .set_icon('card_plus_outline')
    .set_title('Add Room [R]')
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function() {
      self.add_room_();
    })
  );

  // Remove room
  const remove_room_button = new beestat.component.tile()
    .set_icon('card_remove_outline')
    .set_title('Remove Room [Delete]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.button_group_.add_button(remove_room_button);

  if (this.state_.active_room !== undefined) {
    remove_room_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.red.base)
      .addEventListener('click', this.remove_room_.bind(this));
  } else {
    remove_room_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Add point
  const add_point_button = new beestat.component.tile()
    .set_icon('vector_square_plus')
    .set_title('Add Point [Double click]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.button_group_.add_button(add_point_button);

  if (this.state_.active_wall_entity !== undefined) {
    add_point_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.gray.light)
      .addEventListener('click', this.add_point_.bind(this));
  } else {
    add_point_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Remove point
  const remove_point_button = new beestat.component.tile()
    .set_background_color(beestat.style.color.bluegray.base)
    .set_title('Remove Point [Delete]')
    .set_icon('vector_square_remove');
  this.button_group_.add_button(remove_point_button);

  if (
    this.state_.active_point !== undefined &&
    this.state_.active_room.points.length > 3
  ) {
    remove_point_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.red.base)
      .addEventListener('click', this.remove_point_.bind(this));
  } else {
    remove_point_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Toggle snap to grid
  let snapping_icon;
  let snapping_title;
  if (this.state_.snapping === true) {
    snapping_icon = 'grid';
    snapping_title = 'Disable Snapping [S]';
  } else {
    snapping_icon = 'grid_off';
    snapping_title = 'Enable Snapping [S]';
  }

  this.button_group_.add_button(new beestat.component.tile()
    .set_icon(snapping_icon)
    .set_title(snapping_title)
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', this.toggle_snapping_.bind(this))
  );

  // Zoom in
  const zoom_in_button = new beestat.component.tile()
    .set_icon('magnify_plus_outline')
    .set_title('Zoom In')
    .set_background_color(beestat.style.color.bluegray.base);
  this.button_group_.add_button(zoom_in_button);

  if (
    this.can_zoom_in_() === true
  ) {
    zoom_in_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.gray.light)
      .addEventListener('click', function() {
        self.zoom_in_();
      });
  } else {
    zoom_in_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Zoom out
  const zoom_out_button = new beestat.component.tile()
    .set_icon('magnify_minus_outline')
    .set_title('Zoom out')
    .set_background_color(beestat.style.color.bluegray.base);
  this.button_group_.add_button(zoom_out_button);

  if (
    this.can_zoom_out_() === true
  ) {
    zoom_out_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.gray.light)
      .addEventListener('click', function() {
        self.zoom_out_();
      });
  } else {
    zoom_out_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Render
  this.button_group_.render(this.toolbar_container_);

  // FLOORS
  this.button_group_floors_ = new beestat.component.tile_group();

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const sorted_groups = Object.values(floor_plan.data.groups)
    .sort(function(a, b) {
      return a.elevation > b.elevation;
    });

  let icon_number = 1;
  sorted_groups.forEach(function(group) {
    const button = new beestat.component.tile()
      .set_title(group.name)
      .set_text_hover_color(beestat.style.color.lightblue.light)
      .set_text_color(beestat.style.color.lightblue.base);

    let icon;
    if (group.elevation < 0) {
      icon = 'alpha_b';
    } else {
      icon = 'numeric_' + icon_number++;
    }

    if (group === self.state_.active_group) {
      button
        .set_icon(icon + '_box');
    } else {
      button
        .set_icon(icon)
        .addEventListener('click', function() {
          if (self.state_.active_room_entity !== undefined) {
            self.state_.active_room_entity.set_active(false);
          }
          if (self.state_.active_wall_entity !== undefined) {
            self.state_.active_wall_entity.set_active(false);
          }
          if (self.state_.active_point_entity !== undefined) {
            self.state_.active_point_entity.set_active(false);
          }

          self.state_.active_group = group;
          self.dispatchEvent('change_group');
        });
    }

    self.button_group_floors_.add_button(button);
  });

  this.button_group_floors_.render(this.floors_container_);
};

/**
 * Update the infobox to match the current state.
 */
beestat.component.floor_plan.prototype.update_infobox = function() {
  const parts = [];
  if (this.state_.active_room !== undefined) {
    parts.push(this.state_.active_room.name || 'Unnamed Room');
    parts.push(
      beestat.floor_plan.get_area_room(this.state_.active_room)
        .toLocaleString() + ' sqft'
    );
  } else {
    parts.push(this.state_.active_group.name || 'Unnamed Floor');
    parts.push(
      beestat.floor_plan.get_area_group(this.state_.active_group)
        .toLocaleString() + ' sqft'
    );
  }
  this.infobox_container_.innerText(parts.join(' • '));
};

/**
 * Toggle snapping.
 */
beestat.component.floor_plan.prototype.toggle_snapping_ = function() {
  this.state_.snapping = !this.state_.snapping;
  this.update_toolbar();
};

/**
 * Add a new room.
 *
 * @param {object} room Optional room to copy from.
 */
beestat.component.floor_plan.prototype.add_room_ = function(room) {
  const svg_view_box = this.view_box_;

  let new_room;
  if (room === undefined) {
    const new_room_size = 120;
    new_room = {
      'x': svg_view_box.x + (svg_view_box.width / 2) - (new_room_size / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - (new_room_size / 2),
      'points': [
        {
          'x': 0,
          'y': 0
        },
        {
          'x': new_room_size,
          'y': 0
        },
        {
          'x': new_room_size,
          'y': new_room_size
        },
        {
          'x': 0,
          'y': new_room_size
        }
      ]
    };
  } else {
    let min_x = Infinity;
    let max_x = -Infinity;
    let min_y = Infinity;
    let max_y = -Infinity;

    room.points.forEach(function(point) {
      min_x = Math.min(room.x + point.x, min_x);
      max_x = Math.max(room.x + point.x, max_x);
      min_y = Math.min(room.y + point.y, min_y);
      max_y = Math.max(room.y + point.y, max_y);
    });

    new_room = {
      'x': svg_view_box.x + (svg_view_box.width / 2) - ((max_x - min_x) / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - ((max_y - min_y) / 2),
      'points': beestat.clone(room.points)
    };
  }

  this.state_.active_group.rooms.push(new_room);
  this.state_.active_room = new_room;

  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }

  this.dispatchEvent('add_room');
};

/**
 * Remove the currently active room.
 */
beestat.component.floor_plan.prototype.remove_room_ = function() {
  const self = this;

  const index = this.state_.active_group.rooms.findIndex(function(active_room) {
    return active_room === self.state_.active_room;
  });

  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.set_active(false);
  }
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
  }
  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }

  this.state_.active_group.rooms.splice(index, 1);
  this.dispatchEvent('remove_room');
};

/**
 * Clear the currently active room.
 */
beestat.component.floor_plan.prototype.clear_room_ = function() {
  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.set_active(false);
  }
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
  }
  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }
  this.dispatchEvent('clear_room');
};

/**
 * Remove the currently active point.
 */
beestat.component.floor_plan.prototype.remove_point_ = function() {
  if (this.state_.active_room.points.length > 3) {
    for (let i = 0; i < this.state_.active_room.points.length; i++) {
      if (this.state_.active_point === this.state_.active_room.points[i]) {
        this.state_.active_room.points.splice(i, 1);
        if (this.state_.active_point_entity !== undefined) {
          this.state_.active_point_entity.set_active(false);
        }
        this.dispatchEvent('remove_point');
        break;
      }
    }
  }
};

/**
 * Add a new point to the active wall.
 */
beestat.component.floor_plan.prototype.add_point_ = function() {
  this.state_.active_wall_entity.add_point();
};

/**
 * Set the width of this component. Also updates the view box to the
 * appropriate values according to the current zoom.
 *
 * @param {number} width
 */
beestat.component.floor_plan.prototype.set_width = function(width) {
  this.view_box_.width = this.view_box_.width * width / this.width_;
  this.width_ = width;
  this.svg_.setAttribute('width', width);
  this.update_view_box_();
  this.state_.floor_plan_width = width;
};

/**
 * Zoom
 *
 * @param {number} scale_delta
 * @param {Event} e
 */
beestat.component.floor_plan.prototype.zoom_ = function(scale_delta, e) {
  let local_point;
  if (e === undefined) {
    local_point = {
      'x': this.width_ / 2,
      'y': this.height_ / 2
    };
  } else {
    local_point = this.get_local_point(e);
  }

  this.view_box_.x -= (local_point.x - this.view_box_.x) * (scale_delta - 1);
  this.view_box_.y -= (local_point.y - this.view_box_.y) * (scale_delta - 1);
  this.view_box_.width *= scale_delta;
  this.view_box_.height *= scale_delta;

  this.update_view_box_();
  this.update_toolbar();

  this.dispatchEvent('zoom');
};

/**
 * Reset the view box
 */
beestat.component.floor_plan.prototype.reset_view_box_ = function() {
  this.view_box_ = {
    'x': 0,
    'y': 0,
    'width': this.width_,
    'height': this.height_
  };
  this.update_view_box_();
};

/**
 * Zoom in
 *
 * @param {Event} e Optional event when zooming to a specific mouse position.
 */
beestat.component.floor_plan.prototype.zoom_in_ = function(e) {
  if (this.can_zoom_in_() === true) {
    this.zoom_(0.9, e);
  }
};

/**
 * Zoom out
 *
 * @param {Event} e Optional event when zooming to a specific mouse position.
 */
beestat.component.floor_plan.prototype.zoom_out_ = function(e) {
  if (this.can_zoom_out_() === true) {
    this.zoom_(1.1, e);
  }
};

/**
 * Whether or not you can zoom in.
 *
 * @return {boolean} Whether or not you can zoom in.
 */
beestat.component.floor_plan.prototype.can_zoom_in_ = function() {
  const min_width = this.width_ / 4;
  const min_height = this.height_ / 4;

  if (
    this.view_box_.width * 0.9 < min_width ||
    this.view_box_.height * 0.9 < min_height
  ) {
    return false;
  }

  return true;
};

/**
 * Whether or not you can zoom out
 *
 * @return {boolean} Whether or not you can zoom in.
 */
beestat.component.floor_plan.prototype.can_zoom_out_ = function() {
  const max_width = this.width_ * 3;
  const max_height = this.height_ * 3;

  if (
    this.view_box_.width * 1.1 > max_width ||
    this.view_box_.height * 1.1 > max_height
  ) {
    return false;
  }

  return true;
};

/**
 * Get the group below the specified one.
 *
 * @param {object} group The current group.
 *
 * @return {object} The group below the current group.
 */
beestat.component.floor_plan.prototype.get_group_below = function(group) {
  let closest_group;
  let closest_elevation_diff = Infinity;

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  floor_plan.data.groups.forEach(function(other_group) {
    if (
      other_group.elevation < group.elevation &&
      group.elevation - other_group.elevation < closest_elevation_diff
    ) {
      closest_elevation_diff = group.elevation - other_group.elevation;
      closest_group = other_group;
    }
  });

  return closest_group;
};

/**
 * Center the view box on the content. Sets zoom and pan.
 */
beestat.component.floor_plan.prototype.center_content = function() {
  window.fp = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  let has_content = false;
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      room.points.forEach(function(point) {
        has_content = true;
        min_x = Math.min(room.x + point.x, min_x);
        max_x = Math.max(room.x + point.x, max_x);
        min_y = Math.min(room.y + point.y, min_y);
        max_y = Math.max(room.y + point.y, max_y);
      });
    });
  });

  this.reset_view_box_();
  if (has_content === true) {
    const width = (max_x - min_x) + 50;
    const height = (max_y - min_y) + 50;
    while (
      (
        this.view_box_.width < width ||
        this.view_box_.height < height
      ) &&
      this.can_zoom_out_() === true
    ) {
      this.zoom_out_();
    }

    const center_x = (max_x + min_x) / 2;
    const center_y = (max_y + min_y) / 2;

    this.view_box_.x = center_x - (this.view_box_.width / 2);
    this.view_box_.y = center_y - (this.view_box_.height / 2);

    this.update_view_box_();
  }
};
