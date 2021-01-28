/**
 * Cool setpoint metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setpoint.cool = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.setpoint.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setpoint.cool, beestat.component.metric.setpoint);

beestat.component.metric.setpoint.cool.prototype.child_metric_name_ = 'cool';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.setpoint.cool.prototype.get_icon_ = function() {
  return 'snowflake';
};
