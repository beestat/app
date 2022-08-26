/**
 * Text input.
 */
beestat.component.input.text = function() {
  const self = this;

  this.input_ = document.createElement('input');
  this.input_.setAttribute('type', 'text');

  // Add event listeners in the constructor, not the render. Avoids duplicating.
  this.input_.addEventListener('focus', function() {
    self.dispatchEvent('focus');
    self.input_.style.background = beestat.style.color.bluegray.dark;
  });

  this.input_.addEventListener('blur', function() {
    self.dispatchEvent('blur');
    self.input_.style.background = beestat.style.color.bluegray.light;
  });

  this.input_.addEventListener('change', function() {
    self.dispatchEvent('change');
  });

  this.input_.addEventListener('input', function() {
    self.dispatchEvent('input');
  });

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.text, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.text.prototype.decorate_ = function(parent) {
  Object.assign(this.input_.style, {
    'border': 'none',
    'background': beestat.style.color.bluegray.light,
    'border-radius': `${beestat.style.size.border_radius}px`,
    'padding': `${beestat.style.size.gutter / 2}px`,
    'color': '#ffffff',
    'outline': 'none',
    'transition': 'background 200ms ease',
    'margin-bottom': `${beestat.style.size.gutter}px`,
    'border-bottom': `2px solid ${beestat.style.color.lightblue.base}`
  });

  // Set input width; interpret string widths literally (ex: 100%)
  if (this.width_ !== undefined) {
    if (isNaN(this.width_) === true) {
      this.input_.style.width = this.width_;
    } else {
      this.input_.style.width = this.width_ + 'px';
    }
  }

  if (this.label_ !== undefined) {
    const label_container = document.createElement('div');
    label_container.innerText = this.label_;
    label_container.style.fontSize = beestat.style.font_size.normal;
    parent[0].appendChild(label_container);
  }

  if (this.inputmode_ !== undefined) {
    this.input_.setAttribute('inputmode', this.inputmode_);
  }

  // If we want an icon just drop one on top of the input and add some padding.
  if (this.icon_ !== undefined) {
    const icon_container = document.createElement('div');

    Object.assign(icon_container.style, {
      'position': 'absolute',
      'top': (this.label_ !== undefined) ? '25px' : '7px',
      'left': '6px'
    });

    parent[0].appendChild(icon_container);

    this.input_.style.paddingLeft = '28px';

    (new beestat.component.icon(this.icon_).set_size(16)
      .set_color('#fff'))
      .render($(icon_container));
  }

  parent[0].appendChild(this.input_);
};

/**
 * Set the value in the input field. Do not rerender; it's unnecessary.
 *
 * @param {string} value
 * @param {boolean} dispatch_event Whether or not to dispatch the change
 * event. Useful in situations where you need to change the value *inside* the
 * chagne event.
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_value = function(value, dispatch_event = true) {
  this.input_.value = value;

  if (dispatch_event === true) {
    this.dispatchEvent('change');
  }

  return this;
};

/**
 * Set the placeholder. Do not rerender; it's unnecessary.
 *
 * @param {string} placeholder
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_placeholder = function(placeholder) {
  this.input_.setAttribute('placeholder', placeholder);

  return this;
};

/**
 * Get the value in the input field.
 *
 * @return {string} The value in the input field. Undefined if not set.
 */
beestat.component.input.text.prototype.get_value = function() {
  return this.input_.value.trim() === '' ? undefined : this.input_.value.trim();
};

/**
 * Set the label of the input field.
 *
 * @param {string} label
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_label = function(label) {
  this.label_ = label;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the icon of the input field.
 *
 * @param {string} icon
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_icon = function(icon) {
  this.icon_ = icon;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the width of the input field.
 *
 * @param {string} width
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_width = function(width) {
  this.width_ = width;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the inputmode of the input field.
 *
 * @param {string} inputmode
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_inputmode = function(inputmode) {
  this.inputmode_ = inputmode;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the max length attribute of the input field.
 *
 * @param {number} maxlength
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.text.prototype.set_maxlength = function(maxlength) {
  this.input_.setAttribute('maxlength', maxlength);

  return this;
};
