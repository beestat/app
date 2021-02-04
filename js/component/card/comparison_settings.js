/**
 * Home comparison settings.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.comparison_settings = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

  /*
   * If the thermostat changes that means the property_type could change and
   * thus need to rerender.
   */
  beestat.dispatcher.addEventListener(
    [
      'cache.thermostat',
      'cache.data.metrics'
    ],
    function() {
      self.rerender();
    }
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.comparison_settings, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.comparison_settings.prototype.decorate_contents_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

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

  row = $.createElement('div').addClass('row');
  parent.appendChild(row);

  var column_detail = $.createElement('div').addClass([
    'column',
    'column_12'
  ]);
  row.appendChild(column_detail);
  this.decorate_detail_(column_detail);

  const sync_progress = beestat.thermostat.get_sync_progress(this.thermostat_id_);

  if (sync_progress === null || sync_progress < 100) {
    this.show_loading_('Fetching');
    window.setTimeout(function() {
      var api = new beestat.api();
      api.add_call(
        'thermostat',
        'read_id',
        {
          'attributes': {
            'inactive': 0
          }
        },
        'thermostat'
      );

      api.set_callback(function(response) {
        beestat.cache.set('thermostat', response.thermostat);
      });

      api.send();
    }, 10000);
  } else {
    if (thermostat.profile === null) {
      this.show_loading_('Fetching');
      new beestat.api()
        .add_call(
          'thermostat',
          'generate_profile',
          {
            'thermostat_id': this.thermostat_id_
          }
        )
        .add_call(
          'thermostat',
          'read_id',
          {
            'attributes': {
              'inactive': 0
            }
          },
          'thermostat'
        )
        .set_callback(function(response) {
          beestat.cache.set('thermostat', response.thermostat);
        })
        .send();
    } else if (beestat.cache.data.metrics === undefined) {
      this.show_loading_('Fetching');
      new beestat.api()
        .add_call(
          'thermostat',
          'get_metrics',
          {
            'thermostat_id': this.thermostat_id_,
            'attributes': beestat.comparisons.get_attributes()
          }
        )
        .set_callback(function(response) {
          beestat.cache.set('data.metrics', response);
        })
        .send();
    }
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
          // Delete from the cache to trigger the metrics loading screen
          beestat.cache.delete('data.metrics');

          // Update the setting
          beestat.setting('comparison_region', region);

          // Rerender real quick to change the selected button
          self.rerender();

          // Open up the loading window.
          self.show_loading_('Fetching');

          new beestat.api()
            .add_call(
              'thermostat',
              'get_metrics',
              {
                'thermostat_id': self.thermostat_id_,
                'attributes': beestat.comparisons.get_attributes()
              }
            )
            .set_callback(function(response) {
              beestat.cache.set('data.metrics', response);
            })
            .send();
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

  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  (new beestat.component.title('Property')).render(parent);

  var property_types = [];
  property_types.push({
    'value': 'similar',
    'text': 'Very Similar'
  });

  if (thermostat.property.structure_type !== null) {
    property_types.push({
      'value': 'same_structure',
      'text': 'Type: ' +
        thermostat.property.structure_type.charAt(0).toUpperCase() +
        thermostat.property.structure_type.slice(1)
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
          // Delete from the cache to trigger the metrics loading screen
          beestat.cache.delete('data.metrics');

          // Update the setting
          beestat.setting('comparison_property_type', property_type.value);

          // Rerender real quick to change the selected button
          self.rerender();

          // Open up the loading window.
          self.show_loading_('Fetching');

          new beestat.api()
            .add_call(
              'thermostat',
              'get_metrics',
              {
                'thermostat_id': self.thermostat_id_,
                'attributes': beestat.comparisons.get_attributes()
              }
            )
            .set_callback(function(response) {
              beestat.cache.set('data.metrics', response);
            })
            .send();
        });
    }

    button_group.add_button(button);
  });
  button_group.render(parent);
};

beestat.component.card.comparison_settings.prototype.decorate_detail_ = function(parent) {
  var strings = [];

  strings.push('Matching system type and stages');

  var comparison_attributes = beestat.comparisons.get_attributes();

  if (comparison_attributes.property_structure_type !== undefined) {
    strings.push('Property Type: ' + this.get_comparison_string_(comparison_attributes.property_structure_type));
  } else {
    strings.push('Any property type');
  }

  if (comparison_attributes.property_age !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_age, 'years old'));
  } else {
    strings.push('Any property age');
  }

  if (comparison_attributes.property_square_feet !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_square_feet, 'sqft'));
  } else {
    strings.push('Any square footage');
  }

  if (comparison_attributes.property_stories !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_stories, 'stories'));
  } else {
    strings.push('Any number of stories');
  }

  if (comparison_attributes.radius !== undefined) {
    strings.push('Within ' + comparison_attributes.radius.value + ' miles of your location');
  } else {
    strings.push('Any region');
  }

  (new beestat.component.title('Comparing to homes like...')).render(parent);

  strings.forEach(function(string) {
    var div = $.createElement('div');
    div.innerText(string);
    if (string.match('Any') !== null) {
      div.style({'color': beestat.style.color.gray.base});
    }
    parent.appendChild(div);
  });
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
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];
  const address = beestat.cache.address[thermostat.address_id];

  let string = 'Thermostat at ';

  if (address.normalized !== null && address.normalized.delivery_line_1 !== undefined) {
    string += address.normalized.delivery_line_1;
  } else if (address.normalized !== null && address.normalized.address1 !== undefined) {
    string += address.normalized.address1;
  } else {
    string += 'unknown address';
  }

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
 * Helper function to display various comparison strings in a human-readable
 * way.
 *
 * @param {mixed} comparison_attribute The attribute
 * @param {string} suffix If a suffix (ex: "years") should be placed on the
 * end.
 *
 * @return {string} The human-readable string.
 */
beestat.component.card.comparison_settings.prototype.get_comparison_string_ = function(comparison_attribute, suffix) {
  var s = (suffix !== undefined ? (' ' + suffix) : '');
  if (comparison_attribute.operator !== undefined) {
    if (comparison_attribute.operator === 'between') {
      return 'Between ' + comparison_attribute.value[0] + ' and ' + comparison_attribute.value[1] + s;
    } else if (comparison_attribute.operator === '>=') {
      return 'At least ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '<=') {
      return 'Less than or equal than ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '>') {
      return 'Greater than ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '<') {
      return 'Less than' + comparison_attribute.value + s;
    }
    return comparison_attribute.operator + ' ' + comparison_attribute.value + s;
  } else if (Array.isArray(comparison_attribute.value) === true) {
    return 'One of ' + comparison_attribute.value.join(', ') + s;
  }
  return comparison_attribute + s;
};
