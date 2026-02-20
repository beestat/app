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
 * Whether current user has early access.
 *
 * @return {boolean}
 */
beestat.component.floor_plan.prototype.has_early_access_ = function() {
  return beestat.user.has_early_access() === true;
};

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
  this.svg_.style.touchAction = 'none';

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
  const toolbar_left = beestat.style.size.gutter;
  const toolbar_column_width = 40;
  const toolbar_column_gap = beestat.style.size.gutter / 2;
  this.toolbar_container_.style({
    'position': 'absolute',
    'top': beestat.style.size.gutter,
    'left': toolbar_left,
    'width': '40px'
  });
  parent.appendChild(this.toolbar_container_);

  this.toolbar_container_secondary_ = $.createElement('div');
  this.toolbar_container_secondary_.style({
    'position': 'absolute',
    'top': beestat.style.size.gutter,
    'left': toolbar_left + toolbar_column_width + toolbar_column_gap,
    'width': '40px'
  });
  parent.appendChild(this.toolbar_container_secondary_);

  if (this.state_.show_layers_sidebar !== true) {
    this.floors_container_ = $.createElement('div');
    this.floors_container_.style({
      'position': 'absolute',
      'top': beestat.style.size.gutter,
      'left': beestat.style.size.gutter * 4
    });
    parent.appendChild(this.floors_container_);
  }

  this.update_toolbar();

  if (this.state_.show_layers_sidebar !== true) {
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
  }

  this.update_infobox();

  parent.appendChild(this.svg_);

  this.keydown_handler_ = function(e) {
    if (e.target.nodeName === 'BODY') {
      if (e.key === 'Escape') {
        if (
          self.state_.active_room_entity !== undefined ||
          self.state_.active_surface_entity !== undefined ||
          self.state_.active_tree_entity !== undefined ||
          self.state_.active_opening_entity !== undefined ||
          self.state_.active_light_source_entity !== undefined
        ) {
          self.clear_room_();
        }
      } else if (e.key === 'Delete') {
        if (self.state_.active_point_entity !== undefined) {
          self.remove_point_();
        } else {
          self.remove_active_entity_();
        }
      } else if (e.key.toLowerCase() === 'r') {
        if (e.ctrlKey === false) {
          self.add_room_();
        }
      } else if (e.key.toLowerCase() === 'f') {
        if (e.ctrlKey === false && self.has_early_access_() === true) {
          self.add_surface_();
        }
      } else if (e.key.toLowerCase() === 't') {
        if (e.ctrlKey === false && self.has_early_access_() === true) {
          self.add_tree_();
        }
      } else if (e.key.toLowerCase() === 'o') {
        if (e.ctrlKey === false && self.has_early_access_() === true) {
          self.add_opening_();
        }
      } else if (e.key.toLowerCase() === 'l') {
        if (e.ctrlKey === false && self.has_early_access_() === true) {
          self.add_light_source_();
        }
      } else if (e.key.toLowerCase() === 's') {
        self.toggle_snapping_();
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true &&
        self.has_early_access_() === true &&
        self.state_.active_surface_entity !== undefined
      ) {
        self.state_.copied_object = {
          'type': 'surface',
          'data': beestat.clone(self.state_.active_surface_entity.get_surface())
        };
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true &&
        self.state_.active_room_entity !== undefined
      ) {
        self.state_.copied_object = {
          'type': 'room',
          'data': beestat.clone(self.state_.active_room_entity.get_room())
        };
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true &&
        self.has_early_access_() === true &&
        self.state_.active_tree_entity !== undefined
      ) {
        self.state_.copied_object = {
          'type': 'tree',
          'data': beestat.clone(self.state_.active_tree_entity.get_tree())
        };
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true &&
        self.state_.active_opening_entity !== undefined
      ) {
        self.state_.copied_object = {
          'type': 'opening',
          'data': beestat.clone(self.state_.active_opening_entity.get_opening())
        };
      } else if (
        e.key.toLowerCase() === 'c' &&
        e.ctrlKey === true &&
        self.state_.active_light_source_entity !== undefined
      ) {
        self.state_.copied_object = {
          'type': 'light_source',
          'data': beestat.clone(self.state_.active_light_source_entity.get_light_source())
        };
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true &&
        self.has_early_access_() === true &&
        self.state_.copied_object !== undefined &&
        self.state_.copied_object.type === 'surface'
      ) {
        self.add_surface_(self.state_.copied_object.data);
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true &&
        self.has_early_access_() === true &&
        self.state_.copied_object !== undefined &&
        self.state_.copied_object.type === 'tree'
      ) {
        self.add_tree_(self.state_.copied_object.data);
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true &&
        self.state_.copied_object !== undefined &&
        self.state_.copied_object.type === 'room'
      ) {
        self.add_room_(self.state_.copied_object.data);
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true &&
        self.state_.copied_object !== undefined &&
        self.state_.copied_object.type === 'opening'
      ) {
        self.add_opening_(self.state_.copied_object.data);
      } else if (
        e.key.toLowerCase() === 'v' &&
        e.ctrlKey === true &&
        self.state_.copied_object !== undefined &&
        self.state_.copied_object.type === 'light_source'
      ) {
        self.add_light_source_(self.state_.copied_object.data);
      } else if (
        e.key.toLowerCase() === 'z' &&
        e.ctrlKey === true
      ) {
        self.undo_();
      } else if (
        e.key.toLowerCase() === 'y' &&
        e.ctrlKey === true
      ) {
        self.redo_();
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        const entity =
          self.state_.active_point_entity ||
          self.state_.active_wall_entity ||
          self.state_.active_opening_entity ||
          self.state_.active_light_source_entity ||
          self.state_.active_surface_entity ||
          self.state_.active_room_entity ||
          self.state_.active_tree_entity;

        if (entity !== undefined) {
          let x = entity.get_x();
          let y = entity.get_y();
          if (
            self.state_.active_opening_entity !== undefined &&
            entity === self.state_.active_opening_entity &&
            typeof entity.get_center_ === 'function'
          ) {
            const opening_center = entity.get_center_();
            x = opening_center.x;
            y = opening_center.y;
          }

          switch (e.key) {
          case 'ArrowLeft':
            entity.set_xy(x === null ? null : x - 1, y, 'update');
            break;
          case 'ArrowRight':
            entity.set_xy(x === null ? null : x + 1, y, 'update');
            break;
          case 'ArrowUp':
            entity.set_xy(x, y === null ? null : y - 1, 'update');
            break;
          case 'ArrowDown':
            entity.set_xy(x, y === null ? null : y + 1, 'update');
            break;
          }

          e.preventDefault();
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
      'x': e.clientX || e.touches[0].clientX,
      'y': e.clientY || e.touches[0].clientY
    };

    self.drag_start_pan_ = {
      'x': self.view_box_.x,
      'y': self.view_box_.y
    };

    self.dragging_ = true;
  };

  this.mousemove_handler_ = function(e) {
    if (self.dragging_ === true) {
      const dx = ((e.clientX || e.touches[0].clientX) - self.drag_start_mouse_.x);
      const dy = ((e.clientY || e.touches[0].clientY) - self.drag_start_mouse_.y);
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
  this.svg_.addEventListener('touchstart', mousedown_handler.bind(this));

  window.addEventListener('mousemove', this.mousemove_handler_);
  window.addEventListener('touchmove', this.mousemove_handler_);

  window.addEventListener('mouseup', this.mouseup_handler_);
  window.addEventListener('touchend', this.mouseup_handler_);
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
    window.removeEventListener('touchmove', this.mousemove_handler_);
    window.removeEventListener('mouseup', this.mouseup_handler_);
    window.removeEventListener('touchend', this.mouseup_handler_);
    this.rendered_ = false;
  }
};

/**
 * Update the toolbar to match the current state.
 */
beestat.component.floor_plan.prototype.update_toolbar = function() {
  const self = this;
  const tree_group = this.get_tree_group_();

  if (this.tile_group_ !== undefined) {
    this.tile_group_.dispose();
  }

  if (this.tile_group_floors_ !== undefined) {
    this.tile_group_floors_.dispose();
  }
  if (this.tile_group_secondary_ !== undefined) {
    this.tile_group_secondary_.dispose();
  }

  this.tile_group_ = new beestat.component.tile_group();
  this.tile_group_secondary_ = new beestat.component.tile_group();

  // Add room
  this.tile_group_.add_tile(new beestat.component.tile()
    .set_icon('view_quilt')
    .set_title('Add Room [R]')
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function() {
      self.add_room_();
    })
  );

  if (this.has_early_access_() === true) {
    // Add opening
    this.tile_group_.add_tile(new beestat.component.tile()
      .set_icon('window_closed_variant')
      .set_title('Add Opening [O]')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        self.add_opening_();
      })
    );

    // Add surface
    this.tile_group_.add_tile(new beestat.component.tile()
      .set_icon('texture_box')
      .set_title('Add Surface [F]')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        self.add_surface_();
      })
    );

    // Add window (placeholder - no action yet)
    // this.tile_group_.add_tile(new beestat.component.tile()
    //   .set_icon('window_closed_variant')
    //   .set_title('Add Window')
    //   .set_text_color(beestat.style.color.gray.light)
    //   .set_background_color(beestat.style.color.bluegray.base)
    //   .set_background_hover_color(beestat.style.color.bluegray.light)
    // );

    // Add tree (first floor only)
    const add_tree_button = new beestat.component.tile()
      .set_icon('tree')
      .set_title('Add Tree [T]')
      .set_background_color(beestat.style.color.bluegray.base);
    this.tile_group_.add_tile(add_tree_button);

    if (this.state_.active_group === tree_group) {
      add_tree_button
        .set_background_hover_color(beestat.style.color.bluegray.light)
        .set_text_color(beestat.style.color.gray.light)
        .addEventListener('click', this.add_tree_.bind(this));
    } else {
      add_tree_button
        .set_text_color(beestat.style.color.bluegray.dark);
    }

    // Add light source
    this.tile_group_.add_tile(new beestat.component.tile()
      .set_icon('lightbulb_on')
      .set_title('Add Light Source [L]')
      .set_text_color(beestat.style.color.gray.light)
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        self.add_light_source_();
      })
    );
  }

  // Remove selected room, opening, surface, or tree
  const remove_button = new beestat.component.tile()
    .set_icon('card_remove_outline')
    .set_title('Remove [Delete]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.tile_group_.add_tile(remove_button);

  if (
    this.state_.active_room_entity !== undefined ||
    this.state_.active_opening_entity !== undefined ||
    this.state_.active_surface_entity !== undefined ||
    this.state_.active_tree_entity !== undefined ||
    this.state_.active_light_source_entity !== undefined
  ) {
    remove_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.red.base)
      .addEventListener('click', this.remove_active_entity_.bind(this));
  } else {
    remove_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Add point
  const add_point_button = new beestat.component.tile()
    .set_icon('vector_square_plus')
    .set_title('Add Point [Double click]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.tile_group_.add_tile(add_point_button);

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
  this.tile_group_.add_tile(remove_point_button);

  if (
    this.state_.active_point_entity !== undefined &&
    this.get_active_shape_entity_() !== undefined &&
    this.get_active_shape_entity_().get_room().points.length > 3
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

  this.tile_group_.add_tile(new beestat.component.tile()
    .set_icon(snapping_icon)
    .set_title(snapping_title)
    .set_text_color(beestat.style.color.gray.light)
    .set_background_color(beestat.style.color.bluegray.base)
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', this.toggle_snapping_.bind(this))
  );

  // Undo
  const undo_button = new beestat.component.tile()
    .set_icon('undo')
    .set_title('Undo [Ctrl+Z]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.tile_group_secondary_.add_tile(undo_button);

  if (
    this.can_undo_() === true
  ) {
    undo_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.gray.light)
      .addEventListener('click', function() {
        self.undo_();
      });
  } else {
    undo_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Redo
  const redo_button = new beestat.component.tile()
    .set_icon('redo')
    .set_title('Redo [Ctrl+Y]')
    .set_background_color(beestat.style.color.bluegray.base);
  this.tile_group_secondary_.add_tile(redo_button);

  if (
    this.can_redo_() === true
  ) {
    redo_button
      .set_background_hover_color(beestat.style.color.bluegray.light)
      .set_text_color(beestat.style.color.gray.light)
      .addEventListener('click', function() {
        self.redo_();
      });
  } else {
    redo_button
      .set_text_color(beestat.style.color.bluegray.dark);
  }

  // Zoom in
  const zoom_in_button = new beestat.component.tile()
    .set_icon('magnify_plus_outline')
    .set_title('Zoom In')
    .set_background_color(beestat.style.color.bluegray.base);
  this.tile_group_secondary_.add_tile(zoom_in_button);

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
  this.tile_group_secondary_.add_tile(zoom_out_button);

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
  this.tile_group_.render(this.toolbar_container_);
  this.tile_group_secondary_.render(this.toolbar_container_secondary_);

  // FLOORS
  if (this.floors_container_ !== undefined) {
    this.tile_group_floors_ = new beestat.component.tile_group();

    const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

    const sorted_groups = Object.values(floor_plan.data.groups)
      .sort(function(a, b) {
        return a.elevation > b.elevation;
      });

    let icon_number = 1;
    sorted_groups.forEach(function(group) {
      const button = new beestat.component.tile()
        .set_title(group.name)
        .set_shadow(false)
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
            self.set_active_group(group);
          });
      }

      self.tile_group_floors_.add_tile(button);
    });

    this.tile_group_floors_.render(this.floors_container_);
  }
};

