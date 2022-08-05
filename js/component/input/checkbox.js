/**
 * Checkbox input.
 */
beestat.component.input.checkbox = function() {
  const self = this;

  this.input_ = document.createElement('input');
  this.input_.setAttribute('type', 'checkbox');

  this.input_.addEventListener('change', function() {
    self.dispatchEvent('change');
  });

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.checkbox, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.checkbox.prototype.decorate_ = function(parent) {
  const self = this;

  const div = document.createElement('div');
  div.className = 'checkbox';

  this.input_.setAttribute('id', this.uuid_);

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
 * Set whether or not this checkbox is selected.
 *
 * @param {boolean} checked
 *
 * @return {beestat.component.input.checkbox} This.
 */
beestat.component.input.checkbox.prototype.set_checked = function(checked) {
  this.input_.checked = checked;

  return this;
};

/**
 * Get whether or not this checkbox is selected.
 *
 * @return {string} Whether or not this checkbox is selected.
 */
beestat.component.input.checkbox.prototype.get_checked = function() {
  return this.input_.checked;
};

/**
 * Set the checkbox label.
 *
 * @param {string} label
 *
 * @return {beestat.component.input.checkbox} This.
 */
beestat.component.input.checkbox.prototype.set_label = function(label) {
  this.label_ = label;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};
