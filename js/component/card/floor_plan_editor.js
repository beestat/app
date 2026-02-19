/**
 * Floor plan editor.
 *
 * @param {number} thermostat_id
 */
beestat.component.card.floor_plan_editor = function(thermostat_id) {
  const self = this;

  this.thermostat_id_ = thermostat_id;

  // Whether or not to show the editor when loading.
  this.show_editor_ = beestat.floor_plan.get_bounding_box(
    beestat.setting('visualize.floor_plan_id')
  ).x === Infinity;

/*  const change_function = beestat.debounce(function() {
    // todo replace these with (if entity set active false?)
    delete self.state_.active_group;

    self.rerender();

    // Center the content if the floor plan changed.
    if (self.floor_plan_ !== undefined) {
      self.floor_plan_.center_content();
    }
  }, 10);

  beestat.dispatcher.addEventListener(
    'setting.visualize.floor_plan_id',
    change_function
  );*/

  beestat.component.card.apply(this, arguments);

  // Snapping initial
  if (this.state_.snapping === undefined) {
    this.state_.snapping = true;
  }

  this.state_.show_layers_sidebar = true;
  if (this.state_.layers_sidebar === undefined) {
    this.state_.layers_sidebar = {};
  }
  if (this.state_.layers_sidebar.mobile_mode === undefined) {
    this.state_.layers_sidebar.mobile_mode = (
      beestat.platform() === 'ios' ||
      beestat.platform() === 'android'
    );
  }

  // The first time this component renders center the content.
  this.addEventListener('render', function() {
    if (this.floor_plan_ !== undefined) {
      self.floor_plan_.center_content();
      self.removeEventListener('render');
    }
  });
};
beestat.extend(beestat.component.card.floor_plan_editor, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_contents_ = function(parent) {
  const self = this;

  const floor_plan = beestat.cache.floor_plan[beestat.setting('visualize.floor_plan_id')];

  // Set group ids if they are not set.
  floor_plan.data.groups.forEach(function(group) {
    if (group.group_id === undefined) {
      group.group_id = window.crypto.randomUUID();
    }
    if (group.rooms === undefined) {
      group.rooms = [];
    }
    if (group.surfaces === undefined) {
      group.surfaces = [];
    }
    if (group.trees === undefined) {
      group.trees = [];
    }

    group.rooms.forEach(function(room) {
      if (room.room_id === undefined) {
        room.room_id = window.crypto.randomUUID();
      }
      if (room.editor_hidden === undefined) {
        room.editor_hidden = room.editor_visible === false;
      }
      delete room.editor_visible;
      if (room.editor_locked === undefined) {
        room.editor_locked = false;
      }
    });

    group.surfaces.forEach(function(surface) {
      if (surface.surface_id === undefined) {
        surface.surface_id = window.crypto.randomUUID();
      }
      if (surface.editor_hidden === undefined) {
        surface.editor_hidden = surface.editor_visible === false;
      }
      delete surface.editor_visible;
      if (surface.editor_locked === undefined) {
        surface.editor_locked = false;
      }
    });

    group.trees.forEach(function(tree) {
      if (tree.tree_id === undefined) {
        tree.tree_id = window.crypto.randomUUID();
      }
      if (tree.editor_hidden === undefined) {
        tree.editor_hidden = tree.editor_visible === false;
      }
      delete tree.editor_visible;
      if (tree.editor_locked === undefined) {
        tree.editor_locked = false;
      }
    });
  });

  /**
   * If there is an active_group_id, override whatever the current active
   * group is. Used for undo/redo.
   */
  if (this.state_.active_group_id !== undefined) {
    for (let i = 0; i < floor_plan.data.groups.length; i++) {
      if (floor_plan.data.groups[i].group_id === this.state_.active_group_id) {
        this.state_.active_group = floor_plan.data.groups[i];
        delete this.state_.active_group_id;
        break;
      }
    }
  }

  // If there is no active group, set it to best guess of ground floor.
  if (this.state_.active_group === undefined) {
    let closest_distance = Infinity;
    let closest_group;
    floor_plan.data.groups.forEach(function(group) {
      if (Math.abs(group.elevation) < closest_distance) {
        closest_group = group;
        closest_distance = Math.abs(group.elevation);
      }
    });
    this.state_.active_group = closest_group;
  }

  this.floor_plan_tile_ = new beestat.component.tile.floor_plan(
    beestat.setting('visualize.floor_plan_id')
  )
    .set_background_color(beestat.style.color.lightblue.base)
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .set_display('block')
    .addEventListener('click', function() {
      self.show_editor_ = !self.show_editor_;
      self.rerender();
    })
    .render(parent);

  // Decorate everything.
  if (this.show_editor_ === true) {
    const drawing_pane_container = $.createElement('div');
    drawing_pane_container.style({
      'margin-top': beestat.style.size.gutter,
      'position': 'relative',
      'overflow-x': 'hidden'
    });
    parent.appendChild(drawing_pane_container);
    this.decorate_drawing_pane_(drawing_pane_container);

    this.info_pane_container_ = $.createElement('div')
      .style('margin-top', beestat.style.size.gutter / 2);
    parent.appendChild(this.info_pane_container_);
    this.decorate_info_pane_(this.info_pane_container_);

    // Help container
    if (beestat.floor_plan.get_area(beestat.setting('visualize.floor_plan_id')) === 0) {
      const help_container = document.createElement('div');
      Object.assign(help_container.style, {
        'position': 'absolute',
        'left': '65px',
        'top': '20px'
      });
      drawing_pane_container.appendChild(help_container);

      this.helper_tile_ = new beestat.component.tile()
        .set_text('Start by adding a room')
        .set_shadow(false)
        .set_background_color(beestat.style.color.green.base)
        .set_text_color('#fff')
        .set_type('pill')
        .set_size('small')
        .set_icon('arrow_left')
        .render($(help_container));
    }
  }

  const expand_container = document.createElement('div');
  Object.assign(expand_container.style, {
    'position': 'absolute',
    'right': '28px',
    'top': '70px'
  });
  parent.appendChild(expand_container);

  new beestat.component.tile()
    .set_icon(this.show_editor_ === true ? 'chevron_up' : 'chevron_down')
    .set_size('small')
    .set_shadow(false)
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .addEventListener('click', function() {
      self.show_editor_ = !self.show_editor_;
      self.rerender();
    })
    .render($(expand_container));
};

/**
 * Decorate the drawing pane.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_drawing_pane_ = function(parent) {
  const self = this;

  // Dispose existing SVG to remove any global listeners.
  if (this.floor_plan_ !== undefined) {
    this.floor_plan_.dispose();
  }

  // Dispose existing compass
  if (this.compass_ !== undefined) {
    this.compass_.dispose();
  }

  // Dispose existing layers sidebar.
  if (this.layers_sidebar_ !== undefined) {
    this.layers_sidebar_.dispose();
  }

  const drawing_canvas_container = $.createElement('div');
  drawing_canvas_container.style({
    'position': 'relative',
    'width': '100%',
    'overflow': 'hidden',
    'height': '500px'
  });
  parent.appendChild(drawing_canvas_container);

  const layers_sidebar_container = $.createElement('div');
  const sidebar_outer_gutter = beestat.style.size.gutter / 2;
  const is_mobile_layers_sidebar = (
    this.state_.layers_sidebar !== undefined &&
    this.state_.layers_sidebar.mobile_mode === true
  );
  const layers_sidebar_width = is_mobile_layers_sidebar ? 56 : 250;
  const layers_sidebar_padding = sidebar_outer_gutter;
  layers_sidebar_container.style({
    'position': 'absolute',
    'top': sidebar_outer_gutter + 'px',
    'right': sidebar_outer_gutter + 'px',
    'bottom': sidebar_outer_gutter + 'px',
    'width': layers_sidebar_width + 'px',
    'height': 'auto',
    'padding': layers_sidebar_padding + 'px',
    'box-sizing': 'border-box',
    'overflow': 'visible',
    'z-index': 5,
    'pointer-events': 'auto'
  });
  drawing_canvas_container.appendChild(layers_sidebar_container);

  // Create and render a new SVG component.
  this.floor_plan_ = new beestat.component.floor_plan(
    beestat.setting('visualize.floor_plan_id'),
    this.state_
  );

  this.floor_plan_.render(drawing_canvas_container);

  this.layers_sidebar_ = new beestat.component.floor_plan_layers_sidebar(
    beestat.setting('visualize.floor_plan_id'),
    this.state_
  )
    .style({
      'height': '100%',
      'width': '100%'
    })
    .set_on_select_floor(function(group) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.floor_plan_.set_active_group(group);
      self.update_layers_sidebar_();
    })
    .set_on_select_object(function(group, type, object_id) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.select_layer_object_(group, type, object_id);
    })
    .set_on_toggle_visibility(function(group, type, object_id, visible) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_layer_object_visibility_(group, type, object_id, visible);
    })
    .set_on_toggle_lock(function(group, type, object_id, locked) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_layer_object_locked_(group, type, object_id, locked);
    })
    .set_on_toggle_layer_visibility(function(group, type, visible) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_layer_visible_(group, type, visible);
    })
    .set_on_toggle_layer_lock(function(group, type, locked) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_layer_locked_(group, type, locked);
    })
    .set_on_toggle_group_visibility(function(group, visible) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_group_visible_(group, visible);
    })
    .set_on_toggle_group_lock(function(group, locked) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.set_group_locked_(group, locked);
    })
    .set_on_reorder(function(group, type, from_index, to_index, drop_after) {
      if (self.layers_sidebar_ !== undefined) {
        self.layers_sidebar_.remember_scroll();
      }
      self.reorder_layer_object_(group, type, from_index, to_index, drop_after);
    })
    .set_on_toggle_mobile_mode(function(mobile_mode) {
      if (self.state_.layers_sidebar === undefined) {
        self.state_.layers_sidebar = {};
      }
      self.state_.layers_sidebar.mobile_mode = mobile_mode === true;
      self.rerender();
    })
    .render(layers_sidebar_container);

  this.ensure_active_entity_visibility_();

  // Create and render the compass for setting orientation (early access only)
  if (beestat.user.has_early_access() === true) {
    this.compass_ = new beestat.component.compass(
      beestat.setting('visualize.floor_plan_id')
    );
    this.compass_.render(drawing_canvas_container);
    if (this.compass_.container_ !== undefined) {
      this.compass_.container_.style.left = beestat.style.size.gutter + 'px';
      this.compass_.container_.style.right = 'auto';
      this.compass_.container_.style.bottom = beestat.style.size.gutter + 'px';
    }

    // Update floor plan when rotation changes
    this.compass_.addEventListener('rotation_change', function() {
      self.update_floor_plan_();
    });
  }

  setTimeout(function() {
    if (drawing_canvas_container.getBoundingClientRect().width > 0) {
      self.floor_plan_.set_width(drawing_canvas_container.getBoundingClientRect().width);
    }
  }, 0);

  beestat.dispatcher.removeEventListener('resize.floor_plan_editor');
  beestat.dispatcher.addEventListener('resize.floor_plan_editor', function() {
    self.floor_plan_.set_width(drawing_canvas_container.getBoundingClientRect().width);
  });

  // Rerender when stuff happens
  this.floor_plan_.addEventListener('add_room', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('remove_room', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('remove_point', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('add_surface', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('remove_surface', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('add_tree', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('remove_tree', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('undo', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('redo', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('change_group', self.rerender.bind(this));

  this.entity_index_ = {
    'rooms': {},
    'surfaces': {},
    'trees': {}
  };

  const on_entity_update = function() {
    self.floor_plan_.update_infobox();
    self.update_info_pane_();
    self.update_floor_plan_tile_();
    self.update_floor_plan_();
    self.update_layers_sidebar_();
  };

  const on_entity_activate = function() {
    self.expand_layers_for_active_entity_();
    self.scroll_layers_to_active_entity_();
    self.floor_plan_.update_infobox();
    self.floor_plan_.update_toolbar();
    self.update_info_pane_();
    self.update_floor_plan_tile_();
    self.update_layers_sidebar_();
  };

  const on_entity_inactivate = function() {
    self.restore_entity_draw_order_();
    self.floor_plan_.update_infobox();
    self.floor_plan_.update_toolbar();
    self.update_info_pane_();
    self.update_floor_plan_tile_();
    self.update_layers_sidebar_();
  };

  const group_below = this.floor_plan_.get_group_below(this.state_.active_group);
  if (group_below !== undefined) {
    group_below.rooms.slice().reverse().forEach(function(room) {
      if (room.editor_hidden === true) {
        return;
      }

      const room_entity = new beestat.component.floor_plan_entity.room(self.floor_plan_, self.state_)
        .set_enabled(false)
        .set_room(room)
        .set_group(self.state_.active_group);
      room_entity.render(self.floor_plan_.get_g());
    });
    group_below.surfaces.slice().reverse().forEach(function(surface) {
      if (surface.editor_hidden === true) {
        return;
      }

      const surface_entity = new beestat.component.floor_plan_entity.surface(self.floor_plan_, self.state_)
        .set_enabled(false)
        .set_surface(surface)
        .set_group(self.state_.active_group);
      surface_entity.render(self.floor_plan_.get_g());
    });
  }

  // Loop over the rooms in this group and add them.
  let active_room_entity;
  this.state_.active_group.rooms.slice().reverse().forEach(function(room) {
    if (room.editor_hidden === true) {
      return;
    }

      const room_entity = new beestat.component.floor_plan_entity.room(self.floor_plan_, self.state_)
        .set_enabled(room.editor_locked !== true)
        .set_room(room)
        .set_group(self.state_.active_group);

    room_entity.addEventListener('update', on_entity_update);
    room_entity.addEventListener('activate', on_entity_activate);
    room_entity.addEventListener('inactivate', on_entity_inactivate);

    /**
     * If there is currently an active room, use it to match to the newly
     * created room entities and then store it. After this loop is done
     * activate it to avoid other rooms getting written on top. Also delete
     * the active room from the state or it will needlessly be inactivated in
     * the set_active function.
     */
    if (
      self.state_.active_room_entity !== undefined &&
      room.room_id === self.state_.active_room_entity.get_room().room_id
    ) {
      delete self.state_.active_room_entity;
      active_room_entity = room_entity;
    }

    // Render the room and save to the list of current entities.
    room_entity.render(self.floor_plan_.get_g());
    self.entity_index_.rooms[room.room_id] = room_entity;
  });

  if (active_room_entity !== undefined) {
    active_room_entity.set_active(true);
  }

  /**
   * If there was an active room, defer to adding it last so it ends up on
   * top. The set_active function doesn't do anything if the room isn't
   * rendered otherwise.
   */
  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.render(this.floor_plan_.get_g());
  }

  // Loop over surfaces in this group and add them.
  let active_surface_entity;
  this.state_.active_group.surfaces.slice().reverse().forEach(function(surface) {
    if (surface.editor_hidden === true) {
      return;
    }

    const surface_entity = new beestat.component.floor_plan_entity.surface(self.floor_plan_, self.state_)
      .set_enabled(surface.editor_locked !== true)
      .set_surface(surface)
      .set_group(self.state_.active_group);

    surface_entity.addEventListener('update', on_entity_update);
    surface_entity.addEventListener('activate', on_entity_activate);
    surface_entity.addEventListener('inactivate', on_entity_inactivate);

    if (
      self.state_.active_surface_entity !== undefined &&
      surface.surface_id === self.state_.active_surface_entity.get_surface().surface_id
    ) {
      delete self.state_.active_surface_entity;
      active_surface_entity = surface_entity;
    }

    surface_entity.render(self.floor_plan_.get_g());
    self.entity_index_.surfaces[surface.surface_id] = surface_entity;
  });

  if (active_surface_entity !== undefined) {
    active_surface_entity.set_active(true);
  }

  if (this.state_.active_surface_entity !== undefined) {
    this.state_.active_surface_entity.render(this.floor_plan_.get_g());
  }

  // Trees are only editable on the first floor.
  const tree_group = this.floor_plan_.get_tree_group_();
  if (tree_group === this.state_.active_group) {
    if (tree_group.trees === undefined) {
      tree_group.trees = [];
    }

    let active_tree_entity;
    tree_group.trees.slice().reverse().forEach(function(tree) {
      if (tree.editor_hidden === true) {
        return;
      }

      const tree_entity = new beestat.component.floor_plan_entity.tree(self.floor_plan_, self.state_)
        .set_enabled(tree.editor_locked !== true)
        .set_tree(tree)
        .set_group(tree_group);

      tree_entity.addEventListener('update', on_entity_update);
      tree_entity.addEventListener('activate', on_entity_activate);
      tree_entity.addEventListener('inactivate', on_entity_inactivate);

      if (
        self.state_.active_tree_entity !== undefined &&
        tree.tree_id === self.state_.active_tree_entity.get_tree().tree_id
      ) {
        delete self.state_.active_tree_entity;
        active_tree_entity = tree_entity;
      }

      tree_entity.render(self.floor_plan_.get_g());
      self.entity_index_.trees[tree.tree_id] = tree_entity;
    });

    if (active_tree_entity !== undefined) {
      active_tree_entity.set_active(true);
    }

    if (this.state_.active_tree_entity !== undefined) {
      this.state_.active_tree_entity.render(this.floor_plan_.get_g());
    }
  }

  this.apply_pending_layer_selection_();
  this.update_layers_sidebar_();
};

