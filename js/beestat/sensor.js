beestat.sensor = {};

/**
 * Get a sorted list of all sensors attached to the current thermostat.
 *
 * @param {number} thermostat_id Thermostat to get this list for.
 *
 * @return {array} The sensors.
 */
beestat.sensor.get_sorted = function(thermostat_id) {
  // Get and sort all the sensors.
  const sensors = [];
  Object.values(beestat.cache.sensor).forEach(function(sensor) {
    if (sensor.thermostat_id === (thermostat_id || beestat.setting('thermostat_id'))) {
      sensors.push(sensor);
    }
  });

  sensors.sort(function(a, b) {
    return a.name.localeCompare(b.name, 'en', {'sensitivity': 'base'});
  });

  return sensors;
};
