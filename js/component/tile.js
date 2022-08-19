/**
 * A block with an optional icon and up to two lines of text.
 */
beestat.component.tile = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.tile, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.tile.prototype.decorate_ = function(parent) {
  const self = this;

  const background_color = this.background_color_ || 'none';
  const text_color = this.text_color_ || '#fff';
  const tabbable = this.tabbable_ || false;
  const shadow = this.shadow_ === undefined ? true : this.shadow_;
  const display = this.display_ === 'block' ? 'flex' : 'inline-flex';
  let border_radius;
  if (this.type_ === 'pill') {
    border_radius = (this.get_size_() === 'large' ? 48 : 36);
  } else {
    border_radius = beestat.style.size.border_radius;
  }

  this.container_ = document.createElement('div');

  Object.assign(this.container_.style, {
    'background': background_color,
    'border-radius': `${border_radius}px`,
    'height': `${(this.get_size_() === 'large' ? 48 : 36)}px`,
    'display': display,
    'align-items': 'center',
    'color': text_color,
    'user-select': 'none',
    'transition': 'color 200ms ease, background 200ms ease',
    'outline-offset': '1px',
    'text-align': 'left'
  });

  if (shadow === true) {
    Object.assign(this.container_.style, {
      'box-shadow': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
    });
  }

  parent.appendChild(this.container_);

  // Padding. Basically for icon only make it a nice square button.
  if (this.get_text_() === undefined) {
    Object.assign(this.container_.style, {
      'width': `${(this.get_size_() === 'large' ? 48 : 36)}px`,
      'justify-content': 'center'
    });
  } else {
    Object.assign(this.container_.style, {
      'padding-left': `${(beestat.style.size.gutter / 2)}px`,
      'padding-right': `${(beestat.style.size.gutter / 2)}px`,
    });
  }

  // Tabbable
  if (tabbable === true) {
    this.container_.setAttribute('tabIndex', '0');
  }

  // Title
  if (this.title_ !== undefined) {
    this.container_.setAttribute('title', this.title_);
  }

  // Hover
  if (
    this.text_hover_color_ !== undefined ||
    this.background_hover_color_ !== undefined
  ) {
    this.container_.style.cursor = 'pointer';

    const mouseenter_style = {};
    if (this.text_hover_color_ !== undefined) {
      mouseenter_style.color = this.text_hover_color_;
    }
    if (this.background_hover_color_ !== undefined) {
      mouseenter_style.background = this.background_hover_color_;
    }

    const mouseleave_style = {};
    mouseleave_style.color =
      (this.text_color_ !== undefined) ? this.text_color_ : '';
    mouseleave_style.background =
      (this.background_color_ !== undefined) ? this.background_color_ : '';

    this.container_.addEventListener('mouseenter', function() {
      Object.assign(self.container_.style, mouseenter_style);
    });
    this.container_.addEventListener('mouseleave', function() {
      Object.assign(self.container_.style, mouseleave_style);
    });
  }

  // Focus
  if (tabbable === true) {
    this.container_.addEventListener('focus', function() {
      self.container_.style.outline = '2px solid #fff';
    });
    this.container_.addEventListener('blur', function() {
      self.container_.style.outline = 'none';
    });
    this.container_.addEventListener('keydown', function(e) {
      if (
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        self.dispatchEvent(new window.Event('click'));
      }
    });
  }

  // Left and right container
  const left_container = document.createElement('div');
  this.decorate_left_(left_container);
  this.container_.appendChild(left_container);

  const right_container = document.createElement('div');
  right_container.style.minWidth = '0';
  this.decorate_right_(right_container);
  this.container_.appendChild(right_container);

  // Events
  this.container_.addEventListener('click', function() {
    self.dispatchEvent('click');
  });

  this.container_.addEventListener('mousedown', function() {
    self.dispatchEvent('mousedown');
  });
};

