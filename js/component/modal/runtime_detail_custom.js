/**
 * Custom date range for the Runtime Detail chart.
 */
beestat.component.modal.runtime_detail_custom = function() {
  beestat.component.modal.apply(this, arguments);
  this.state_.runtime_detail_range_type = beestat.setting('runtime_detail_range_type');
  this.state_.runtime_detail_range_dynamic = beestat.setting('runtime_detail_range_dynamic');
  this.state_.runtime_detail_range_static_begin = beestat.setting('runtime_detail_range_static_begin');
  this.state_.runtime_detail_range_static_end = beestat.setting('runtime_detail_range_static_end');
  this.state_.error = {
    'max_range': false,
    'invalid_range_begin': false,
    'invalid_range_end': false,
    'out_of_sync_range': false
  };
};
beestat.extend(beestat.component.modal.runtime_detail_custom, beestat.component.modal);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.runtime_detail_custom.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Choose a custom range to display on the Runtime Detail chart.'));

  this.decorate_range_type_(parent);

  if (this.state_.runtime_detail_range_type === 'dynamic') {
    this.decorate_range_dynamic_(parent);
  } else {
    this.decorate_range_static_(parent);
  }

  this.decorate_error_(parent);
};

/**
 * Decorate the range type selector.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.runtime_detail_custom.prototype.decorate_range_type_ = function(parent) {
  var self = this;

  var button_group = new beestat.component.button_group();

  button_group.add_button(new beestat.component.button()
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .set_background_color(
      this.state_.runtime_detail_range_type === 'dynamic'
        ? beestat.style.color.lightblue.base
        : beestat.style.color.bluegray.base
    )
    .set_text('Dynamic')
    .addEventListener('click', function() {
      self.state_.runtime_detail_range_type = 'dynamic';
      self.rerender();
    }));

  button_group.add_button(new beestat.component.button()
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .set_background_color(
      this.state_.runtime_detail_range_type === 'static'
        ? beestat.style.color.lightblue.base
        : beestat.style.color.bluegray.base
    )
    .set_text('Static')
    .addEventListener('click', function() {
      self.state_.runtime_detail_range_type = 'static';
      self.rerender();
    }));

  (new beestat.component.title('Range Type')).render(parent);
  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);
  button_group.render(column);
};

/**
 * Decorate the static range inputs.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.runtime_detail_custom.prototype.decorate_range_static_ = function(parent) {
  var self = this;

  var runtime_detail_static_range_begin;
  var runtime_detail_static_range_end;

  /**
   * Check whether or not a value is outside of where data is synced.
   */
  var check_out_of_sync_range = function() {
    var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
    var min = moment.max(
      moment(thermostat.sync_begin),
      moment().subtract(1, 'year')
    );
    var max = moment(thermostat.sync_end);

    var begin = moment.min(
      moment(runtime_detail_static_range_begin.get_value()),
      moment(runtime_detail_static_range_end.get_value())
    );

    var end = moment.max(
      moment(runtime_detail_static_range_begin.get_value() + ' 00:00:00'),
      moment(runtime_detail_static_range_end.get_value() + ' 23:59:59')
    );

    if (
      begin.isBefore(min) === true ||
      end.isAfter(max) === true
    ) {
      self.state_.error.out_of_sync_range = true;
    } else {
      self.state_.error.out_of_sync_range = false;
    }
  };

  runtime_detail_static_range_begin = new beestat.component.input.text()
    .set_style({
      'width': 110,
      'text-align': 'center',
      'border-bottom': '2px solid ' + beestat.style.color.lightblue.base
    })
    .set_attribute({
      'maxlength': 10
    })
    .set_icon('calendar')
    .set_value(this.state_.runtime_detail_range_static_begin);

  runtime_detail_static_range_begin.addEventListener('blur', function() {
    var m = moment(this.get_value());
    if (m.isValid() === true) {
      self.state_.error.invalid_range_begin = false;

      var value = m.format('M/D/YYYY');

      var diff = Math.abs(m.diff(moment(runtime_detail_static_range_end.get_value()), 'day')) + 1;
      if (diff > 30) {
        self.state_.error.max_range = true;
      } else {
        self.state_.error.max_range = false;
      }

      check_out_of_sync_range();

      self.state_.runtime_detail_range_static_begin = value;
      self.rerender();
    } else {
      self.state_.runtime_detail_range_static_begin = this.get_value();
      self.state_.error.invalid_range_begin = true;
      self.rerender();
    }
  });

  runtime_detail_static_range_end = new beestat.component.input.text()
    .set_style({
      'width': 110,
      'text-align': 'center',
      'border-bottom': '2px solid ' + beestat.style.color.lightblue.base
    })
    .set_attribute({
      'maxlength': 10
    })
    .set_icon('calendar')
    .set_value(this.state_.runtime_detail_range_static_end);

  runtime_detail_static_range_end.addEventListener('blur', function() {
    var m = moment(this.get_value());
    if (m.isValid() === true) {
      self.state_.error.invalid_range_end = false;

      var value = m.format('M/D/YYYY');

      var diff = Math.abs(m.diff(moment(runtime_detail_static_range_begin.get_value()), 'day')) + 1;
      if (diff > 30) {
        self.state_.error.max_range = true;
      } else {
        self.state_.error.max_range = false;
      }

      check_out_of_sync_range();

      self.state_.runtime_detail_range_static_end = value;
      self.rerender();
    } else {
      self.state_.runtime_detail_range_static_end = this.get_value();
      self.state_.error.invalid_range_end = true;
      self.rerender();
    }
  });

  var span;

  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);

  span = $.createElement('span').style('display', 'inline-block');
  runtime_detail_static_range_begin.render(span);
  column.appendChild(span);

  span = $.createElement('span')
    .style({
      'display': 'inline-block',
      'margin-left': beestat.style.size.gutter,
      'margin-right': beestat.style.size.gutter
    })
    .innerText('to');
  column.appendChild(span);

  span = $.createElement('span').style('display', 'inline-block');
  runtime_detail_static_range_end.render(span);
  column.appendChild(span);
};

