/**
 * Runtime per heating degree day metric.
 *
 * @param {number} thermostat_id The thermostat group.
 */
beestat.component.metric.runtime_per_degree_day = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.runtime_per_degree_day, beestat.component.metric);

beestat.component.metric.runtime_per_degree_day.prototype.parent_metric_name_ = 'runtime_per_degree_day';

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.runtime_per_degree_day.prototype.get_units_ = function() {
  return 'm';
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.runtime_per_degree_day.prototype.get_title_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_].name;
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.runtime_per_degree_day.prototype.get_color_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_].color;
};

/**
 * Get max cutoff. This is used to set the chart min to max(median - 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.runtime_per_degree_day.prototype.get_cutoff_min_ = function() {
  return 0;
};
