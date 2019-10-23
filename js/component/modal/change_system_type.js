/**
 * Change system type.
 */
beestat.component.modal.change_system_type = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.change_system_type, beestat.component.modal);

beestat.component.modal.change_system_type.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];

  parent.appendChild($.createElement('p').innerHTML('What type of HVAC system do you have? This applies to all thermostats in this group. System types that beestat detected are indicated.'));

  var options = {
    'heat': [
      'gas',
      'compressor',
      'electric',
      'boiler',
      'geothermal',
      'oil',
      'none'
    ],
    'heat_auxiliary': [
      'gas',
      'electric',
      'oil',
      'none'
    ],
    'cool': [
      'compressor',
      'geothermal',
      'none'
    ]
  };

  var titles = {
    'heat': 'Heat',
    'heat_auxiliary': 'Auxiliary Heat',
    'cool': 'Cool'
  };

  var colors = {
    'heat': beestat.style.color.orange.base,
    'heat_auxiliary': beestat.style.color.red.dark,
    'cool': beestat.style.color.blue.light
  };

  this.selected_types_ = {};
  this.selected_buttons_ = {};
  for (let key in options) {
    (new beestat.component.title(titles[key])).render(parent);

    let current_type = thermostat_group['system_type_' + key];

    let button_group = new beestat.component.button_group();
    options[key].forEach(function(system_type) {
      let text = system_type.charAt(0).toUpperCase() + system_type.slice(1);
      if (thermostat.system_type.detected[key] === system_type) {
        text += ' [Detected]';
      }

      let button = new beestat.component.button()
        .set_background_hover_color(colors[key])
        .set_text_color('#fff')
        .set_text(text)
        .addEventListener('click', function() {
          if (current_type !== system_type) {
            this.set_background_color(colors[key]);
            if (self.selected_buttons_[key] !== undefined) {
              self.selected_buttons_[key].set_background_color(beestat.style.color.bluegray.base);
            }
            self.selected_buttons_[key] = this;
            self.selected_types_[key] = system_type;
            current_type = system_type;
          }
        });

      if (current_type === system_type) {
        button.set_background_color(colors[key]);
        self.selected_types_[key] = system_type;
        self.selected_buttons_[key] = button;
      } else {
        button.set_background_color(beestat.style.color.bluegray.base);
      }

      button_group.add_button(button);
    });
    button_group.render(parent);
  }
};

beestat.component.modal.change_system_type.prototype.get_title_ = function() {
  return 'Change System Type';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.change_system_type.prototype.get_buttons_ = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var self = this;

  var cancel = new beestat.component.button()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.red.base)
    .set_text('Cancel')
    .addEventListener('click', function() {
      self.dispose();
    });

  var save = new beestat.component.button()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Save')
    .addEventListener('click', function() {
      this
        .set_background_color(beestat.style.color.gray.base)
        .set_background_hover_color()
        .removeEventListener('click');

      new beestat.api()
        .add_call(
          'thermostat_group',
          'update_system_types',
          {
            'thermostat_group_id': thermostat.thermostat_group_id,
            'system_types': self.selected_types_
          },
          'update_system_types'
        )
        .add_call('thermostat', 'read_id', {}, 'thermostat')
        .add_call('thermostat_group', 'read_id', {}, 'thermostat_group')
        .set_callback(function(response) {
          // Update the cache.
          beestat.cache.set('thermostat', response.thermostat);
          beestat.cache.set('thermostat_group', response.thermostat_group);

          // Re-run comparison scores as they are invalid for the new system
          // type.
          beestat.home_comparisons.get_comparison_scores();

          // Close the modal.
          self.dispose();
        })
        .send();
    });

  return [
    cancel,
    save
  ];
};
