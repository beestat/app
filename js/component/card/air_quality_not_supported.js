/**
 * Air Quality Not Supported
 */
beestat.component.card.air_quality_not_supported = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.air_quality_not_supported, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.air_quality_not_supported.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.blue.light);
  parent.appendChild($.createElement('p').innerText('Access to Air Quality information requires a compatible thermostat. Support beestat by buying through this affiliate link.'));

  new beestat.component.button()
    .set_icon('open_in_new')
    .set_text('Buy an ecobee Smart Thermostat Premium on Amazon')
    .set_background_color(beestat.style.color.green.dark)
    .set_background_hover_color(beestat.style.color.green.light)
    .addEventListener('click', function() {
      window.open('https://amzn.to/3A7vv3S');
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.air_quality_not_supported.prototype.get_title_ = function() {
  return 'Unsupported Thermostat';
};
