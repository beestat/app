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
    'thermostat_group',
    'read_id',
    {},
    'thermostat_group'
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

  api.set_callback(function(response) {
    beestat.cache.set('user', response.user);

    // Rollbar isn't defined on dev.
    if (window.Rollbar !== undefined) {
      Rollbar.configure({
        'payload': {
          'person': {
            'id': beestat.get_user().user_id
          },
          'beestat': {
            'user_id': beestat.get_user().user_id
          }
        }
      });
    }

    beestat.cache.set('thermostat', response.thermostat);
    beestat.cache.set('thermostat_group', response.thermostat_group);
    beestat.cache.set('sensor', response.sensor);

    beestat.cache.set('ecobee_thermostat', response.ecobee_thermostat);
    beestat.cache.set('ecobee_sensor', response.ecobee_sensor);
    beestat.cache.set('address', response.address);
    beestat.cache.set('announcement', response.announcement);
    beestat.cache.set('runtime_thermostat', []);
    beestat.cache.set('runtime_thermostat_summary', response.runtime_thermostat_summary);

    // Set the active thermostat_id if this is your first time visiting.
    if (beestat.setting('thermostat_id') === undefined) {
      beestat.setting(
        'thermostat_id',
        $.values(beestat.cache.thermostat)[0].thermostat_id
      );
    }

    // Change the active thermostat_id if the one you have is no longer valid.
    if (response.thermostat[beestat.setting('thermostat_id')] === undefined) {
      beestat.setting('thermostat_id', Object.keys(response.thermostat)[0]);
    }

    var thermostat = beestat.cache.thermostat[
      beestat.setting('thermostat_id')
    ];
    var ecobee_thermostat = beestat.cache.ecobee_thermostat[
      thermostat.ecobee_thermostat_id
    ];

    // Set the active temperature unit.
    beestat.setting('temperature_unit', thermostat.temperature_unit);

    // Rename series if only one stage is available.
    if (ecobee_thermostat.json_settings.coolStages === 1) {
      beestat.series.sum_compressor_cool_1.name = 'Cool';
    }
    if (ecobee_thermostat.json_settings.heatStages === 1) {
      beestat.series.sum_compressor_heat_1.name = 'Heat';
    }

    // Fix some other stuff for non-heat-pump.
    if (ecobee_thermostat.json_settings.hasHeatPump === false) {
      beestat.series.auxiliary_heat_1.name =
        beestat.series.sum_compressor_heat_1.name;
      beestat.series.auxiliary_heat_1.color =
        beestat.series.sum_compressor_heat_1.color;
      beestat.series.sum_auxiliary_heat_2.name =
        beestat.series.compressor_heat_2.name;
      beestat.series.sum_auxiliary_heat_2.color =
        beestat.series.compressor_heat_2.color;
    }

    /*
     * Fire off an API call to sync. The cron job will eventually run but this
     * ensures things get moving quicker.
     */
    new beestat.api()
      .add_call(
        'runtime_thermostat',
        'sync',
        {
          'thermostat_id': thermostat.thermostat_id
        }
      )
      .send();

    // Enable polling for live updates
    beestat.enable_poll();

    (new beestat.layer.dashboard()).render();

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

    if (
      last_read_announcement_id === undefined ||
      (
        most_recent_important_announcement_id !== undefined &&
        last_read_announcement_id < most_recent_important_announcement_id
      )
    ) {
      (new beestat.component.modal.announcements()).render();
    }
  });

  api.send();
};
