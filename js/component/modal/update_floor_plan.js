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
  (new beestat.component.title('Floors')).render(parent);
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

  // Appearance
  (new beestat.component.title('Appearance')).render(parent);
  parent.appendChild($.createElement('p').innerHTML('Customize how your floor plan looks in 3D view.'));

  // Debug: Log current appearance data
  console.log('Floor plan appearance data:', floor_plan.data.appearance);
  console.log('State appearance:', self.state_.appearance);

  const appearance_grid = document.createElement('div');
  Object.assign(appearance_grid.style, {
    'display': 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))',
    'column-gap': `${beestat.style.size.gutter}px`,
    'row-gap': `${beestat.style.size.gutter}px`,
    'margin-bottom': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(appearance_grid);

  // Rotation input
  const rotation_input = new beestat.component.input.text()
    .set_label('Rotation (°)')
    .set_width('100%')
    .set_icon('rotate-right');

  const current_rotation = self.state_.appearance?.rotation !== undefined
    ? self.state_.appearance.rotation
    : (floor_plan.data.appearance?.rotation || 0);
  rotation_input.set_value(String(current_rotation));

  rotation_input.addEventListener('change', function() {
    if (self.state_.appearance === undefined) {
      self.state_.appearance = {};
    }
    const value = parseInt(rotation_input.get_value(), 10);
    if (!isNaN(value) && value >= 0 && value <= 359) {
      self.state_.appearance.rotation = value;
    }
  });

  rotation_input.render($(appearance_grid));

  // Roof Style dropdown
  const roof_style_select = new beestat.component.input.select()
    .set_label('Roof Style')
    .set_width('100%');

  roof_style_select.add_option({'label': 'Hip', 'value': 'hip'});
  roof_style_select.add_option({'label': 'Flat', 'value': 'flat'});

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
    {'label': 'Charcoal Gray', 'value': '#3a3a3a'},
    {'label': 'Black', 'value': '#1a1a1a'},
    {'label': 'Brown', 'value': '#4a3a2a'},
    {'label': 'Terracotta', 'value': '#8b4513'},
    {'label': 'Slate Blue', 'value': '#5a6a7a'},
    {'label': 'Forest Green', 'value': '#2d4a2e'},
    {'label': 'Burgundy Red', 'value': '#6b2c2c'},
    {'label': 'Weathered Gray', 'value': '#6a6a6a'}
  ];

  roof_colors.forEach(function(color) {
    roof_color_select.add_option(color);
  });

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
  console.log('Setting roof color to:', current_roof_color);
  roof_color_select.set_value(current_roof_color);

  // Siding Color dropdown
  const siding_color_select = new beestat.component.input.select()
    .set_label('Siding Color')
    .set_width('100%');

  const siding_colors = [
    {'label': 'Blue Gray', 'value': '#889aaa'},
    {'label': 'White', 'value': '#f5f5f5'},
    {'label': 'Beige', 'value': '#d4c4a8'},
    {'label': 'Light Gray', 'value': '#c0c0c0'},
    {'label': 'Red Brick', 'value': '#9a4a3a'},
    {'label': 'Brown', 'value': '#8b6f47'},
    {'label': 'Cream', 'value': '#f0e8d0'},
    {'label': 'Sage Green', 'value': '#8a9a7a'},
    {'label': 'Navy Blue', 'value': '#4a5a6a'}
  ];

  siding_colors.forEach(function(color) {
    siding_color_select.add_option(color);
  });

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
  console.log('Setting siding color to:', current_siding_color);
  siding_color_select.set_value(current_siding_color);

  // Ground Color dropdown
  const ground_color_select = new beestat.component.input.select()
    .set_label('Ground Color')
    .set_width('100%');

  const ground_colors = [
    {'label': 'Grass Green', 'value': '#4a7c3f'},
    {'label': 'Dried Grass', 'value': '#9a8a5a'},
    {'label': 'Desert Sand', 'value': '#c4a57a'},
    {'label': 'Dark Green', 'value': '#2a4a2a'},
    {'label': 'Snow', 'value': '#f0f0f0'},
    {'label': 'Autumn Grass', 'value': '#7a6a4a'}
  ];

  ground_colors.forEach(function(color) {
    ground_color_select.add_option(color);
  });

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
  console.log('Setting ground color to:', current_ground_color);
  ground_color_select.set_value(current_ground_color);

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
