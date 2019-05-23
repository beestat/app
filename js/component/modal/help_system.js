/**
 * Help for the system card.
 */
beestat.component.modal.help_system = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_system, beestat.component.modal);

beestat.component.modal.help_system.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Shows the current system status it would be displayed on the thermostat itself. Includes the following information:'));
  var ul = $.createElement('ul');
  parent.appendChild(ul);
  ul.appendChild($.createElement('li').innerHTML('System Mode'));
  ul.appendChild($.createElement('li').innerHTML('Schedule or Override'));
  ul.appendChild($.createElement('li').innerHTML('Setpoint'));
  ul.appendChild($.createElement('li').innerHTML('Temperature'));
  ul.appendChild($.createElement('li').innerHTML('Humidity'));
  ul.appendChild($.createElement('li').innerHTML('Running equipment'));
  ul.appendChild($.createElement('li').innerHTML('Active comfort setting'));
};

beestat.component.modal.help_system.prototype.get_title_ = function() {
  return 'System - Help';
};
