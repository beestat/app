/**
 * A group of radio input elements.
 */
beestat.component.radio_group = function() {
  this.radios_ = [];
  this.name_ = Math.random();
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.radio_group, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.radio_group.prototype.decorate_ = function(parent) {
  const self = this;

  const container = $.createElement('div');
  container.style('margin-bottom', beestat.style.size.gutter);

  this.radios_.forEach(function(radio) {
    radio.set_name('name', this.name_);

    radio.addEventListener('change', function() {
      self.value_ = radio.get_value();
      self.dispatchEvent('change');
    });

    radio.render(container);
  });

  parent.appendChild(container);
};

/**
 * Add a radio to this group.
 *
 * @param {beestat.component.radio} radio The radio to add.
 */
beestat.component.radio_group.prototype.add_radio = function(radio) {
  this.radios_.push(radio);
  if (this.rendered_ === true) {
    this.rerender();
  }
};

/**
 * Remove this component from the page. Disposes the radios first.
 */
beestat.component.radio_group.prototype.dispose = function() {
  this.radios_.forEach(function(radio) {
    radio.dispose();
  });
  beestat.component.prototype.dispose.apply(this, arguments);
};

/**
 * Get the selected radio button's value.
 *
 * @return {string} The value.
 */
beestat.component.radio_group.prototype.get_value = function() {
  for (let i = 0; i < this.radios_.length; i++) {
    if (this.radios_[i].get_checked() === true) {
      return this.radios_[i].get_value();
    }
  }

  return null;
};
