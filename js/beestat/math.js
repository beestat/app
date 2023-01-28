beestat.math = {};

/**
 * Get a linear trendline from a set of data.
 *
 * @param {Object} data The data; at least two points required.
 *
 * @return {Object} The slope and intercept of the trendline.
 */
beestat.math.get_linear_trendline = function(data) {
  // Requires at least two points.
  if (Object.keys(data).length < 2) {
    return null;
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x_squared = 0;
  var n = 0;

  for (var x in data) {
    x = parseFloat(x);
    var y = parseFloat(data[x]);

    sum_x += x;
    sum_y += y;
    sum_xy += (x * y);
    sum_x_squared += Math.pow(x, 2);
    n++;
  }

  var slope = ((n * sum_xy) - (sum_x * sum_y)) /
    ((n * sum_x_squared) - (Math.pow(sum_x, 2)));
  var intercept = ((sum_y) - (slope * sum_x)) / (n);

  return {
    'slope': slope,
    'intercept': intercept
  };
};
