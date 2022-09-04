/**
 * A group of radio input elements.
 */
beestat.component.radio_group = function() {
  this.radios_ = [];
  this.name_ = window.crypto.randomUUID();
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

  // Outer container
  const container = document.createElement('div');
  if (this.arrangement_ === 'horizontal') {
    Object.assign(container.style, {
      'display': 'flex',
      'grid-gap': `${beestat.style.size.gutter}px`
    });
  }
  parent.appendChild(container);

  // Radios
  this.radios_.forEach(function(radio) {
    radio.set_name(self.name_);

    radio.addEventListener('change', function() {
      self.value_ = radio.get_value();
      self.dispatchEvent('change');
    });

    radio.render($(container));
  });
};

/**
 * Add a radio to this group.
 *
 * @param {beestat.component.radio} radio The radio to add.
 *
 * @return {beestat.component.radio_group}
 */
beestat.component.radio_group.prototype.add_radio = function(radio) {
  this.radios_.push(radio);
  if (this.rendered_ === true) {
    this.rerender();
  }
  return this;
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

/**
 * Set the arrangement of the radio buttons in the group.
 *
 * @param {string} arrangement horizontal|vertical
 *
 * @return {beestat.component.radio_group}
 */
beestat.component.radio_group.prototype.set_arrangement = function(arrangement) {
  this.arrangement_ = arrangement;

  return this;
};
