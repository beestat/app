/**
 * Download data modal.
 */
beestat.component.modal.download_data = function() {
  beestat.component.modal.apply(this, arguments);
  this.state_.range_begin = moment().hour(0)
    .minute(0)
    .second(0)
    .millisecond(0);
  this.state_.range_end = this.state_.range_begin.clone();
};
beestat.extend(beestat.component.modal.download_data, beestat.component.modal);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.download_data.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Beestat stores, at a most, the past year of raw thermostat logs. Select a date range to download.'));
  this.decorate_range_(parent);
  this.decorate_presets_(parent);
  this.decorate_android_ios_disabled_(parent);
  this.decorate_error_(parent);

  // Fire off this event once to get everything updated.
  this.dispatchEvent('range_change');
};

/**
 * Decorate range inputs.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.download_data.prototype.decorate_range_ = function(parent) {
  var self = this;

  (new beestat.component.title('Date Range')).render(parent);

  var range_begin = new beestat.component.input.text()
    .set_width(110)
    .set_maxlength(10)
    .set_icon('calendar')
    .set_value(this.state_.range_begin.format('M/D/YYYY'));

  range_begin.addEventListener('blur', function() {
    self.state_.range_begin = moment(this.get_value());
    self.dispatchEvent('range_change');
  });

  var range_end = new beestat.component.input.text()
    .set_width(110)
    .set_maxlength(10)
    .set_icon('calendar')
    .set_value(this.state_.range_end.format('M/D/YYYY'));

  range_end.addEventListener('blur', function() {
    self.state_.range_end = moment(this.get_value());
    self.dispatchEvent('range_change');
  });

  // Update the inputs if the range changes.
  this.addEventListener('range_change', function() {
    if (self.state_.range_begin.isValid() === true) {
      range_begin.set_value(self.state_.range_begin.format('M/D/YYYY'));
    }

    if (self.state_.range_end.isValid() === true) {
      range_end.set_value(self.state_.range_end.format('M/D/YYYY'));
    }
  });

  var span;

  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);

  span = $.createElement('span').style('display', 'inline-block');
  range_begin.render(span);
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
  range_end.render(span);
  column.appendChild(span);
};

/**
 * Decorate preset options.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.download_data.prototype.decorate_presets_ = function(parent) {
  var self = this;

  (new beestat.component.title('Presets')).render(parent);

  var row = $.createElement('div').addClass('row');
  parent.appendChild(row);
  var column = $.createElement('div').addClass(['column column_12']);
  row.appendChild(column);

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var now = moment().hour(0)
    .minute(0)
    .second(0)
    .millisecond(0);

  var presets = [
    {
      'label': 'Today',
      'range_begin': now.clone(),
      'range_end': now.clone(),
      'button': new beestat.component.tile()
    },
    {
      'label': 'Yesterday',
      'range_begin': now.clone().subtract(1, 'day'),
      'range_end': now.clone().subtract(1, 'day'),
      'button': new beestat.component.tile()
    },
    {
      'label': 'This Week',
      'range_begin': now.clone().startOf('week'),
      'range_end': now.clone(),
      'button': new beestat.component.tile()
    },
    {
      'label': 'Last Week',
      'range_begin': now.clone()
        .subtract(1, 'week')
        .startOf('week'),
      'range_end': now.clone()
        .subtract(1, 'week')
        .endOf('week'),
      'button': new beestat.component.tile()
    },
    {
      'label': 'This Month',
      'range_begin': now.clone().startOf('month'),
      'range_end': now.clone(),
      'button': new beestat.component.tile()
    },
    {
      'label': 'Last Month',
      'range_begin': now.clone()
        .subtract(1, 'month')
        .startOf('month'),
      'range_end': now.clone()
        .subtract(1, 'month')
        .endOf('month'),
      'button': new beestat.component.tile()
    },
    {
      'label': 'All Time',
      'range_begin': moment.max(moment(thermostat.data_begin), now.clone().subtract(1, 'year')),
      'range_end': now.clone(),
      'button': new beestat.component.tile()
    }
  ];

  var tile_group = new beestat.component.tile_group();
  presets.forEach(function(preset) {
    preset.button
      .set_background_color(beestat.style.color.bluegray.base)
      .set_background_hover_color(beestat.style.color.lightblue.base)
      .set_text_color('#fff')
      .set_text(preset.label)
      .addEventListener('mousedown', function() {
        self.state_.range_begin = preset.range_begin;
        self.state_.range_end = preset.range_end;
        self.dispatchEvent('range_change');
      });
    tile_group.add_tile(preset.button);
  });

  // Highlight the preset if the current date range matches.
  this.addEventListener('range_change', function() {
    presets.forEach(function(preset) {
      if (
        preset.range_begin.isSame(self.state_.range_begin) &&
        preset.range_end.isSame(self.state_.range_end)
      ) {
        preset.button.set_background_color(beestat.style.color.lightblue.base);
      } else {
        preset.button.set_background_color(beestat.style.color.bluegray.base);
      }
    });
  });

  tile_group.render(column);
};

/**
 * Decorate the disabled notice for Android and iOS.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.download_data.prototype.decorate_android_ios_disabled_ = function(parent) {
  if (beestat.platform() === 'ios' || beestat.platform() === 'android') {
    new beestat.component.tile()
      .set_icon('alert')
      .set_size('large')
      .set_display('block')
      .set_shadow(false)
      .set_background_color(beestat.style.color.red.base)
      .set_text('Download Data is only available directly in a browser.')
      .set_text_color('#fff')
      .render(parent);
  }
};

/**
 * Decorate the error area.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.download_data.prototype.decorate_error_ = function(parent) {
  var self = this;

  var div = $.createElement('div').style('color', beestat.style.color.red.base);

  // Display errors as necessary.
  this.addEventListener('range_change', function() {
    div.innerHTML('');
    if (self.state_.range_begin.isValid() === false) {
      div.appendChild($.createElement('div').innerText('Invalid begin date.'));
    }
    if (self.state_.range_end.isValid() === false) {
      div.appendChild($.createElement('div').innerText('Invalid end date.'));
    }
  });

  parent.appendChild(div);
};

/**
 * Get title.
 *
 * @return {string} Title
 */
beestat.component.modal.download_data.prototype.get_title_ = function() {
  return 'Download Data';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.download_data.prototype.get_buttons_ = function() {
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

  var save = new beestat.component.tile()
    .set_text_color('#fff')
    .set_text('Download');

  if (beestat.platform() === 'ios' || beestat.platform() === 'android') {
    save
      .set_background_color(beestat.style.color.gray.light);
  } else {
    save
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .addEventListener('click', function() {
        var range_begin;
        var range_end;
        if (self.state_.range_end.isBefore(self.state_.range_begin) === true) {
          range_begin = self.state_.range_end;
          range_end = self.state_.range_begin;
        } else {
          range_begin = self.state_.range_begin;
          range_end = self.state_.range_end;
        }

        var download_arguments = {
          'thermostat_id': beestat.setting('thermostat_id'),
          'download_begin': range_begin.format(),
          'download_end': range_end.hour(23).minute(55)
            .format()
        };

        window.location.href = '/api/?resource=runtime&method=download&arguments=' + encodeURIComponent(JSON.stringify(download_arguments)) + '&api_key=' + window.beestat_api_key_local;

        self.dispose();
      });
  }

  return [
    cancel,
    save
  ];
};
