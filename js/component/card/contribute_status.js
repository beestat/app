/**
 * Contribute benefits.
 */
beestat.component.card.contribute_status = function() {
  const self = this;

  beestat.dispatcher.addEventListener(
    [
      'cache.user',
      'cache.stripe_event'
    ],
    function() {
      self.rerender();
    }
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.contribute_status, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute_status.prototype.decorate_contents_ = function(parent) {
  const p = document.createElement('p');
  p.innerText = 'Use this area to view, update, or cancel your support of beestat.';
  parent.appendChild(p);

  this.decorate_direct_(parent);
  this.decorate_patreon_(parent);
};

/**
 * Decorate direct giving.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute_status.prototype.decorate_direct_ = function(parent) {
  (new beestat.component.title('Direct Giving')).render(parent);

  const container = document.createElement('div');
  Object.assign(container.style, {
    'background': beestat.style.color.bluegray.dark,
    'padding': `${beestat.style.size.gutter}px`,
    'display': 'flex',
    'flex-wrap': 'wrap',
    'grid-gap': `${beestat.style.size.gutter}px`,
    'align-items': 'center',
    'margin-bottom': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(container);

  const status_container = document.createElement('div');
  Object.assign(status_container.style, {
    'flex-grow': '1'
  });
  container.appendChild(status_container);

  const status_tile = new beestat.component.tile()
    .set_shadow(false);

  const button_container = document.createElement('div');
  container.appendChild(button_container);

  if (beestat.user.stripe_is_active() === true) {
    status_tile
      .set_icon('check')
      .set_text_color(beestat.style.color.green.base)
      .set_text('Supporter');
  } else {
    status_tile
      .set_icon('close')
      .set_text_color(beestat.style.color.gray.base)
      .set_text('Not a Supporter');
  }
  status_tile.render($(status_container));

  const manage_tile = new beestat.component.tile()
    .set_text('Manage Support')
    .set_icon('credit_card_settings')
    .set_background_color(beestat.style.color.red.base)
    .set_background_hover_color(beestat.style.color.red.light)
    .set_text_color('#fff')
    .addEventListener('click', function() {
      window.open(
        window.environment === 'dev'
          ? 'https://billing.stripe.com/p/login/test_14k8zD2vwb8g6ZO8ww'
          : 'https://billing.stripe.com/p/login/7sI5kEetRfHP6g8fYY'
      );
    });
  manage_tile.render($(button_container));
};

/**
 * Decorate Patreon giving.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute_status.prototype.decorate_patreon_ = function(parent) {
  const self = this;

  (new beestat.component.title('Patreon')).render(parent);

  const container = document.createElement('div');
  Object.assign(container.style, {
    'background': beestat.style.color.bluegray.dark,
    'padding': `${beestat.style.size.gutter}px`,
    'display': 'flex',
    'flex-wrap': 'wrap',
    'grid-gap': `${beestat.style.size.gutter}px`,
    'align-items': 'center'
  });
  parent.appendChild(container);

  const status_container = document.createElement('div');
  Object.assign(status_container.style, {
    'flex-grow': '1'
  });
  container.appendChild(status_container);

  const status_tile = new beestat.component.tile()
    .set_shadow(false);

  const button_container = document.createElement('div');
  container.appendChild(button_container);

  if (beestat.user.patreon_is_connected() === true) {
    self.state_.patreon_connecting = false;

    const user = beestat.user.get();

    if (user.patreon_status.patron_status === 'active_patron') {
      status_tile
        .set_icon('check')
        .set_text_color(beestat.style.color.green.base)
        .set_text('Supporter');
    } else {
      status_tile
        .set_icon('close')
        .set_text_color(beestat.style.color.gray.base)
        .set_text('Not a Supporter');
    }
    status_tile.render($(status_container));

    const tile_group = new beestat.component.tile_group();
    const unlink_tile = new beestat.component.tile()
      .set_text('Unlink')
      .set_icon('link_off')
      .set_shadow(false)
      .set_text_color(beestat.style.color.gray.base)
      .set_text_hover_color(beestat.style.color.red.base)
      .addEventListener('click', function() {
        this.removeEventListener('click');

        new beestat.api()
          .add_call(
            'user',
            'unlink_patreon_account',
            {},
            'unlink_patreon_account'
          )
          .add_call('user', 'read_id', {}, 'user')
          .set_callback(function(response) {
            beestat.cache.set('user', response.user);
          })
          .send();
      });
    tile_group.add_tile(unlink_tile);

    const manage_tile = new beestat.component.tile()
      .set_text('Manage Support')
      .set_icon('patreon')
      .set_background_color(beestat.style.color.red.base)
      .set_background_hover_color(beestat.style.color.red.light)
      .set_text_color('#fff')
      .addEventListener('click', function() {
        window.open('https://patreon.com/beestat');
      });
    tile_group.add_tile(manage_tile);

    tile_group.render($(button_container));
  } else {
    status_tile
      .set_icon('cloud_question')
      .set_text_color(beestat.style.color.gray.base)
      .set_text('Account Not Connected')
      .render($(status_container));

    if (this.state_.patreon_connecting === true) {
      const connecting_button = new beestat.component.tile()
        .set_text('Cancel Connection')
        .set_icon('close')
        .set_background_color(beestat.style.color.red.base)
        .set_background_hover_color(beestat.style.color.red.light)
        .set_text_color('#fff')
        .addEventListener('click', function() {
          self.state_.patreon_connecting = false;
          self.rerender();
        });
      connecting_button.render($(button_container));

      const api_call = new beestat.api()
        .add_call('user', 'read_id')
        .set_callback(function(response) {
          beestat.cache.set('user', response);
        });

      window.setTimeout(function() {
        api_call.send();
      }, 5000);
    } else {
      const link_button = new beestat.component.tile()
        .set_text('Connect Account')
        .set_icon('patreon')
        .set_background_color(beestat.style.color.red.base)
        .set_background_hover_color(beestat.style.color.red.light)
        .set_text_color('#fff')
        .addEventListener('click', function() {
          window.open('../api/?resource=patreon&method=authorize&arguments={}&api_key=ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2');
          self.state_.patreon_connecting = true;
          self.rerender();
        });
      link_button.render($(button_container));
    }
  }
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.contribute_status.prototype.get_title_ = function() {
  return 'Contribution Status';
};
