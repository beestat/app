/**
 * Menu
 */
beestat.component.menu = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.menu, beestat.component);

beestat.component.menu.prototype.rerender_on_breakpoint_ = false;

beestat.component.menu.prototype.decorate_ = function(parent) {
  var self = this;

  this.menu_items_ = [];

  this.icon_ = new beestat.component.button()
    .set_type('pill')
    .set_icon('dots_vertical')
    .set_bubble_text(this.bubble_text_)
    .set_bubble_color(this.bubble_color_)
    .set_text_color('#fff')
    // .set_background_hover_color(beestat.style.color.bluegray.light)
    .set_background_hover_color('rgba(255, 255, 255, 0.1')
    .addEventListener('click', function() {
      // Did I just try to open the same menu as last time?
      var same_as_last = (beestat.component.menu.open_menu === self);

      // Close any open menus (this deletes beestat.component.menu.open_menu)
      if (beestat.component.menu.open_menu !== undefined) {
        beestat.component.menu.open_menu.dispose();
      }

      if (same_as_last === false) {
        self.open_();
      }
    })
    .render(parent);
};

/**
 * Close this menu by hiding the container and removing the event listeners.
 */
beestat.component.menu.prototype.dispose = function() {
  if (beestat.component.menu.open_menu !== undefined) {
    var container = beestat.component.menu.open_menu.container_;
    container.style('transform', 'scale(0)');

    delete beestat.component.menu.open_menu;
    setTimeout(function() {
      container.parentNode().removeChild(container);
    }, 200);
  }

  $('html').removeEventListener('click.menu');
  $(window).removeEventListener('keydown.menu');
  $(window).removeEventListener('resize.menu');
};

/**
 * Open the menu.
 */
beestat.component.menu.prototype.open_ = function() {
  var self = this;

  var position = this.icon_.getBoundingClientRect();

  var container = $.createElement('div')
    .style({
      'background': '#fff',
      'color': '#444',
      'position': 'absolute',
      'top': position.bottom + 'px',
      'right': (window.innerWidth - position.right) + 'px',
      'transition': 'all 200ms ease',
      'transform': 'scale(0)',
      'transform-origin': 'top right',
      'padding': (beestat.style.size.gutter / 2) + 'px 0',
      'box-shadow': '0 2px 4px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.23)',
      'user-select': 'none',
      'border-radius': beestat.style.size.border_radius
    });

  $('body').appendChild(container);
  this.container_ = container;
  beestat.component.menu.open_menu = this;

  this.menu_items_.forEach(function(menu_item) {
    menu_item.render(container);
  });

  // Transition the element in after it's been placed on the page.
  setTimeout(function() {
    container.style('transform', 'scale(1)');

    /*
     * Close the element when clicking outside of it. For now I'm relying on
     * contains where possible, and falling back to saying "if you click on the
     * html document then close it too". If this starts to breakdown probably
     * just need to switch to checking against the bounding box.
     */
    $('html').addEventListener('click.menu', function(e) {
      if (
        (
          e.target.contains(container[0]) === false &&
          container[0].contains(e.target) === false
        ) ||
        e.target.nodeName === 'HTML'
      ) {
        self.dispose();
      }
    });

    $(window).addEventListener('keydown.menu', function(e) {
      if (e.which === 27) {
        self.dispose();
      }
    });

    $(window).addEventListener('resize.menu', function() {
      self.dispose();
    });
  }, 0);
};

/**
 * Set the text of the bubble.
 *
 * @param {string} bubble_text
 *
 * @return {beestat.component.menu} This.
 */
beestat.component.menu.prototype.set_bubble_text = function(bubble_text) {
  this.bubble_text_ = bubble_text;
  return this;
};

/**
 * Set the color of the bubble.
 *
 * @param {string} bubble_color
 *
 * @return {beestat.component.menu} This.
 */
beestat.component.menu.prototype.set_bubble_color = function(bubble_color) {
  this.bubble_color_ = bubble_color;
  return this;
};

/**
 * Add an item to the menu.
 *
 * @param {beestat.component.menu_item} menu_item
 *
 * @return {beestat.component.menu} This.
 */
beestat.component.menu.prototype.add_menu_item = function(menu_item) {
  this.menu_items_.push(menu_item);

  menu_item.set_menu(this);

  return this;
};

/**
 * Remove an item from the menu.
 *
 * @param {beestat.component.menu_item} menu_item
 *
 * @return {beestat.component.menu} This.
 */
beestat.component.menu.prototype.remove_menu_item = function(menu_item) {
  this.menu_items_.splice(
    this.menu_items_.indexOf(menu_item),
    1
  );

  return this;
};
