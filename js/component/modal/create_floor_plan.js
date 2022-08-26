/**
 * Create a floor plan.
 *
 * @param {integer} thermostat_id
 */
beestat.component.modal.create_floor_plan = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.modal.apply(this, arguments);

  this.state_.error = {};
};
beestat.extend(beestat.component.modal.create_floor_plan, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.create_floor_plan.prototype.decorate_contents_ = function(parent) {
  const self = this;
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  parent.appendChild($.createElement('p').innerHTML('Describe your home to help create this floor plan.'));

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
    name_input.set_value('Home');
  }

  // Floor count
  const floor_container = document.createElement('div');
  floor_container.style.marginBottom = `${beestat.style.size.gutter}px`;
  parent.appendChild(floor_container);

  (new beestat.component.title('How many floors does your home have?'))
    .render($(floor_container));

  const floor_count_input = new beestat.component.input.text()
    .set_icon('layers')
    .set_maxlength(1)
    .set_requirements({
      'min_value': 1,
      'max_value': 8,
      'type': 'integer',
      'required': true
    })
    .render($(floor_container));

  floor_count_input.addEventListener('change', function() {
    self.state_.floor_count = floor_count_input.get_value();
    self.state_.error.floor_count = !floor_count_input.meets_requirements();
  });

  if (self.state_.floor_count !== undefined) {
    floor_count_input.set_value(self.state_.floor_count);
  } else if (
    thermostat.property.stories !== null &&
    self.state_.error.floor_count !== true
  ) {
    floor_count_input.set_value(thermostat.property.stories);
  }

  // Basement
  const basement_checkbox = new beestat.component.input.checkbox()
    .set_label('One of these floors is a basement')
    .render($(floor_container));

  basement_checkbox.addEventListener('change', function() {
    self.state_.basement = basement_checkbox.get_checked();
  });

  if (self.state_.basement !== undefined) {
    basement_checkbox.set_value(self.state_.basement);
  }

  // Ceiling height
  (new beestat.component.title('How tall are your ceilings (feet)?')).render(parent);

  const height_input = new beestat.component.input.text()
    .set_icon('arrow_expand_vertical')
    .set_maxlength(2)
    .set_requirements({
      'min_value': 1,
      'type': 'integer',
      'required': true
    })
    .render(parent);

  height_input.addEventListener('change', function() {
    self.state_.height = height_input.get_value();
    self.state_.error.height = !height_input.meets_requirements();
  });

  if (self.state_.height !== undefined) {
    height_input.set_value(self.state_.height);
  } else if (self.state_.error.height !== true) {
    height_input.set_value(8);
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

      if (addresses.length === 1) {
        radio.set_checked(true);
        self.state_.address_id = Number(address.address_id);
      }

      radio_group.add_radio(radio);
    }
  });

  radio_group.add_radio(
    new beestat.component.input.radio()
      .set_label('Not Listed')
      .set_checked(addresses.length === 0)
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
beestat.component.modal.create_floor_plan.prototype.get_title_ = function() {
  return 'Create Floor Plan';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.create_floor_plan.prototype.get_buttons_ = function() {
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
    .set_text('Create Floor Plan')
    .addEventListener('click', function() {
      this
        .set_background_color(beestat.style.color.gray.base)
        .set_background_hover_color()
        .removeEventListener('click');

      // Fail if there are errors.
      if (
        self.state_.error.floor_count === true ||
        self.state_.error.height === true ||
        self.state_.error.name === true
      ) {
        self.rerender();
        return;
      }

      const attributes = {
        'name': self.state_.name
      };
      if (self.state_.address_id !== undefined) {
        attributes.address_id = self.state_.address_id;
      }
      attributes.data = {
        'groups': []
      };
      let elevation = (self.state_.basement === true) ? (self.state_.height * -12) : 0;
      let floor = (self.state_.basement === true) ? 0 : 1;
      const ordinals = [
        'First',
        'Second',
        'Third',
        'Fourth',
        'Fifth',
        'Sixth',
        'Seventh',
        'Eighth',
        'Ninth'
      ];
      for (let i = 0; i < self.state_.floor_count; i++) {
        attributes.data.groups.push({
          'name': floor === 0 ? 'Basement' : (ordinals[floor - 1] + ' Floor'),
          'elevation': elevation,
          'height': self.state_.height * 12,
          'rooms': []
        });

        floor++;
        elevation += (self.state_.height * 12);
      }

      new beestat.api()
        .add_call(
          'floor_plan',
          'create',
          {
            'attributes': attributes
          },
          'new_floor_plan'
        )
        .add_call(
          'floor_plan',
          'read_id',
          {},
          'floor_plan'
        )
        .set_callback(function(response) {
          beestat.cache.set('floor_plan', response.floor_plan);
          beestat.setting('visualize.floor_plan_id', response.new_floor_plan.floor_plan_id);
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
beestat.component.modal.create_floor_plan.prototype.decorate_error_ = function(parent) {
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

  if (this.state_.error.floor_count === true) {
    div.appendChild($.createElement('div').innerText('Number of floors is invalid.'));
    has_error = true;
  }

  if (this.state_.error.height === true) {
    div.appendChild($.createElement('div').innerText('Ceiling height is invalid.'));
    has_error = true;
  }

  if (has_error === true) {
    parent.appendChild(div);
  }
};
