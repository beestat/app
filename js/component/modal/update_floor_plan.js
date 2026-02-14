/**
 * Update a floor plan.
 *
 * @param {integer} floor_plan_id
 */
beestat.component.modal.update_floor_plan = function(floor_plan_id) {
  this.floor_plan_id_ = floor_plan_id;

  beestat.component.modal.apply(this, arguments);

  this.state_.error = {};
};
beestat.extend(beestat.component.modal.update_floor_plan, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.update_floor_plan.prototype.decorate_contents_ = function(parent) {
  const self = this;

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  parent.appendChild($.createElement('p').innerHTML('Make changes to your floor plan below.'));

  // Name
  (new beestat.component.title('Give your floor plan a name')).render(parent);

  const name_input = new beestat.component.input.text()
    .set_icon('label')
    .set_maxlength(255)
    .set_requirements({
      'required': true
    })
    .render(parent);

  name_input.addEventListener('change', function() {
    self.state_.name = name_input.get_value();
    self.state_.error.name = !name_input.meets_requirements();
  });

  if (self.state_.name !== undefined) {
    name_input.set_value(self.state_.name);
  } else if (self.state_.error.name !== true) {
    name_input.set_value(floor_plan.name);
  }

  // Floors
  const floors_title_container = document.createElement('div');
  floors_title_container.style.marginTop = `${beestat.style.size.gutter}px`;
  parent.appendChild(floors_title_container);
  (new beestat.component.title('Floors')).render($(floors_title_container));
  parent.appendChild($.createElement('p').innerHTML('To add or remove floors, create a new floor plan. Change floor settings like name, elevation, and ceiling height on the editor.'));

  const grid = document.createElement('div');

  Object.assign(grid.style, {
    'display': 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(150px, 1fr))',
    'column-gap': `${beestat.style.size.gutter}px`,
    'row-gap': `${beestat.style.size.gutter}px`,
    'margin-bottom': `${beestat.style.size.gutter}px`
  });

  parent.appendChild(grid);

  const sorted_groups = Object.values(floor_plan.data.groups)
    .sort(function(a, b) {
      return a.elevation > b.elevation;
    });

  sorted_groups.forEach(function(group) {
    new beestat.component.tile.floor_plan_group(group)
      .set_background_color(beestat.style.color.gray.dark)
      .set_shadow(false)
      .set_display('block')
      .render($(grid));
  });

  // Appearance (early access only)
  if (beestat.user.has_early_access() === true) {
    (new beestat.component.title('Appearance')).render(parent);
    parent.appendChild($.createElement('p').innerHTML('Customize how your floor plan looks in the visualizer\'s environment mode.'));

    const appearance_grid = document.createElement('div');
    Object.assign(appearance_grid.style, {
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
      'column-gap': `${beestat.style.size.gutter}px`,
      'row-gap': `${beestat.style.size.gutter}px`,
      'margin-bottom': `${beestat.style.size.gutter}px`
    });
    parent.appendChild(appearance_grid);

    const add_options_alphabetically = function(select, options) {
      options
        .slice()
        .sort(function(a, b) {
          return a.label.localeCompare(b.label);
        })
        .forEach(function(option) {
          select.add_option(option);
        });
    };

    // Roof Style dropdown
    const roof_style_select = new beestat.component.input.select()
      .set_label('Roof Style')
      .set_width('100%');

    add_options_alphabetically(roof_style_select, [
      {'label': 'Hip', 'value': 'hip'},
      {'label': 'Flat', 'value': 'flat'}
    ]);

    roof_style_select.addEventListener('change', function() {
      if (self.state_.appearance === undefined) {
        self.state_.appearance = {};
      }
      self.state_.appearance.roof_style = roof_style_select.get_value();
    });

    roof_style_select.render($(appearance_grid));

    const current_roof_style = self.state_.appearance?.roof_style !== undefined
      ? self.state_.appearance.roof_style
      : (floor_plan.data.appearance?.roof_style || 'hip');
    roof_style_select.set_value(current_roof_style);

    // Roof Color dropdown
    const roof_color_select = new beestat.component.input.select()
      .set_label('Roof Color')
      .set_width('100%');

    const roof_colors = [
      {'label': 'Charcoal', 'value': '#3a3a3a'},
      {'label': 'Black', 'value': '#1a1a1a'},
      {'label': 'Weathered Gray', 'value': '#6a6a6a'},
      {'label': 'Driftwood', 'value': '#8b7d6b'},
      {'label': 'Brown', 'value': '#4a3a2a'},
      {'label': 'Dark Brown', 'value': '#2a1a0a'},
      {'label': 'Slate', 'value': '#5a6a7a'},
      {'label': 'Terracotta', 'value': '#8b4513'},
      {'label': 'Forest Green', 'value': '#2d4a2e'},
      {'label': 'Colonial Blue', 'value': '#3a5a6a'}
    ];

    add_options_alphabetically(roof_color_select, roof_colors);

    roof_color_select.addEventListener('change', function() {
      if (self.state_.appearance === undefined) {
        self.state_.appearance = {};
      }
      self.state_.appearance.roof_color = roof_color_select.get_value();
    });

    roof_color_select.render($(appearance_grid));

    const current_roof_color = self.state_.appearance?.roof_color !== undefined
      ? self.state_.appearance.roof_color
      : (floor_plan.data.appearance?.roof_color || '#3a3a3a');
    roof_color_select.set_value(current_roof_color);

    // Siding Color dropdown
    const siding_color_select = new beestat.component.input.select()
      .set_label('Siding Color')
      .set_width('100%');

    const siding_colors = [
      {'label': 'White', 'value': '#f5f5f5'},
      {'label': 'Cream', 'value': '#f0e8d0'},
      {'label': 'Greige', 'value': '#c9c3b8'},
      {'label': 'Charcoal', 'value': '#3a3a3a'},
      {'label': 'Sage', 'value': '#8a9a7a'},
      {'label': 'Navy', 'value': '#4a5a6a'},
      {'label': 'Brick Red', 'value': '#9a4a3a'},
      {'label': 'Sandstone', 'value': '#d4c4a8'},
      {'label': 'Taupe', 'value': '#8b7d6b'},
      {'label': 'Terracotta', 'value': '#b85a3a'}
    ];

    add_options_alphabetically(siding_color_select, siding_colors);

    siding_color_select.addEventListener('change', function() {
      if (self.state_.appearance === undefined) {
        self.state_.appearance = {};
      }
      self.state_.appearance.siding_color = siding_color_select.get_value();
    });

    siding_color_select.render($(appearance_grid));

    const current_siding_color = self.state_.appearance?.siding_color !== undefined
      ? self.state_.appearance.siding_color
      : (floor_plan.data.appearance?.siding_color || '#889aaa');
    siding_color_select.set_value(current_siding_color);

    // Ground Color dropdown
    const ground_color_select = new beestat.component.input.select()
      .set_label('Ground Color')
      .set_width('100%');

    const ground_colors = [
      {'label': 'Summer Grass', 'value': '#4a7c3f'},
      {'label': 'Fall Grass', 'value': '#9a8a5a'},
      {'label': 'Winter Snow', 'value': '#f0f0f0'},
      {'label': 'Bare Dirt', 'value': '#7a5c3a'},
      {'label': 'Gravel', 'value': '#999999'},
      {'label': 'Coastal Sand', 'value': '#e0d5b7'},
      {'label': 'Desert Landscape', 'value': '#c4a57a'}
    ];

    add_options_alphabetically(ground_color_select, ground_colors);

    ground_color_select.addEventListener('change', function() {
      if (self.state_.appearance === undefined) {
        self.state_.appearance = {};
      }
      self.state_.appearance.ground_color = ground_color_select.get_value();
    });

    ground_color_select.render($(appearance_grid));

    const current_ground_color = self.state_.appearance?.ground_color !== undefined
      ? self.state_.appearance.ground_color
      : (floor_plan.data.appearance?.ground_color || '#4a7c3f');
    ground_color_select.set_value(current_ground_color);
  }

  // Address
  (new beestat.component.title('What is the address for this home?')).render(parent);
  parent.appendChild($.createElement('p').innerHTML('Addresses are pulled directly from your ecobee data.'));

  const radio_group = new beestat.component.radio_group();
  const addresses = Object.values(beestat.cache.address);
  addresses.forEach(function(address) {
    if (beestat.address.is_valid(address.address_id) === true) {
      let radio = new beestat.component.input.radio()
        .set_label(beestat.address.get_lines(address.address_id)[0])
        .set_value(address.address_id);

      if (address.address_id === floor_plan.address_id) {
        radio.set_checked(true);
        self.state_.address_id = Number(address.address_id);
      }

      radio_group.add_radio(radio);
    }
  });

  radio_group.add_radio(
    new beestat.component.input.radio()
      .set_label('Not Listed')
      .set_checked(floor_plan.address_id === null)
  );

  radio_group.addEventListener('change', function() {
    if (radio_group.get_value() === undefined) {
      delete self.state_.address_id;
    } else {
      self.state_.address_id = Number(radio_group.get_value());
    }
  });

  radio_group.render(parent);

  this.decorate_error_(parent);
};

