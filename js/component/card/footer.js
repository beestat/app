/**
 * Helpful footer stuff.
 */
beestat.component.card.footer = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.footer, beestat.component.card);

beestat.component.card.footer.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.bluegray.light);

  var footer = $.createElement('div')
    .style({
      'text-align': 'center'
    });
  parent.appendChild(footer);

  var footer_links = $.createElement('div');
  footer.appendChild(footer_links);

  footer_links.appendChild(
    $.createElement('a')
      .setAttribute('href', 'https://doc.beestat.io/')
      .innerHTML('Help')
  );
  footer_links.appendChild($.createElement('span').innerHTML(' • '));

  footer_links.appendChild(
    $.createElement('a')
      .setAttribute('href', 'https://community.beestat.io/')
      .setAttribute('target', '_blank')
      .innerHTML('Feedback')
  );
  footer_links.appendChild($.createElement('span').innerHTML(' • '));

  footer_links.appendChild(
    $.createElement('a')
      .setAttribute('href', 'https://beestat.io/privacy/')
      .setAttribute('target', '_blank')
      .innerHTML('Privacy')
  );
  footer_links.appendChild($.createElement('span').innerHTML(' • '));

  footer_links.appendChild(
    $.createElement('a')
      .setAttribute('href', 'http://eepurl.com/dum59r')
      .setAttribute('target', '_blank')
      .innerHTML('Mailing List')
  );
  footer_links.appendChild($.createElement('span').innerHTML(' • '));

  footer_links.appendChild(
    $.createElement('a')
      .setAttribute('href', 'mailto:contact@beestat.io')
      .innerHTML('Contact')
  );

};
