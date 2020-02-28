/**
 * Home comparison settings.
 */
beestat.component.card.comparison_settings = function() {
  var self = this;

  /*
   * If the thermostat_group changes that means the property_type could change
   * and thus need to rerender.
   */
  beestat.dispatcher.addEventListener('cache.thermostat_group', function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.comparison_settings, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.comparison_settings.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[thermostat.thermostat_group_id];

  var row;

  // Row
  row = $.createElement('div').addClass('row');
  parent.appendChild(row);

  var column_region = $.createElement('div').addClass([
    'column',
    'column_4'
  ]);
  row.appendChild(column_region);
  this.decorate_region_(column_region);

  var column_property = $.createElement('div').addClass([
    'column',
    'column_8'
  ]);
  row.appendChild(column_property);
  this.decorate_property_(column_property);

  /*
   * If the data is available, then get the data if we don't already have it
   * loaded. If the data is not available, poll until it becomes available.
   */
  if (thermostat_group.profile === null) {
    // This will show the loading screen.
    self.data_available_();

    var poll_interval = 10000;

    beestat.add_poll_interval(poll_interval);
    beestat.dispatcher.addEventListener('poll.comparisons_load', function() {
      if (self.data_available_() === true) {
        beestat.remove_poll_interval(poll_interval);
        beestat.dispatcher.removeEventListener('poll.comparisons_load');

        new beestat.api()
          .add_call(
            'thermostat_group',
            'generate_profiles',
            {},
            'generate_profiles'
          )
          .add_call(
            'thermostat_group',
            'read_id',
            {},
            'thermostat_group'
          )
          .set_callback(function(response) {
            beestat.cache.set('thermostat_group', response.thermostat_group);
            (new beestat.layer.comparisons()).render();
          })
          .send();
      }
    });
  }
};

/**
 * Decorate the region options.
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.comparison_settings.prototype.decorate_region_ = function(parent) {
  var self = this;

  (new beestat.component.title('Region')).render(parent);

  var regions = [
    'nearby',
    'global'
  ];

  var current_region = beestat.setting('comparison_region');

  var color = beestat.style.color.green.base;

  var button_group = new beestat.component.button_group();
  regions.forEach(function(region) {
    var button = new beestat.component.button()
      .set_background_hover_color(color)
      .set_text_color('#fff')
      .set_text(region.charAt(0).toUpperCase() + region.slice(1));

    if (current_region === region) {
      button.set_background_color(color);
    } else {
      button
        .set_background_color(beestat.style.color.bluegray.light)
        .addEventListener('click', function() {
          // Update the setting
          beestat.setting('comparison_region', region);

          // Rerender real quick to change the selected button
          self.rerender();

          // Open up the loading window.
          self.show_loading_('Calculating Score for ' + region + ' region');

          beestat.comparisons.get_comparison_scores(function() {
            // Rerender to get rid of the loader.
            self.rerender();
          });
        });
    }

    button_group.add_button(button);
  });
  button_group.render(parent);
};

/**
 * Decorate the property type options.
 *
 * @param {rocket.ELements} parent
 */
beestat.component.card.comparison_settings.prototype.decorate_property_ = function(parent) {
  var self = this;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];

  (new beestat.component.title('Property')).render(parent);

  var property_types = [];
  property_types.push({
    'value': 'similar',
    'text': 'Very Similar'
  });

  if (thermostat_group.property_structure_type !== null) {
    property_types.push({
      'value': 'same_structure',
      'text': 'Type: ' +
        thermostat_group.property_structure_type.charAt(0).toUpperCase() +
        thermostat_group.property_structure_type.slice(1)
    });
  }

  property_types.push({
    'value': 'all',
    'text': 'All'
  });

  var current_property_type = beestat.setting('comparison_property_type');

  var color = beestat.style.color.purple.base;

  var button_group = new beestat.component.button_group();
  property_types.forEach(function(property_type) {
    var button = new beestat.component.button()
      .set_background_hover_color(color)
      .set_text_color('#fff')
      .set_text(property_type.text);

    if (current_property_type === property_type.value) {
      button.set_background_color(color);
    } else {
      button
        .set_background_color(beestat.style.color.bluegray.light)
        .addEventListener('click', function() {
          // Update the setting
          beestat.setting('comparison_property_type', property_type.value);

          // Rerender real quick to change the selected button
          self.rerender();

          // Open up the loading window.
          self.show_loading_('Calculating Score for ' + property_type.text);

          beestat.comparisons.get_comparison_scores(function() {
            // Rerender to get rid of the loader.
            self.rerender();
          });
        });
    }

    button_group.add_button(button);
  });
  button_group.render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.comparison_settings.prototype.get_title_ = function() {
  return 'Comparison Settings';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle of the card.
 */
beestat.component.card.comparison_settings.prototype.get_subtitle_ = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];
  var address = beestat.cache.address[thermostat_group.address_id];

  var string = '';

  if (address.normalized !== null && address.normalized.delivery_line_1 !== undefined) {
    string = address.normalized.delivery_line_1;
  } else if (address.normalized !== null && address.normalized.address1 !== undefined) {
    string = address.normalized.address1;
  } else {
    string = 'Unknown Address';
  }

  var count = 0;
  $.values(beestat.cache.thermostat).forEach(function(t) {
    if (t.thermostat_group_id === thermostat_group.thermostat_group_id) {
      count++;
    }
  });

  string += ' (' + count + ' Thermostat' + (count > 1 ? 's' : '') + ')';

  return string;
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.comparison_settings.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/596040eadd014928830b4d1d54692761');
    }));
};

/**
 * Determine whether or not all of the data has been loaded so the scores can
 * be generated.
 *
 * @return {boolean} Whether or not all of the data has been loaded.
 */
beestat.component.card.comparison_settings.prototype.data_available_ = function() {
  var sync_progress = beestat.get_sync_progress(beestat.setting('thermostat_id'));

  if (sync_progress >= 95) {
    this.show_loading_('Calculating Scores');
  } else {
    this.show_loading_('Syncing Data (' +
      Math.round(sync_progress) +
      '%)');
  }

  return sync_progress === 100;
};
