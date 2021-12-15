/**
 * Input parent class.
 */
beestat.component.input = function() {
  this.uuid_ = this.generate_uuid_();
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.input, beestat.component);

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

/**
 * Generate a UUID to uniquely identify an input.
 *
 * @link https://stackoverflow.com/a/2117523
 * @return {string} The UUID;
 */
beestat.component.input.prototype.generate_uuid_ = function() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};
