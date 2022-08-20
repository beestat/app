/**
 * Input parent class.
 */
beestat.component.input = function() {
  this.uuid_ = window.crypto.randomUUID();

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.input, beestat.component);

/**
 * Focus an input.
 *
 * @return {beestat.component.input} This.
 */
beestat.component.input.prototype.focus = function() {
  this.input_.focus();
  this.input_.setSelectionRange(0, this.input_.value().length);

  return this;
};

/**
 * Enable or disable an input.
 *
 * @param {boolean} enabled Whether or not the input should be enabled.
 *
 * @return {beestat.component.input} This.
 */
beestat.component.input.prototype.set_enabled = function(enabled) {
  this.input_.disabled = !enabled;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Generic setter that sets a key to a value, rerenders if necessary.
 *
 * @param {string} key
 * @param {string} value
 *
 * @return {beestat.component.input} This.
 */
beestat.component.input.prototype.set_ = function(key, value) {
  this[key + '_'] = value;

  if (this.rendered_ === true) {
    this.rerender();
  }

  return this;
};

/**
 * Set the requirements for this input to be valid.
 *
 * @param {object} requirements
 *
 * @return {beestat.component.input.text} This.
 */
beestat.component.input.prototype.set_requirements = function(requirements) {
  this.requirements_ = requirements;

  return this;
};

/**
 * Check whether or not this input meets the requirements.
 *
 * @return {boolean} Whether or not this input meets the requirements.
 */
beestat.component.input.prototype.meets_requirements = function() {
  if (this.requirements_ !== undefined) {
    switch (this.requirements_.type) {
    case 'integer':
      this.requirements_.regexp = /^-?\d+$/;
      break;
    case 'decimal':
      this.requirements_.regexp = /^-?\d+(?:\.\d+)?$/;
      break;
    }

    if (
      this.requirements_.required === true &&
      this.get_value() === undefined
    ) {
      return false;
    }

    if (
      this.requirements_.min_value !== undefined &&
      this.get_value() < this.requirements_.min_value
    ) {
      return false;
    }

    if (
      this.requirements_.max_value !== undefined &&
      this.get_value() > this.requirements_.max_value
    ) {
      return false;
    }

    if (
      this.get_value() !== undefined &&
      this.requirements_.regexp !== undefined &&
      this.requirements_.regexp.test(this.get_value()) === false
    ) {
      return false;
    }
  }

  return true;
};
