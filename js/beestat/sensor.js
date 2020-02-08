beestat.sensor = {};

/**
 * Get a sorted list of all sensors attached to the current thermostat.
 *
 * @return {array} The sensors.
 */
beestat.sensor.get_sorted = function() {
  // Get and sort all the sensors.
  var sensors = [];
  $.values(beestat.cache.sensor).forEach(function(sensor) {
    if (sensor.thermostat_id === beestat.setting('thermostat_id')) {
      sensors.push(sensor);
    }
  });

  sensors.sort(function(a, b) {
    return a.name.localeCompare(b.name, 'en', {'sensitivity': 'base'});
  });

  return sensors;
};
