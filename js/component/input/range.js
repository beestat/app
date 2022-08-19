/**
 * Range input.
 */
beestat.component.input.range = function() {
  const self = this;

  this.input_ = document.createElement('input');
  this.input_.setAttribute('type', 'range');

  this.input_.addEventListener('change', function() {
    self.dispatchEvent('change');
  });

  this.input_.addEventListener('input', function() {
    self.dispatchEvent('input');
  });

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.range, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.range.prototype.decorate_ = function(parent) {
  this.input_.style.width = '100%';

  parent.appendChild(this.input_);
};

/**
 * Set the value in the range field. Do not rerender; it's unnecessary.
 *
 * @param {string} value
 *
 * @return {beestat.component.input.range} This.
 */
beestat.component.input.range.prototype.set_value = function(value) {
  this.input_.value = value;

  this.dispatchEvent('change');

  return this;
};

/**
 * Get the value of the input.
 *
 * @return {string}
 */
beestat.component.input.range.prototype.get_value = function() {
  return this.input_.value;
};

/**
 * Set the min value of the range input.
 *
 * @param {string} min
 *
 * @return {beestat.component.input.range} This.
 */
beestat.component.input.range.prototype.set_min = function(min) {
  this.input_.setAttribute('min', min);

  return this;
};

/**
 * Set the max value of the range input.
 *
 * @param {string} max
 *
 * @return {beestat.component.input.range} This.
 */
beestat.component.input.range.prototype.set_max = function(max) {
  this.input_.setAttribute('max', max);

  return this;
};