/**
 * Rerender layers sidebar if available.
 */
beestat.component.card.floor_plan_editor.prototype.update_layers_sidebar_ = function() {
  if (this.layers_sidebar_ !== undefined) {
    this.layers_sidebar_.remember_scroll();
    this.layers_sidebar_.rerender();
  }
};

/**
 * Select an object from the layers sidebar.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {string} object_id
 */
beestat.component.card.floor_plan_editor.prototype.select_layer_object_ = function(group, type, object_id) {
  const normalized_type = type === 'room' ? 'rooms' : type;
  const object = this.get_layer_object_by_id_(group, normalized_type, object_id);
  const is_active_group = (
    this.state_.active_group !== undefined &&
    this.state_.active_group.group_id === group.group_id
  );

  this.state_.pending_layer_selection = {
    'group_id': group.group_id,
    'type': normalized_type,
    'object_id': object_id
  };

  if (is_active_group !== true) {
    this.floor_plan_.set_active_group(group);
    return;
  }

  if (object !== undefined && object.editor_locked === true) {
    delete this.state_.pending_layer_selection;
    return;
  }

  const entity_map = this.entity_index_[normalized_type];
  if (entity_map !== undefined && entity_map[object_id] !== undefined) {
    entity_map[object_id].set_active(true);
    delete this.state_.pending_layer_selection;
  }
};

