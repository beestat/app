/**
 * Custom date range for the Air Quality Detail chart.
 */
beestat.component.modal.air_quality_detail_custom = function() {
  beestat.component.modal.apply(this, arguments);
  this.state_.air_quality_detail_range_type = beestat.setting('air_quality_detail_range_type');
  this.state_.air_quality_detail_range_dynamic = beestat.setting('air_quality_detail_range_dynamic');
  this.state_.air_quality_detail_range_static_begin = beestat.setting('air_quality_detail_range_static_begin');
  this.state_.air_quality_detail_range_static_end = beestat.setting('air_quality_detail_range_static_end');
  this.state_.error = {
    'max_range': false,
    'invalid_range_begin': false,
    'invalid_range_end': false,
    'out_of_sync_range': false
  };
};
beestat.extend(beestat.component.modal.air_quality_detail_custom, beestat.component.modal);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.air_quality_detail_custom.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Choose a custom range to display on the Air Quality Detail chart. Max range is 7 days at a time and 90 days in the past.'));

  this.decorate_range_type_(parent);

  if (this.state_.air_quality_detail_range_type === 'dynamic') {
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
beestat.component.modal.air_quality_detail_custom.prototype.decorate_range_type_ = function(parent) {
  var self = this;

  var tile_group = new beestat.component.tile_group();

  tile_group.add_tile(new beestat.component.tile()
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .set_background_color(
      this.state_.air_quality_detail_range_type === 'dynamic'
        ? beestat.style.color.lightblue.base
        : beestat.style.color.bluegray.base
    )
    .set_text('Dynamic')
    .addEventListener('click', function() {
      self.state_.air_quality_detail_range_type = 'dynamic';
      self.rerender();
    }));

  tile_group.add_tile(new beestat.component.tile()
    .set_background_hover_color(beestat.style.color.lightblue.base)
    .set_text_color('#fff')
    .set_background_color(
      this.state_.air_quality_detail_range_type === 'static'
        ? beestat.style.color.lightblue.base
        : beestat.style.color.bluegray.base
    )
    .set_text('Static')
    .addEventListener('click', function() {
      self.state_.air_quality_detail_range_type = 'static';
      self.rerender();
    }));

  (new beestat.component.title('Range Type')).render(parent);
  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);
  tile_group.render(column);
};

