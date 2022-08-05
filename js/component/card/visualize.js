/**
 * Visualize
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.visualize = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.visualize, beestat.component.card);

beestat.component.card.visualize.prototype.decorate_contents_ = function(parent) {
  const scene = new beestat.component.scene(this.thermostat_id_);
  scene.render(parent);

  let date = new Date('2022-06-27 11:30:00');
  scene.set_date(date);
  // let date = new Date('2024-04-08 08:00:00'); // Total solar eclipse
  // scene.set_date(date);
  // setInterval(function() {
  //   date = new Date(date.getTime() + (60000 * 1));
  //   scene.set_date(date);
  // }, 100);
  //

  beestat.dispatcher.addEventListener('cache.floor_plan', function() {
    scene.rerender();
    // todo get scene to remember date, camera position, etc on rerender
    scene.set_date(date);
  });
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.visualize.prototype.get_title_ = function() {
  return 'Visualize';
};
