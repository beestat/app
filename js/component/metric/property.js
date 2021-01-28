/**
 * Property metric.
 *
 * @param {number} thermostat_id The thermostat.
 */
beestat.component.metric.property = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.apply(this, arguments);
};
beestat.extend(beestat.component.metric.property, beestat.component.metric);

beestat.component.metric.property.prototype.parent_metric_name_ = 'property';

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.property.prototype.get_title_ = function() {
  return this.child_metric_name_.charAt(0).toUpperCase() + this.child_metric_name_.slice(1);
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.property.prototype.get_color_ = function() {
  return beestat.style.color.purple.base;
};

