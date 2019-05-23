/**
 * Input parent class.
 */
beestat.component.input = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.input, beestat.component);

beestat.component.input.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 *
 * @return {beestat.component.input} This.
 */
beestat.component.input.prototype.decorate_ = function(parent) {};

beestat.component.input.prototype.focus = function() {
  this.input_.focus();
  this.input_[0].setSelectionRange(0, this.input_.value().length);
  return this;
};

beestat.component.input.prototype.disable = function() {
  this.input_[0].disabled = true;
  return this;
};

beestat.component.input.prototype.enable = function() {
  this.input_[0].disabled = false;
  return this;
};

/**
 * Generic setter that sets a key to a value, rerenders if necessary, and
 * returns this.
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
