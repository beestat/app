/**
 * Glenwood Terms & Conditions / Privacy Card
 */
beestat.component.card.glenwood_terms = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.glenwood_terms, beestat.component.card);

beestat.component.card.glenwood_terms.prototype.decorate_contents_ = function(parent) {
  var terms_box = $.createElement('div')
    .style({
      'background': beestat.style.color.bluegray.dark,
      'padding': beestat.style.size.gutter + 'px',
      'border-radius': beestat.style.size.border_radius,
      'margin-bottom': beestat.style.size.gutter + 'px',
      'color': '#fff'
    })
    .innerHTML(
      '<p>By enrolling, you agree to share certain thermostat data from your beestat account with Glenwood Condominium and its management company. This data will be used only for program administration, energy management, and related reporting.</p>' +
      '<ul style="margin-left:1em;">' +
        '<li><strong>What is shared:</strong> Runtime summaries and temperature averages, as needed by Glenwood Condominium for its reporting.</li>' +
        '<li><strong>What is not shared:</strong> Specific occupancy data, your personal account credentials, email address, or other unrelated personal information.</li>' +
        '<li><strong>Control:</strong> You may unenroll at any time through your beestat account, which will stop all future sharing.</li>' +
      '</ul>' +
      '<p>Beestat will not sell your data, and data shared with Glenwood Condominium will not be disclosed to other parties except as required by law.</p>'
    );

  parent.appendChild(terms_box);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.glenwood_terms.prototype.get_title_ = function() {
  return 'Privacy';
};
