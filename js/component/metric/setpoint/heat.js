/**
 * Heat setpoint metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setpoint.heat = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.setpoint.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setpoint.heat, beestat.component.metric.setpoint);

beestat.component.metric.setpoint.heat.prototype.child_metric_name_ = 'heat';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.setpoint.heat.prototype.get_icon_ = function() {
  return 'fire';
};
