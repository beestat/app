/**
 * Visualize intro.
 *
 * @param {number} thermostat_id
 */
beestat.component.card.visualize_affiliate = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.visualize_affiliate, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_affiliate.prototype.decorate_contents_ = function(parent) {
  const tile_group = new beestat.component.tile_group();

  tile_group.add_tile(new beestat.component.tile()
    .set_icon('open_in_new')
    .set_text([
      'SmartSensor 2 Pack',
      'Amazon Affiliate'
    ])
    .set_size('large')
    .set_background_color(beestat.style.color.green.dark)
    .set_background_hover_color(beestat.style.color.green.light)
    .addEventListener('click', function() {
      window.open(beestat.affiliate.get_link('ecobee_smart_sensor_2_pack'));
    })
  );

  tile_group.render(parent);
};

/**
 * Decorate the close button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_affiliate.prototype.decorate_top_right_ = function(parent) {
  new beestat.component.tile()
    .set_type('pill')
    .set_shadow(false)
    .set_icon('close')
    .set_text_color('#fff')
    .set_background_hover_color('rgba(255, 255, 255, 0.1')
    .addEventListener('click', function() {
      beestat.setting('visualize.hide_affiliate', true);
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.visualize_affiliate.prototype.get_title_ = function() {
  return 'Need more sensors?';
};
