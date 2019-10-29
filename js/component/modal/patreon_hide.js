/**
 * Options for hiding the patreon card.
 */
beestat.component.modal.patreon_hide = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.patreon_hide, beestat.component.modal);

beestat.component.modal.patreon_hide.poll_interval_ = 5000;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.patreon_hide.prototype.decorate_contents_ = function(parent) {
  switch (this.is_active_patron_()) {
  case false:
    parent.appendChild($.createElement('p').innerText('Your Patreon account is connected but you\'re not currently a supporter. If you recently became a supporter it could take up to 24 hours to update.'));
    break;
  case null:
    parent.appendChild($.createElement('p').innerText('Hey there! If you didn\'t notice, beestat doesn\'t run ads, cost money, or sell your data. If you find beestat useful, please consider supporting the project. Your contribution helps pay for servers, storage, and other cool things. Thanks!'));
    break;
  }
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.patreon_hide.prototype.get_title_ = function() {
  return 'Don\'t want to see this anymore?';
};

/**
 * Close the modal but run some special code first to make sure any running
 * interval gets stopped.
 */
beestat.component.modal.patreon_hide.prototype.dispose = function() {
  if (this.is_polling_ === true) {
    beestat.remove_poll_interval(beestat.component.modal.patreon_hide.poll_interval_);
    beestat.dispatcher.removeEventListener('poll.patreon_hide');
  }

  beestat.component.modal.prototype.dispose.apply(this, arguments);
};

/**
 * Hide the Patreon card for some amount of time.
 *
 * @param {number} amount How long.
 * @param {string} unit The unit (day, month, etc).
 */
beestat.component.modal.patreon_hide.prototype.hide_patreon_card_for_ = function(amount, unit) {
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
beestat.component.modal.patreon_hide.prototype.is_active_patron_ = function() {
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
beestat.component.modal.patreon_hide.prototype.get_buttons_ = function() {
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
      .set_text('Link Patreon to hide forever')
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .addEventListener('click', function() {
        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .set_text('Waiting for Patreon...')
          .removeEventListener('click');

        beestat.add_poll_interval(beestat.component.modal.patreon_hide.poll_interval_);
        self.is_polling_ = true;

        beestat.dispatcher.addEventListener('poll.patreon_hide', function() {
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
