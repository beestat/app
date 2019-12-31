/**
 * Options for hiding the patreon card.
 */
beestat.component.modal.enjoy_beestat = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.enjoy_beestat, beestat.component.modal);

beestat.component.modal.enjoy_beestat.poll_interval_ = 5000;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.enjoy_beestat.prototype.decorate_contents_ = function(parent) {
  switch (this.is_active_patron_()) {
  case false:
    parent.appendChild($.createElement('p').innerText('Your Patreon account is connected but you\'re not currently a supporter. If you recently became a supporter it could take up to 24 hours to update.'));
    break;
  case null:
    parent.appendChild($.createElement('p').innerHTML('If you didn\'t notice, beestat doesn\'t run ads, charge money, or sell your data. If you find beestat useful, <strong>please consider supporting the project on <a href="https://patreon.com/beestat" target="_blank" class="inverted">Patreon</a>.</strong> Your contribution helps pay for servers, storage, and other cool things. Thanks!'));
    parent.appendChild($.createElement('p').innerHTML('Not into Patreon? <a href="https://www.notion.so/beestat/Support-Beestat-bf7f099eb8de486bad51aa6245c00891" target="_blank" class="inverted">Here are some other ways to help</a>.'));
    break;
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
 * Close the modal but run some special code first to make sure any running
 * interval gets stopped.
 */
beestat.component.modal.enjoy_beestat.prototype.dispose = function() {
  if (this.is_polling_ === true) {
    beestat.remove_poll_interval(beestat.component.modal.enjoy_beestat.poll_interval_);
    beestat.dispatcher.removeEventListener('poll.enjoy_beestat');
  }

  beestat.component.modal.prototype.dispose.apply(this, arguments);
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
 * Determine whether or not the current user is an active Patron.
 *
 * @return {boolean} true if yes, false if no, null if not connected.
 */
beestat.component.modal.enjoy_beestat.prototype.is_active_patron_ = function() {
  var user = beestat.get_user();
  if (user.patreon_status !== null) {
    return (user.patreon_status.patron_status === 'active_patron');
  }
  return null;
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

  if (self.is_active_patron_() === null) {
    var link = new beestat.component.button()
      .set_text('Link Patreon')
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .addEventListener('click', function() {
        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .set_text('Waiting for Patreon...')
          .removeEventListener('click');

        beestat.add_poll_interval(beestat.component.modal.enjoy_beestat.poll_interval_);
        self.is_polling_ = true;

        beestat.dispatcher.addEventListener('poll.enjoy_beestat', function() {
          switch (self.is_active_patron_()) {
          case true:
            // Connected and is Patron
            beestat.cards.patreon.dispose();
            self.dispose();
            break;
          case false:
            // Connected but isn't Patron
            self.hide_patreon_card_for_(3, 'day');
            self.dispose();
            break;
          }
        });

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
