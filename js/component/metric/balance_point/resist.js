/**
 * Balance Point for Resist
 *
 * @param {number} thermostat_id The thermostat ID.
 */
beestat.component.metric.balance_point.resist = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.metric.balance_point.apply(this, arguments);
};
beestat.extend(beestat.component.metric.balance_point.resist, beestat.component.metric.balance_point);

beestat.component.metric.balance_point.resist.prototype.child_metric_name_ = 'resist';

/**
 * Get the icon of this metric.
 *
 * @return {string} The icon of this metric.
 */
beestat.component.metric.balance_point.resist.prototype.get_icon_ = function() {
  return 'resistor';
};

/**
 * Get the title of this metric.
 *
 * @return {string} The title of this metric.
 */
beestat.component.metric.balance_point.resist.prototype.get_title_ = function() {
  return 'Resist';
};

/**
 * Get the color of this metric.
 *
 * @return {string} The color of this metric.
 */
beestat.component.metric.balance_point.resist.prototype.get_color_ = function() {
  return beestat.style.color.gray.dark;
};
