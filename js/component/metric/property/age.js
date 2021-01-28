/**
 * Property age metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.property.age = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.property.age, beestat.component.metric.property);

beestat.component.metric.property.age.prototype.child_metric_name_ = 'age';

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.property.age.prototype.get_units_ = function() {
  return 'y';
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.property.age.prototype.get_title_ = function() {
  return 'Age';
};

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.property.age.prototype.get_icon_ = function() {
  return 'clock_outline';
};

/**
 * Get max cutoff. This is used to set the chart min to max(median - 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.property.age.prototype.get_cutoff_min_ = function() {
  return 0;
};
