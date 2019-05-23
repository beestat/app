/**
 * Help for the sensors card.
 */
beestat.component.modal.help_my_home = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_my_home, beestat.component.modal);

beestat.component.modal.help_my_home.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('These are all the properties of your home and HVAC system that are used in Home Comparisons.'));

  new beestat.component.title('System').render(parent);
  parent.appendChild($.createElement('p').innerHTML('Type of heating/cooling systems; detected automatically but are not always completely accurate due to lack of available data. They can be overridden by clicking on the <em>My Home</em> menu, then selecting <em>Change System Type</em>.'));

  new beestat.component.title('Region').render(parent);
  parent.appendChild($.createElement('p').innerHTML('Geographical region; determined automatically based on the address on the thermostat account.'));

  new beestat.component.title('Property').render(parent);
  parent.appendChild($.createElement('p').innerHTML('Physical property characteristics; determined automatically based on the data on the thermostat account.'));
};

beestat.component.modal.help_my_home.prototype.get_title_ = function() {
  return 'My Home - Help';
};
