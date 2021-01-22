/**
 * A button-shaped component with text, an icon, and a background color.
 */
beestat.component.button_group = function() {
  this.buttons_ = [];
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.button_group, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.button_group.prototype.decorate_ = function(parent) {
  var self = this;

  // Only exists so that there can be spacing between wrapped elements.
  var outer_container = $.createElement('div')
    .style({
      'margin-top': (beestat.style.size.gutter / -2)
    });
  parent.appendChild(outer_container);

  this.buttons_.forEach(function(button, i) {
    var container = $.createElement('div').style({
      'display': 'inline-block',
      'margin-right': (i < self.buttons_.length) ? (beestat.style.size.gutter / 2) : 0,
      'margin-top': (beestat.style.size.gutter / 2)
    });
    button.render(container);
    outer_container.appendChild(container);
  });
};

/**
 * Add a button to this group.
 *
 * @param {beestat.component.button} button The button to add.
 */
beestat.component.button_group.prototype.add_button = function(button) {
  this.buttons_.push(button);
  if (this.rendered_ === true) {
    this.rerender();
  }
};

/**
 * Get all of the buttons in this button group.
 *
 * @return {[beestat.component.button]} The buttons in this group.
 */
beestat.component.button_group.prototype.get_buttons = function() {
  return this.buttons_;
};
