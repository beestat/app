beestat.enable_poll = function() {
  window.clearTimeout(beestat.poll_timeout);
  beestat.poll_timeout = window.setTimeout(
    beestat.poll,
    60000 * 5
  );
};

beestat.enable_poll_watcher = function() {
  window.clearTimeout(beestat.poll_watcher_timeout);
  beestat.poll_watcher_timeout = window.setTimeout(
    beestat.poll_watcher,
    1000
  );
};

/**
 * Check every second for when the last successful poll was. Used for when the
 * app is sent to the background and the polling stops to ensure an update is
 * run immediately.
 */
beestat.poll_watcher = function() {
  if (
    beestat.poll_last !== undefined &&
    beestat.poll_last.isBefore(moment().subtract(6, 'minute')) === true
  ) {
    window.clearTimeout(beestat.poll_timeout);
    beestat.poll();
  }

  beestat.enable_poll_watcher();
};

/**
 * Poll the database for changes and update the cache.
 */
beestat.poll = function() {
  beestat.poll_last = moment();

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

  api.set_callback(function(response) {
    beestat.cache.set('user', response.user);
    beestat.cache.set('thermostat', response.thermostat);
    beestat.cache.set('sensor', response.sensor);
    beestat.cache.set('ecobee_thermostat', response.ecobee_thermostat);
    beestat.cache.set('ecobee_sensor', response.ecobee_sensor);

    beestat.enable_poll();

    beestat.ecobee.notify_if_down();
  });

  api.send();

  /**
   * Send this every poll but don't specifically do anything with the
   * response. The caching won't allow it to send every time, but it should at
   * least keep up.
   */
  new beestat.api()
    .add_call(
      'runtime',
      'sync',
      {
        'thermostat_id': beestat.setting('thermostat_id')
      }
    )
    .set_callback(function(response, from_cache) {
      if (from_cache === false) {
        // Delete this cached data so the charts update.
        beestat.cache.delete('data.runtime_thermostat_detail__runtime_thermostat');
        beestat.cache.delete('data.runtime_sensor_detail__runtime_thermostat');
        beestat.cache.delete('data.runtime_sensor_detail__runtime_sensor');
        beestat.cache.delete('data.air_quality_detail__runtime_thermostat');
        beestat.cache.delete('data.air_quality_detail__runtime_sensor');
        beestat.cache.delete('data.three_d__runtime_sensor');
        beestat.cache.delete('data.three_d__runtime_thermostat');
      }
    })
    .send();
};
