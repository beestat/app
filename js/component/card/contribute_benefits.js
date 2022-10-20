/**
 * Contribute benefits.
 */
beestat.component.card.contribute_benefits = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.contribute_benefits, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute_benefits.prototype.decorate_contents_ = function(parent) {
  const p = document.createElement('p');
  p.innerText = 'In addition to satisfaction of supporting a great project, you\'ll get:';
  parent.appendChild(p);

  const benefit_container = document.createElement('div');
  Object.assign(benefit_container.style, {
    'background': beestat.style.color.bluegray.dark,
    'padding': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(benefit_container);

  const benefits = [
    'Early access to new features',
    'Private Discord membership',
    'More frequent data syncing',
    'Removed contribute banner'
  ];
  benefits.forEach(function(benefit) {
    new beestat.component.tile()
      .set_shadow(false)
      .set_text_color(beestat.style.color.yellow.base)
      .set_icon('octagram')
      .set_text(benefit)
      .style({
        'margin-bottom': `${beestat.style.size.gutter / 2}px`
      })
      .render($(benefit_container));
  });

  new beestat.component.tile()
    .set_shadow(false)
    .set_text_color(beestat.style.color.red.base)
    .set_icon('heart')
    .set_text('My unending gratitude')
    .render($(benefit_container));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.contribute_benefits.prototype.get_title_ = function() {
  return 'Benefits';
};
