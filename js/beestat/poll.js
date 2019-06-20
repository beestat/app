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
  beestat.api(
    'api',
    'batch',
    [
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
      }
    ],
    function(response) {
      beestat.cache.set('user', response.user);
      beestat.cache.set('thermostat', response.thermostat);
      beestat.cache.set('sensor', response.sensor);
      beestat.cache.set('ecobee_thermostat', response.ecobee_thermostat);
      beestat.cache.set('ecobee_sensor', response.ecobee_sensor);
      beestat.enable_poll();
      beestat.dispatcher.dispatchEvent('poll');
    }
  );
};

beestat.default_poll_interval = 300000; // 5 minutes
beestat.poll_intervals = [beestat.default_poll_interval];
