/**
 * Menu item
 */
beestat.component.menu_item = function() {
  this.hidden_ = false;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.menu_item, beestat.component);

beestat.component.menu_item.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.menu_item.prototype.decorate_ = function(parent) {
  var self = this;

  if (this.hidden_ === false) {
    parent
      .style({
        'padding': (beestat.style.size.gutter / 4) + 'px ' + (beestat.style.size.gutter) + 'px',
        'transition': 'background 200ms ease, color 200ms ease',
        'cursor': 'pointer'
      });
    this.parent_ = parent;

    (new beestat.component.icon(this.icon_))
      .set_size(24)
      .set_text(this.text_)
      .set_bubble_text(this.bubble_text_)
      .set_bubble_color(this.bubble_color_)
      .render(parent);

    // Events
      parent.addEventListener('mouseenter', function() {
      parent.style({
        'background': beestat.style.color.blue.light,
        'color': '#fff'
      });
    });
    parent.addEventListener('mouseleave', function() {
      parent.style({
        'background': 'none',
        'color': ''
      });
    });
    parent.addEventListener('click', function() {
      self.menu_.dispose();
      if(self.callback_ !== undefined) {
        self.callback_();
      }
    });
  }
};

/**
 * Set the text of the menu item.
 *
 * @param {string} text
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_text = function(text) {
  this.text_ = text;
  return this;
};

/**
 * Set the icon of the menu item.
 *
 * @param {string} icon
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_icon = function(icon) {
  this.icon_ = icon;
  return this;
};

/**
 * Set the callback of clicking the menu item.
 *
 * @param {Function} callback
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_callback = function(callback) {
  this.callback_ = callback;
  return this;
};

/**
 * Set the text of the bubble.
 *
 * @param {string} bubble_text
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_bubble_text = function(bubble_text) {
  this.bubble_text_ = bubble_text;
  return this;
};

/**
 * Set the color of the bubble.
 *
 * @param {string} bubble_color
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_bubble_color = function(bubble_color) {
  this.bubble_color_ = bubble_color;
  return this;
};

/**
 * Hide the menu item.
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.hide = function() {
  this.hidden_ = true;
  return this;
};

/**
 * Show the menu item.
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.show = function() {
  this.hidden_ = false;
  return this;
};

/**
 * Set the menu component so the item can interact with it as necessary.
 *
 * @param {beestat.component.menu} menu
 *
 * @return {beestat.component.menu_item} This.
 */
beestat.component.menu_item.prototype.set_menu = function(menu) {
  this.menu_ = menu;
  return this;
};
