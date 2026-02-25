/**
 * Date range helpers.
 */
beestat.date_range = {};

/**
 * Clamp a detail range object for dynamic/static detail charts.
 *
 * @param {object} range
 * @param {object} options
 *
 * @return {object}
 */
beestat.date_range.clamp = function(range, options) {
  var max_dynamic_days = options.max_dynamic_days;
  var max_static_days = options.max_static_days;
  var now_m = options.now ? moment(options.now) : moment();

  var clamped = {
    'type': range.type === 'static' ? 'static' : 'dynamic',
    'dynamic': parseInt(range.dynamic, 10),
    'static_begin': range.static_begin,
    'static_end': range.static_end
  };

  if (isNaN(clamped.dynamic) === true || clamped.dynamic < 1) {
    clamped.dynamic = 1;
  } else if (clamped.dynamic > max_dynamic_days) {
    clamped.dynamic = max_dynamic_days;
  }

  var static_end_m = moment(clamped.static_end);
  if (static_end_m.isValid() === false) {
    static_end_m = now_m.clone();
  }

  var static_begin_m = moment(clamped.static_begin);
  if (static_begin_m.isValid() === false) {
    static_begin_m = static_end_m.clone().subtract(max_static_days - 1, 'day');
  }

  if (static_begin_m.isAfter(static_end_m) === true) {
    var temp = static_begin_m.clone();
    static_begin_m = static_end_m.clone();
    static_end_m = temp;
  }

  var diff = Math.abs(static_end_m.diff(static_begin_m, 'day')) + 1;
  if (diff > max_static_days) {
    static_end_m = static_begin_m.clone().add(max_static_days - 1, 'day');
  }

  clamped.static_begin = static_begin_m.format('M/D/YYYY');
  clamped.static_end = static_end_m.format('M/D/YYYY');

  clamped.changed = (
    clamped.type !== range.type ||
    clamped.dynamic !== range.dynamic ||
    clamped.static_begin !== range.static_begin ||
    clamped.static_end !== range.static_end
  );

  return clamped;
};
