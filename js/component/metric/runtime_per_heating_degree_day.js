/**
 * Runtime per heating degree day metric.
 *
 * @param {number} thermostat_group_id The thermostat group.
 */
beestat.component.metric.runtime_per_heating_degree_day = function(thermostat_group_id) {
  this.thermostat_group_id_ = thermostat_group_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.runtime_per_heating_degree_day, beestat.component.metric);

beestat.component.metric.runtime_per_heating_degree_day.prototype.rerender_on_breakpoint_ = false;

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_title_ = function() {
  return 'Runtime / HDD';
};

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_icon_ = function() {
  return 'fire';
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_color_ = function() {
  return beestat.series.compressor_heat_1.color;
};

/**
 * Get the minimum value of this metric (within two standard deviations).
 *
 * @return {mixed} The minimum value of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_min_ = function() {
  var standard_deviation =
    beestat.cache.data.metrics.runtime_per_heating_degree_day.standard_deviation;
  return (beestat.cache.data.metrics.runtime_per_heating_degree_day.median - (standard_deviation * 2)).toFixed(1);
};

/**
 * Get the maximum value of this metric (within two standard deviations).
 *
 * @return {mixed} The maximum value of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_max_ = function() {
  var standard_deviation =
    beestat.cache.data.metrics.runtime_per_heating_degree_day.standard_deviation;
  return (beestat.cache.data.metrics.runtime_per_heating_degree_day.median + (standard_deviation * 2)).toFixed(1);
};

/**
 * Get the value of this metric.
 *
 * @return {mixed} The value of this metric.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_value_ = function() {
  var thermostat_group = beestat.cache.thermostat_group[
    this.thermostat_group_id_
  ];
  // todo: store this explicitly on the profile so it doesn't have to be calculated in JS?
  return (thermostat_group.profile.runtime.heat_1 /
    thermostat_group.profile.degree_days.heat).toFixed(1);
};

/**
 * Get a histogram between the min and max values of this metric.
 *
 * @return {array} The histogram.
 */
beestat.component.metric.runtime_per_heating_degree_day.prototype.get_histogram_ = function() {
  var histogram = [];
  for (var value in beestat.cache.data.metrics.runtime_per_heating_degree_day.histogram) {
    if (
      value >= this.get_min_() &&
      value <= this.get_max_()
    ) {
      var count = beestat.cache.data.metrics.runtime_per_heating_degree_day.histogram[value];
      histogram.push({
        'value': value,
        'count': count
      });
    }
  }
  return histogram;
};
