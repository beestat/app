/**
 * Runtime / CDD for Cool Stage 1
 *
 * @param {number} thermostat_id The thermostat ID.
 */
beestat.component.metric.runtime_per_degree_day.cool_1 = function(thermostat_id) {
  this.thermostat_group_id_ = thermostat_id;

  beestat.component.metric.runtime_per_degree_day.apply(this, arguments);
};
beestat.extend(beestat.component.metric.runtime_per_degree_day.cool_1, beestat.component.metric.runtime_per_degree_day);

beestat.component.metric.runtime_per_degree_day.cool_1.prototype.child_metric_name_ = 'cool_1';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.runtime_per_degree_day.cool_1.prototype.get_icon_ = function() {
  return 'snowflake';
};
