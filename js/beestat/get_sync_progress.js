/**
 * Get the sync progress for a thermostat.
 *
 * @param {number} thermostat_id
 *
 * @return {number} A number between 0 and 100 inclusive.
 */
beestat.get_sync_progress = function(thermostat_id) {
  var thermostat = beestat.cache.thermostat[thermostat_id];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  var required_sync_begin = moment.max(
    moment(thermostat.first_connected),
    moment().subtract(1, 'year')
  );
  var required_sync_end = moment().subtract(1, 'hour');

  var denominator = required_sync_end.diff(required_sync_begin, 'day');
  var numerator = current_sync_end.diff(current_sync_begin, 'day');

  return Math.min(100, Math.round(numerator / denominator * 100)) || 0;
};
