/**
 * Balance Point for Heat Stage 2
 *
 * @param {number} thermostat_id The thermostat ID.
 */
beestat.component.metric.balance_point.heat_2 = function(thermostat_id) {
  this.thermostat_group_id_ = thermostat_id;

  beestat.component.metric.balance_point.apply(this, arguments);
};
beestat.extend(beestat.component.metric.balance_point.heat_2, beestat.component.metric.balance_point);

beestat.component.metric.balance_point.heat_2.prototype.child_metric_name_ = 'heat_2';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.balance_point.heat_2.prototype.get_icon_ = function() {
  return 'fire';
};
