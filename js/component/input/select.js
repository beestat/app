/**
 * Select input.
 */
beestat.component.input.select = function() {
  const self = this;

  this.options_ = [];

  this.input_ = document.createElement('select');

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

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.select, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.select.prototype.decorate_ = function(parent) {
  const self = this;

  this.input_.style.border = 'none';
  this.input_.style.background = beestat.style.color.bluegray.light;
  this.input_.style.borderRadius = beestat.style.size.border_radius + 'px';
  this.input_.style.padding = (beestat.style.size.gutter / 2) + 'px';
  this.input_.style.color = '#fff';
  this.input_.style.outline = 'none';
  this.input_.style.transition = 'background 200ms ease';
  this.input_.style.marginBottom = beestat.style.size.gutter + 'px';
  this.input_.style.borderBottom = '2px solid ' + beestat.style.color.lightblue.base;

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

  let group;
  let option_parent = this.input_;
  this.options_.forEach(function(option) {
    if (option.group !== group) {
      group = option.group;
      option_parent = document.createElement('optgroup');
      option_parent.setAttribute('label', group);
      self.input_.appendChild(option_parent);
    }
    const option_element = document.createElement('option');
    option_element.setAttribute('value', option.value);
    option_element.innerText = option.label;
    option_parent.appendChild(option_element);
  });

  parent[0].appendChild(this.input_);
};

/**
 * Add an option.
 *
 * @param {string} option
 *
 * @return {beestat.component.input.select} This.
 */
beestat.component.input.select.prototype.add_option = function(option) {
  this.options_.push(option);

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the value in the input field. Do not rerender; it's unnecessary.
 *
 * @param {string} value
 *
 * @return {beestat.component.input.select} This.
 */
beestat.component.input.select.prototype.set_value = function(value) {
  this.input_.value = value;

  this.dispatchEvent('change');

  return this;
};

/**
 * Get the value in the input field.
 *
 * @return {string} The value in the input field. Undefined if not set.
 */
beestat.component.input.select.prototype.get_value = function() {
  return this.input_.value;
};

/**
 * Set the label of the input field.
 *
 * @param {string} label
 *
 * @return {beestat.component.input.select} This.
 */
beestat.component.input.select.prototype.set_label = function(label) {
  this.label_ = label;

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
 * @return {beestat.component.input.select} This.
 */
beestat.component.input.select.prototype.set_width = function(width) {
  this.width_ = width;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};
