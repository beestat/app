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

  var denominator = required_sync_end.diff(required_sync_begin, 'minute');
  var numerator = current_sync_end.diff(current_sync_begin, 'minute');

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

/**
 * Helper function to get any system type.
 *
 * @param {number} thermostat_id
 * @param {string} mode heat|auxiliary_heat|cool
 *
 * @return {string} The system type.
 */
beestat.thermostat.get_system_type = function(thermostat_id, mode) {
  const thermostat = beestat.cache.thermostat[thermostat_id];

  if (thermostat.system_type.reported[mode].equipment !== null) {
    return thermostat.system_type.reported[mode].equipment;
  } else if (thermostat.system_type.detected[mode].equipment !== null) {
    return thermostat.system_type.detected[mode].equipment;
  }

  return 'unknown';
};

/**
 * Helper function to get any stages.
 *
 * @param {number} thermostat_id
 * @param {string} mode heat|auxiliary_heat|cool
 *
 * @return {string} The system type.
 */
beestat.thermostat.get_stages = function(thermostat_id, mode) {
  const thermostat = beestat.cache.thermostat[thermostat_id];

  if (thermostat.system_type.reported[mode].stages !== null) {
    return thermostat.system_type.reported[mode].stages;
  } else if (thermostat.system_type.detected[mode].stages !== null) {
    return thermostat.system_type.detected[mode].stages;
  }

  return 'unknown';
};

/**
 * Get the color a thermostat should be based on what equipment is running.
 *
 * @param {number} thermostat_id
 *
 * @return {string} The color string.
 */
beestat.thermostat.get_color = function(thermostat_id) {
  switch (beestat.thermostat.get_operating_mode(thermostat_id)) {
  case 'auxiliary_heat_1':
    return beestat.series.auxiliary_heat_1.color;
  case 'auxiliary_heat_2':
    return beestat.series.auxiliary_heat_1.color;
  case 'heat_1':
    return beestat.series.compressor_heat_1.color;
  case 'heat_2':
    return beestat.series.compressor_heat_2.color;
  case 'cool_1':
    return beestat.series.compressor_cool_1.color;
  case 'cool_2':
    return beestat.series.compressor_cool_2.color;
  default:
    return beestat.style.color.bluegray.dark;
  }
};

/**
 * Get the overall operating mode. This is meant for casual display of what my
 * system is doing right now.
 *
 * @param {number} thermostat_id
 *
 * @return {string} One of heat_1, heat_2, auxiliary_heat_1, auxiliary_heat_2,
 * cool_1, cool_2, or off.
 */
beestat.thermostat.get_operating_mode = function(thermostat_id) {
  const thermostat = beestat.cache.thermostat[thermostat_id];

  const operating_modes = [
    'auxiliary_heat_2',
    'auxiliary_heat_1',
    'heat_2',
    'heat_1',
    'cool_2',
    'cool_1'
  ];

  for (let i = 0; i < operating_modes.length; i++) {
    if (thermostat.running_equipment.includes(operating_modes[i]) === true) {
      return operating_modes[i];
    }
  }

  return 'off';
};

/**
 * Get the currently in-use climate.
 *
 * @param {number} thermostat_id
 * @param {string} climate_ref The ecobee climateRef
 *
 * @return {object} The climate
 */
beestat.thermostat.get_current_climate = function(thermostat_id) {
  const thermostat = beestat.cache.thermostat[thermostat_id];
  const climates = thermostat.program.climates;
  const climate_ref = thermostat.program.currentClimateRef;

  for (var i = 0; i < climates.length; i++) {
    if (climates[i].climateRef === climate_ref) {
      return climates[i];
    }
  }

  return null;
};

/**
 * Get whether or not the thermostat supports air quality.
 *
 * @param {number} thermostat_id
 * @param {string} climate_ref The ecobee climateRef
 *
 * @return {boolean} Whether or not the thermostat supports air quality.
 */
beestat.thermostat.supports_air_quality = function(thermostat_id) {
  const thermostat = beestat.cache.thermostat[thermostat_id];
  const ecobee_thermostat = beestat.cache.ecobee_thermostat[thermostat.ecobee_thermostat_id];
  return ecobee_thermostat.model_number === 'aresSmart';
};
