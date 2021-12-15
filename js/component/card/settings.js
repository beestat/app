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

  parent.appendChild(
    $.createElement('p')
      .style('font-weight', '400')
      .innerText('Thermostat Summary')
  );

  // Gap Fill
  const enable_gap_fill = new beestat.component.input.checkbox();
  enable_gap_fill
    .set_label('Enable Gap Fill')
    .set_value(beestat.setting('runtime_thermostat_summary_gap_fill'))
    .render(parent);

  enable_gap_fill.addEventListener('change', function() {
    enable_gap_fill.disable();
    beestat.setting(
      'runtime_thermostat_summary_gap_fill',
      enable_gap_fill.get_value(),
      function() {
        enable_gap_fill.enable();
      }
    );
  });

  // Smart Scale
  const enable_smart_scale = new beestat.component.input.checkbox();
  enable_smart_scale
    .set_label('Enable Smart Scale')
    .set_value(beestat.setting('runtime_thermostat_summary_smart_scale'))
    .render(parent);

  enable_smart_scale.addEventListener('change', function() {
    enable_smart_scale.disable();
    beestat.setting(
      'runtime_thermostat_summary_smart_scale',
      enable_smart_scale.get_value(),
      function() {
        enable_smart_scale.enable();
      }
    );
  });

  parent.appendChild(
    $.createElement('p')
      .style('font-weight', '400')
      .innerText('Temperature Profiles')
  );
  const ignore_solar_gain = new beestat.component.input.checkbox();
  const ignore_solar_gain_key = 'thermostat.' + thermostat.thermostat_id + '.profile.ignore_solar_gain';
  ignore_solar_gain
    .set_label('Ignore Solar Gain')
    .set_value(beestat.setting(ignore_solar_gain_key))
    .render(parent);

  ignore_solar_gain.addEventListener('change', function() {
    ignore_solar_gain.disable();
    beestat.setting(
      ignore_solar_gain_key,
      ignore_solar_gain.get_value(),
      function() {
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
            ignore_solar_gain.enable();
            beestat.cache.set('thermostat', response.thermostat);
          })
          .send();
      }
    );
  });
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
