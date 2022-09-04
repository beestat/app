/**
 * Format a distance in a number of different ways.
 *
 * @param {object} args Instructions on how to format:
 *   distance (required) - distance to work with
 *   output_distance_unit (optional, default ft) - Output distance unit; default matches setting.
 *   convert (optional, default true) - Whether or not to convert to Celcius if necessary
 *   round (optional, default 1) - Number of decimal points to round to
 *   units (optional, default false) - Whether or not to include units in the result
 *   type (optional, default number) - Type of value to return (string|number)
 *
 * @return {string} The formatted distance.
 */
beestat.distance = function(args) {
  // Allow passing a single argument of distance for convenience.
  if (typeof args !== 'object' || args === null) {
    args = {
      'distance': args
    };
  }

  var input_distance_unit = beestat.default_value(
    args.input_distance_unit,
    'in'
  );
  var output_distance_unit = beestat.default_value(
    args.output_distance_unit,
    beestat.setting('units.distance')
  );
  var round = beestat.default_value(args.round, 1);
  var units = beestat.default_value(args.units, false);
  var type = beestat.default_value(args.type, 'number');

  var distance = parseFloat(args.distance);

  // Check for invalid values.
  if (isNaN(distance) === true || isFinite(distance) === false) {
    return null;
  }

  const conversion_factors = {
    'in': {
      'ft': 0.0833,
      'm': 0.0254
    },
    'm': {
      'in': 39.3701,
      'ft': 3.28084
    },
    'ft': {
      'm': 0.3048,
      'in': 12
    }
  };

  // Convert if necessary and asked for.
  if (input_distance_unit !== output_distance_unit) {
    distance *= conversion_factors[input_distance_unit][output_distance_unit];
  }

  /*
   * Get to the appropriate number of decimal points. This will turn the number
   * into a string. Then do a couple silly operations to fix -0.02 from showing
   * up as -0.0 in string form.
   */
  distance = distance.toFixed(round);
  distance = parseFloat(distance);
  distance = distance.toFixed(round);

  /*
   * Convert the previous string back to a number if requested. Format matters
   * because HighCharts doesn't accept strings in some cases.
   */
  if (type === 'number' && units === false) {
    distance = Number(distance);
  }

  // Append units if asked for.
  if (units === true) {
    distance = Number(distance).toLocaleString() + ' ' + output_distance_unit;
  }

  return distance;
};
