/**
 * Options for hiding the patreon card.
 */
beestat.component.modal.enjoy_beestat = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.enjoy_beestat, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.enjoy_beestat.prototype.decorate_contents_ = function(parent) {
  if (
    beestat.user.patreon_is_connected() === true &&
    beestat.user.patreon_is_active() === false
  ) {
    parent.appendChild($.createElement('p').innerText('Your Patreon account is connected but you\'re not currently a supporter. If you recently became a supporter it could take up to 24 hours to update.'));
  } else {
    parent.appendChild($.createElement('p').innerHTML('Beestat is completely free to use and does not run ads or sell your data. If you want to help, <strong>consider supporting the project on <a href="https://patreon.com/beestat" target="_blank" class="inverted">Patreon</a></strong>. Among other benefits, it will hide this banner permanently.'));
    parent.appendChild($.createElement('p').innerHTML('Not into Patreon or can\'t afford to give? <a href="https://www.notion.so/beestat/Support-Beestat-bf7f099eb8de486bad51aa6245c00891" target="_blank" class="inverted">Here are some other ways to help</a>.'));
  }
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.enjoy_beestat.prototype.get_title_ = function() {
  return 'Enjoy beestat?';
};

/**
 * Hide the Patreon card for some amount of time.
 *
 * @param {number} amount How long.
 * @param {string} unit The unit (day, month, etc).
 */
beestat.component.modal.enjoy_beestat.prototype.hide_patreon_card_for_ = function(amount, unit) {
  beestat.setting(
    'patreon_hide_until',
    moment().utc()
      .add(amount, unit)
      .format('YYYY-MM-DD HH:mm:ss')
  );
  beestat.cards.patreon.dispose();
};

/**
 * Get the buttons on the modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.enjoy_beestat.prototype.get_buttons_ = function() {
  var self = this;

  var hide = new beestat.component.button()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.bluegray.base)
    .set_text('Hide for one month')
    .addEventListener('click', function() {
      self.hide_patreon_card_for_(1, 'month');
      self.dispose();
    });

  if (beestat.user.patreon_is_connected() === false) {
    var link = new beestat.component.button()
      .set_text('Link Patreon')
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .addEventListener('click', function() {
        self.dispose();
        (new beestat.component.modal.patreon_status()).render();
        window.open('../api/?resource=patreon&method=authorize&arguments={}&api_key=ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2');
      });

    return [
      hide,
      link
    ];
  }

  var ok = new beestat.component.button()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('OK')
    .addEventListener('click', function() {
      self.dispose();
    });

  return [
    hide,
    ok
  ];
};
