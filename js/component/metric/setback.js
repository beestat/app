/**
 * Setback metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setback = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setback, beestat.component.metric);

beestat.component.metric.setback.prototype.parent_metric_name_ = 'setback';

beestat.component.metric.setback.prototype.is_temperature_ = true;

beestat.component.metric.setback.prototype.is_temperature_delta_ = true;

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.setback.prototype.get_units_ = function() {
  return beestat.setting('temperature_unit');
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.setback.prototype.get_title_ = function() {
  return this.child_metric_name_.charAt(0).toUpperCase() + this.child_metric_name_.slice(1);
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.setback.prototype.get_color_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_ + '_1'].color;
};

/**
 * Get max cutoff. This is used to set the chart min to max(median - 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.setback.prototype.get_cutoff_min_ = function() {
  return 0;
};