/**
 * Update the infobox to match the current state.
 */
beestat.component.floor_plan.prototype.update_infobox = function() {
  if (this.infobox_container_ === undefined) {
    return;
  }

  const parts = [];
  if (this.state_.active_tree_entity !== undefined) {
    const tree = this.state_.active_tree_entity.get_tree();
    parts.push('Tree');
    parts.push(
      beestat.distance({
        'distance': tree.diameter || 0,
        'units': true,
        'round': 0
      }) + ' dia'
    );
  } else if (this.state_.active_surface_entity !== undefined) {
    parts.push('Surface');
    parts.push(
      beestat.area({
        'input_area_unit': 'in²',
        'area': beestat.floor_plan.get_area_room(this.state_.active_surface_entity.get_surface()),
        'round': 0,
        'units': true
      })
    );
  } else if (this.state_.active_room_entity !== undefined) {
    parts.push(this.state_.active_room_entity.get_room().name || 'Unnamed Room');
    parts.push(
      beestat.area({
        'input_area_unit': 'in²',
        'area': beestat.floor_plan.get_area_room(this.state_.active_room_entity.get_room()),
        'round': 0,
        'units': true
      })
    );
  } else if (this.state_.active_opening_entity !== undefined) {
    const opening = this.state_.active_opening_entity.get_opening();
    const opening_width = this.get_opening_width_(opening);
    parts.push('Opening');
    parts.push((opening.type || 'empty').toUpperCase());
    parts.push(
      beestat.distance({
        'distance': opening_width,
        'units': true,
        'round': 0
      }) + ' w'
    );
  } else if (this.state_.active_light_source_entity !== undefined) {
    parts.push('Light Source');
  } else {
    parts.push(this.state_.active_group.name || 'Unnamed Floor');
    parts.push(
      beestat.area({
        'input_area_unit': 'in²',
        'area': beestat.floor_plan.get_area_group(this.state_.active_group),
        'round': 0,
        'units': true
      })
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
 * Add a new surface.
 *
 * @param {object} surface Optional surface to copy from.
 */
beestat.component.floor_plan.prototype.add_surface_ = function(surface) {
  if (this.has_early_access_() !== true) {
    return;
  }

  const default_surface_color = '#9a9a96';
  this.save_buffer();

  if (this.state_.active_group.surfaces === undefined) {
    this.state_.active_group.surfaces = [];
  }

  const svg_view_box = this.view_box_;

  let new_surface;
  if (surface === undefined) {
    const new_surface_size = 120;
    new_surface = {
      'surface_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2) - (new_surface_size / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - (new_surface_size / 2),
      'color': default_surface_color,
      'height': 0,
      'editor_hidden': false,
      'editor_locked': false,
      'points': [
        {
          'x': 0,
          'y': 0
        },
        {
          'x': new_surface_size,
          'y': 0
        },
        {
          'x': new_surface_size,
          'y': new_surface_size
        },
        {
          'x': 0,
          'y': new_surface_size
        }
      ]
    };
  } else {
    let min_x = Infinity;
    let max_x = -Infinity;
    let min_y = Infinity;
    let max_y = -Infinity;

    surface.points.forEach(function(point) {
      min_x = Math.min(surface.x + point.x, min_x);
      max_x = Math.max(surface.x + point.x, max_x);
      min_y = Math.min(surface.y + point.y, min_y);
      max_y = Math.max(surface.y + point.y, max_y);
    });

    new_surface = {
      'surface_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2) - ((max_x - min_x) / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - ((max_y - min_y) / 2),
      'color': surface.color || default_surface_color,
      'height': surface.height || 0,
      'editor_hidden': false,
      'editor_locked': false,
      'points': beestat.clone(surface.points)
    };
  }

  this.state_.active_group.surfaces.unshift(new_surface);
  new beestat.component.floor_plan_entity.surface(this, this.state_)
    .set_surface(new_surface)
    .set_group(this.state_.active_group)
    .set_active(true);

  this.dispatchEvent('add_surface');
};

/**
 * Add a new room.
 *
 * @param {object} room Optional room to copy from.
 */
beestat.component.floor_plan.prototype.add_room_ = function(room) {
  this.save_buffer();

  const svg_view_box = this.view_box_;

  let new_room;
  if (room === undefined) {
    const new_room_size = 120;
    new_room = {
      'room_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2) - (new_room_size / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - (new_room_size / 2),
      'editor_hidden': false,
      'editor_locked': false,
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
      'room_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2) - ((max_x - min_x) / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2) - ((max_y - min_y) / 2),
      'editor_hidden': false,
      'editor_locked': false,
      'points': beestat.clone(room.points)
    };
  }

  this.state_.active_group.rooms.unshift(new_room);
  new beestat.component.floor_plan_entity.room(this, this.state_)
    .set_room(new_room)
    .set_group(this.state_.active_group)
    .set_active(true);

  this.dispatchEvent('add_room');
};

/**
 * Remove the currently active room.
 */
beestat.component.floor_plan.prototype.remove_room_ = function() {
  this.save_buffer();

  const old_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
    beestat.setting('visualize.floor_plan_id')
  ));

  const self = this;

  const index = this.state_.active_group.rooms.findIndex(function(room) {
    return room === self.state_.active_room_entity.get_room();
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

  const new_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
    beestat.setting('visualize.floor_plan_id')
  ));

  // Delete data if the overall sensor set changes so it's re-fetched.
  if (old_sensor_ids.sort().join(' ') !== new_sensor_ids.sort().join(' ')) {
    beestat.cache.delete('data.three_d__runtime_sensor');
  }

  this.dispatchEvent('remove_room');
};

/**
 * Remove the currently active selectable entity (surface, room, opening, or tree).
 */
beestat.component.floor_plan.prototype.remove_active_entity_ = function() {
  if (this.state_.active_light_source_entity !== undefined) {
    this.remove_light_source_();
    return;
  }

  if (this.state_.active_opening_entity !== undefined) {
    this.remove_opening_();
    return;
  }

  if (this.state_.active_surface_entity !== undefined) {
    this.remove_surface_();
    return;
  }

  if (this.state_.active_room_entity !== undefined) {
    this.remove_room_();
    return;
  }

  if (this.state_.active_tree_entity !== undefined) {
    this.remove_tree_();
  }
};

/**
 * Set the active group and clear active entities.
 *
 * @param {object} group
 *
 * @return {beestat.component.floor_plan} This.
 */
beestat.component.floor_plan.prototype.set_active_group = function(group) {
  if (group === undefined || this.state_.active_group === group) {
    return this;
  }

  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.set_active(false);
  }
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
  }
  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }
  if (this.state_.active_surface_entity !== undefined) {
    this.state_.active_surface_entity.set_active(false);
  }
  if (this.state_.active_tree_entity !== undefined) {
    this.state_.active_tree_entity.set_active(false);
  }
  if (this.state_.active_opening_entity !== undefined) {
    this.state_.active_opening_entity.set_active(false);
  }
  if (this.state_.active_light_source_entity !== undefined) {
    this.state_.active_light_source_entity.set_active(false);
  }

  this.state_.active_group = group;
  this.dispatchEvent('change_group');

  return this;
};

