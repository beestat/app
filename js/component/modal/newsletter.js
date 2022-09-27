/**
 * Newsletter
 */
beestat.component.modal.newsletter = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.newsletter, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.newsletter.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Interested in following beestat development? Subscribe to the newsletter for an updates. Emails are sparse; only a few every year.'));

  this.email_address_ = new beestat.component.input.text()
    .set_width('50%');

  if (this.subscribed_ === true) {
    this.email_address_.set_icon('check');
    this.email_address_.set_enabled(false);
    this.email_address_.set_value(this.state_.email_address_);
  } else if (this.subscribed_ === false) {
    this.email_address_.set_icon('email');
    this.email_address_.set_value(this.state_.email_address_);
  } else {
    this.email_address_.set_icon('email');
    this.email_address_.set_value(beestat.user.get().email_address);
  }

  this.email_address_.render(parent);

  if (this.subscribed_ === true) {
    parent.appendChild($.createElement('p').innerHTML('You are now subscribed to the beestat newsletter!'));
  } else if (this.subscribed_ === false) {
    parent.appendChild(
      $.createElement('p')
        .innerHTML(this.error_)
        .style('color', beestat.style.color.red.base)
    );
  }
};

/**
 * Get title.
 *
 * @return {string} Tht title.
 */
beestat.component.modal.newsletter.prototype.get_title_ = function() {
  return 'Newsletter';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.newsletter.prototype.get_buttons_ = function() {
  var self = this;

  let buttons = [];
  if (this.subscribed_ === true) {
    const ok = new beestat.component.tile()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_text('Close')
      .addEventListener('click', function() {
        self.dispose();
      });
    buttons.push(ok);
  } else {
    const no_thanks = new beestat.component.tile()
      .set_background_color('#fff')
      .set_text_color(beestat.style.color.gray.base)
      .set_text_hover_color(beestat.style.color.red.base)
      .set_shadow(false)
      .set_text('No Thanks')
      .addEventListener('click', function() {
        self.dispose();
      });
    buttons.push(no_thanks);

    const subscribe = new beestat.component.tile()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_text('Subscribe')
      .addEventListener('click', function() {
        self.state_.email_address_ = self.email_address_.get_value();

        if (self.state_.email_address_.match(/.+@.+\..+/) === null) {
          self.subscribed_ = false;
          self.error_ = 'Invalid email address.';
          self.rerender();
          return;
        }

        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .removeEventListener('click');

        no_thanks.removeEventListener('click');

        new beestat.api()
          .add_call(
            'mailgun',
            'subscribe',
            {'email_address': self.state_.email_address_}
          )
          .set_callback(function(response) {
            if (response.subscribed === true) {
              self.subscribed_ = true;
            } else {
              self.subscribed_ = false;
              self.error_ = 'Subscribe failed; please try again later.';
            }
            self.rerender();
          })
          .send();
      });
    buttons.push(subscribe);
  }

  return buttons;
};