/**
 * Set an object's editor visibility.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {string} object_id
 * @param {boolean} visible
 */
beestat.component.card.floor_plan_editor.prototype.set_layer_object_visibility_ = function(group, type, object_id, visible) {
  const object = this.get_layer_object_by_id_(group, type, object_id);
  if (object === undefined) {
    return;
  }
  object.editor_hidden = visible !== true;

  if (visible !== true) {
    if (
      type === 'rooms' &&
      this.state_.active_room_entity !== undefined &&
      this.state_.active_room_entity.get_room().room_id === object_id
    ) {
      this.state_.active_room_entity.set_active(false);
    }
    if (
      type === 'surfaces' &&
      this.state_.active_surface_entity !== undefined &&
      this.state_.active_surface_entity.get_surface().surface_id === object_id
    ) {
      this.state_.active_surface_entity.set_active(false);
    }
    if (
      type === 'trees' &&
      this.state_.active_tree_entity !== undefined &&
      this.state_.active_tree_entity.get_tree().tree_id === object_id
    ) {
      this.state_.active_tree_entity.set_active(false);
    }
  }

  this.floor_plan_.update_infobox();
  this.floor_plan_.update_toolbar();
  this.update_info_pane_();
  this.update_floor_plan_();
  this.rerender();
};

/**
 * Set an object's editor lock.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {string} object_id
 * @param {boolean} locked
 */