/**
 * Remove the currently active surface.
 */
beestat.component.floor_plan.prototype.remove_surface_ = function() {
  this.save_buffer();

  if (
    this.state_.active_surface_entity === undefined ||
    this.state_.active_group.surfaces === undefined
  ) {
    return;
  }

  const self = this;

  const index = this.state_.active_group.surfaces.findIndex(function(surface) {
    return surface === self.state_.active_surface_entity.get_surface();
  });

  if (index === -1) {
    return;
  }

  this.state_.active_surface_entity.set_active(false);
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
  }
  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }

  this.state_.active_group.surfaces.splice(index, 1);

  this.dispatchEvent('remove_surface');
};

/**
 * Add a new opening.
 *
 * @param {object} opening Optional opening to copy from.
 */
beestat.component.floor_plan.prototype.add_opening_ = function(opening) {
  if (this.has_early_access_() !== true) {
    return;
  }

  this.save_buffer();

  if (this.state_.active_group.openings === undefined) {
    this.state_.active_group.openings = [];
  }

  const svg_view_box = this.view_box_;
  const requested_opening_type = (opening || {}).type;
  const opening_type = requested_opening_type === 'garage'
    ? 'door'
    : (
      ['empty', 'door', 'window', 'glass'].includes(requested_opening_type)
        ? requested_opening_type
        : 'empty'
    );

  let default_width = 36;
  let default_height = 78;
  let default_elevation = 0;
  let default_color = '#7a573b';
  if (opening_type === 'window' || opening_type === 'glass') {
    default_width = 48;
    default_height = 42;
    default_elevation = 36;
  }

  const width = Math.max(12, Number((opening || {}).width || default_width));
  const height = Math.max(1, Number((opening || {}).height || default_height));
  const elevation = Number((opening || {}).elevation !== undefined ? opening.elevation : default_elevation);
  const center_x = Number((opening || {}).x || (svg_view_box.x + (svg_view_box.width / 2)));
  const center_y = Number((opening || {}).y || (svg_view_box.y + (svg_view_box.height / 2)));
  const half_width = width / 2;

  const new_opening = {
    'opening_id': window.crypto.randomUUID(),
    'x': center_x,
    'y': center_y,
    'height': height,
    'elevation': elevation,
    'points': (opening || {}).points && (opening || {}).points.length === 2
      ? beestat.clone(opening.points)
      : [
        {
          'x': center_x - half_width,
          'y': center_y
        },
        {
          'x': center_x + half_width,
          'y': center_y
        }
      ],
    'type': opening_type,
    'color': opening_type === 'door' ? String((opening || {}).color || default_color) : undefined,
    'name': (opening || {}).name,
    'editor_hidden': false,
    'editor_locked': false
  };

  this.state_.active_group.openings.unshift(new_opening);
  new beestat.component.floor_plan_entity.opening(this, this.state_)
    .set_opening(new_opening)
    .set_group(this.state_.active_group)
    .set_active(true);

  this.dispatchEvent('add_opening');
};

