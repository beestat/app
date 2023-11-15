/**
 * A tile representing a thermostat for the quick switch.
 *
 * @param {integer} thermostat_id
 */
beestat.component.tile.thermostat.switcher = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.tile.thermostat.apply(this, arguments);
};
beestat.extend(beestat.component.tile.thermostat.switcher, beestat.component.tile.thermostat);

/**
 * Get the icon for this tile.
 *
 * @return {string} The icon.
 */
beestat.component.tile.thermostat.switcher.prototype.get_icon_ = function() {
  return undefined;
};

/**
 * Get the text for this tile.
 *
 * @return {string} The first line of text.
 */
beestat.component.tile.thermostat.switcher.prototype.get_text_ = function() {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  const temperature = beestat.temperature({
    'temperature': thermostat.temperature,
    'round': 0,
    'units': true
  });

  return thermostat.name + ' • ' + temperature;
};

/**
 * Get the size of this tile.
 *
 * @return {string} The size of this tile.
 */
beestat.component.tile.thermostat.switcher.prototype.get_size_ = function() {
  return 'medium';
};
