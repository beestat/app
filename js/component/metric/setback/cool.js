/**
 * Cool setback metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.setback.cool = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.setback.apply(this, arguments);
};
beestat.extend(beestat.component.metric.setback.cool, beestat.component.metric.setback);

beestat.component.metric.setback.cool.prototype.child_metric_name_ = 'cool';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.setback.cool.prototype.get_icon_ = function() {
  return 'snowflake';
};