/**
 * Get title.
 *
 * @return {string} The title.
 */
beestat.component.modal.update_floor_plan.prototype.get_title_ = function() {
  return 'Edit Floor Plan';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.update_floor_plan.prototype.get_buttons_ = function() {
  const self = this;

  const cancel = new beestat.component.tile()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.red.base)
    .set_shadow(false)
    .set_text('Cancel')
    .addEventListener('click', function() {
      self.dispose();
    });

  const save = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Update Floor Plan')
    .addEventListener('click', function() {
      this
        .set_background_color(beestat.style.color.gray.base)
        .set_background_hover_color()
        .removeEventListener('click');

      // Fail if there are errors.
      if (
        self.state_.error.name === true
      ) {
        self.rerender();
        return;
      }

      const floor_plan = beestat.cache.floor_plan[self.floor_plan_id_];
      const attributes = {
        'floor_plan_id': self.floor_plan_id_,
        'name': self.state_.name,
        'address_id': self.state_.address_id === undefined ? null : self.state_.address_id
      };

      // Include appearance if modified
      if (self.state_.appearance !== undefined && Object.keys(self.state_.appearance).length > 0) {
        // Ensure rotation is numeric
        if (self.state_.appearance.rotation !== undefined) {
          self.state_.appearance.rotation = parseInt(self.state_.appearance.rotation, 10);
        }

        // Merge with existing floor plan data
        const updated_data = beestat.clone(floor_plan.data);
        updated_data.appearance = {
          ...(updated_data.appearance || {}),
          ...self.state_.appearance
        };
        attributes.data = updated_data;
      }

      self.dispose();
      new beestat.api()
        .add_call(
          'floor_plan',
          'update',
          {
            'attributes': attributes
          },
          'update_floor_plan'
        )
        .add_call(
          'floor_plan',
          'read_id',
          {},
          'floor_plan'
        )
        .set_callback(function(response) {
          beestat.cache.set('floor_plan', response.floor_plan);
        })
        .send();
    });

  return [
    cancel,
    save
  ];
};

/**
 * Decorate the error area.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.update_floor_plan.prototype.decorate_error_ = function(parent) {
  let has_error = false;

  var div = $.createElement('div').style({
    'background': beestat.style.color.red.base,
    'color': '#fff',
    'border-radius': beestat.style.size.border_radius,
    'padding': beestat.style.size.gutter
  });

  if (this.state_.error.name === true) {
    div.appendChild($.createElement('div').innerText('Name is required.'));
    has_error = true;
  }

  if (has_error === true) {
    parent.appendChild(div);
  }
};
