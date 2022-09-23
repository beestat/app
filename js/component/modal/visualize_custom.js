/**
 * Custom date range for the Runtime Detail chart.
 */
beestat.component.modal.visualize_custom = function() {
  beestat.component.modal.apply(this, arguments);

  this.state_.range_begin = beestat.setting('visualize.range_static.begin');
  this.state_.range_end = beestat.setting('visualize.range_static.end');

  this.state_.error = {
    'range_diff_invalid': {
      'triggered': false,
      'message': 'Max range is seven days'
    },
    'range_begin_invalid': {
      'triggered': false,
      'message': 'Begin date is invalid'
    },
    'range_end_invalid': {
      'triggered': false,
      'message': 'End date is invalid'
    }
  };
};
beestat.extend(beestat.component.modal.visualize_custom, beestat.component.modal);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.visualize_custom.prototype.decorate_contents_ = function(parent) {
  const instructions_container = document.createElement('p');
  instructions_container.innerText = 'Choose a date range of up to seven days. Multi-day ranges will be be averaged into a single 24-hour span.';
  parent.appendChild(instructions_container);

  this.decorate_inputs_(parent[0]);

  if (this.has_error_() === true) {
    this.decorate_error_(parent[0]);
  }
};

/**
 * Decorate the static range inputs.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.modal.visualize_custom.prototype.decorate_inputs_ = function(parent) {
  const self = this;

  const container = document.createElement('div');
  Object.assign(container.style, {
    'display': 'flex',
    'grid-gap': `${beestat.style.size.gutter}px`,
    'align-items': 'center'
  });
  parent.appendChild(container);

  // Range begin
  this.range_begin_input_ = new beestat.component.input.text()
    .set_width(110)
    .set_maxlength(10)
    .set_requirements({
      'required': true,
      'type': 'date'
    })
    .set_transform({
      'type': 'date'
    })
    .set_icon('calendar')
    .set_value(
      beestat.date(this.state_.range_begin)
    )
    .render($(container));

  this.range_begin_input_.addEventListener('blur', function() {
    self.state_.range_begin = this.get_value();
  });

  // To
  const to = document.createElement('div');
  to.innerText = 'to';
  container.appendChild(to);

  // Range end
  this.range_end_input_ = new beestat.component.input.text()
    .set_width(110)
    .set_maxlength(10)
    .set_requirements({
      'required': true,
      'type': 'date'
    })
    .set_transform({
      'type': 'date'
    })
    .set_icon('calendar')
    .set_value(
      beestat.date(this.state_.range_end)
    )
    .render($(container));

  this.range_end_input_.addEventListener('blur', function() {
    self.state_.range_end = this.get_value();
  });
};

/**
 * Decorate the error area.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.modal.visualize_custom.prototype.decorate_error_ = function(parent) {
  const container = document.createElement('div');
  Object.assign(container.style, {
    'background': beestat.style.color.red.base,
    'color': '#fff',
    'border-radius': `${beestat.style.size.border_radius}px`,
    'padding': `${beestat.style.size.gutter}px`,
    'margin-top': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(container);

  for (let key in this.state_.error) {
    if (this.state_.error[key].triggered === true) {
      const error_div = document.createElement('div');
      error_div.innerText = this.state_.error[key].message;
      container.appendChild(error_div);
    }
  }
};

/**
 * Check and see whether not there is currently an error.
 *
 * @return {boolean}
 */
beestat.component.modal.visualize_custom.prototype.has_error_ = function() {
  this.check_error_();

  for (let key in this.state_.error) {
    if (this.state_.error[key].triggered === true) {
      return true;
    }
  }

  return false;
};

/**
 * Check to see if there are any errors and update the state.
 */
beestat.component.modal.visualize_custom.prototype.check_error_ = function() {
  this.state_.error.range_begin_invalid.triggered =
    !this.range_begin_input_.meets_requirements();

  this.state_.error.range_end_invalid.triggered =
    !this.range_end_input_.meets_requirements();

  this.state_.error.range_diff_invalid.triggered = false;
  if (
    this.range_begin_input_.meets_requirements() === true &&
    this.range_end_input_.meets_requirements() === true
  ) {
    const range_begin_m = moment(this.range_begin_input_.get_value());
    const range_end_m = moment(this.range_end_input_.get_value());

    if (Math.abs(range_begin_m.diff(range_end_m, 'day')) > 7) {
      this.state_.error.range_diff_invalid.triggered = true;
    }
  }
};

/**
 * Get title.
 *
 * @return {string} Title
 */
beestat.component.modal.visualize_custom.prototype.get_title_ = function() {
  return 'Visualize - Custom Range';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.visualize_custom.prototype.get_buttons_ = function() {
  var self = this;

  var cancel = new beestat.component.tile()
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
    .set_text('Save')
    .addEventListener('click', function() {
      this
        .set_background_color(beestat.style.color.gray.base)
        .set_background_hover_color()
        .removeEventListener('click');

      if (self.has_error_() === true) {
        self.rerender();
      } else {
        if (moment(self.state_.range_begin).isAfter(moment(self.state_.range_end)) === true) {
          var temp = self.state_.range_begin;
          self.state_.range_begin = self.state_.range_end;
          self.state_.range_end = temp;
        }

        beestat.cache.delete('data.three_d__runtime_sensor');
        beestat.setting(
          {
            'visualize.range_type': 'static',
            'visualize.range_static.begin': self.state_.range_begin,
            'visualize.range_static.end': self.state_.range_end
          },
          undefined,
          function() {
            self.dispose();
          }
        );
      }
    });

  return [
    cancel,
    save
  ];
};
