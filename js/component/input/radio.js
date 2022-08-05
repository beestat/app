/**
 * Radio input.
 */
beestat.component.input.radio = function() {
  const self = this;

  this.input_ = document.createElement('input');
  this.input_.setAttribute('type', 'radio');

  this.input_.addEventListener('change', function() {
    self.dispatchEvent('change');
  });

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.radio, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.radio.prototype.decorate_ = function(parent) {
  const self = this;

  const div = document.createElement('div');
  div.className = 'radio';

  this.input_.setAttribute('id', this.uuid_);
  this.input_.setAttribute('name', this.name_);

  div.appendChild(this.input_);

  const label = document.createElement('label');
  label.setAttribute('for', this.uuid_);
  div.appendChild(label);

  const span = document.createElement('span');
  span.style.cursor = 'pointer';
  span.style.marginLeft = (beestat.style.size.gutter / 2) + 'px';
  span.innerText = this.label_;
  span.addEventListener('click', function() {
    self.input_.click();
  });
  div.appendChild(span);

  parent.appendChild(div);
};

/**
 * Set the value of the radio button that is returned when calling
 * get_value().
 *
 * @param {string} value
 *
 * @return {beestat.component.input.radio} This.
 */
beestat.component.input.radio.prototype.set_value = function(value) {
  this.value_ = value;

  return this;
};

/**
 * Get the value of the radio button.
 *
 * @return {string} The value in the input field.
 */
beestat.component.input.radio.prototype.get_value = function() {
  return this.value_;
};

/**
 * Set whether or not this radio is selected.
 *
 * @param {boolean} checked
 *
 * @return {beestat.component.input.radio} This.
 */
beestat.component.input.radio.prototype.set_checked = function(checked) {
  this.input_.checked = checked;

  return this;
};

/**
 * Get whether or not this radio is selected.
 *
 * @return {string} Whether or not this radio is selected.
 */
beestat.component.input.radio.prototype.get_checked = function() {
  return this.input_.checked;
};

/**
 * Set the radio label.
 *
 * @param {string} label
 *
 * @return {beestat.component.input.radio} This.
 */
beestat.component.input.radio.prototype.set_label = function(label) {
  this.label_ = label;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the radio name. Required to group radio elements together.
 *
 * @param {string} name
 *
 * @return {beestat.component.input.radio} This.
 */
beestat.component.input.radio.prototype.set_name = function(name) {
  this.name_ = name;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};