/**
 * Get opening width in floor-plan units from points.
 *
 * @param {object} opening
 *
 * @return {number}
 */
beestat.component.floor_plan.prototype.get_opening_width_ = function(opening) {
  if (
    opening !== undefined &&
    opening.points !== undefined &&
    opening.points.length === 2
  ) {
    const dx = Number(opening.points[1].x || 0) - Number(opening.points[0].x || 0);
    const dy = Number(opening.points[1].y || 0) - Number(opening.points[0].y || 0);
    return Math.max(0, Math.sqrt((dx * dx) + (dy * dy)));
  }

  return Math.max(0, Number(opening.width || 0));
};

/**
 * Remove the currently active opening.
 */
beestat.component.floor_plan.prototype.remove_opening_ = function() {
  this.save_buffer();

  if (
    this.state_.active_opening_entity === undefined ||
    this.state_.active_group.openings === undefined
  ) {
    return;
  }

  const self = this;
  const index = this.state_.active_group.openings.findIndex(function(opening) {
    return opening === self.state_.active_opening_entity.get_opening();
  });

  if (index === -1) {
    return;
  }

  this.state_.active_opening_entity.set_active(false);
  this.state_.active_group.openings.splice(index, 1);

  this.dispatchEvent('remove_opening');
};

/**
 * Add a new light source to the active floor.
 *
 * @param {object} light_source Optional light source to copy from.
 */
