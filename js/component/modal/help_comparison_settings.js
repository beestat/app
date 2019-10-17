/**
 * Comparison settings help.
 */
beestat.component.modal.help_comparison_settings = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_comparison_settings, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.help_comparison_settings.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerText('Comparison settings allow you to customize how your home is compared to the homes of other beestat users. All thermostats at the same physical address are compared together.'));

  (new beestat.component.title('Region')).render(parent);
  parent.appendChild($.createElement('p').innerText('Compare your home to other homes within 250 miles (400km) or expand this to all homes globally.'));

  (new beestat.component.title('Property')).render(parent);
  parent.appendChild($.createElement('p').innerHTML('The <em>Very Similar</em> option will compare with other homes with similar physical characteristics. This typically makes the most sense. The second option will compare with other homes of the same structure type (ex: Detached, Apartment). You may also compare with all other homes regardless of type, although this isn\'t generally very meaningful.'));
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.help_comparison_settings.prototype.get_title_ = function() {
  return 'Comparison Settings - Help';
};
