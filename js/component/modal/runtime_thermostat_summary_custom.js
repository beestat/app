/**
 * Custom date range for the aggregate runtime chart.
 */
beestat.component.modal.runtime_thermostat_summary_custom = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.runtime_thermostat_summary_custom, beestat.component.modal);

beestat.component.modal.runtime_thermostat_summary_custom.prototype.decorate_contents_ = function(parent) {
  var self = this;

  parent.appendChild($.createElement('p').innerHTML('Choose a custom range to display on the Aggregate Runtime chart.'));

  // Time count
  var time_count = new beestat.component.input.text()
    .set_style({
      'width': 75,
      'text-align': 'center',
      'border-bottom': '2px solid ' + beestat.style.color.lightblue.base
    })
    .set_attribute({
      'maxlength': 10
    })
    .set_icon('pound')
    .set_value(beestat.setting('runtime_thermostat_summary_time_count'));

  self.state_.runtime_thermostat_summary_time_count =
    beestat.setting('runtime_thermostat_summary_time_count');

  time_count.addEventListener('blur', function() {
    self.state_.runtime_thermostat_summary_time_count =
      parseInt(this.get_value(), 10) || 1;
  });

  // Button groups
  var options = {
    'runtime_thermostat_summary_time_period': [
      'day',
      'week',
      'month',
      'year',
      'all'
    ],
    'runtime_thermostat_summary_group_by': [
      'day',
      'week',
      'month',
      'year'
    ]
  };

  var button_groups = {};

  this.selected_buttons_ = {};
  for (let key in options) {
    let current_type = beestat.setting(key);

    let button_group = new beestat.component.button_group();
    options[key].forEach(function(value) {
      let text = value.replace('runtime_thermostat_summary_', '')
        .charAt(0)
        .toUpperCase() +
        value.slice(1) +
        (
          (
            key === 'runtime_thermostat_summary_time_period' &&
            value !== 'all'
          ) ? 's' : ''
        );

      let button = new beestat.component.button()
        .set_background_hover_color(beestat.style.color.lightblue.base)
        .set_text_color('#fff')
        .set_text(text)
        .addEventListener('click', function() {
          if (key === 'runtime_thermostat_summary_time_period') {
            if (value === 'all') {
              time_count.set_value('∞').disable();
            } else if (time_count.get_value() === '∞') {
              time_count
                .set_value(self.state_.runtime_thermostat_summary_time_count || '1')
                .enable();
              time_count.dispatchEvent('blur');
            }
          }

          if (current_type !== value) {
            this.set_background_color(beestat.style.color.lightblue.base);
            if (self.selected_buttons_[key] !== undefined) {
              self.selected_buttons_[key]
                .set_background_color(beestat.style.color.bluegray.base);
            }
            self.selected_buttons_[key] = this;
            self.state_[key] = value;
            current_type = value;
          }
        });

      if (current_type === value) {
        if (
          key === 'runtime_thermostat_summary_time_period' &&
          value === 'all'
        ) {
          time_count.set_value('∞').disable();
        }

        button.set_background_color(beestat.style.color.lightblue.base);
        self.state_[key] = value;
        self.selected_buttons_[key] = button;
      } else {
        button.set_background_color(beestat.style.color.bluegray.base);
      }

      button_group.add_button(button);
    });
    button_groups[key] = button_group;
  }

  // Display it all
  var row;
  var column;

  (new beestat.component.title('Time Period')).render(parent);
  row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  column = $.createElement('div').addClass(['column column_2']);
  row.appendChild(column);
  time_count.render(column);
  column = $.createElement('div').addClass(['column column_10']);
  row.appendChild(column);
  button_groups.runtime_thermostat_summary_time_period.render(column);
  (new beestat.component.title('Group By')).render(parent);
  row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);
  button_groups.runtime_thermostat_summary_group_by.render(column);
};

/**
 * Get title.
 *
 * @return {string} Title
 */
beestat.component.modal.runtime_thermostat_summary_custom.prototype.get_title_ = function() {
  return 'Aggregate Runtime - Custom Range';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.runtime_thermostat_summary_custom.prototype.get_buttons_ = function() {
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

      beestat.setting(
        {
          'runtime_thermostat_summary_time_count':
            self.state_.runtime_thermostat_summary_time_period === 'all'
              ? 0
              : self.state_.runtime_thermostat_summary_time_count,
          'runtime_thermostat_summary_time_period':
            self.state_.runtime_thermostat_summary_time_period,
          'runtime_thermostat_summary_group_by':
            self.state_.runtime_thermostat_summary_group_by
        },
        undefined,
        function() {
          self.dispose();
        }
      );
    });

  return [
    cancel,
    save
  ];
};