beestat.component.tile.prototype.decorate_left_ = function(parent) {
  if (this.get_icon_() !== undefined) {
    const icon_container = document.createElement('div');
    if (this.get_text_() !== undefined) {
      icon_container.style.marginRight = (beestat.style.size.gutter / 2) + 'px';
    }
    parent.appendChild(icon_container);

    new beestat.component.icon(this.get_icon_())
      .set_bubble_text(this.bubble_text_)
      .set_bubble_color(this.bubble_color_)
      .set_size(this.get_size_() === 'large' ? 32 : 24)
      .render($(icon_container));
  }
};

/**
 * Decorate the right side of the tile.
 *
 * @param {HTMLElement} parent
 */
beestat.component.tile.prototype.decorate_right_ = function(parent) {
  if (Array.isArray(this.get_text_()) === true) {
    const line_1_container = document.createElement('div');
    line_1_container.innerText = this.get_text_()[0];
    line_1_container.style.fontWeight = beestat.style.font_weight.bold;
    line_1_container.style.whiteSpace = 'nowrap';
    line_1_container.style.overflow = 'hidden';
    line_1_container.style.textOverflow = 'ellipsis';
    parent.appendChild(line_1_container);

    const line_2_container = document.createElement('div');
    line_2_container.innerText = this.get_text_()[1];
    line_2_container.style.fontWeight = beestat.style.font_weight.light;
    parent.appendChild(line_2_container);
  } else if (this.get_text_() !== undefined) {
    const text_container = document.createElement('div');
    text_container.innerText = this.get_text_();
    text_container.style.fontWeight = beestat.style.font_weight.normal;
    parent.appendChild(text_container);
  }
};

/**
 * Set the icon.
 *
 * @param {string} icon
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_icon = function(icon) {
  this.icon_ = icon;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the size. Default is small.
 *
 * @param {string} size large|small
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_size = function(size) {
  this.size_ = size;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Get the size of this tile.
 *
 * @return {string} The size of this tile.
 */
beestat.component.tile.prototype.get_size_ = function() {
  return this.size_;
};

/**
 * Get the icon for this tile.
 *
 * @return {string} The icon.
 */
beestat.component.tile.prototype.get_icon_ = function() {
  return this.icon_;
};

/**
 * Set the text of the button.
 *
 * @param {string|array} text A single string or array of strings. If an array
 * is passed multiple lines of text will be shown.
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_text = function(text) {
  this.text_ = text;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Get the text for this tile.
 *
 * @return {string} The text for this tile.
 */
beestat.component.tile.prototype.get_text_ = function() {
  return this.text_;
};

/**
 * Set the background color.
 *
 * @param {string} background_color
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_background_color = function(background_color) {
  this.background_color_ = background_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set whether or not there is a shadow. Default true.
 *
 * @param {boolean} shadow
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_shadow = function(shadow) {
  this.shadow_ = shadow;
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
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_text_color = function(text_color) {
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
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_background_hover_color = function(background_hover_color) {
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
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_text_hover_color = function(text_hover_color) {
  this.text_hover_color_ = text_hover_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set the title for the tile.
 *
 * @param {string} title
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_title = function(title) {
  this.title_ = title;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Get the container for this tile.
 *
 * @return {array} The container for this tile.
 */
beestat.component.tile.prototype.get_container = function() {
  return this.container_;
};

/**
 * Set whether or not this is tabbable. Default false.
 *
 * @param {boolean} tabbable
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_tabbable = function(tabbable) {
  this.tabbable_ = tabbable;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Set display mode.
 *
 * @param {string} display inline|block; default inline.
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_display = function(display) {
  this.display_ = display;
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
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_type = function(type) {
  this.type_ = type;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};

/**
 * Do the normal event listener stuff. Only exists for chaining purposes.
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.addEventListener = function() {
  rocket.EventTarget.prototype.addEventListener.apply(this, arguments);
  return this;
};

/**
 * Set the text of the bubble.
 *
 * @param {string} bubble_text
 *
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_bubble_text = function(bubble_text) {
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
 * @return {beestat.component.tile} This.
 */
beestat.component.tile.prototype.set_bubble_color = function(bubble_color) {
  this.bubble_color_ = bubble_color;
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
};
