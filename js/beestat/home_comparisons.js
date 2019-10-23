beestat.home_comparisons = {};

/**
 * Fire off an API call to get the comparison scores using the currently
 * defined settings. Updates the cache with the response which fires off the
 * vent for anything bound to that data.
 *
 * Note that this fires off a batch API call for heat, cool, and resist
 * scores. So if you *only* had the resist card on the dashboard you would
 * still get all three. I think the most common use case is showing all three
 * scores, so the layer loader will be able to optimize away the duplicate
 * requests and do one multi API call instead of three distinct API calls.
 *
 * @param {Function} callback Optional callback to fire when the API call
 * completes.
 */
beestat.home_comparisons.get_comparison_scores = function(callback) {
  var types = [
    'heat',
    'cool',
    'resist'
  ];

  var api = new beestat.api();
  types.forEach(function(type) {
    beestat.cache.delete('data.comparison_scores_' + type);
    api.add_call(
      'thermostat_group',
      'get_scores',
      {
        'type': type,
        'attributes': beestat.home_comparisons.get_comparison_attributes(type)
      },
      type
    );
  });

  api.set_callback(function(data) {
    types.forEach(function(type) {
      beestat.cache.set('data.comparison_scores_' + type, data[type]);
    });

    if (callback !== undefined) {
      callback();
    }
  });

  api.send();
};

/**
 * Based on the comparison settings chosen in the GUI, get the proper broken
 * out comparison attributes needed to make an API call.
 *
 * @param {string} type heat|cool|resist
 *
 * @return {Object} The comparison attributes.
 */
beestat.home_comparisons.get_comparison_attributes = function(type) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group =
    beestat.cache.thermostat_group[thermostat.thermostat_group_id];

  var attributes = {};

  if (beestat.setting('comparison_property_type') === 'similar') {
    // Match structure type exactly.
    if (thermostat_group.property_structure_type !== null) {
      attributes.property_structure_type =
        thermostat_group.property_structure_type;
    }

    // Always a 10 year age delta on both sides.
    if (thermostat_group.property_age !== null) {
      var property_age_delta = 10;
      var min_property_age = Math.max(
        0,
        thermostat_group.property_age - property_age_delta
      );
      var max_property_age = thermostat_group.property_age + property_age_delta;
      attributes.property_age = {
        'operator': 'between',
        'value': [
          min_property_age,
          max_property_age
        ]
      };
    }

    // Always a 1000sqft size delta on both sides (total 2000 sqft).
    if (thermostat_group.property_square_feet !== null) {
      var property_square_feet_delta = 1000;
      var min_property_square_feet = Math.max(
        0,
        thermostat_group.property_square_feet - property_square_feet_delta
      );
      var max_property_square_feet =
        thermostat_group.property_square_feet +
        property_square_feet_delta;
      attributes.property_square_feet = {
        'operator': 'between',
        'value': [
          min_property_square_feet,
          max_property_square_feet
        ]
      };
    }

    /*
     * If 0 or 1 stories, then 1 story, else just more than one story.
     * Apartments ignore this.
     */
    if (
      thermostat_group.property_stories !== null &&
      thermostat_group.property_structure_type !== 'apartment'
    ) {
      if (thermostat_group.property_stories < 2) {
        attributes.property_stories = thermostat_group.property_stories;
      } else {
        attributes.property_stories = {
          'operator': '>=',
          'value': thermostat_group.property_stories
        };
      }
    }
  } else if (beestat.setting('comparison_property_type') === 'same_structure') {
    // Match structure type exactly.
    if (thermostat_group.property_structure_type !== null) {
      attributes.property_structure_type =
        thermostat_group.property_structure_type;
    }
  }

  if (
    thermostat_group.address_latitude !== null &&
    thermostat_group.address_longitude !== null &&
    beestat.setting('comparison_region') !== 'global'
  ) {
    attributes.address_latitude = thermostat_group.address_latitude;
    attributes.address_longitude = thermostat_group.address_longitude;
    attributes.address_radius = 250;
  }

  if (type === 'heat') {
    attributes.system_type_heat = thermostat_group.system_type_heat;
  } else if (type === 'cool') {
    attributes.system_type_cool = thermostat_group.system_type_cool;
  }

  return attributes;
};
