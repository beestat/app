/**
 * Load layer.
 */
beestat.layer.load = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.load, beestat.layer);

beestat.layer.load.prototype.decorate_ = function(parent) {
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  var logo_container = $.createElement('div');
  logo_container.style({
    'margin': '100px auto 32px auto',
    'text-align': 'center'
  });
  parent.appendChild(logo_container);

  (new beestat.component.logo()).render(logo_container);

  var loading_text = $.createElement('div');
  loading_text.style({
    'font-weight': '500',
    'margin': '0 auto 16px auto',
    'text-align': 'center'
  });
  parent.appendChild(loading_text);

  (new beestat.component.loading()).render(loading_text);

  var api = new beestat.api();

  api.add_call(
    'thermostat',
    'sync',
    {},
    'thermostat_sync'
  );

  api.add_call(
    'sensor',
    'sync',
    {},
    'sensor_sync'
  );

  api.add_call(
    'user',
    'read_id',
    {},
    'user'
  );

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

  api.add_call(
    'sensor',
    'read_id',
    {
      'attributes': {
        'inactive': 0
      }
    },
    'sensor'
  );

  api.add_call(
    'ecobee_thermostat',
    'read_id',
    {
      'attributes': {
        'inactive': 0
      }
    },
    'ecobee_thermostat'
  );

  api.add_call(
    'ecobee_sensor',
    'read_id',
    {
      'attributes': {
        'inactive': 0
      }
    },
    'ecobee_sensor'
  );

  api.add_call(
    'address',
    'read_id',
    {},
    'address'
  );

  api.add_call(
    'floor_plan',
    'read_id',
    {},
    'floor_plan'
  );

  api.add_call(
    'announcement',
    'read_id',
    {},
    'announcement'
  );

  api.add_call(
    'runtime_thermostat_summary',
    'read_id',
    {},
    'runtime_thermostat_summary'
  );

  api.add_call(
    'stripe_event',
    'read_id',
    {},
    'stripe_event'
  );

  api.set_callback(function(response) {
    beestat.cache.set('user', response.user);

    Sentry.configureScope(function(scope) {
      scope.setUser({
        'id': beestat.user.get().user_id
      });
    });

    beestat.cache.set('thermostat', response.thermostat);
    beestat.cache.set('sensor', response.sensor);

    beestat.cache.set('ecobee_thermostat', response.ecobee_thermostat);
    beestat.cache.set('ecobee_sensor', response.ecobee_sensor);
    beestat.cache.set('address', response.address);
    beestat.cache.set('floor_plan', response.floor_plan);
    beestat.cache.set('announcement', response.announcement);
    beestat.cache.set('runtime_thermostat_summary', response.runtime_thermostat_summary);
    beestat.cache.set('stripe_event', response.stripe_event);

    // Set the active thermostat_id if this is your first time visiting.
    if (beestat.setting('thermostat_id') === undefined) {
      beestat.setting(
        'thermostat_id',
        $.values(beestat.cache.thermostat)[0].thermostat_id
      );
    }

    // Increment the number of opens if under the threshold.
    const setting_key = 'meta.opens.' + beestat.platform();
    if (beestat.setting(setting_key) === undefined) {
      beestat.setting(setting_key, 1);
    } else {
      beestat.setting(setting_key, beestat.setting(setting_key) + 1);
    }

    // Change the active thermostat_id if the one you have is no longer valid.
    if (response.thermostat[beestat.setting('thermostat_id')] === undefined) {
      beestat.setting('thermostat_id', Object.keys(response.thermostat)[0]);
    }

    var thermostat = beestat.cache.thermostat[
      beestat.setting('thermostat_id')
    ];

    // Set the document title to include the thermostat name
    if (thermostat.name !== null && thermostat.name.trim() !== '') {
      document.title = 'beestat | ' + thermostat.name;
    } else {
      document.title = 'beestat';
    }

    // Set the temperature unit if it hasn't been set before.
    if (beestat.setting('units.temperature') === undefined) {
      beestat.setting('units.temperature', thermostat.temperature_unit);
    }

    // Set the distance/area units if they hasn't been set before.
    const imperial_countries = [
      'USA',
      'CAN'
    ];

    if (
      beestat.setting('units.distance') === undefined ||
      beestat.setting('units.area') === undefined
    ) {
      if (
        thermostat.address_id !== null &&
        beestat.address.is_valid(thermostat.address_id) === true
      ) {
        const address = beestat.cache.address[thermostat.address_id];
        beestat.setting({
          'units.distance': imperial_countries.includes(address.normalized.components.country_iso_3) === true ? 'ft' : 'm',
          'units.area': imperial_countries.includes(address.normalized.components.country_iso_3) === true ? 'ft²' : 'm²'
        });
      } else {
        // Assume ft/ft² if invalid address.
        beestat.setting({
          'units.distance': 'ft',
          'units.area': 'ft²'
        });
      }
    }

    // Currency (USD is default)
    const currency_map = {
      'CAN': 'cad',
      'AUS': 'aud',
      'GBR': 'gbp'
    };
    if (
      beestat.setting('units.currency') === undefined &&
      thermostat.address_id !== null &&
      beestat.address.is_valid(thermostat.address_id) === true
    ) {
      const address = beestat.cache.address[thermostat.address_id];
      if (currency_map[address.normalized.components.country_iso_3] !== undefined) {
        beestat.setting(
          'units.currency',
          currency_map[address.normalized.components.country_iso_3]
        );
      }
    }

    // Rename series if there are multiple stages.
    if (beestat.thermostat.get_stages(thermostat.thermostat_id, 'heat') > 1) {
      beestat.series.compressor_heat_1.name = 'Heat 1';
      beestat.series.sum_compressor_heat_1.name = 'Heat 1';
      beestat.series.indoor_heat_1_delta.name = 'Heat 1 Δ';
    }
    if (beestat.thermostat.get_stages(thermostat.thermostat_id, 'auxiliary_heat') > 1) {
      beestat.series.auxiliary_heat_1.name = 'Aux Heat 1';
      beestat.series.sum_auxiliary_heat_1.name = 'Aux Heat 1';
      beestat.series.indoor_auxiliary_heat_1_delta.name = 'Aux Heat 1 Δ';
    }
    if (beestat.thermostat.get_stages(thermostat.thermostat_id, 'cool') > 1) {
      beestat.series.compressor_cool_1.name = 'Cool 1';
      beestat.series.sum_compressor_cool_1.name = 'Cool 1';
      beestat.series.indoor_cool_1_delta.name = 'Cool 1 Δ';
    }

    // Fix some other stuff for non-heat-pump.
    const sytem_type_heat = beestat.thermostat.get_system_type(thermostat.thermostat_id, 'heat');
    if (
      sytem_type_heat !== 'compressor' &&
      sytem_type_heat !== 'geothermal'
    ) {
      beestat.series.auxiliary_heat_1.name = beestat.series.sum_compressor_heat_1.name;
      beestat.series.auxiliary_heat_1.color = beestat.series.sum_compressor_heat_1.color;
      beestat.series.sum_auxiliary_heat_2.name = beestat.series.compressor_heat_2.name;
      beestat.series.sum_auxiliary_heat_2.color = beestat.series.compressor_heat_2.color;
    }

    /*
     * Fire off an API call to sync. The cron job will eventually run but this
     * ensures things get moving quicker.
     */
    new beestat.api()
      .add_call(
        'runtime',
        'sync',
        {
          'thermostat_id': thermostat.thermostat_id
        }
      )
      .send();

    // Enable polling for live updates
    beestat.enable_poll();
    beestat.enable_poll_watcher();

    (new beestat.layer.detail()).render();

    beestat.ecobee.notify_if_down();

    /*
     * If never seen an announcement, or if there is an unread important
     * announcement, show the modal.
     */
    var last_read_announcement_id = beestat.setting('last_read_announcement_id');

    var most_recent_important_announcement_id;
    var announcements = $.values(beestat.cache.announcement).reverse();
    for (var i = 0; i < announcements.length; i++) {
      if (announcements[i].important === true) {
        most_recent_important_announcement_id = announcements[i].announcement_id;
        break;
      }
    }

    /*
     * Show the first run modal or the announcements modal if there are unread
     * important announcements.
     */
    if (beestat.setting('first_run') === true) {
      beestat.setting('first_run', false);
      (new beestat.component.modal.newsletter()).render();
    } else if (
      $.keys(beestat.cache.announcement).length > 0 &&
      (
        last_read_announcement_id === undefined ||
        (
          most_recent_important_announcement_id !== undefined &&
          last_read_announcement_id < most_recent_important_announcement_id
        )
      )
    ) {
      (new beestat.component.modal.announcements()).render();
    }
  });

  api.send();
};