beestat.component.card.floor_plan_editor.prototype.set_layer_object_locked_ = function(group, type, object_id, locked) {
  const object = this.get_layer_object_by_id_(group, type, object_id);
  if (object === undefined) {
    return;
  }

  object.editor_locked = locked;

  if (locked === true) {
    if (
      type === 'rooms' &&
      this.state_.active_room_entity !== undefined &&
      this.state_.active_room_entity.get_room().room_id === object_id
    ) {
      this.state_.active_room_entity.set_active(false);
    }
    if (
      type === 'surfaces' &&
      this.state_.active_surface_entity !== undefined &&
      this.state_.active_surface_entity.get_surface().surface_id === object_id
    ) {
      this.state_.active_surface_entity.set_active(false);
    }
    if (
      type === 'trees' &&
      this.state_.active_tree_entity !== undefined &&
      this.state_.active_tree_entity.get_tree().tree_id === object_id
    ) {
      this.state_.active_tree_entity.set_active(false);
    }
  }

  this.floor_plan_.update_infobox();
  this.floor_plan_.update_toolbar();
  this.update_info_pane_();
  this.update_floor_plan_();
  this.rerender();
};

/**
 * Lock or unlock all objects in a layer type.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {boolean} locked
 */
beestat.component.card.floor_plan_editor.prototype.set_layer_locked_ = function(group, type, locked) {
  const collection = group[type] || [];
  collection.forEach(function(object) {
    object.editor_locked = locked;
  });

  if (locked === true) {
    this.deactivate_active_entity_for_group_type_(group, type);
  }

  this.sync_after_layer_change_();
};

/**
 * Hide or show all objects in a type layer.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {boolean} visible
 */
beestat.component.card.floor_plan_editor.prototype.set_layer_visible_ = function(group, type, visible) {
  const collection = group[type] || [];
  collection.forEach(function(object) {
    object.editor_hidden = visible !== true;
  });

  if (visible !== true) {
    this.deactivate_active_entity_for_group_type_(group, type);
  }

  this.sync_after_layer_change_();
};

/**
 * Lock or unlock all objects in a floor group.
 *
 * @param {object} group
 * @param {boolean} locked
 */
beestat.component.card.floor_plan_editor.prototype.set_group_locked_ = function(group, locked) {
  ['rooms', 'surfaces', 'trees'].forEach(function(type) {
    const collection = group[type] || [];
    collection.forEach(function(object) {
      object.editor_locked = locked;
    });
  });

  if (locked === true) {
    this.deactivate_active_entity_for_group_type_(group, 'rooms');
    this.deactivate_active_entity_for_group_type_(group, 'surfaces');
    this.deactivate_active_entity_for_group_type_(group, 'trees');
  }

  this.sync_after_layer_change_();
};

/**
 * Hide or show all objects in a floor group.
 *
 * @param {object} group
 * @param {boolean} visible
 */
beestat.component.card.floor_plan_editor.prototype.set_group_visible_ = function(group, visible) {
  ['rooms', 'surfaces', 'trees'].forEach(function(type) {
    const collection = group[type] || [];
    collection.forEach(function(object) {
      object.editor_hidden = visible !== true;
    });
  });

  if (visible !== true) {
    this.deactivate_active_entity_for_group_type_(group, 'rooms');
    this.deactivate_active_entity_for_group_type_(group, 'surfaces');
    this.deactivate_active_entity_for_group_type_(group, 'trees');
  }

  this.sync_after_layer_change_();
};

/**
 * Deactivate active entity if it belongs to the specified group/type.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 */
beestat.component.card.floor_plan_editor.prototype.deactivate_active_entity_for_group_type_ = function(group, type) {
  if (type === 'rooms' && this.state_.active_room_entity !== undefined) {
    if (this.state_.active_room_entity.group_ === group) {
      this.state_.active_room_entity.set_active(false);
    }
    return;
  }

  if (type === 'surfaces' && this.state_.active_surface_entity !== undefined) {
    if (this.state_.active_surface_entity.group_ === group) {
      this.state_.active_surface_entity.set_active(false);
    }
    return;
  }

  if (type === 'trees' && this.state_.active_tree_entity !== undefined) {
    if (this.state_.active_tree_entity.group_ === group) {
      this.state_.active_tree_entity.set_active(false);
    }
  }
};

/**
 * Refresh editor after layer/group state changes.
 */
beestat.component.card.floor_plan_editor.prototype.sync_after_layer_change_ = function() {
  this.floor_plan_.update_infobox();
  this.floor_plan_.update_toolbar();
  this.update_info_pane_();
  this.update_floor_plan_();
  this.rerender();
};

/**
 * Reorder an object in a fixed sub-layer.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {number} from_index
 * @param {number} to_index
 * @param {boolean} drop_after
 */
