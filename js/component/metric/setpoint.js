/**
 * Setpoint metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setpoint = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setpoint, beestat.component.metric);

beestat.component.metric.setpoint.prototype.parent_metric_name_ = 'setpoint';

beestat.component.metric.setpoint.prototype.is_temperature_ = true;

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.setpoint.prototype.get_units_ = function() {
  return beestat.setting('temperature_unit');
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.setpoint.prototype.get_title_ = function() {
  return this.child_metric_name_.charAt(0).toUpperCase() + this.child_metric_name_.slice(1);
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.setpoint.prototype.get_color_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_ + '_1'].color;
};

