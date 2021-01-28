/**
 * Property square feet metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.property.square_feet = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.property.square_feet, beestat.component.metric.property);

beestat.component.metric.property.square_feet.prototype.child_metric_name_ = 'square_feet';

/**
 * Get the units for this metric.
 *
 * @return {string} The units for this metric.
 */
beestat.component.metric.property.square_feet.prototype.get_units_ = function() {
  return 'ft²';
};

/**
 * Get the a formatter function that applies a transformation to the value.
 *
 * @return {mixed} A function that formats the string.
 */
beestat.component.metric.property.square_feet.prototype.get_formatter_ = function() {
  var self = this;

  return function(value, precision) {
    return value.toLocaleString() + self.get_units_();
  };
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.property.square_feet.prototype.get_title_ = function() {
  return 'Square Feet';
};

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.property.square_feet.prototype.get_icon_ = function() {
  return 'view_quilt';
};

/**
 * Get max cutoff. This is used to set the chart min to max(median - 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.property.square_feet.prototype.get_cutoff_min_ = function() {
  return 500;
};

/**
 * Get the counting interval for the histogram.
 *
 * @return {number} The interval.
 */
beestat.component.metric.property.square_feet.prototype.get_interval_ = function() {
  return 500;
};
