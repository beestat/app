/**
 * Checkbox parent class.
 */
beestat.component.input.checkbox = function() {
  this.input_ = $.createElement('input');

  beestat.component.input.apply(this, arguments);
};
beestat.extend(beestat.component.input.checkbox, beestat.component.input);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.input.checkbox.prototype.decorate_ = function(parent) {
  var self = this;

  const div = $.createElement('div').addClass('checkbox');
  this.input_
    .setAttribute('id', this.uuid_)
    .setAttribute('type', 'checkbox');
  div.appendChild(this.input_);

  const label = $.createElement('label');
  label.setAttribute('for', this.uuid_);
  div.appendChild(label);

  const text_label = $.createElement('span')
    .style({
      'cursor': 'pointer',
      'margin-left': (beestat.style.size.gutter / 2)
    })
    .innerText(this.label_)
    .addEventListener('click', function() {
      self.input_[0].click();
      // self.input_.checked(!self.input_.checked());
    });
  div.appendChild(text_label);

  this.input_.addEventListener('change', function() {
    // console.log('input changed');
    self.dispatchEvent('change');
  });

  parent.appendChild(div);
};

/**
 * Set the value in the input field. This bypasses the set_ function to avoid
 * rerendering when the input value is set. It's unnecessary and can also
 * cause minor issues if you try to set the value, then do something else with
 * the input immediately after.
 *
 * This will not fire off the change event listener.
 *
 * @param {string} value
 *
 * @return {beestat.component.input.checkbox} This.
 */
beestat.component.input.checkbox.prototype.set_value = function(value) {
  this.input_.checked(value);
  return this;
};

/**
 * Get the value in the input field.
 *
 * @return {string} The value in the input field.
 */
beestat.component.input.checkbox.prototype.get_value = function() {
  return this.input_.checked();
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
  return this;
};
