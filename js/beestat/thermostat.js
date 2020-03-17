beestat.thermostat = {};

/**
 * Get the sync progress for a thermostat.
 *
 * @param {number} thermostat_id
 *
 * @return {number|null} A number between 0 and 100 inclusive. Can return null
 * for unknown.
 */
beestat.thermostat.get_sync_progress = function(thermostat_id) {
  var thermostat = beestat.cache.thermostat[thermostat_id];

  var current_sync_begin = moment(thermostat.sync_begin);
  var current_sync_end = moment(thermostat.sync_end);

  var required_sync_begin = moment.max(
    moment(thermostat.first_connected),
    moment().subtract(1, 'year')
  );
  var required_sync_end = moment().subtract(1, 'hour');

  // If the thermostat was connected within the last hour.
  if (required_sync_end.isSameOrBefore(required_sync_begin) === true) {
    return null;
  }

  var denominator = required_sync_end.diff(required_sync_begin, 'day');
  var numerator = current_sync_end.diff(current_sync_begin, 'day');

  return Math.min(100, Math.round(numerator / denominator * 100)) || 0;
};

/**
 * Determine whether or not the data to render the desired date range has been
 * synced.
 *
 * @param {number} thermostat_id
 * @param {moment} required_sync_begin
 * @param {moment} required_sync_end
 *
 * @return {boolean} Whether or not the data is synced.
 */
beestat.thermostat.data_synced = function(thermostat_id, required_sync_begin, required_sync_end) {
  // Demo can just grab whatever data is there.
  if (window.is_demo === true) {
    return true;
  }

  var thermostat = beestat.cache.thermostat[thermostat_id];

  var current_sync_begin = moment.utc(thermostat.sync_begin);
  var current_sync_end = moment.utc(thermostat.sync_end);

  return (
    current_sync_begin.isSameOrBefore(required_sync_begin) === true &&
    current_sync_end.isSameOrAfter(required_sync_end) === true
  );
};
