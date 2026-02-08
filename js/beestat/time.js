/**
 * Get a nice resresentation of a time duration.
 *
 * @param {number} seconds
 * @param {string} opt_unit Any unit that moment supports when creating
 * durations. If left out defaults to seconds.
 *
 * @return {string} A humanized duration string.
 */
beestat.time = function(seconds, opt_unit) {
  var duration = moment.duration(seconds, opt_unit || 'seconds');

  var hours = Math.floor(duration.asHours());
  var minutes = duration.get('minutes');

  return hours.toLocaleString() + 'h ' + minutes + 'm';
};
