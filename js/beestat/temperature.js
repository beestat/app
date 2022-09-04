/**
 * Format a temperature in a number of different ways. Default settings will
 * return a number converted to Celcius if necessary and rounded to one decimal
 * place.
 *
 * @param {object} args Instructions on how to format:
 *   temperature (required) - Temperature to work with
 *   input_temperature_unit (optional, default °F) - Input temperature unit
 *   output_temperature_unit (optional, default current setting) - Output temperature unit; default matches setting.
 *   convert (optional, default true) - Whether or not to convert to Celcius if necessary
 *   delta (optional, default false) - Whether or not the convert action is for a delta instead of a normal value
 *   round (optional, default 1) - Number of decimal points to round to
 *   units (optional, default false) - Whether or not to include units in the result
 *   type (optional, default number) - Type of value to return (string|number)
 *
 * @return {string} The formatted temperature.
 */
beestat.temperature = function(args) {
  // Allow passing a single argument of temperature for convenience.
  if (typeof args !== 'object' || args === null) {
    args = {
      'temperature': args
    };
  }

  var input_temperature_unit = beestat.default_value(
    args.input_temperature_unit,
    '°F'
  );
  var output_temperature_unit = beestat.default_value(
    args.output_temperature_unit,
    beestat.setting('units.temperature')
  );
  var delta = beestat.default_value(args.delta, false);
  var round = beestat.default_value(args.round, 1);
  var units = beestat.default_value(args.units, false);
  var type = beestat.default_value(args.type, 'number');

  var temperature = parseFloat(args.temperature);

  // Check for invalid values.
  if (isNaN(temperature) === true || isFinite(temperature) === false) {
    return null;
  }

  // Convert to Celcius if necessary and asked for.
  if (input_temperature_unit !== output_temperature_unit) {
    if (input_temperature_unit === '°F') {
      if (delta === true) {
        temperature *= (5 / 9);
      } else {
        temperature = (temperature - 32) * (5 / 9);
      }
    } else if (input_temperature_unit === '°C') {
      if (delta === true) {
        temperature *= (9 / 5);
      } else {
        temperature = (temperature * (9 / 5)) + 32;
      }
    }
  }

  /*
   * Get to the appropriate number of decimal points. This will turn the number
   * into a string. Then do a couple silly operations to fix -0.02 from showing
   * up as -0.0 in string form.
   */
  temperature = temperature.toFixed(round);
  temperature = parseFloat(temperature);
  temperature = temperature.toFixed(round);

  /*
   * Convert the previous string back to a number if requested. Format matters
   * because HighCharts doesn't accept strings in some cases.
   */
  if (type === 'number' && units === false) {
    temperature = Number(temperature);
  }

  // Append units if asked for.
  if (units === true) {
    temperature += output_temperature_unit;
  }

  return temperature;
};