beestat.component.floor_plan.prototype.add_light_source_ = function(light_source) {
  if (this.has_early_access_() !== true) {
    return;
  }

  this.save_buffer();

  if (this.state_.active_group.light_sources === undefined) {
    this.state_.active_group.light_sources = [];
  }

  const svg_view_box = this.view_box_;
  const new_light_source = {
    'light_source_id': window.crypto.randomUUID(),
    'x': Number((light_source || {}).x || (svg_view_box.x + (svg_view_box.width / 2))),
    'y': Number((light_source || {}).y || (svg_view_box.y + (svg_view_box.height / 2))),
    'elevation': Number((light_source || {}).elevation !== undefined ? light_source.elevation : 84),
    'intensity': ['dim', 'normal', 'bright'].includes((light_source || {}).intensity)
      ? light_source.intensity
      : 'normal',
    'temperature_k': Math.max(1000, Math.min(12000, Math.round(Number((light_source || {}).temperature_k || 4000)))),
    'name': (light_source || {}).name,
    'editor_hidden': false,
    'editor_locked': false
  };

  this.state_.active_group.light_sources.unshift(new_light_source);
  new beestat.component.floor_plan_entity.light_source(this, this.state_)
    .set_light_source(new_light_source)
    .set_group(this.state_.active_group)
    .set_active(true);

  this.dispatchEvent('add_light_source');
};