beestat.component.card.floor_plan_editor.prototype.reorder_layer_object_ = function(group, type, from_index, to_index, drop_after) {
  const collection = group[type] || [];
  let insert_index = to_index + (drop_after === true ? 1 : 0);
  if (
    from_index < 0 ||
    insert_index < 0 ||
    from_index >= collection.length ||
    insert_index > collection.length
  ) {
    return;
  }

  if (from_index < insert_index) {
    insert_index--;
  }

  if (from_index === insert_index) {
    return;
  }

  const moved = collection.splice(from_index, 1)[0];
  collection.splice(insert_index, 0, moved);

  this.update_floor_plan_();
  this.rerender();
};

/**
 * Ensure hidden active entities are cleared.
 */
beestat.component.card.floor_plan_editor.prototype.ensure_active_entity_visibility_ = function() {
  if (
    this.state_.active_room_entity !== undefined &&
    (
      this.state_.active_room_entity.get_room().editor_hidden === true ||
      this.state_.active_room_entity.get_room().editor_locked === true
    )
  ) {
    delete this.state_.active_room_entity;
    delete this.state_.active_wall_entity;
    delete this.state_.active_point_entity;
  }

  if (
    this.state_.active_surface_entity !== undefined &&
    (
      this.state_.active_surface_entity.get_surface().editor_hidden === true ||
      this.state_.active_surface_entity.get_surface().editor_locked === true
    )
  ) {
    delete this.state_.active_surface_entity;
    delete this.state_.active_wall_entity;
    delete this.state_.active_point_entity;
  }

  if (
    this.state_.active_tree_entity !== undefined &&
    (
      this.state_.active_tree_entity.get_tree().editor_hidden === true ||
      this.state_.active_tree_entity.get_tree().editor_locked === true
    )
  ) {
    delete this.state_.active_tree_entity;
  }
};

/**
 * Apply deferred sidebar selection after rerender.
 */
beestat.component.card.floor_plan_editor.prototype.apply_pending_layer_selection_ = function() {
  if (this.state_.pending_layer_selection === undefined) {
    return;
  }

  const pending = this.state_.pending_layer_selection;
  if (
    this.state_.active_group === undefined ||
    pending.group_id !== this.state_.active_group.group_id
  ) {
    return;
  }

  const entity_map = this.entity_index_[pending.type];
  const pending_object = this.get_layer_object_by_id_(this.state_.active_group, pending.type, pending.object_id);
  if (
    pending_object !== undefined &&
    pending_object.editor_locked !== true &&
    entity_map !== undefined &&
    entity_map[pending.object_id] !== undefined
  ) {
    entity_map[pending.object_id].set_active(true);
  }

  delete this.state_.pending_layer_selection;
};

/**
 * Get the id key by object type.
 *
 * @param {string} type rooms|surfaces|trees
 *
 * @return {string}
 */
beestat.component.card.floor_plan_editor.prototype.get_layer_object_id_key_ = function(type) {
  if (type === 'rooms') {
    return 'room_id';
  }
  if (type === 'surfaces') {
    return 'surface_id';
  }
  return 'tree_id';
};

/**
 * Get object by id from a group/type.
 *
 * @param {object} group
 * @param {string} type rooms|surfaces|trees
 * @param {string} object_id
 *
 * @return {object|undefined}
 */
beestat.component.card.floor_plan_editor.prototype.get_layer_object_by_id_ = function(group, type, object_id) {
  const collection = group[type] || [];
  const id_key = this.get_layer_object_id_key_(type);
  for (let i = 0; i < collection.length; i++) {
    if (collection[i][id_key] === object_id) {
      return collection[i];
    }
  }
};

/**
 * Expand sidebar nodes needed to reveal the currently active entity.
 */
beestat.component.card.floor_plan_editor.prototype.expand_layers_for_active_entity_ = function() {
  if (this.state_.layers_sidebar === undefined || this.state_.active_group === undefined) {
    return;
  }

  let type;
  if (this.state_.active_tree_entity !== undefined) {
    type = 'trees';
  } else if (this.state_.active_surface_entity !== undefined) {
    type = 'surfaces';
  } else if (this.state_.active_room_entity !== undefined) {
    type = 'rooms';
  } else {
    return;
  }

  const sidebar_state = this.state_.layers_sidebar;
  const group_id = this.state_.active_group.group_id;
  sidebar_state.collapsed_groups[group_id] = false;
  sidebar_state.collapsed_types[group_id + '.' + type] = false;
};

/**
 * Queue sidebar scroll to currently active entity.
 */
beestat.component.card.floor_plan_editor.prototype.scroll_layers_to_active_entity_ = function() {
  if (this.state_.layers_sidebar === undefined || this.state_.active_group === undefined) {
    return;
  }

  let type;
  let object_id;
  if (this.state_.active_tree_entity !== undefined) {
    type = 'trees';
    object_id = this.state_.active_tree_entity.get_tree().tree_id;
  } else if (this.state_.active_surface_entity !== undefined) {
    type = 'surfaces';
    object_id = this.state_.active_surface_entity.get_surface().surface_id;
  } else if (this.state_.active_room_entity !== undefined) {
    type = 'rooms';
    object_id = this.state_.active_room_entity.get_room().room_id;
  } else {
    return;
  }

  this.state_.layers_sidebar.scroll_to = {
    'group_id': this.state_.active_group.group_id,
    'type': type,
    'object_id': object_id
  };
};

/**
 * Restore visible entity draw order to persisted layer order.
 */
beestat.component.card.floor_plan_editor.prototype.restore_entity_draw_order_ = function() {
  if (
    this.floor_plan_ === undefined ||
    this.state_.active_group === undefined ||
    this.entity_index_ === undefined
  ) {
    return;
  }

  const append_entities_in_order = function(collection, entity_map, id_key) {
    collection.slice().reverse().forEach(function(object) {
      const entity = entity_map[object[id_key]];
      if (
        entity !== undefined &&
        entity.g_ !== undefined &&
        entity.g_.parentNode !== null
      ) {
        entity.g_.parentNode.appendChild(entity.g_);
      }
    });
  };

  append_entities_in_order(
    this.state_.active_group.rooms || [],
    this.entity_index_.rooms || {},
    'room_id'
  );

  append_entities_in_order(
    this.state_.active_group.surfaces || [],
    this.entity_index_.surfaces || {},
    'surface_id'
  );

  const tree_group = this.floor_plan_.get_tree_group_();
  if (tree_group === this.state_.active_group) {
    append_entities_in_order(
      tree_group.trees || [],
      this.entity_index_.trees || {},
      'tree_id'
    );
  }
};

