/**
 * Score help
 *
 * @param {string} type heat|cool|resist
 */
beestat.component.modal.help_score = function(type) {
  this.type_ = type;
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_score, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.help_score.prototype.decorate_contents_ = function(parent) {
  (new beestat.component.title('What is this value?')).render(parent);
  var what_is;
  switch (this.type_) {
  case 'heat':
    what_is = 'Your heat score represents how well your home heats compared to other homes. The most important factor is the rate at which temperature increases. However, you also receive a bonus to this score for having longer cycle times. Aux heating is not used when generating this score.';
    break;
  case 'cool':
    what_is = 'Your cool score represents how well your home cool compared to other homes. The most important factor is the rate at which temperature decreases. However, you also receive a bonus to this score for having longer cycle times.';
    break;
  case 'resist':
    what_is = 'Your resist score represents how well your home is able to maintain a consistent temperature without the help of your HVAC system. For example, if you have a very drafty home that loses heat quickly in the winter, this score will be low. If you have a home with good insulation, this score will be high.';
    break;
  }
  parent.appendChild($.createElement('p').innerText(what_is));

  (new beestat.component.title('How is my ' + this.type_ + ' score calculated?')).render(parent);
  parent.appendChild($.createElement('p').innerText('The currently displayed score was calculated using the following parameters:'));

  var strings = [];

  var comparison_attributes = beestat.get_comparison_attributes(this.type_);

  if (comparison_attributes.system_type_heat !== undefined) {
    strings.push('Heat Type: ' + this.get_comparison_string_(comparison_attributes.system_type_heat));
  } else {
    strings.push('Heat Type: Not considered');
  }

  if (comparison_attributes.system_type_heat_auxiliary !== undefined) {
    strings.push('Aux Heat Type: ' + this.get_comparison_string_(comparison_attributes.system_type_heat_auxiliary));
  } else {
    strings.push('Aux Heat Type: Not considered');
  }

  if (comparison_attributes.system_type_cool !== undefined) {
    strings.push('Cool Type: ' + this.get_comparison_string_(comparison_attributes.system_type_cool));
  } else {
    strings.push('Cool Type: Not considered');
  }

  if (comparison_attributes.property_structure_type !== undefined) {
    strings.push('Property Type: ' + this.get_comparison_string_(comparison_attributes.property_structure_type));
  } else {
    strings.push('Property Type: Not considered');
  }

  if (comparison_attributes.property_age !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_age, 'years old'));
  } else {
    strings.push('Property age not considered');
  }

  if (comparison_attributes.property_square_feet !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_square_feet, 'sqft'));
  } else {
    strings.push('Square footage not considered');
  }

  if (comparison_attributes.property_stories !== undefined) {
    strings.push(this.get_comparison_string_(comparison_attributes.property_stories, 'stories'));
  } else {
    strings.push('Number of stories not considered');
  }

  if (comparison_attributes.address_radius !== undefined) {
    strings.push('Within ' + comparison_attributes.address_radius + ' miles of your location');
  } else {
    strings.push('Region not considered');
  }

  var ul = $.createElement('ul');
  parent.appendChild(ul);
  strings.forEach(function(string) {
    var li = $.createElement('li');
    li.innerText(string);
    if (string.match('considered') !== null) {
      li.style({'color': beestat.style.color.gray.base});
    }
    ul.appendChild(li);
  });
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.help_score.prototype.get_title_ = function() {
  return this.type_.charAt(0).toUpperCase() + this.type_.slice(1) + ' Score - Help';
};

/**
 * Helper function to display various comparison strings in a human-readable
 * way.
 *
 * @param {mixed} comparison_attribute The attribute
 * @param {string} suffix If a suffix (ex: "years") should be placed on the
 * end.
 *
 * @return {string} The human-readable string.
 */
beestat.component.modal.help_score.prototype.get_comparison_string_ = function(comparison_attribute, suffix) {
  var s = (suffix !== undefined ? (' ' + suffix) : '');
  if (comparison_attribute.operator !== undefined) {
    if (comparison_attribute.operator === 'between') {
      return 'Between ' + comparison_attribute.value[0] + ' and ' + comparison_attribute.value[1] + s;
    } else if (comparison_attribute.operator === '>=') {
      return 'At least ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '<=') {
      return 'Less than or equal than ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '>') {
      return 'Greater than ' + comparison_attribute.value + s;
    } else if (comparison_attribute.operator === '<') {
      return 'Less than' + comparison_attribute.value + s;
    }
    return comparison_attribute.operator + ' ' + comparison_attribute.value + s;
  } else if (Array.isArray(comparison_attribute.value) === true) {
    return 'One of ' + comparison_attribute.value.join(', ') + s;
  }
  return comparison_attribute + s;
};
