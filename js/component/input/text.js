/**
 * Input parent class.
 */
beestat.component.input.text = function() {
  var self = this;

  this.input_ = $.createElement('input');

  // Add these up top so they don't get re-added on rerender.
  this.input_.addEventListener('focus', function() {
    self.input_.style({
      'background': beestat.style.color.bluegray.dark
    });
  });

  this.input_.addEventListener('blur', function() {
    self.dispatchEvent('blur');
    self.input_.style({
      'background': beestat.style.color.bluegray.light
    });
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.input.text, beestat.component.input);

beestat.component.input.text.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.text.prototype.decorate_ = function(parent) {
  this.input_
    .setAttribute('type', 'text')
    .style({
      'border': 'none',
      'background': beestat.style.color.bluegray.light,
      'border-radius': beestat.style.size.border_radius,
      'padding': (beestat.style.size.gutter / 2),
      'color': '#fff',
      'outline': 'none',
      'transition': 'background 200ms ease'
    });

  if (this.style_ !== undefined) {
    this.input_.style(this.style_);
  }

  if (this.attribute_ !== undefined) {
    this.input_.setAttribute(this.attribute_);
  }

  // If we want an icon just drop one on top of the input and add some padding.
  if (this.icon_ !== undefined) {
    var icon_container = $.createElement('div')
      .style({
        'position': 'absolute',
        'top': '7px',
        'left': '6px'
      });
    parent.appendChild(icon_container);

    this.input_.style({
      'padding-left': '28px'
    });

    (new beestat.component.icon(this.icon_).set_size(16)
      .set_color('#fff'))
      .render(icon_container);
  }

  if (this.value_ !== undefined) {
    this.input_.value(this.value_);
  }

  parent.appendChild(this.input_);
};

/**
 * Set the value in the input field. This bypasses the set_ function to avoid
 * rerendering when the input value is set. It's unnecessary and can also
 * cause minor issues if you try to set the value, then do something else with
 * the input immediately after.
 *
 * @param {string} value
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_value = function(value) {
  this.value_ = value;
  this.input_.value(value);
  return this;
};

/**
 * Get the value in the input field.
 *
 * @return {string} The value in the input field.
 */
beestat.component.input.text.prototype.get_value = function() {
  return this.input_.value();
};

/**
 * Set the style of the input field. Overrides any default styles.
 *
 * @param {object} style
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_style = function(style) {
  return this.set_('style', style);
};

/**
 * Set the attributes of the input field. Overrides any default attributes.
 *
 * @param {object} attribute
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_attribute = function(attribute) {
  return this.set_('attribute', attribute);
};

/**
 * Set the icon of the input field.
 *
 * @param {string} icon
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_icon = function(icon) {
  return this.set_('icon', icon);
};
