beestat.component.icon = function(icon_name) {
  this.icon_name_ = icon_name;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.icon, beestat.component);

beestat.component.icon.prototype.rerender_on_breakpoint_ = false;

beestat.component.icon.prototype.decorate_ = function(parent) {
  var self = this;

  // TODO This works but really icons need to be put into their own containers if I want this
  parent.style('display', 'inline-block');

  var container = $.createElement('div')
    .style({
      'display': 'flex',
      'align-items': 'center'
    });
  parent.appendChild(container);

  var icon = $.createElement('div')
    .style('position', 'relative')
    .addClass([
      'icon',
      this.icon_name_
    ]);
  container.appendChild(icon);

  if (this.size_ !== undefined && this.size_ !== 24) {
    icon.addClass('f' + this.size_);
  }

  if (this.color_ !== undefined) {
    container.style('color', this.color_);
  }

  if (this.text_ !== undefined) {
    var text = $.createElement('span')
      .style({
        'margin-left': (beestat.style.size.gutter / 2)
      })
      .innerText(this.text_);

    container.appendChild(text);
  }

  // Hover
  if (this.hover_color_ !== undefined) {
    container.style({
      'cursor': 'pointer',
      'transition': 'color 200ms ease'
    });

    container.addEventListener('mouseenter', function() {
      container.style('color', self.hover_color_);
    });
    container.addEventListener('mouseleave', function() {
      container.style('color', self.color_ || '');
    });
  }

  container.addEventListener('click', function() {
    self.dispatchEvent('click');
  });

  // Bubble
  if (this.bubble_text_ !== undefined) {
    var bubble = $.createElement('div')
      .style({
        'background': this.bubble_color_ || beestat.style.color.blue.base,
        'position': 'absolute',
        'top': 0,
        'right': 0,
        'border-radius': '6px',
        'height': '12px',
        'line-height': '12px',
        'min-width': '12px',
        'text-align': 'center',
        'color': '#fff',
        'font-size': '10px'
      })
      .innerText(this.bubble_text_);
    icon.appendChild(bubble);
  }

  this.parent_ = icon;
};

/**
 * Set the color of the icon.
 *
 * @param {string} color Any supported CSS color string.
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_color = function(color) {
  this.color_ = color;
  return this;
};

/**
 * Set the hover color of the icon
 *
 * @param {string} hover_color Any supported CSS color string
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_hover_color = function(hover_color) {
  this.hover_color_ = hover_color;
  return this;
};

/**
 * Set the text of the icon.
 *
 * @param {string} text
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_text = function(text) {
  this.text_ = text;
  return this;
};

/**
 * Set the size of the icon
 *
 * @param {number} size
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_size = function(size) {
  this.size_ = size;
  return this;
};

/**
 * Set the text of the bubble.
 *
 * @param {string} bubble_text
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_bubble_text = function(bubble_text) {
  this.bubble_text_ = bubble_text;
  return this;
};

/**
 * Set the color of the bubble.
 *
 * @param {string} bubble_color
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.set_bubble_color = function(bubble_color) {
  this.bubble_color_ = bubble_color;
  return this;
};

/**
 * Do the normal event listener stuff, but also wrap the icon in an <a> tag to
 * automatically take advantage of link styles.
 *
 * Note: Must call after the icon is rendered.
 *
 * @return {beestat.component.icon} This.
 */
beestat.component.icon.prototype.addEventListener = function() {
  rocket.EventTarget.prototype.addEventListener.apply(this, arguments);
  return this;
};

/**
 * Get the icon element.
 *
 * @return {rocket.Elements} The icon element.
 */
beestat.component.icon.prototype.get_element = function() {
  return this.parent_;
};
