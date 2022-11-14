/**
 * Visualize intro.
 *
 * @param {number} thermostat_id
 */
beestat.component.card.visualize_intro = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.visualize_intro, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_intro.prototype.decorate_contents_ = function(parent) {
  const self = this;

  const center_container = document.createElement('div');
  center_container.style.textAlign = 'center';
  parent.appendChild(center_container);

  new beestat.component.tile()
    .set_icon('plus')
    .set_text([
      'Get started now!',
      'Create my first floor plan'
    ])
    .set_size('large')
    .set_background_color(beestat.style.color.green.dark)
    .set_background_hover_color(beestat.style.color.green.light)
    .render($(center_container))
    .addEventListener('click', function() {
      new beestat.component.modal.create_floor_plan(
        self.thermostat_id_
      ).render();
    });
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.visualize_intro.prototype.get_title_ = function() {
  return 'Visualize';
};
