beestat.add_poll_interval = function(poll_interval) {
  beestat.poll_intervals.push(poll_interval);
  beestat.enable_poll();
};

beestat.remove_poll_interval = function(poll_interval) {
  var index = beestat.poll_intervals.indexOf(poll_interval);
  if (index !== -1) {
    beestat.poll_intervals.splice(index, 1);
  }
  beestat.enable_poll();
};

beestat.reset_poll_interval = function() {
  beestat.poll_intervals = [beestat.default_poll_interval];
  beestat.enable_poll();
};

beestat.enable_poll = function() {
  clearTimeout(beestat.poll_timeout);
  if (beestat.poll_intervals.length > 0) {
    beestat.poll_timeout = setTimeout(
      beestat.poll,
      Math.min.apply(null, beestat.poll_intervals)
    );
  }
};

beestat.disable_poll = function() {
  clearTimeout(beestat.poll_timeout);
};

/**
 * Poll the database for changes and update the cache.
 */
beestat.poll = function() {
  var api = new beestat.api();

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
    beestat.dispatcher.dispatchEvent('poll');
  });

  api.send();
};

// Five minutes
beestat.default_poll_interval = 300000;
beestat.poll_intervals = [beestat.default_poll_interval];
