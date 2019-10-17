/**
 * Get or set a setting.
 *
 * @param {mixed} key If a string, get/set that specific key. If an object, set all the specified keys in the object.
 * @param {mixed} opt_value If a string, set the specified key to this value.
 * @param {mixed} opt_callback Optional callback.
 *
 * @return {mixed} The setting if requesting (undefined if not set), undefined
 * otherwise.
 */
beestat.setting = function(key, opt_value, opt_callback) {
  var user = beestat.get_user();

  var defaults = {
    'recent_activity_time_period': 'day',
    'recent_activity_time_count': 3,

    'runtime_thermostat_summary_time_count': 0,
    'runtime_thermostat_summary_time_period': 'all',
    'runtime_thermostat_summary_group_by': 'month',
    'runtime_thermostat_summary_gap_fill': true,

    'comparison_region': 'global',
    'comparison_property_type': 'similar'
  };

  if (user.json_settings === null) {
    user.json_settings = {};
  }

  /*
   * TODO This is temporary until I get all the setting data types under
   * control. Just doing this so other parts of the application can be built out
   * properly.
   */
  if (user.json_settings.thermostat_id !== undefined) {
    user.json_settings.thermostat_id = parseInt(
      user.json_settings.thermostat_id,
      10
    );
  }

  if (opt_value === undefined && typeof key !== 'object') {
    if (user.json_settings[key] !== undefined) {
      return user.json_settings[key];
    } else if (defaults[key] !== undefined) {
      return defaults[key];
    }
    return undefined;
  }
  var settings;
  if (typeof key === 'object') {
    settings = key;
  } else {
    settings = {};
    settings[key] = opt_value;
  }

  var api = new beestat.api();
  api.set_callback(opt_callback);

  var has_calls = false;

  for (var k in settings) {
    if (user.json_settings[k] !== settings[k]) {
      user.json_settings[k] = settings[k];

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

  // If no settings changed no API call needs to be fired.
  if (has_calls === true) {
    api.send();
  }
};
