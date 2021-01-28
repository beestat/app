/**
 * Heat setback metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setback.heat = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.setback.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setback.heat, beestat.component.metric.setback);

beestat.component.metric.setback.heat.prototype.child_metric_name_ = 'heat';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.setback.heat.prototype.get_icon_ = function() {
  return 'fire';
};
