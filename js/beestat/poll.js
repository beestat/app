beestat.enable_poll = function() {
  window.clearTimeout(beestat.poll_timeout);
  if (beestat.poll_intervals.length > 0) {
    beestat.poll_timeout = window.setTimeout(
      beestat.poll,
      Math.min.apply(null, beestat.poll_intervals)
    );
  }
};

/**
 * Poll the database for changes and update the cache.
 */
window.last_poll = moment();
beestat.poll = function() {
  window.last_poll = moment();

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
};

// Five minutes
beestat.default_poll_interval = 300000;
beestat.poll_intervals = [beestat.default_poll_interval];