/**
 * Decorate the static range inputs.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.air_quality_detail_custom.prototype.decorate_range_static_ = function(parent) {
  var self = this;

  var air_quality_detail_static_range_begin;
  var air_quality_detail_static_range_end;

  /**
   * Check whether or not a value is outside of where data is synced.
   */
  var check_out_of_sync_range = function() {
    var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
    var min = moment.max(
      moment(thermostat.sync_begin),
      moment().subtract(1, 'month')
    );
    var max = moment(thermostat.sync_end);

    var begin = moment.min(
      moment(air_quality_detail_static_range_begin.get_value()),
      moment(air_quality_detail_static_range_end.get_value())
    );

    var end = moment.max(
      moment(air_quality_detail_static_range_begin.get_value() + ' 00:00:00'),
      moment(air_quality_detail_static_range_end.get_value() + ' 23:59:59')
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

  air_quality_detail_static_range_begin = new beestat.component.input.text()
    .set_maxlength(10)
    .set_width(110)
    .set_icon('calendar')
    .set_value(this.state_.air_quality_detail_range_static_begin);

  air_quality_detail_static_range_begin.addEventListener('blur', function() {
    var m = moment(this.get_value());
    if (m.isValid() === true) {
      self.state_.error.invalid_range_begin = false;

      var value = m.format('M/D/YYYY');

      var diff = Math.abs(m.diff(moment(air_quality_detail_static_range_end.get_value()), 'day')) + 1;
      if (diff > 7) {
        self.state_.error.max_range = true;
      } else {
        self.state_.error.max_range = false;
      }

      check_out_of_sync_range();

      self.state_.air_quality_detail_range_static_begin = value;
      self.rerender();
    } else {
      self.state_.air_quality_detail_range_static_begin = this.get_value();
      self.state_.error.invalid_range_begin = true;
      self.rerender();
    }
  });

  air_quality_detail_static_range_end = new beestat.component.input.text()
    .set_maxlength(10)
    .set_width(110)
    .set_icon('calendar')
    .set_value(this.state_.air_quality_detail_range_static_end);

  air_quality_detail_static_range_end.addEventListener('blur', function() {
    var m = moment(this.get_value());
    if (m.isValid() === true) {
      self.state_.error.invalid_range_end = false;

      var value = m.format('M/D/YYYY');

      var diff = Math.abs(m.diff(moment(air_quality_detail_static_range_begin.get_value()), 'day')) + 1;
      if (diff > 7) {
        self.state_.error.max_range = true;
      } else {
        self.state_.error.max_range = false;
      }

      check_out_of_sync_range();

      self.state_.air_quality_detail_range_static_end = value;
      self.rerender();
    } else {
      self.state_.air_quality_detail_range_static_end = this.get_value();
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
  air_quality_detail_static_range_begin.render(span);
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
  air_quality_detail_static_range_end.render(span);
  column.appendChild(span);
};

/**
 * Decorate the dynamic range input.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.air_quality_detail_custom.prototype.decorate_range_dynamic_ = function(parent) {
  var self = this;

  var air_quality_detail_range_dynamic = new beestat.component.input.text()
    .set_maxlength(2)
    .set_width(75)
    .set_icon('pound')
    .set_value(beestat.setting('air_quality_detail_range_dynamic'));

  air_quality_detail_range_dynamic.addEventListener('blur', function() {
    var value = parseInt(this.get_value(), 10);
    if (isNaN(value) === true || value === 0) {
      value = 1;
    } else if (value > 7) {
      value = 7;
    }
    this.set_value(value);
    self.state_.air_quality_detail_range_dynamic = value;
  });

  var span;

  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);

  span = $.createElement('span').style('display', 'inline-block');
  air_quality_detail_range_dynamic.render(span);
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
beestat.component.modal.air_quality_detail_custom.prototype.decorate_error_ = function(parent) {
  var div = $.createElement('div').style('color', beestat.style.color.red.base);
  if (this.state_.error.max_range === true) {
    div.appendChild($.createElement('div').innerText('Max range is 7 days.'));
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
beestat.component.modal.air_quality_detail_custom.prototype.get_title_ = function() {
  return 'Air Quality Detail - Custom Range';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.air_quality_detail_custom.prototype.get_buttons_ = function() {
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

  var save;
  if (
    this.state_.error.max_range === true ||
    this.state_.error.invalid_range_begin === true ||
    this.state_.error.invalid_range_end === true ||
    this.state_.error.out_of_sync_range === true
  ) {
    save = new beestat.component.tile()
      .set_background_color(beestat.style.color.gray.base)
      .set_text_color('#fff')
      .set_text('Save');
  } else {
    save = new beestat.component.tile()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_text('Save')
      .addEventListener('click', function() {
        // Bit of a rig to fix the odd situation where somehow people are
        // getting these values set to more than 30 days.
        var air_quality_detail_range_static_begin_m = moment(self.state_.air_quality_detail_range_static_begin);
        var air_quality_detail_range_static_end_m = moment(self.state_.air_quality_detail_range_static_end);

        var diff = Math.abs(air_quality_detail_range_static_begin_m.diff(air_quality_detail_range_static_end_m, 'day')) + 1;
        if (diff > 30) {
          air_quality_detail_range_static_end_m = air_quality_detail_range_static_begin_m.clone().add(29, 'days');
          self.state_.air_quality_detail_range_static_end = air_quality_detail_range_static_end_m.format('M/D/YYYY');
        }

        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .removeEventListener('click');

        if (moment(self.state_.air_quality_detail_range_static_begin).isAfter(moment(self.state_.air_quality_detail_range_static_end)) === true) {
          var temp = self.state_.air_quality_detail_range_static_begin;
          self.state_.air_quality_detail_range_static_begin = self.state_.air_quality_detail_range_static_end;
          self.state_.air_quality_detail_range_static_end = temp;
        }

        beestat.cache.delete('data.air_quality_detail__runtime_thermostat');
        beestat.cache.delete('data.air_quality_detail__runtime_sensor');
        beestat.setting(
          {
            'air_quality_detail_range_type': self.state_.air_quality_detail_range_type,
            'air_quality_detail_range_dynamic': self.state_.air_quality_detail_range_dynamic,
            'air_quality_detail_range_static_begin': self.state_.air_quality_detail_range_static_begin,
            'air_quality_detail_range_static_end': self.state_.air_quality_detail_range_static_end
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
