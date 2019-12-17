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
    'runtime_detail_smoothing': true,
    'runtime_detail_range_type': 'dynamic',
    'runtime_detail_range_static_begin': moment()
      .subtract(3, 'day')
      .format('MM/DD/YYYY'),
    'runtime_detail_range_static_end': moment().format('MM/DD/YYYY'),
    'runtime_detail_range_dynamic': 3,

    'runtime_thermostat_summary_time_count': 0,
    'runtime_thermostat_summary_time_period': 'all',
    'runtime_thermostat_summary_group_by': 'month',
    'runtime_thermostat_summary_gap_fill': true,

    'comparison_region': 'global',
    'comparison_property_type': 'similar',

    'temperature_unit': '°F'
  };

  if (user.settings === null) {
    user.settings = {};
  }

  /*
   * TODO This is temporary until I get all the setting data types under
   * control. Just doing this so other parts of the application can be built out
   * properly.
   */
  if (user.settings.thermostat_id !== undefined) {
    user.settings.thermostat_id = parseInt(
      user.settings.thermostat_id,
      10
    );
  }

  if (opt_value === undefined && typeof key !== 'object') {
    if (user.settings[key] !== undefined) {
      return user.settings[key];
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
    if (user.settings[k] !== settings[k]) {
      user.settings[k] = settings[k];

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
};
