/**
 * Format a date.
 *
 * @param {object} args Instructions on how to format:
 *   date (required) - Temperature to work with
 *
 * @return {string} The formatted date.
 */
beestat.date = function(args) {
  // Allow passing a single argument of date for convenience.
  if (typeof args !== 'object' || args === null) {
    args = {
      'date': args
    };
  }

  const m = moment(args.date);
  if (
    args.date !== undefined &&
    m.isValid() === true
  ) {
    return m.format(beestat.setting('date_format'));
  } else {
    return '';
  }
};
