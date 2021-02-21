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

  if (thermostat.system_type2.reported[mode].equipment !== null) {
    return thermostat.system_type2.reported[mode].equipment;
  } else if (thermostat.system_type2.detected[mode].equipment !== null) {
    return thermostat.system_type2.detected[mode].equipment;
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

  if (thermostat.system_type2.reported[mode].stages !== null) {
    return thermostat.system_type2.reported[mode].stages;
  } else if (thermostat.system_type2.detected[mode].stages !== null) {
    return thermostat.system_type2.detected[mode].stages;
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
  var thermostat = beestat.cache.thermostat[thermostat_id];
  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  if (
    ecobee_thermostat.equipment_status.indexOf('compCool2') !== -1 ||
    ecobee_thermostat.equipment_status.indexOf('compCool1') !== -1
  ) {
    return beestat.style.color.blue.light;
  } else if (
    ecobee_thermostat.settings.hasHeatPump === true &&
    (
      ecobee_thermostat.equipment_status.indexOf('auxHeat3') !== -1 ||
      ecobee_thermostat.equipment_status.indexOf('auxHeat2') !== -1 ||
      ecobee_thermostat.equipment_status.indexOf('auxHeat1') !== -1 ||
      ecobee_thermostat.equipment_status.indexOf('auxHotWater') !== -1
    )
  ) {
    return beestat.style.color.red.base;
  } else if (
    (
      ecobee_thermostat.settings.hasHeatPump === false &&
      (
        ecobee_thermostat.equipment_status.indexOf('auxHeat3') !== -1 ||
        ecobee_thermostat.equipment_status.indexOf('auxHeat2') !== -1 ||
        ecobee_thermostat.equipment_status.indexOf('auxHeat1') !== -1 ||
        ecobee_thermostat.equipment_status.indexOf('compHotWater') !== -1 ||
        ecobee_thermostat.equipment_status.indexOf('auxHotWater') !== -1
      )
    ) ||
    (
      ecobee_thermostat.settings.hasHeatPump === true &&
      (
        ecobee_thermostat.equipment_status.indexOf('heatPump1') !== -1 ||
        ecobee_thermostat.equipment_status.indexOf('heatPump2') !== -1
      )
    )
  ) {
    return beestat.style.color.orange.base;
  }
  return beestat.style.color.bluegray.dark;
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
};
