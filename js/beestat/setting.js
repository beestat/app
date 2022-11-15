/**
 * Get or set a setting. ESLint Forgive my variable naming sins for the sake
 * of no-shadow.
 *
 * @param {mixed} argument_1 If a string, get/set that specific key. If an
 * object, set all the specified keys in the object.
 * @param {mixed} opt_value If a string, set the specified key to this value.
 * @param {mixed} opt_callback Optional callback.
 *
 * @return {mixed} The setting if requesting (undefined if not set), undefined
 * otherwise.
 */
beestat.setting = function(argument_1, opt_value, opt_callback) {
  const user = beestat.user.get();
  if (user.settings === null) {
    user.settings = {};
  }

  // TODO Some of these are still strings instead of ints in the database.
  if (user.settings.thermostat_id !== undefined) {
    user.settings.thermostat_id = parseInt(
      user.settings.thermostat_id,
      10
    );
  }

  const defaults = {
    'runtime_thermostat_detail_range_type': 'dynamic',
    'runtime_thermostat_detail_range_static_begin': moment()
      .subtract(3, 'day')
      .format('MM/DD/YYYY'),
    'runtime_thermostat_detail_range_static_end': moment().format('MM/DD/YYYY'),
    'runtime_thermostat_detail_range_dynamic': 3,

    'runtime_sensor_detail_range_type': 'dynamic',
    'runtime_sensor_detail_range_static_begin': moment()
      .subtract(3, 'day')
      .format('MM/DD/YYYY'),
    'runtime_sensor_detail_range_static_end': moment().format('MM/DD/YYYY'),
    'runtime_sensor_detail_range_dynamic': 3,

    'air_quality_detail_range_type': 'dynamic',
    'air_quality_detail_range_static_begin': moment()
      .subtract(3, 'day')
      .format('MM/DD/YYYY'),
    'air_quality_detail_range_static_end': moment().format('MM/DD/YYYY'),
    'air_quality_detail_range_dynamic': 3,

    'air_quality_summary_range_type': 'dynamic',
    'air_quality_summary_range_static_begin': moment()
      .subtract(28, 'day')
      .format('MM/DD/YYYY'),
    'air_quality_summary_range_static_end': moment().format('MM/DD/YYYY'),
    'air_quality_summary_range_dynamic': 28,

    'runtime_thermostat_summary_time_count': 0,
    'runtime_thermostat_summary_time_period': 'all',
    'runtime_thermostat_summary_group_by': 'month',
    'runtime_thermostat_summary_gap_fill': true,
    'runtime_thermostat_summary_smart_scale': true,

    'comparison_region': 'global',
    'comparison_property_type': 'similar',

    'first_run': true,

    'thermostat.#.profile.ignore_solar_gain': false,

    'visualize.data_type': 'temperature',
    'visualize.range_type': 'dynamic',
    'visualize.range_dynamic': 7,
    'visualize.range_static.begin': moment()
      .subtract(3, 'day')
      .format('MM/DD/YYYY'),
    'visualize.range_static.end': moment()
      .format('MM/DD/YYYY'),
    'visualize.heat_map_values': 'dynamic',
    'visualize.heat_map_static.temperature.min': 70,
    'visualize.heat_map_static.temperature.max': 80,
    'visualize.heat_map_static.occupancy.min': 0,
    'visualize.heat_map_static.occupancy.max': 100,
    'visualize.hide_affiliate': false,
    'visualize.three_d.show_labels': false,
    'visualize.three_d.auto_rotate': false,

    'date_format': 'M/D/YYYY',

    'units.currency': 'usd',

    'hide_contribute_banner': false
  };

  // Figure out what we're trying to do.
  let settings;
  let key;
  let mode;
  if (typeof argument_1 === 'object') {
    settings = argument_1;
  } else {
    key = argument_1;

    if (opt_value !== undefined) {
      settings = {};
      settings[key] = opt_value;
    }
  }
  mode = (settings !== undefined || opt_value !== undefined) ? 'set' : 'get';

  // Get the requested value.
  if (mode === 'get') {
    /**
     * Get a value nested in an object from a string path.
     *
     * @param {object} o The object to search in.
     * @param {string} p) The path (ex: thermostat.1.profile.ignore_solar_gain)
     *
     * @throws {exception} If the path is invalid.
     * @return {mixed} The value, or undefined if it doesn't exist.
     */
    const get_value_from_path = (o, p) => p.split('.').reduce((a, v) => a[v], o);

    /**
     * Get the default value of a setting.
     *
     * @param {string} k The setting to get.
     *
     * @return {mixed} The default value, or undefined if there is none.
     */
    const get_default_value = function(k) {
      // Replace any numeric key parts with a # as a placeholder.
      let old_parts = k.split('.');
      let new_parts = [];
      old_parts.forEach(function(part) {
        if (isNaN(part) === false) {
          new_parts.push('#');
        } else {
          new_parts.push(part);
        }
      });

      return defaults[new_parts.join('.')];
    };

    let value;
    try {
      value = get_value_from_path(user.settings, key);
    } catch (error) {
      value = undefined;
    }

    return (value === undefined ? get_default_value(key) : value);
  }

  // Set the requested value.

  /**
   * Recursively update the setting object.
   *
   * @param {object} user_settings Settings object
   * @param {string} k Key to update. Dots indicate a path.
   * @param {mixed} v Value to set
   *
   * @return {object} Updated settings object.
   */
  const update_setting = function(user_settings, k, v) {
    let path = k.split('.');
    if (path.length > 1) {
      const this_key = path.shift();
      if (user_settings[this_key] === undefined) {
        user_settings[this_key] = {};
      }
      if (typeof user_settings[this_key] !== 'object') {
        throw new Error('Tried to set sub-key of non-object setting.');
      }
      user_settings[this_key] = update_setting(
        user_settings[this_key],
        path.join('.'),
        v
      );
    } else {
      user_settings[k] = v;
    }

    return user_settings;
  };

  const api = new beestat.api();
  api.set_callback(opt_callback);

  let has_calls = false;

  for (let k in settings) {
    if (beestat.setting(k) !== settings[k]) {
      user.settings = update_setting(user.settings, k, settings[k]);

      beestat.dispatcher.dispatchEvent('setting.' + k);

      api.add_call(
        'user',
        'update_setting',
        {
          'key': k,
          'value': settings[k]
        }
      );

      has_calls = true;
    }
  }

  /**
   * If no settings changed no API call needs to be fired. In that case also
   * fire the callback since the API isn't doing it.
   */
  if (has_calls === true) {
    api.send();
  } else {
    if (opt_callback !== undefined) {
      opt_callback();
    }
  }

  return undefined;
};