/**
 * Remove the currently active light source.
 */
beestat.component.floor_plan.prototype.remove_light_source_ = function() {
  this.save_buffer();

  if (
    this.state_.active_light_source_entity === undefined ||
    this.state_.active_group.light_sources === undefined
  ) {
    return;
  }

  const self = this;
  const index = this.state_.active_group.light_sources.findIndex(function(light_source) {
    return light_source === self.state_.active_light_source_entity.get_light_source();
  });

  if (index === -1) {
    return;
  }

  this.state_.active_light_source_entity.set_active(false);
  this.state_.active_group.light_sources.splice(index, 1);

  this.dispatchEvent('remove_light_source');
};

/**
 * Add a new tree to the first floor.
 *
 * @param {object} tree Optional tree to copy from.
 */
beestat.component.floor_plan.prototype.add_tree_ = function(tree) {
  if (this.has_early_access_() !== true) {
    return;
  }

  const tree_group = this.get_tree_group_();
  if (tree_group === undefined || this.state_.active_group !== tree_group) {
    return;
  }

  this.save_buffer();

  if (tree_group.trees === undefined) {
    tree_group.trees = [];
  }

  const svg_view_box = this.view_box_;
  let new_tree;
  if (tree === undefined) {
    new_tree = {
      'tree_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2),
      'height': 120,
      'diameter': 72,
      'type': 'round',
      'editor_hidden': false,
      'editor_locked': false
    };
  } else {
    const tree_type = ['conical', 'round', 'oval'].includes(tree.type)
      ? tree.type
      : 'round';
    new_tree = {
      'tree_id': window.crypto.randomUUID(),
      'x': svg_view_box.x + (svg_view_box.width / 2),
      'y': svg_view_box.y + (svg_view_box.height / 2),
      'height': tree.height || 120,
      'diameter': tree.diameter || 72,
      'type': tree_type,
      'editor_hidden': false,
      'editor_locked': false
    };
  }

  tree_group.trees.unshift(new_tree);
  new beestat.component.floor_plan_entity.tree(this, this.state_)
    .set_tree(new_tree)
    .set_group(tree_group)
    .set_active(true);

  this.dispatchEvent('add_tree');
};

