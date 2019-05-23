/**
 * Temperature Profiles help.
 *
 * @param {string} type heat|cool|resist
 * @param {array} comparison_attributes
 */
beestat.component.modal.help_temperature_profiles = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_temperature_profiles, beestat.component.modal);

/*
Describes how quickly your home loses or gains heat compared to the temperature outside. The flatter this line the better your home keeps temperature without needing your heating or air conditioning to run.

The data is sourced from your past year of history, looking at the rate of temperature change when your HVAC system is completely off. It is recalculated once a week.

This feature is still in beta, and as such is not perfect. For example, this graph does not account for homes with multiple thermostats or secondary sources of heating/cooling such as window A/C units and space heaters.*/

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.help_temperature_profiles.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerText('Temperature profiles tell you how fast or slow your indoor temperature changes. This is powerful information that can tell you a lot about your home and help you make informed decisions.'));

  (new beestat.component.title('Heat / Cool')).render(parent);
  parent.appendChild($.createElement('p').innerText('The orange and blue lines represent the rate at which your home heats or cools for any given outdoor temperature. The dotted lines are the raw data, and the solid line is a trendline for that data. For heat pump owners, the outdoor temperature where the orange line crosses the y-axis is called your balance point and tells you when you need an auxiliary source of heat to keep your home warm.'));

  (new beestat.component.title('Resist')).render(parent);
  parent.appendChild($.createElement('p').innerText('The gray line represents the rate at which your home gains or loses heat when your HVAC system is completely off. The dotted lines are the raw data, and the solid line is a trendline for that data.'));
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.help_temperature_profiles.prototype.get_title_ = function() {
  return 'Temperature Profiles - Help';
};
