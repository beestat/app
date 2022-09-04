beestat.comparisons = {};

/**
 * Based on the comparison settings chosen in the GUI, get the proper broken
 * out comparison attributes needed to make an API call.
 *
 * @return {object} The comparison attributes.
 */
beestat.comparisons.get_attributes = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var address = beestat.cache.address[thermostat.address_id];

  var attributes = {};

  if (beestat.setting('comparison_property_type') === 'similar') {
    // Match structure type exactly.
    if (thermostat.property.structure_type !== null) {
      attributes.property_structure_type =
        thermostat.property.structure_type;
    }

    // Always a 10 year age delta on both sides.
    if (thermostat.property.age !== null) {
      var property_age_delta = 10;
      var min_property_age = Math.max(
        0,
        thermostat.property.age - property_age_delta
      );
      var max_property_age = thermostat.property.age + property_age_delta;
      attributes.property_age = {
        'operator': 'between',
        'value': [
          min_property_age,
          max_property_age
        ]
      };
    }

    // Always a 1000ft² size delta on both sides (total 2000 ft²).
    if (thermostat.property.square_feet !== null) {
      var property_square_feet_delta = 1000;
      var min_property_square_feet = Math.max(
        0,
        thermostat.property.square_feet - property_square_feet_delta
      );
      var max_property_square_feet =
        thermostat.property.square_feet +
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
      thermostat.property.stories !== null &&
      thermostat.property.structure_type !== 'apartment'
    ) {
      if (thermostat.property.stories < 2) {
        attributes.property_stories = thermostat.property.stories;
      } else {
        attributes.property_stories = {
          'operator': '>=',
          'value': thermostat.property.stories
        };
      }
    }
  } else if (beestat.setting('comparison_property_type') === 'same_structure') {
    // Match structure type exactly.
    if (thermostat.property.structure_type !== null) {
      attributes.property_structure_type =
        thermostat.property.structure_type;
    }
  }

  if (
    beestat.address.is_valid(address.address_id) === true &&
    beestat.setting('comparison_region') !== 'global'
  ) {
    attributes.radius = {
      'operator': '<',
      'value': 250
    };
  }

  return attributes;
};