/**
 * Remove the currently active tree.
 */
beestat.component.floor_plan.prototype.remove_tree_ = function() {
  const tree_group = this.get_tree_group_();
  if (
    this.state_.active_tree_entity === undefined ||
    tree_group === undefined ||
    tree_group.trees === undefined
  ) {
    return;
  }

  this.save_buffer();

  const self = this;
  const index = tree_group.trees.findIndex(function(tree) {
    return tree === self.state_.active_tree_entity.get_tree();
  });

  if (index === -1) {
    return;
  }

  this.state_.active_tree_entity.set_active(false);
  tree_group.trees.splice(index, 1);

  this.dispatchEvent('remove_tree');
};

/**
 * Clear the currently active room.
 */
beestat.component.floor_plan.prototype.clear_room_ = function() {
  if (this.state_.active_tree_entity !== undefined) {
    this.state_.active_tree_entity.set_active(false);
  }
  if (this.state_.active_surface_entity !== undefined) {
    this.state_.active_surface_entity.set_active(false);
  }
  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.set_active(false);
  }
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
  }
  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
  }
  if (this.state_.active_opening_entity !== undefined) {
    this.state_.active_opening_entity.set_active(false);
  }
  if (this.state_.active_light_source_entity !== undefined) {
    this.state_.active_light_source_entity.set_active(false);
  }
};

/**
 * Remove the currently active point.
 */
