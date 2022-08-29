/**
 * Help for floor plan elevation.
 *
 * @param {number} floor_plan_id
 */
beestat.component.modal.floor_plan_elevation_help = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.floor_plan_elevation_help, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.floor_plan_elevation_help.prototype.decorate_contents_ = function(parent) {
  const p1 = document.createElement('p');
  p1.innerText = 'Whoops!';
  parent.appendChild(p1);

  const p2 = document.createElement('p');
  p2.innerText = 'Elevation should be the height of this floor or room relative to the ground outside your home. For example, your first floor elevation should typically be 0, and your second floor elevation would be the height of your first floor ceilings.';
  parent.appendChild(p2);

  const p3 = document.createElement('p');
  p3.innerText = 'All rooms inherit the elevation of their floor, but can be overridden for complex floor plans.';
  parent.appendChild(p3);
};

/**
 * Get title.
 *
 * @return {string} The title.
 */
beestat.component.modal.floor_plan_elevation_help.prototype.get_title_ = function() {
  return 'Elevation';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.floor_plan_elevation_help.prototype.get_buttons_ = function() {
  var self = this;

  var ok = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Got it!')
    .addEventListener('click', function() {
      self.dispose();
    });

  return [ok];
};
