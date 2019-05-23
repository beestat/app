/**
 * Help for the home efficiency card.
 */
beestat.component.modal.help_home_efficiency = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_home_efficiency, beestat.component.modal);

beestat.component.modal.help_home_efficiency.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Describes how quickly your home loses or gains heat compared to the temperature outside. The flatter this line the better your home keeps temperature without needing your heating or air conditioning to run.'));
  parent.appendChild($.createElement('p').innerHTML('The data is sourced from your past year of history, looking at the rate of temperature change when your HVAC system is completely off. It is recalculated once a week.'));
  parent.appendChild($.createElement('p').innerHTML('This feature is still in beta, and as such is not perfect. For example, this graph does not account for homes with multiple thermostats or secondary sources of heating/cooling such as window A/C units and space heaters.'));
};

beestat.component.modal.help_home_efficiency.prototype.get_title_ = function() {
  return 'Home Efficiency - Help';
};
