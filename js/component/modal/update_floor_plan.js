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

      const attributes = {
        'floor_plan_id': self.floor_plan_id_,
        'name': self.state_.name,
        'address_id': self.state_.address_id === undefined ? null : self.state_.address_id
      };

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
