/**
 * Heat setpoint metric.
 *
 * @param {number} thermostat_group_id The thermostat group.
 */
beestat.component.metric.setpoint_heat = function(thermostat_group_id) {
  this.thermostat_group_id_ = thermostat_group_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setpoint_heat, beestat.component.metric);

beestat.component.metric.setpoint_heat.prototype.rerender_on_breakpoint_ = false;

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_title_ = function() {
  return 'Heat Setpoint';
};

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_icon_ = function() {
  return 'fire';
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_color_ = function() {
  return beestat.series.compressor_heat_1.color;
};

/**
 * Get the minimum value of this metric (within two standard deviations).
 *
 * @param {boolean} units Whether or not to return a numerical value or a
 * string with units.
 *
 * @return {mixed} The minimum value of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_min_ = function(units) {
  var standard_deviation =
    beestat.cache.data.metrics.setpoint_heat.standard_deviation;
  return beestat.temperature({
    'temperature': beestat.cache.data.metrics.setpoint_heat.median - (standard_deviation * 2),
    'round': 0,
    'units': units
  });
};

/**
 * Get the maximum value of this metric (within two standard deviations).
 *
 * @param {boolean} units Whether or not to return a numerical value or a
 * string with units.
 *
 * @return {mixed} The maximum value of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_max_ = function(units) {
  var standard_deviation =
    beestat.cache.data.metrics.setpoint_heat.standard_deviation;
  return beestat.temperature({
    'temperature': beestat.cache.data.metrics.setpoint_heat.median + (standard_deviation * 2),
    'round': 0,
    'units': units
  });
};

/**
 * Get the value of this metric.
 *
 * @param {boolean} units Whether or not to return a numerical value or a
 * string with units.
 *
 * @return {mixed} The value of this metric.
 */
beestat.component.metric.setpoint_heat.prototype.get_value_ = function(units) {
  var thermostat_group = beestat.cache.thermostat_group[
    this.thermostat_group_id_
  ];
  return beestat.temperature({
    'temperature': thermostat_group.profile.setpoint.heat,
    'units': units
  });
};

/**
 * Get a histogram between the min and max values of this metric.
 *
 * @param {boolean} units Whether or not to return a numerical value or a
 * string with units.
 *
 * @return {array} The histogram.
 */
beestat.component.metric.setpoint_heat.prototype.get_histogram_ = function(units) {
  var histogram = [];
  for (var temperature in beestat.cache.data.metrics.setpoint_heat.histogram) {
    if (
      temperature >= this.get_min_(units) &&
      temperature <= this.get_max_(units)
    ) {
      var count = beestat.cache.data.metrics.setpoint_heat.histogram[temperature];
      histogram.push({
        'value': beestat.temperature(temperature),
        'count': count
      });
    }
  }
  return histogram;
};
