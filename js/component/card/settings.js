/**
 * Setting
 */
beestat.component.card.settings = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.settings, beestat.component.card);

/**
 * Decorate contents.
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.card.settings.prototype.decorate_contents_ = function(parent) {
  const thermostat = beestat.cache.thermostat[
    beestat.setting('thermostat_id')
  ];

  /**
   * Units
   */
  parent.appendChild(
    $.createElement('p')
      .style('font-weight', '400')
      .innerText('Units')
  );

  // Temperature
  parent.appendChild(
    $.createElement('p')
      .innerText('Temperature')
  );

  const temperature_radio_group = new beestat.component.radio_group()
    .set_arrangement('horizontal');
  [
    '°F',
    '°C'
  ].forEach(function(temperature_unit) {
    temperature_radio_group.add_radio(
      new beestat.component.input.radio()
        .set_label(temperature_unit)
        .set_value(temperature_unit)
        .set_checked(beestat.setting('units.temperature') === temperature_unit)
    );
  });

  temperature_radio_group.addEventListener('change', function() {
    beestat.setting('units.temperature', temperature_radio_group.get_value());
  });

  temperature_radio_group.render(parent);

  // Distance
  parent.appendChild(
    $.createElement('p')
      .innerText('Distance / Area')
  );

  const distance_radio_group = new beestat.component.radio_group()
    .set_arrangement('horizontal');
  [
    'ft',
    'm'
  ].forEach(function(distance_unit) {
    distance_radio_group.add_radio(
      new beestat.component.input.radio()
        .set_label(distance_unit + ' / ' + distance_unit + '²')
        .set_value(distance_unit)
        .set_checked(beestat.setting('units.distance') === distance_unit)
    );
  });

  distance_radio_group.addEventListener('change', function() {
    beestat.setting({
      'units.distance': distance_radio_group.get_value(),
      'units.area': distance_radio_group.get_value() + '²'
    });
  });

  distance_radio_group.render(parent);

  /**
   * Thermosat Summary
   */
  parent.appendChild(
    $.createElement('p')
      .style('font-weight', '400')
      .innerText('Thermostat Summary')
  );

  // Gap Fill
  const enable_gap_fill = new beestat.component.input.checkbox();
  enable_gap_fill
    .set_label('Enable Gap Fill')
    .set_checked(beestat.setting('runtime_thermostat_summary_gap_fill'))
    .render(parent);

  enable_gap_fill.addEventListener('change', function() {
    enable_gap_fill.set_enabled(false);
    beestat.setting(
      'runtime_thermostat_summary_gap_fill',
      enable_gap_fill.get_checked(),
      function() {
        enable_gap_fill.set_enabled(true);
      }
    );
  });

  // Smart Scale
  const enable_smart_scale = new beestat.component.input.checkbox();
  enable_smart_scale
    .set_label('Enable Smart Scale')
    .set_checked(beestat.setting('runtime_thermostat_summary_smart_scale'))
    .render(parent);

  enable_smart_scale.addEventListener('change', function() {
    enable_smart_scale.set_enabled(false);
    beestat.setting(
      'runtime_thermostat_summary_smart_scale',
      enable_smart_scale.get_checked(),
      function() {
        enable_smart_scale.set_enabled(true);
      }
    );
  });

  /**
   * Temperature Profiles
   */
  parent.appendChild(
    $.createElement('p')
      .style({
        'font-weight': '400',
        'margin-top': (beestat.style.size.gutter * 2) + 'px'
      })
      .innerText('Temperature Profiles')
  );
  const ignore_solar_gain = new beestat.component.input.checkbox();
  const ignore_solar_gain_key = 'thermostat.' + thermostat.thermostat_id + '.profile.ignore_solar_gain';
  ignore_solar_gain
    .set_label('Ignore Solar Gain')
    .set_checked(beestat.setting(ignore_solar_gain_key))
    .render(parent);

  ignore_solar_gain.addEventListener('change', function() {
    ignore_solar_gain.set_enabled(false);
    beestat.setting(
      ignore_solar_gain_key,
      ignore_solar_gain.get_checked(),
      function() {
        /**
         * Clear the API call cache and delete the profile so it regenerates
         * next time you go to the page.
         */
        new beestat.api()
          .add_call(
            'thermostat',
            'generate_profile',
            {
              'thermostat_id': thermostat.thermostat_id
            },
            undefined,
            undefined,
            undefined,
            // Clear cache
            true
          )
          .add_call(
            'thermostat',
            'update',
            {
              'attributes': {
                'thermostat_id': thermostat.thermostat_id,
                'profile': null
              }
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
            ignore_solar_gain.set_enabled(true);
            beestat.cache.set('thermostat', response.thermostat);
          })
          .send();
      }
    );
  });

  // Temperature profile begin/end
  const temperature_profiles_range_begin_key = 'thermostat.' + thermostat.thermostat_id + '.profile.range_begin';

  parent.appendChild(
    $.createElement('p')
      .innerText('Custom Start Date')
  );

  var temperature_profiles_range_begin = new beestat.component.input.text()
    .set_maxlength(10)
    .set_requirements({
      'type': 'date'
    })
    .set_icon('calendar');

  if (
    beestat.setting(temperature_profiles_range_begin_key) !== undefined &&
    beestat.setting(temperature_profiles_range_begin_key) !== null
  ) {
    temperature_profiles_range_begin.set_value(
      beestat.setting(temperature_profiles_range_begin_key)
    );
  }

  temperature_profiles_range_begin.addEventListener('change', function() {
    var temperature_profiles_range_begin_value;
    if (temperature_profiles_range_begin.meets_requirements() === true) {
      temperature_profiles_range_begin_value = this.get_value();
    } else {
      this.set_value('', false);
      temperature_profiles_range_begin_value = null;
    }

    beestat.setting(
      temperature_profiles_range_begin_key,
      temperature_profiles_range_begin_value,
      function() {
        /**
         * Clear the API call cache and delete the profile so it regenerates
         * next time you go to the page.
         */
        new beestat.api()
          .add_call(
            'thermostat',
            'generate_profile',
            {
              'thermostat_id': thermostat.thermostat_id
            },
            undefined,
            undefined,
            undefined,
            // Clear cache
            true
          )
          .add_call(
            'thermostat',
            'update',
            {
              'attributes': {
                'thermostat_id': thermostat.thermostat_id,
                'profile': null
              }
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
      }
    );
  });

  temperature_profiles_range_begin.render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.settings.prototype.get_title_ = function() {
  return 'Settings';
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.settings.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/9d01e7256390473ca8121d4098d91c9d');
    }));
};
