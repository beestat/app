/**
 * Green Patreon banner asking people for money. $_$
 */
beestat.component.card.patreon = function() {
  var self = this;

  beestat.dispatcher.addEventListener([
    'cache.user',
    'setting.patreon_hide_until'
  ], function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.patreon, beestat.component.card);

beestat.component.card.patreon.prototype.decorate_contents_ = function(parent) {
  var self = this;

  // Don't render anything if the user is an active Patron.
  if (beestat.component.card.patreon.should_show() === false) {
    window.setTimeout(function() {
      self.dispose();
    }, 0);
    return;
  }

  parent.style('background', beestat.style.color.green.base);

  new beestat.component.button()
    .set_icon('heart')
    .set_text('Support this project on Patreon!')
    .set_background_color(beestat.style.color.green.dark)
    .set_background_hover_color(beestat.style.color.green.light)
    .addEventListener('click', function() {
      window.open('https://www.patreon.com/beestat');
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.patreon.prototype.get_title_ = function() {
  return 'Enjoy beestat?';
};

/**
 * Decorate the close button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.patreon.prototype.decorate_top_right_ = function(parent) {
  new beestat.component.button()
    .set_type('pill')
    .set_icon('close')
    .set_text_color('#fff')
    .set_background_hover_color(beestat.style.color.green.light)
    .addEventListener('click', function() {
      (new beestat.component.modal.enjoy_beestat()).render();
    })
    .render(parent);
};

/**
 * Determine whether or not this card should be shown.
 *
 * @return {boolean} Whether or not to show the card.
 */
beestat.component.card.patreon.should_show = function() {
  if (
    beestat.user.patreon_is_active() === true ||
    window.is_demo === true ||
    (
      beestat.setting('patreon_hide_until') !== undefined &&
      moment.utc(beestat.setting('patreon_hide_until')).isAfter(moment.utc())
    )
  ) {
    return false;
  }

  return true;
};