/**
 * Decorate the dynamic range input.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.runtime_detail_custom.prototype.decorate_range_dynamic_ = function(parent) {
  var self = this;

  var runtime_detail_range_dynamic = new beestat.component.input.text()
    .set_style({
      'width': 75,
      'text-align': 'center',
      'border-bottom': '2px solid ' + beestat.style.color.lightblue.base
    })
    .set_attribute({
      'maxlength': 2
    })
    .set_icon('pound')
    .set_value(beestat.setting('runtime_detail_range_dynamic'));

  runtime_detail_range_dynamic.addEventListener('blur', function() {
    var value = parseInt(this.get_value(), 10);
    if (isNaN(value) === true || value === 0) {
      value = 1;
    } else if (value > 30) {
      value = 30;
    }
    this.set_value(value);
    self.state_.runtime_detail_range_dynamic = value;
  });

  var span;

  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);

  span = $.createElement('span').style('display', 'inline-block');
  runtime_detail_range_dynamic.render(span);
  column.appendChild(span);

  span = $.createElement('span')
    .style({
      'display': 'inline-block',
      'margin-left': beestat.style.size.gutter
    })
    .innerText('days');
  column.appendChild(span);
};

/**
 * Decorate the error area.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.runtime_detail_custom.prototype.decorate_error_ = function(parent) {
  var div = $.createElement('div').style('color', beestat.style.color.red.base);
  if (this.state_.error.max_range === true) {
    div.appendChild($.createElement('div').innerText('Max range is 30 days.'));
  }
  if (this.state_.error.invalid_range_begin === true) {
    div.appendChild($.createElement('div').innerText('Invalid begin date.'));
  }
  if (this.state_.error.invalid_range_end === true) {
    div.appendChild($.createElement('div').innerText('Invalid end date.'));
  }
  if (this.state_.error.out_of_sync_range === true) {
    div.appendChild($.createElement('div').innerText('Detail not available for this range.'));
  }
  parent.appendChild(div);
};

/**
 * Get title.
 *
 * @return {string} Title
 */
beestat.component.modal.runtime_detail_custom.prototype.get_title_ = function() {
  return 'Runtime Detail - Custom Range';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.runtime_detail_custom.prototype.get_buttons_ = function() {
  var self = this;

  var cancel = new beestat.component.button()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.red.base)
    .set_text('Cancel')
    .addEventListener('click', function() {
      self.dispose();
    });

  var save;
  if (
    this.state_.error.max_range === true ||
    this.state_.error.invalid_range_begin === true ||
    this.state_.error.invalid_range_end === true ||
    this.state_.error.out_of_sync_range === true
  ) {
    save = new beestat.component.button()
      .set_background_color(beestat.style.color.gray.base)
      .set_text_color('#fff')
      .set_text('Save');
  } else {
    save = new beestat.component.button()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_text('Save')
      .addEventListener('click', function() {
        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .removeEventListener('click');

        if (moment(self.state_.runtime_detail_range_static_begin).isAfter(moment(self.state_.runtime_detail_range_static_end)) === true) {
          var temp = self.state_.runtime_detail_range_static_begin;
          self.state_.runtime_detail_range_static_begin = self.state_.runtime_detail_range_static_end;
          self.state_.runtime_detail_range_static_end = temp;
        }

        beestat.cache.delete('runtime_thermostat');
        beestat.setting(
          {
            'runtime_detail_range_type': self.state_.runtime_detail_range_type,
            'runtime_detail_range_dynamic': self.state_.runtime_detail_range_dynamic,
            'runtime_detail_range_static_begin': self.state_.runtime_detail_range_static_begin,
            'runtime_detail_range_static_end': self.state_.runtime_detail_range_static_end
          },
          undefined,
          function() {
            self.dispose();
          }
        );
      });
  }

  return [
    cancel,
    save
  ];
};
