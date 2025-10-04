/**
 * Glenwood Terms & Conditions / Privacy Card
 */
beestat.component.card.glenwood_enroll = function() {
  beestat.component.card.apply(this, arguments);

  // Default to the value saved to the setting in the constructor
  this.name = beestat.setting('glenwood_name') || '';
  this.unit_number = beestat.setting('glenwood_unit') || '';
  this.thermostat_ids = Array.isArray(beestat.setting('glenwood_thermostat_ids'))
    ? beestat.setting('glenwood_thermostat_ids').slice()
    : $.values(beestat.cache.thermostat).map(function(thermostat) { return thermostat.thermostat_id; });

  this.is_enrolled = beestat.setting('glenwood_enrolled') === true;
};
beestat.extend(beestat.component.card.glenwood_enroll, beestat.component.card);

beestat.component.card.glenwood_enroll.prototype.decorate_contents_ = function(parent) {
  var self = this;
  self.is_saving = self.is_saving || false;

  // Error message container
  var error_message_container = $.createElement('div')
    .style({
      'color': beestat.style.color.red.base,
      'margin-bottom': beestat.style.size.gutter + 'px',
      'display': 'none'
    });
  parent.appendChild(error_message_container);

  // Enrollment status line
  parent.appendChild(
    $.createElement('div')
      .style({
        'margin-bottom': beestat.style.size.gutter + 'px',
        'color': self.is_enrolled ? beestat.style.color.green.base : beestat.style.color.red.base
      })
      .innerText(self.is_enrolled ? 'You are currently enrolled.' : 'You are not currently enrolled.')
  );

  var input_container = $.createElement('div')
    .style({
      'display': 'flex',
      'gap': beestat.style.size.gutter + 'px',
      'margin-bottom': beestat.style.size.gutter + 'px'
    });

  // Name input
  var name_input = new beestat.component.input.text()
    .set_label('Name')
    .set_maxlength(64)
    .set_value(self.name)
    .set_enabled(!self.is_enrolled);
  name_input.render(input_container);

  // Save name to class variable on change
  name_input.addEventListener('input', function() {
    self.name = name_input.get_value() || '';
  });

  // Unit # input
  var unit_number_input = new beestat.component.input.text()
    .set_label('Unit #')
    .set_maxlength(16)
    .set_value(self.unit_number)
    .set_enabled(!self.is_enrolled);
  unit_number_input.render(input_container);

  // Save unit to class variable on change
  unit_number_input.addEventListener('input', function() {
    self.unit_number = unit_number_input.get_value() || '';
  });

  parent.appendChild(input_container);

  // Enrolled Thermostats title
  parent.appendChild(
    $.createElement('div')
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'margin-bottom': (beestat.style.size.gutter / 2) + 'px'
      })
      .innerText(self.is_enrolled ? 'Enrolled Thermostats' : 'Thermostats to Enroll')
  );

  // List thermostats with checkboxes
  var thermostat_container = $.createElement('div')
    .style({
      'margin-bottom': beestat.style.size.gutter + 'px'
    });

  var thermostat_checkbox_map = {};
  var all_thermostats = $.values(beestat.cache.thermostat);

  if (self.is_enrolled) {
    // Only show enrolled thermostats, keep order as in self.thermostat_ids
    self.thermostat_ids.forEach(function(thermostat_id) {
      var thermostat = beestat.cache.thermostat[thermostat_id];
      if (!thermostat) return;
      var row = $.createElement('div')
        .style({
          'display': 'flex',
          'align-items': 'center',
          'margin-bottom': (beestat.style.size.gutter / 2) + 'px'
        });

      var checkbox = new beestat.component.input.checkbox()
        .set_label(thermostat.name)
        .set_checked(true)
        .set_enabled(false)
        .render(row);

      thermostat_checkbox_map[thermostat_id] = checkbox;
      thermostat_container.appendChild(row);
    });
  } else {
    all_thermostats.forEach(function(thermostat) {
      var row = $.createElement('div')
        .style({
          'display': 'flex',
          'align-items': 'center',
          'margin-bottom': (beestat.style.size.gutter / 2) + 'px'
        });

      var is_checked = self.thermostat_ids.indexOf(thermostat.thermostat_id) !== -1;
      var checkbox = new beestat.component.input.checkbox()
        .set_label(thermostat.name)
        .set_checked(is_checked)
        .set_enabled(true)
        .render(row);

      thermostat_checkbox_map[thermostat.thermostat_id] = checkbox;

      checkbox.addEventListener('change', function() {
        // Update selected thermostats in class variable
        if (checkbox.get_checked()) {
          if (self.thermostat_ids.indexOf(thermostat.thermostat_id) === -1) {
            self.thermostat_ids.push(thermostat.thermostat_id);
          }
        } else {
          self.thermostat_ids = self.thermostat_ids.filter(function(id) {
            return id !== thermostat.thermostat_id;
          });
        }
      });

      thermostat_container.appendChild(row);
    });
  }

  parent.appendChild(thermostat_container);

  // Button container (bottom right)
  var button_container = $.createElement('div')
    .style({
      'display': 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-end'
    });

  // Button (Enroll/Unenroll) goes in the button container
  if (self.is_enrolled) {
    var unenroll_tile = new beestat.component.tile()
      .set_background_color(self.is_saving ? beestat.style.color.gray.base : beestat.style.color.red.base)
      .set_background_hover_color(self.is_saving ? beestat.style.color.gray.base : beestat.style.color.red.light)
      .set_text_color('#fff')
      .set_text('Unenroll')
      .render($(button_container));

    if (!self.is_saving) {
      unenroll_tile.addEventListener('click', function() {
        self.is_saving = true;
        self.rerender();
        beestat.setting({
          'glenwood_enrolled': false,
          'glenwood_name': undefined,
          'glenwood_unit': undefined,
          'glenwood_thermostat_ids': undefined
        }, undefined, function() {
          self.is_saving = false;
          self.is_enrolled = false;
          self.name = '';
          self.unit_number = '';
          self.thermostat_ids = $.values(beestat.cache.thermostat).map(function(thermostat) { return thermostat.thermostat_id; });
          self.rerender();
        });
      });
    }
  } else {
    var enroll_tile = new beestat.component.tile()
      .set_background_color(self.is_saving ? beestat.style.color.gray.base : beestat.style.color.green.base)
      .set_background_hover_color(self.is_saving ? beestat.style.color.gray.base : beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_text('Enroll')
      .render($(button_container));

    if (!self.is_saving) {
      enroll_tile.addEventListener('click', function() {
        if (
          !(self.name && self.name.trim().length > 0) ||
          !(self.unit_number && self.unit_number.trim().length > 0) ||
          !Array.isArray(self.thermostat_ids) ||
          self.thermostat_ids.length === 0
        ) {
          self.error_message = 'Name, Unit #, and at least one thermostat are required.';
          self.rerender();
          return;
        }
        self.error_message = '';
        self.is_saving = true;
        self.rerender();

        beestat.setting({
          'glenwood_enrolled': true,
          'glenwood_name': self.name,
          'glenwood_unit': self.unit_number,
          'glenwood_thermostat_ids': self.thermostat_ids
        }, undefined, function() {
          self.is_saving = false;
          self.is_enrolled = true; // Update enrollment status
          self.rerender();
        });
      });
    }
  }

  // Error message under the button, as a child of the button container
  var error = $.createElement('div')
    .style({
      'color': beestat.style.color.red.base,
      'margin-top': beestat.style.gutter / 2 + 'px',
      'text-align': 'right',
      'min-height': '18px'
    })
    .innerText(self.error_message || '');
  button_container.appendChild(error);

  parent.appendChild(button_container);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.glenwood_enroll.prototype.get_title_ = function() {
  return 'Enrollment';
};