beestat.component.floor_plan.prototype.remove_point_ = function() {
  this.save_buffer();

  const active_shape_entity = this.get_active_shape_entity_();
  if (active_shape_entity === undefined) {
    return;
  }

  if (active_shape_entity.get_room().points.length > 3) {
    for (let i = 0; i < active_shape_entity.get_room().points.length; i++) {
      if (this.state_.active_point_entity.get_point() === active_shape_entity.get_room().points[i]) {
        active_shape_entity.get_room().points.splice(i, 1);
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
 * Get the currently active shape (surface or room).
 *
 * @return {object|undefined}
 */
beestat.component.floor_plan.prototype.get_active_shape_entity_ = function() {
  return this.state_.active_surface_entity || this.state_.active_room_entity;
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
 * Get the first non-basement group (first floor).
 *
 * @return {object|undefined}
 */
beestat.component.floor_plan.prototype.get_tree_group_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const sorted_groups = Object.values(floor_plan.data.groups)
    .sort(function(a, b) {
      return a.elevation > b.elevation;
    });

  const first_floor = sorted_groups.find(function(group) {
    return (group.elevation || 0) >= 0;
  });

  return first_floor || sorted_groups[0];
};

/**
 * Center the view box on the content. Sets zoom and pan.
 */
beestat.component.floor_plan.prototype.center_content = function() {
  const bounding_box = beestat.floor_plan.get_bounding_box(this.floor_plan_id_);

  this.reset_view_box_();
  if (
    bounding_box.x !== Infinity &&
    bounding_box.y !== Infinity
  ) {
    const width = (bounding_box.width) + 50;
    const height = (bounding_box.height) + 50;
    while (
      (
        this.view_box_.width < width ||
        this.view_box_.height < height
      ) &&
      this.can_zoom_out_() === true
    ) {
      this.zoom_out_();
    }

    const center_x = (bounding_box.right + bounding_box.left) / 2;
    const center_y = (bounding_box.bottom + bounding_box.top) / 2;

    this.view_box_.x = center_x - (this.view_box_.width / 2);
    this.view_box_.y = center_y - (this.view_box_.height / 2);

    this.update_view_box_();
  }
};

/**
 * Save the current state to the undo/redo buffer.
 *
 * @param {boolean} clear Whether or not to allow clearing future buffer
 * entries.
 */
beestat.component.floor_plan.prototype.save_buffer = function(clear = true) {
  const buffer_size = 1000;

  if (this.state_.buffer === undefined) {
    this.state_.buffer = [];
    this.state_.buffer_pointer = 0;
  }

  // If the buffer pointer is not at the end, clear those out.
  if (
    clear === true &&
    this.state_.buffer_pointer !== this.state_.buffer.length + 1
  ) {
    this.state_.buffer.length = this.state_.buffer_pointer;
  }

  this.state_.buffer.push({
    'floor_plan': beestat.clone(beestat.cache.floor_plan[beestat.setting('visualize.floor_plan_id')]),
    'active_room_entity': this.state_.active_room_entity,
    'active_surface_entity': this.state_.active_surface_entity,
    'active_tree_entity': this.state_.active_tree_entity,
    'active_opening_entity': this.state_.active_opening_entity,
    'active_light_source_entity': this.state_.active_light_source_entity,
    'active_group_id': this.state_.active_group.group_id
  });

  // If the buffer gets too long shrink it.
  if (this.state_.buffer.length > buffer_size) {
    this.state_.buffer.shift();
  }

  /**
   * Update the buffer pointer. It always points at the index where the next
   * buffer write will happen.
   */
  this.state_.buffer_pointer = this.state_.buffer.length;

  this.update_toolbar();
};

/**
 * Undo
 */
beestat.component.floor_plan.prototype.undo_ = function() {
  if (this.can_undo_() === true) {
    const old_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    /**
     * When undoing, first save the buffer if the pointer is at the end to
     * capture the current state then shift the buffer pointer back an extra.
     */
    if (this.state_.buffer_pointer === this.state_.buffer.length) {
      this.save_buffer(false);
      this.state_.buffer_pointer--;
    }

    // Decrement buffer pointer back to the previous row.
    this.state_.buffer_pointer--;

    // Restore the floor plan.
    beestat.cache.floor_plan[this.floor_plan_id_] =
      beestat.clone(this.state_.buffer[this.state_.buffer_pointer].floor_plan);

    // Restore any active room.
    this.state_.active_room_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_room_entity;
    this.state_.active_surface_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_surface_entity;
    this.state_.active_tree_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_tree_entity;
    this.state_.active_opening_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_opening_entity;
    this.state_.active_light_source_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_light_source_entity;

    // Restore any active group.
    this.state_.active_group_id =
      this.state_.buffer[this.state_.buffer_pointer].active_group_id;

    // Delete data if the overall sensor set changes so it's re-fetched.
    const new_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    if (old_sensor_ids.sort().join(' ') !== new_sensor_ids.sort().join(' ')) {
      beestat.cache.delete('data.three_d__runtime_sensor');
    }

    this.update_toolbar();
    this.dispatchEvent('undo');
  }
};

/**
 * Whether or not you can undo.
 *
 * @return {boolean}
 */
beestat.component.floor_plan.prototype.can_undo_ = function() {
  return this.state_.buffer_pointer > 0;
};

/**
 * Redo
 */
beestat.component.floor_plan.prototype.redo_ = function() {
  if (this.can_redo_() === true) {
    const old_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    this.state_.buffer_pointer++;
    // Restore the floor plan.
    beestat.cache.floor_plan[this.floor_plan_id_] =
      beestat.clone(this.state_.buffer[this.state_.buffer_pointer].floor_plan);

    // Restore any active room.
    this.state_.active_room_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_room_entity;
    this.state_.active_surface_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_surface_entity;
    this.state_.active_tree_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_tree_entity;
    this.state_.active_opening_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_opening_entity;
    this.state_.active_light_source_entity =
      this.state_.buffer[this.state_.buffer_pointer].active_light_source_entity;

    // Restore any active group.
    this.state_.active_group_id =
      this.state_.buffer[this.state_.buffer_pointer].active_group_id;

    // Delete data if the overall sensor set changes so it's re-fetched.
    const new_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    if (old_sensor_ids.sort().join(' ') !== new_sensor_ids.sort().join(' ')) {
      beestat.cache.delete('data.three_d__runtime_sensor');
    }

    this.update_toolbar();
    this.dispatchEvent('redo');
  }
};

/**
 * Whether or not you can redo.
 *
 * @return {boolean}
 */
beestat.component.floor_plan.prototype.can_redo_ = function() {
  return this.state_.buffer !== undefined &&
    this.state_.buffer_pointer + 1 < this.state_.buffer.length;
};