/**
 * Decorate the info pane.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_ = function(parent) {
  if (this.state_.active_tree_entity !== undefined) {
    this.decorate_info_pane_tree_(parent);
  } else if (this.state_.active_surface_entity !== undefined) {
    this.decorate_info_pane_surface_(parent);
  } else if (this.state_.active_room_entity !== undefined) {
    this.decorate_info_pane_room_(parent);
  } else {
    this.decorate_info_pane_floor_(parent);
  }
};

/**
 * Decorate the info pane for a floor.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_floor_ = function(parent) {
  const self = this;

  const grid = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
      'column-gap': beestat.style.size.gutter
    });
  parent.appendChild(grid);

  let div;

  // Group Name
  div = $.createElement('div');
  grid.appendChild(div);
  const name_input = new beestat.component.input.text()
    .set_label('Floor Name')
    .set_placeholder('Unnamed Floor')
    .set_width('100%')
    .set_maxlength(50)
    .set_requirements({
      'required': true
    })
    .render(div);

  if (this.state_.active_group.name !== undefined) {
    name_input.set_value(this.state_.active_group.name);
  }

  name_input.addEventListener('input', function() {
    self.state_.active_group.name = name_input.get_value();
    self.floor_plan_.update_infobox();
    self.update_layers_sidebar_();
  });
  name_input.addEventListener('change', function() {
    self.state_.active_group.name = name_input.get_value();
    self.update_floor_plan_();
    self.update_layers_sidebar_();
  });

  // Elevation
  div = $.createElement('div');
  grid.appendChild(div);
  const elevation_input = new beestat.component.input.text()
    .set_label('Elevation (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': this.state_.active_group.elevation,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': this.state_.active_group.elevation,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(-600),
      'max_value': beestat.distance(600),
      'required': true
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  elevation_input.addEventListener('change', function() {
    if (elevation_input.meets_requirements() === true) {
      self.state_.active_group.elevation = beestat.distance({
        'distance': elevation_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
      self.rerender();
    } else {
      elevation_input.set_value(beestat.distance(self.state_.active_group.elevation), false);
      new beestat.component.modal.floor_plan_elevation_help().render();
    }
  });

  // Ceiling Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Ceiling Height (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': this.state_.active_group.height,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': this.state_.active_group.height,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(60),
      'required': true
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      self.state_.active_group.height = beestat.distance({
        'distance': height_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
    } else {
      height_input.set_value(self.state_.active_group.height, false);
    }
  });

  // Sensor
  div = $.createElement('div');
  grid.appendChild(div);
};

/**
 * Decorate the info pane for a tree.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_tree_ = function(parent) {
  const self = this;
  const tree = this.state_.active_tree_entity.get_tree();

  const grid = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(4, minmax(150px, 1fr))',
      'column-gap': beestat.style.size.gutter,
      'width': '100%'
    });
  parent.appendChild(grid);

  let div;

  // Name
  div = $.createElement('div');
  grid.appendChild(div);
  const name_input = new beestat.component.input.text()
    .set_label('Tree Name')
    .set_placeholder('Unnamed Tree')
    .set_width('100%')
    .set_maxlength(50)
    .render(div);

  if (tree.name !== undefined) {
    name_input.set_value(tree.name);
  }

  name_input.addEventListener('input', function() {
    tree.name = name_input.get_value();
    self.update_layers_sidebar_();
  });
  name_input.addEventListener('change', function() {
    tree.name = name_input.get_value();
    self.update_floor_plan_();
    self.update_layers_sidebar_();
  });

  // Type
  div = $.createElement('div');
  grid.appendChild(div);
  const format_tree_type = function(value) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function(letter) {
        return letter.toUpperCase();
      });
  };
  const type_input = new beestat.component.input.select()
    .set_label('Type')
    .set_width('100%')
    .add_option({
      'label': format_tree_type('conical'),
      'value': 'conical'
    })
    .add_option({
      'label': format_tree_type('round'),
      'value': 'round'
    })
    .render(div);

  type_input.set_value(['conical', 'round'].includes(tree.type) ? tree.type : 'round');
  type_input.addEventListener('change', function() {
    tree.type = type_input.get_value();
    self.update_floor_plan_();
  });

  // Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Height (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': tree.height,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': tree.height,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(1),
      'required': true
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      tree.height = beestat.distance({
        'distance': height_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
    } else {
      height_input.set_value(beestat.distance({
        'distance': tree.height,
        'round': 2
      }) || '', false);
    }
  });
};

/**
 * Decorate the info pane for a surface.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_surface_ = function(parent) {
  const self = this;
  const surface = this.state_.active_surface_entity.get_surface();

  const grid = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(4, minmax(150px, 1fr))',
      'column-gap': beestat.style.size.gutter,
      'width': '100%'
    });
  parent.appendChild(grid);

  let div;

  // Name
  div = $.createElement('div');
  grid.appendChild(div);
  const name_input = new beestat.component.input.text()
    .set_label('Surface Name')
    .set_placeholder('Unnamed Surface')
    .set_width('100%')
    .set_maxlength(50)
    .render(div);

  if (surface.name !== undefined) {
    name_input.set_value(surface.name);
  }

  name_input.addEventListener('input', function() {
    surface.name = name_input.get_value();
    self.update_layers_sidebar_();
  });
  name_input.addEventListener('change', function() {
    surface.name = name_input.get_value();
    self.update_floor_plan_();
    self.update_layers_sidebar_();
  });

  // Surface color preset
  div = $.createElement('div');
  grid.appendChild(div);
  const color_input = new beestat.component.input.select()
    .set_label('Color')
    .set_width('100%');

  const normalize_hex_color = function(value) {
    if (value === undefined || value === null) {
      return undefined;
    }

    let normalized = String(value).trim();
    if (normalized === '') {
      return undefined;
    }

    if (normalized.charAt(0) !== '#') {
      normalized = '#' + normalized;
    }

    if (/^#[0-9a-fA-F]{6}$/.test(normalized) !== true) {
      return undefined;
    }

    return normalized.toLowerCase();
  };

  const apply_surface_color = function(color) {
    surface.color = color;
    self.floor_plan_.update_infobox();
    self.update_floor_plan_();
    self.rerender();
  };

  const surface_colors = [
    {'label': 'Pavement - Concrete', 'value': '#9a9a96'},
    {'label': 'Pavement - Asphalt', 'value': '#1f2328'},
    {'label': 'Pavers - Brick', 'value': '#7a2f2a'},
    {'label': 'Pavers - Stone', 'value': '#8f877e'},
    {'label': 'Wood - Light', 'value': '#c79a6b'},
    {'label': 'Wood - Dark', 'value': '#4b2f1f'},
    {'label': 'Mulch - Brown', 'value': '#6b4a2f'},
    {'label': 'Mulch - Red', 'value': '#7a3f32'},
    {'label': 'Mulch - Black', 'value': '#2e3136'},
    {'label': 'Water - Pool', 'value': '#3e89b8'},
    {'label': 'Water - Natural', 'value': '#3f6f5b'}
  ];
  surface_colors.sort(function(a, b) {
    return a.label.localeCompare(b.label, 'en', {'sensitivity': 'base'});
  });
  surface_colors.push({'label': 'Custom', 'value': '__custom__'});

  const preset_color_map = {};
  surface_colors.forEach(function(surface_color) {
    if (surface_color.value !== '__custom__') {
      preset_color_map[surface_color.value] = true;
    }
    color_input.add_option(surface_color);
  });

  color_input.render(div);

  const custom_color_container = $.createElement('div');
  custom_color_container.style('display', 'none');
  grid.appendChild(custom_color_container);
  const custom_color_input = new beestat.component.input.text()
    .set_label('Custom Hex')
    .set_placeholder('#RRGGBB')
    .set_width('100%')
    .set_maxlength(7)
    .render(custom_color_container);

  const current_surface_color = normalize_hex_color(surface.color) || '#9a9a96';
  const is_preset_color = preset_color_map[current_surface_color] === true;

  if (is_preset_color === true) {
    color_input.set_value(current_surface_color);
    custom_color_input.set_value('', false);
    custom_color_container.style('display', 'none');
  } else {
    color_input.set_value('__custom__');
    custom_color_input.set_value(current_surface_color, false);
    custom_color_container.style('display', 'block');
  }

  color_input.addEventListener('change', function() {
    const selected_value = color_input.get_value();

    if (selected_value === '__custom__') {
      const custom_color = normalize_hex_color(custom_color_input.get_value()) ||
        normalize_hex_color(surface.color) ||
        '#9a9a96';
      custom_color_input.set_value(custom_color, false);
      custom_color_container.style('display', 'block');
      custom_color_input.input_.focus();
      return;
    }

    custom_color_input.set_value('', false);
    custom_color_container.style('display', 'none');
    apply_surface_color(selected_value);
  });

  custom_color_input.addEventListener('change', function() {
    if (color_input.get_value() !== '__custom__') {
      return;
    }

    const custom_color = normalize_hex_color(custom_color_input.get_value());
    if (custom_color === undefined) {
      custom_color_input.set_value(surface.color || '#9a9a96', false);
      return;
    }

    custom_color_input.set_value(custom_color, false);
    apply_surface_color(custom_color);
  });

  // Elevation
  div = $.createElement('div');
  grid.appendChild(div);
  const elevation_input = new beestat.component.input.text()
    .set_label('Elevation (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': self.state_.active_group.elevation,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': surface.elevation,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(-600),
      'max_value': beestat.distance(600)
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  elevation_input.addEventListener('change', function() {
    if (elevation_input.meets_requirements() === true) {
      surface.elevation = beestat.distance({
        'distance': elevation_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
      self.rerender();
    } else {
      elevation_input.set_value('', false);
    }
  });

  // Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Height (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': surface.height || 0,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': surface.height || 0,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(0)
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      surface.height = beestat.distance({
        'distance': height_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
    } else {
      height_input.set_value('', false);
    }
  });
};

/**
 * Decorate the info pane for a room.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_room_ = function(parent) {
  const self = this;

  const grid = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
      'column-gap': beestat.style.size.gutter
    });
  parent.appendChild(grid);

  let div;

  // Room Name
  div = $.createElement('div');
  grid.appendChild(div);
  const name_input = new beestat.component.input.text()
    .set_label('Room Name')
    .set_placeholder('Unnamed Room')
    .set_width('100%')
    .set_maxlength(50)
    .set_requirements({
      'required': true
    })
    .render(div);

  if (this.state_.active_room_entity.get_room().name !== undefined) {
    name_input.set_value(this.state_.active_room_entity.get_room().name);
  }

  name_input.addEventListener('input', function() {
    self.state_.active_room_entity.get_room().name = name_input.get_value();
    self.floor_plan_.update_infobox();
    self.update_layers_sidebar_();
  });
  name_input.addEventListener('change', function() {
    self.state_.active_room_entity.get_room().name = name_input.get_value();
    self.update_floor_plan_();
    self.update_layers_sidebar_();
  });

  // Elevation
  div = $.createElement('div');
  grid.appendChild(div);
  const elevation_input = new beestat.component.input.text()
    .set_label('Elevation (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': this.state_.active_group.elevation,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': this.state_.active_room_entity.get_room().elevation,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(-600),
      'max_value': beestat.distance(600)
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  elevation_input.addEventListener('change', function() {
    if (elevation_input.meets_requirements() === true) {
      self.state_.active_room_entity.get_room().elevation = beestat.distance({
        'distance': elevation_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
      self.rerender();
    } else {
      elevation_input.set_value('', false);
      new beestat.component.modal.floor_plan_elevation_help().render();
    }
  });

  // Ceiling Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Ceiling Height (' + beestat.setting('units.distance') + ')')
    .set_placeholder(beestat.distance({
      'distance': this.state_.active_group.height,
      'round': 2
    }))
    .set_value(beestat.distance({
      'distance': this.state_.active_room_entity.get_room().height,
      'round': 2
    }) || '')
    .set_width('100%')
    .set_maxlength(5)
    .set_requirements({
      'type': 'decimal',
      'min_value': beestat.distance(60)
    })
    .set_transform({
      'type': 'round',
      'decimals': 2
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      self.state_.active_room_entity.get_room().height = beestat.distance({
        'distance': height_input.get_value(),
        'input_distance_unit': beestat.setting('units.distance'),
        'output_distance_unit': 'in',
        'round': 2
      });
      self.update_floor_plan_();
    } else {
      height_input.set_value('', false);
    }
  });

  // Sensor
  div = $.createElement('div');
  div.style('position', 'relative');
  grid.appendChild(div);
  const sensor_input = new beestat.component.input.select()
    .add_option({
      'label': 'None',
      'value': ''
    })
    .set_width('100%')
    .set_label('Sensor');

  const sensors = {};
  Object.values(beestat.cache.thermostat).forEach(function(thermostat) {
    const thermostat_sensors = Object.values(beestat.cache.sensor).filter(function(sensor) {
      return sensor.thermostat_id === thermostat.thermostat_id;
    })
      .sort(function(a, b) {
        return a.name.localeCompare(b.name, 'en', {'sensitivity': 'base'});
      });

    sensors[thermostat.thermostat_id] = thermostat_sensors;
  });

  // Put the sensors in the select.
  for (let thermostat_id in sensors) {
    const thermostat = beestat.cache.thermostat[thermostat_id];
    sensors[thermostat_id].forEach(function(sensor) {
      sensor_input.add_option({
        'group': thermostat.name,
        'value': sensor.sensor_id,
        'label': sensor.name
      });
    });
  }

  sensor_input.render(div);

  if (
    self.state_.active_room_entity.get_room().sensor_id !== undefined &&
    beestat.cache.sensor[self.state_.active_room_entity.get_room().sensor_id] !== undefined
  ) {
    sensor_input.set_value(self.state_.active_room_entity.get_room().sensor_id);
  } else {
    sensor_input.set_value('');
  }

  sensor_input.addEventListener('change', function() {
    const old_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    if (sensor_input.get_value() === '') {
      delete self.state_.active_room_entity.get_room().sensor_id;
    } else {
      self.state_.active_room_entity.get_room().sensor_id = Number(sensor_input.get_value());
    }

    const new_sensor_ids = Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    ));

    // Delete data if the overall sensor set changes so it's re-fetched.
    if (old_sensor_ids.sort().join(' ') !== new_sensor_ids.sort().join(' ')) {
      beestat.cache.delete('data.three_d__runtime_sensor');
    }

    // For the help box
    self.update_info_pane_();

    self.update_floor_plan_();
  });

  // Help container
  if (
    Object.keys(beestat.floor_plan.get_sensor_ids_map(beestat.setting('visualize.floor_plan_id'))).length === 0 &&
    this.state_.active_room_entity !== undefined
  ) {
    const help_container = document.createElement('div');
    Object.assign(help_container.style, {
      'position': 'absolute',
      'left': 0,
      'top': '-9px'
    });
    div.appendChild(help_container);

    this.helper_tile_ = new beestat.component.tile()
      .set_text('Assign a sensor')
      .set_shadow(false)
      .set_background_color(beestat.style.color.green.base)
      .set_text_color('#fff')
      .set_type('pill')
      .set_size('small')
      .set_icon('arrow_down')
      .render($(help_container));

    sensor_input.set_label('⠀');
  }
};

/**
 * Rerender just the info pane to avoid rerendering the entire SVG for
 * resizes, drags, etc. This isn't super ideal but without making the info
 * pane a separate component this is the way.
 */
