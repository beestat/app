/**
 * Runtime / HDD for Auxiliary Heat Stage 1
 *
 * @param {number} thermostat_id The thermostat ID.
 */
beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1 = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.runtime_per_degree_day.apply(this, arguments);
};
beestat.extend(beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1, beestat.component.metric.runtime_per_degree_day);

beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1.prototype.child_metric_name_ = 'auxiliary_heat_1';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1.prototype.get_icon_ = function() {
  return 'fire';
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1.prototype.get_title_ = function() {
  return beestat.series[this.child_metric_name_].name;
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.runtime_per_degree_day.auxiliary_heat_1.prototype.get_color_ = function() {
  return beestat.series[this.child_metric_name_].color;
};
