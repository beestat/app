/**
 * Format a area in a number of different ways.
 *
 * @param {object} args Instructions on how to format:
 *   area (required) - area to work with
 *   output_area_unit (optional, default ft) - Output area unit; default matches setting.
 *   convert (optional, default true) - Whether or not to convert to Celcius if necessary
 *   round (optional, default 0) - Number of decimal points to round to
 *   units (optional, default false) - Whether or not to include units in the result
 *   type (optional, default number) - Type of value to return (string|number)
 *
 * @return {string} The formatted area.
 */
beestat.area = function(args) {
  // Allow passing a single argument of area for convenience.
  if (typeof args !== 'object' || args === null) {
    args = {
      'area': args
    };
  }

  var input_area_unit = beestat.default_value(
    args.input_area_unit,
    'ft²'
  );
  var output_area_unit = beestat.default_value(
    args.output_area_unit,
    beestat.setting('units.area')
  );
  var round = beestat.default_value(args.round, 0);
  var units = beestat.default_value(args.units, false);
  var type = beestat.default_value(args.type, 'number');

  var area = parseFloat(args.area);

  // Check for invalid values.
  if (isNaN(area) === true || isFinite(area) === false) {
    return null;
  }

  const conversion_factors = {
    'in²': {
      'ft²': 0.00694444,
      'm²': 0.00064516
    },
    'ft²': {
      'in²': 144,
      'm²': 0.092903
    }
  };

  // Convert if necessary and asked for.
  if (input_area_unit !== output_area_unit) {
    area *= conversion_factors[input_area_unit][output_area_unit];
  }

  /*
   * Get to the appropriate number of decimal points. This will turn the number
   * into a string. Then do a couple silly operations to fix -0.02 from showing
   * up as -0.0 in string form.
   */
  area = area.toFixed(round);
  area = parseFloat(area);
  area = area.toFixed(round);

  /*
   * Convert the previous string back to a number if requested. Format matters
   * because HighCharts doesn't accept strings in some cases.
   */
  if (type === 'number' && units === false) {
    area = Number(area);
  }

  // Append units if asked for.
  if (units === true) {
    area = Number(area).toLocaleString() + ' ' + output_area_unit;
  }

  return area;
};
