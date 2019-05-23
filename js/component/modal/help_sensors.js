/**
 * Help for the sensors card.
 */
beestat.component.modal.help_sensors = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_sensors, beestat.component.modal);

beestat.component.modal.help_sensors.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Shows a list of all connected sensors. The thermostat itself counts as a sensor and is displayed at the top of the list. Includes the following information:'));
  var ul = $.createElement('ul');
  parent.appendChild(ul);
  ul.appendChild($.createElement('li').innerHTML('Name'));
  ul.appendChild($.createElement('li').innerHTML('Temperature'));
  ul.appendChild($.createElement('li').innerHTML('Whether the temperature is above or below the average'));
  ul.appendChild($.createElement('li').innerHTML('Occupancy'));
  ul.appendChild($.createElement('li').innerHTML('Included in average'));
};

beestat.component.modal.help_sensors.prototype.get_title_ = function() {
  return 'Sensors - Help';
};
