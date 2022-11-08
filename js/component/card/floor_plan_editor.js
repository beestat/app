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
        'top': '59px'
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

  // Create and render a new SVG component.
  this.floor_plan_ = new beestat.component.floor_plan(
    beestat.setting('visualize.floor_plan_id'),
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
  let active_room_entity;
  this.state_.active_group.rooms.forEach(function(room) {
    const room_entity = new beestat.component.floor_plan_entity.room(self.floor_plan_, self.state_)
      .set_room(room)
      .set_group(self.state_.active_group);

    // Update the GUI and save when a room changes.
    room_entity.addEventListener('update', function() {
      self.floor_plan_.update_infobox();
      self.update_info_pane_();
      self.update_floor_plan_tile_();
      self.update_floor_plan_();
    });

    // Update GUI when a room is selected.
    room_entity.addEventListener('activate', function() {
      self.floor_plan_.update_infobox();
      self.floor_plan_.update_toolbar();
      self.update_info_pane_();
      self.update_floor_plan_tile_();
    });

    // Update GUI when a room is deselected.
    room_entity.addEventListener('inactivate', function() {
      self.floor_plan_.update_infobox();
      self.floor_plan_.update_toolbar();
      self.update_info_pane_();
      self.update_floor_plan_tile_();
    });

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
};

/**
 * Decorate the info pane.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.floor_plan_editor.prototype.decorate_info_pane_ = function(parent) {
  if (this.state_.active_room_entity !== undefined) {
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
  });
  name_input.addEventListener('change', function() {
    self.state_.active_group.name = name_input.get_value();
    self.update_floor_plan_();
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
  });
  name_input.addEventListener('change', function() {
    self.state_.active_room_entity.get_room().name = name_input.get_value();
    self.update_floor_plan_();
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
