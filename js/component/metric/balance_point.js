/**
 * Balance point metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.balance_point = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.balance_point, beestat.component.metric);

beestat.component.metric.balance_point.prototype.parent_metric_name_ = 'balance_point';

beestat.component.metric.balance_point.prototype.is_temperature_ = true;

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.balance_point.prototype.get_units_ = function() {
  return beestat.setting('temperature_unit');
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.balance_point.prototype.get_title_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_].name;
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.balance_point.prototype.get_color_ = function() {
  return beestat.series['compressor_' + this.child_metric_name_].color;
};

