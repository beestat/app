/**
 * Floor plan editor.
 *
 * @param {number} thermostat_id
 */
beestat.component.card.floor_plan_editor = function(thermostat_id) {
  const self = this;
  this.thermostat_id_ = thermostat_id;

  var change_function = beestat.debounce(function() {
    // todo replace these with (if entity set active false?)
    delete self.state_.active_group;
    delete self.state_.active_room;

    self.rerender();

    // Center the content if the floor plan changed.
    if (self.floor_plan_ !== undefined) {
      self.floor_plan_.center_content();
    }
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'setting.floor_plan_id',
      'cache.floor_plan'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);

  // Snapping initial
  if (this.state_.snapping === undefined) {
    this.state_.snapping = true;
  }

  // The first time this component renders center the content.
  if (self.floor_plan_ !== undefined) {
    this.addEventListener('render', function() {
      self.floor_plan_.center_content();
      self.removeEventListener('render');
    });
  }
};
beestat.extend(beestat.component.card.floor_plan_editor, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_contents_ = function(parent) {
  const self = this;

  if (Object.keys(beestat.cache.floor_plan).length === 0) {
    const center_container = $.createElement('div').style('text-align', 'center');
    parent.appendChild(center_container);

    const get_started_button = new beestat.component.tile()
      .set_icon('plus')
      .set_text('Create my first floor plan')
      .set_size('large')
      .set_background_color(beestat.style.color.green.dark)
      .set_background_hover_color(beestat.style.color.green.light)
      .render(center_container)
      .addEventListener('click', function() {
        new beestat.component.modal.create_floor_plan(
          self.thermostat_id_
        ).render();
      });
    center_container.appendChild(get_started_button);
  } else {
    const floor_plan = beestat.cache.floor_plan[beestat.setting('floor_plan_id')];

    // Set group ids if they are not set.
    floor_plan.data.groups.forEach(function(group) {
      if (group.group_id === undefined) {
        group.group_id = window.crypto.randomUUID();
      }
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

    // Decorate everything.
    const drawing_pane_container = $.createElement('div');
    drawing_pane_container.style({
      'position': 'relative',
      'overflow-x': 'hidden'
    });
    parent.appendChild(drawing_pane_container);
    this.decorate_drawing_pane_(drawing_pane_container);

    this.info_pane_container_ = $.createElement('div')
      .style('margin-top', beestat.style.size.gutter / 2);
    parent.appendChild(this.info_pane_container_);
    this.decorate_info_pane_(this.info_pane_container_);
  }
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

  // Create and render a new SVG component.
  this.floor_plan_ = new beestat.component.floor_plan(
    beestat.setting('floor_plan_id'),
    this.state_
  );

  this.floor_plan_.render(parent);

  setTimeout(function() {
    if (parent.getBoundingClientRect().width > 0) {
      self.floor_plan_.set_width(parent.getBoundingClientRect().width);
    }
  }, 0);

  beestat.dispatcher.removeEventListener('resize.floor_plan_editor');
  beestat.dispatcher.addEventListener('resize.floor_plan_editor', function() {
    self.floor_plan_.set_width(parent.getBoundingClientRect().width);
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
  this.floor_plan_.addEventListener('undo', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('redo', function() {
    self.update_floor_plan_();
    self.rerender();
  });
  this.floor_plan_.addEventListener('change_group', self.rerender.bind(this));

  // Add all of the entities to the SVG.
  this.entities_ = {
    'room': []
  };

  const group_below = this.floor_plan_.get_group_below(this.state_.active_group);
  if (group_below !== undefined) {
    group_below.rooms.forEach(function(room) {
      const room_entity = new beestat.component.floor_plan_entity.room(self.floor_plan_, self.state_)
        .set_enabled(false)
        .set_room(room)
        .set_group(self.state_.active_group);
      room_entity.render(self.floor_plan_.get_g());
    });
  }

  // Loop over the rooms in this group and add them.
  this.state_.active_group.rooms.forEach(function(room) {
    const room_entity = new beestat.component.floor_plan_entity.room(self.floor_plan_, self.state_)
      .set_room(room)
      .set_group(self.state_.active_group);

    // Update the GUI and save when a room changes.
    room_entity.addEventListener('update', function() {
      self.floor_plan_.update_infobox();
      self.update_info_pane_();
      self.update_floor_plan_();
    });

    // Update GUI when a room is selected.
    room_entity.addEventListener('activate', function() {
      self.floor_plan_.update_infobox();
      self.floor_plan_.update_toolbar();
      self.update_info_pane_();
    });

    // Update GUI when a room is deselected.
    room_entity.addEventListener('inactivate', function() {
      self.floor_plan_.update_infobox();
      self.floor_plan_.update_toolbar();
      self.update_info_pane_();
    });

    // Activate the currently active room (mostly for rerenders).
    if (
      self.state_.active_room_entity !== undefined &&
      room.room_id === self.state_.active_room_entity.get_room().room_id
    ) {
      room_entity.set_active(true);
    }

    // Render the room and save to the list of current entities.
    room_entity.render(self.floor_plan_.get_g());
    self.entities_.room.push(room_entity);
  });

  /**
   * If there was an active room, defer to adding it last so it ends up on
   * top. The set_active function doesn't do anything if the room isn't
   * rendered otherwise.
   */
  if (this.state_.active_room_entity !== undefined) {
    this.state_.active_room_entity.render(this.floor_plan_.get_g());
    this.entities_.room.push(this.state_.active_room_entity);
  }
};

/**
 * Decorate the info pane.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_ = function(parent) {
  if (this.state_.active_room !== undefined) {
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
    .set_maxlength('50')
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
  });
  name_input.addEventListener('change', function() {
    self.state_.active_group.name = name_input.get_value();
    self.update_floor_plan_();
  });

  // Elevation
  div = $.createElement('div');
  grid.appendChild(div);
  const elevation_input = new beestat.component.input.text()
    .set_label('Elevation (feet)')
    .set_placeholder(this.state_.active_group.elevation / 12)
    .set_value(this.state_.active_group.elevation / 12 || '')
    .set_width('100%')
    .set_maxlength('5')
    .set_requirements({
      'type': 'integer',
      'required': true
    })
    .render(div);

  elevation_input.addEventListener('change', function() {
    if (elevation_input.meets_requirements() === true) {
      self.state_.active_group.elevation = elevation_input.get_value() * 12;
      self.update_floor_plan_();
      self.rerender();
    } else {
      elevation_input.set_value(self.state_.active_group.elevation);
    }
  });

  // Ceiling Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Ceiling Height (feet)')
    .set_placeholder(this.state_.active_group.height / 12)
    .set_value(this.state_.active_group.height / 12 || '')
    .set_width('100%')
    .set_maxlength('4')
    .set_requirements({
      'type': 'integer',
      'min_value': 1,
      'required': true
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      self.state_.active_group.height = height_input.get_value() * 12;
      self.update_floor_plan_();
    } else {
      height_input.set_value(self.state_.active_group.height);
    }
  });

  // Sensor
  div = $.createElement('div');
  grid.appendChild(div);
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
    .set_maxlength('50')
    .set_requirements({
      'required': true
    })
    .render(div);

  if (this.state_.active_room.name !== undefined) {
    name_input.set_value(this.state_.active_room.name);
  }

  name_input.addEventListener('input', function() {
    self.state_.active_room.name = name_input.get_value();
    self.floor_plan_.update_infobox();
  });
  name_input.addEventListener('change', function() {
    self.state_.active_room.name = name_input.get_value();
    self.update_floor_plan_();
  });

  // Elevation
  div = $.createElement('div');
  grid.appendChild(div);
  const elevation_input = new beestat.component.input.text()
    .set_label('Elevation (feet)')
    .set_placeholder(this.state_.active_group.elevation / 12)
    .set_value(this.state_.active_room.elevation / 12 || '')
    .set_width('100%')
    .set_maxlength('5')
    .set_requirements({
      'type': 'integer'
    })
    .render(div);

  elevation_input.addEventListener('change', function() {
    if (elevation_input.meets_requirements() === true) {
      self.state_.active_room.elevation = elevation_input.get_value() * 12;
      self.update_floor_plan_();
      self.rerender();
    } else {
      elevation_input.set_value('');
    }
  });

  // Ceiling Height
  div = $.createElement('div');
  grid.appendChild(div);
  const height_input = new beestat.component.input.text()
    .set_label('Ceiling Height (feet)')
    .set_placeholder(this.state_.active_group.height / 12)
    .set_value(this.state_.active_room.height / 12 || '')
    .set_width('100%')
    .set_maxlength('4')
    .set_requirements({
      'type': 'integer',
      'min_value': 1
    })
    .render(div);

  height_input.addEventListener('change', function() {
    if (height_input.meets_requirements() === true) {
      self.state_.active_room.height = height_input.get_value() * 12;
      self.update_floor_plan_();
    } else {
      height_input.set_value('');
    }
  });

  // Sensor
  div = $.createElement('div');
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
    const thermostat_sensors = beestat.sensor.get_sorted(
      thermostat.thermostat_id
    );
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

  if (self.state_.active_room.sensor_id !== undefined) {
    sensor_input.set_value(self.state_.active_room.sensor_id);
  } else {
    sensor_input.set_value('');
  }

  sensor_input.addEventListener('change', function() {
    if (sensor_input.get_value() === '') {
      delete self.state_.active_room.sensor_id;
    } else {
      self.state_.active_room.sensor_id = Number(sensor_input.get_value());
    }
    self.update_floor_plan_();
  });
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
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.floor_plan_editor.prototype.get_title_ = function() {
  return 'Floor Plan';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} Subtitle
 */
beestat.component.card.floor_plan_editor.prototype.get_subtitle_ = function() {
  if (beestat.setting('floor_plan_id') !== null) {
    const floor_plan = beestat.cache.floor_plan[beestat.setting('floor_plan_id')];
    return floor_plan.name;
  }

  return null;
};

/**
 * Update the floor plan in the database. This is throttled so the update can
 * only run so fast.
 */
beestat.component.card.floor_plan_editor.prototype.update_floor_plan_ = function() {
  const self = this;

  window.clearTimeout(this.update_timeout_);
  this.update_timeout_ = window.setTimeout(function() {
    new beestat.api()
      .add_call(
        'floor_plan',
        'update',
        {
          'attributes': {
            'floor_plan_id': beestat.setting('floor_plan_id'),
            'data': self.get_floor_plan_data_(beestat.setting('floor_plan_id'))
          }
        },
        'update_floor_plan'
      )
      .send();
  }, 1000);
};

/**
 * Get floor plan data with UUIDs stripped.
 *
 * @param {number} floor_plan_id Floor plan ID
 *
 * @return {object} The modified floor plan data.
 */
beestat.component.card.floor_plan_editor.prototype.get_floor_plan_data_ = function(floor_plan_id) {
  const floor_plan = beestat.cache.floor_plan[floor_plan_id];
  const data = beestat.clone(floor_plan.data);
  data.groups.forEach(function(group) {
    delete group.group_id;
    group.rooms.forEach(function(room) {
      delete room.room_id;
    });
  });
  return data;
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_top_right_ = function(parent) {
  const self = this;

  var menu = (new beestat.component.menu()).render(parent);

  if (window.is_demo === false) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Add New')
      .set_icon('plus')
      .set_callback(function() {
        new beestat.component.modal.create_floor_plan(
          self.thermostat_id_
        ).render();
      }));

    if (Object.keys(beestat.cache.floor_plan).length > 1) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Switch')
        .set_icon('swap_horizontal')
        .set_callback(function() {
          (new beestat.component.modal.change_floor_plan()).render();
        }));
    }

    if (beestat.setting('floor_plan_id') !== null) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Edit')
        .set_icon('pencil')
        .set_callback(function() {
          new beestat.component.modal.update_floor_plan(
            beestat.setting('floor_plan_id')
          ).render();
        }));
    }

    if (beestat.setting('floor_plan_id') !== null) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Delete')
        .set_icon('delete')
        .set_callback(function() {
          new beestat.component.modal.delete_floor_plan(
            beestat.setting('floor_plan_id')
          ).render();
        }));
    }
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      // TODO
      // window.open('https://doc.beestat.io/???');
    }));
};