beestat.component.card.floor_plan_editor.prototype.update_info_pane_ = function() {
  var old_parent = this.info_pane_container_;
  this.info_pane_container_ = $.createElement('div')
    .style('margin-top', beestat.style.size.gutter / 2);

  this.decorate_info_pane_(this.info_pane_container_);
  old_parent.parentNode().replaceChild(this.info_pane_container_, old_parent);
};

/**
 * Rerender just the top floor pane tile to avoid rerendering the entire SVG
 * for resizes, drags, etc. This isn't super ideal but without making the info
 * pane a separate component this is the way.
 */
beestat.component.card.floor_plan_editor.prototype.update_floor_plan_tile_ = function() {
  this.floor_plan_tile_.rerender();
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.floor_plan_editor.prototype.get_title_ = function() {
  return 'Floor Plan';
};

/**
 * Update the floor plan in the database. This is throttled so the update can
 * only run so fast.
 */
beestat.component.card.floor_plan_editor.prototype.update_floor_plan_ = function() {
  const self = this;

  // Fake this event since the cache is being directly modified.
  beestat.dispatcher.dispatchEvent('cache.floor_plan');

  window.clearTimeout(this.update_timeout_);
  this.update_timeout_ = window.setTimeout(function() {
    new beestat.api()
      .add_call(
        'floor_plan',
        'update',
        {
          'attributes': {
            'floor_plan_id': beestat.setting('visualize.floor_plan_id'),
            'data': self.get_floor_plan_data_(beestat.setting('visualize.floor_plan_id'))
          }
        },
        'update_floor_plan'
      )
      .send();
  }, 1000);
};

/**
 * Get cloned floor plan data.
 *
 * @param {number} floor_plan_id Floor plan ID
 *
 * @return {object} The modified floor plan data.
 */
beestat.component.card.floor_plan_editor.prototype.get_floor_plan_data_ = function(floor_plan_id) {
  return beestat.clone(beestat.cache.floor_plan[floor_plan_id].data);
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_top_right_ = function(parent) {
  const self = this;

  const menu = (new beestat.component.menu()).render(parent);

  if (window.is_demo === false) {
    if (Object.keys(beestat.cache.floor_plan).length > 1) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Switch')
        .set_icon('home_switch')
        .set_callback(function() {
          (new beestat.component.modal.change_floor_plan()).render();
        }));
    }

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Add New')
      .set_icon('plus')
      .set_callback(function() {
        new beestat.component.modal.create_floor_plan(
          self.thermostat_id_
        ).render();
      }));

    if (beestat.setting('visualize.floor_plan_id') !== null) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Edit')
        .set_icon('pencil')
        .set_callback(function() {
          new beestat.component.modal.update_floor_plan(
            beestat.setting('visualize.floor_plan_id')
          ).render();
        }));
    }

    if (beestat.setting('visualize.floor_plan_id') !== null) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Delete')
        .set_icon('delete')
        .set_callback(function() {
          new beestat.component.modal.delete_floor_plan(
            beestat.setting('visualize.floor_plan_id')
          ).render();
        }));
    }
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/86f6e4c44fc84c3cb4e8fb7b16d3d160');
    }));
};
