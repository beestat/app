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

  var batch = [
    {
      'resource': 'thermostat',
      'method': 'sync',
      'alias': 'thermostat_sync'
    },
    {
      'resource': 'sensor',
      'method': 'sync',
      'alias': 'sensor_sync'
    },
    {
      'resource': 'user',
      'method': 'read_id',
      'alias': 'user'
    },
    {
      'resource': 'thermostat',
      'method': 'read_id',
      'alias': 'thermostat',
      'arguments': {
        'attributes': {
          'inactive': 0
        }
      }
    },
    {
      'resource': 'thermostat_group',
      'method': 'read_id',
      'alias': 'thermostat_group'
    },
    {
      'resource': 'sensor',
      'method': 'read_id',
      'alias': 'sensor',
      'arguments': {
        'attributes': {
          'inactive': 0
        }
      }
    },
    {
      'resource': 'ecobee_thermostat',
      'method': 'read_id',
      'alias': 'ecobee_thermostat',
      'arguments': {
        'attributes': {
          'inactive': 0
        }
      }
    },
    {
      'resource': 'ecobee_sensor',
      'method': 'read_id',
      'alias': 'ecobee_sensor',
      'arguments': {
        'attributes': {
          'inactive': 0
        }
      }
    },
    {
      'resource': 'address',
      'method': 'read_id',
      'alias': 'address'
    },
    {
      'resource': 'announcement',
      'method': 'read_id',
      'alias': 'announcement'
    }
  ];

  // First up, sync all thermostats and sensors.
  beestat.api(
    'api',
    'batch',
    batch,
    function(response) {
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
      beestat.cache.set('ecobee_runtime_thermostat', []);
      beestat.cache.set('aggregate_runtime', []);

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

      // Rename series if only one stage is available.
      if (ecobee_thermostat.json_settings.coolStages === 1) {
        beestat.series.compressor_cool_1.name = 'Cool';
      }
      if (ecobee_thermostat.json_settings.heatStages === 1) {
        beestat.series.compressor_heat_1.name = 'Heat';
      }

      // Fix some other stuff for non-heat-pump.
      if (ecobee_thermostat.json_settings.hasHeatPump === false) {
        beestat.series.auxiliary_heat_1.name =
          beestat.series.compressor_heat_1.name;
        beestat.series.auxiliary_heat_1.color =
          beestat.series.compressor_heat_1.color;
        beestat.series.auxiliary_heat_2.name =
          beestat.series.compressor_heat_2.name;
        beestat.series.auxiliary_heat_2.color =
          beestat.series.compressor_heat_2.color;
        beestat.series.auxiliary_heat_3.name = 'Heat 3';
        beestat.series.auxiliary_heat_3.color = '#d35400';
      }

      /*
       * Fire off an API call to sync. The cron job will eventually run but this
       * ensures things get moving quicker.
       */
      beestat.api(
        'ecobee_runtime_thermostat',
        'sync',
        {
          'thermostat_id': thermostat.thermostat_id
        }
      );

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
    }
  );
};
