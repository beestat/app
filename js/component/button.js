/**
 * A button-shaped component with text, an icon, and a background color.
 */
beestat.component.button = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.button, beestat.component);

beestat.component.button.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.button.prototype.decorate_ = function(parent) {
  var self = this;

  var border_radius;
  if (this.type_ === 'pill') {
    border_radius = '32px';
  } else {
    border_radius = beestat.style.size.border_radius;
  }

  this.button_ = $.createElement('div')
    .style({
      'display': 'inline-block',
      'background': this.background_color_,
      'color': this.text_color_,
      'user-select': 'none',
      'border-radius': border_radius,
      'padding-top': '3px',
      'padding-bottom': '3px',
      'transition': 'color 200ms ease, background 200ms ease'
    });
  parent.appendChild(this.button_);

  if (this.icon_ !== undefined && this.text_ !== undefined) {
    // Text + Icon
    this.button_.style({
      'padding-left': (beestat.style.size.gutter / 2),
      'padding-right': (beestat.style.size.gutter / 2)
    });

    (new beestat.component.icon(this.icon_))
      .set_text(this.text_)
      .set_bubble_text(this.bubble_text_)
      .set_bubble_color(this.bubble_color_)
      .render(this.button_);
  } else if (this.icon_ === undefined && this.text_ !== undefined) {
    // Text only
    this.button_.style({
      'padding': '0px ' + (beestat.style.size.gutter / 2) + 'px',
      'line-height': '32px'
    });
    this.button_.innerText(this.text_);
  } else {
    // Icon only
    this.button_.style({
      'width': '32px',
      'text-align': 'center'
    });

    (new beestat.component.icon(this.icon_))
      .set_text(this.text_)
      .set_bubble_text(this.bubble_text_)
      .set_bubble_color(this.bubble_color_)
      .render(this.button_);
  }

  if (
    this.text_hover_color_ !== undefined ||
    this.background_hover_color_ !== undefined
  ) {
    this.button_.style({'cursor': 'pointer'});

    var mouseenter_style = {};
    if (this.text_hover_color_ !== undefined) {
      mouseenter_style.color = this.text_hover_color_;
    }
    if (this.background_hover_color_ !== undefined) {
      mouseenter_style.background = this.background_hover_color_;
    }

    var mouseleave_style = {};
    mouseleave_style.color =
      (this.text_color_ !== undefined) ? this.text_color_ : '';
    mouseleave_style.background =
      (this.background_color_ !== undefined) ? this.background_color_ : '';

    this.button_.addEventListener('mouseenter', function() {
      self.button_.style(mouseenter_style);
    });
    this.button_.addEventListener('mouseleave', function() {
      self.button_.style(mouseleave_style);
    });
  }

  this.button_.addEventListener('click', function() {
    self.dispatchEvent('click');
  });
};

/**
 * Set the text.
 *
 * @param {string} text
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_text = function(text) {
  this.text_ = text;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the icon.
 *
 * @param {string} icon
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_icon = function(icon) {
  this.icon_ = icon;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the background color.
 *
 * @param {string} background_color
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_background_color = function(background_color) {
  this.background_color_ = background_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the text color.
 *
 * @param {string} text_color
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_text_color = function(text_color) {
  this.text_color_ = text_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the background hover color.
 *
 * @param {string} background_hover_color
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_background_hover_color = function(background_hover_color) {
  this.background_hover_color_ = background_hover_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the text hover color.
 *
 * @param {string} text_hover_color
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_text_hover_color = function(text_hover_color) {
  this.text_hover_color_ = text_hover_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the type.
 *
 * @param {string} type Valid value is "pill" for now.
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_type = function(type) {
  this.type_ = type;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the text of the bubble.
 *
 * @param {string} bubble_text
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_bubble_text = function(bubble_text) {
  this.bubble_text_ = bubble_text;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the color of the bubble.
 *
 * @param {string} bubble_color
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.set_bubble_color = function(bubble_color) {
  this.bubble_color_ = bubble_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Do the normal event listener stuff.
 *
 * @return {beestat.component.button} This.
 */
beestat.component.button.prototype.addEventListener = function() {
  rocket.EventTarget.prototype.addEventListener.apply(this, arguments);
  return this;
};

/**
 * Get the bounding box for the button.
 *
 * @return {array} The bounding box.
 */
beestat.component.button.prototype.getBoundingClientRect = function() {
  return this.button_.getBoundingClientRect();
};
