/**
 * Main contribute card.
 */
beestat.component.card.contribute = function() {
  beestat.component.card.apply(this, arguments);

  this.state_.currency_multiplier = [
    'usd',
    'gbp'
  ].includes(beestat.setting('units.currency')) === true ? 1 : 1.5;
  this.state_.contribute_type = 'recurring';
  this.state_.contribute_interval = 'year';
  this.state_.contribute_amount = 2 * this.state_.currency_multiplier;
  this.state_.contribute_amount_other = 5 * this.state_.currency_multiplier;
  this.state_.contribute_amount_other_enabled = false;
};
beestat.extend(beestat.component.card.contribute, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute.prototype.decorate_contents_ = function(parent) {
  const self = this;

  if (beestat.user.contribution_is_active() === true) {
    const p1 = document.createElement('p');
    p1.innerText = 'Thank you so much for your support! Your contribution goes a long way towards keeping beestat running and enabling me to create a rich and useful application. My hope is that you are able to use beestat to save money and improve the efficiency of your home.';
    parent.appendChild(p1);

    const tile_group = new beestat.component.tile_group();

    const discord_tile = new beestat.component.tile()
      .set_background_color(beestat.style.color.purple.base)
      .set_background_hover_color(beestat.style.color.purple.light)
      .set_text_color('#fff')
      .set_icon('forum')
      .set_text('Join the Private Discord');
    discord_tile.addEventListener('click', function() {
      window.open('https://discord.gg/GzWbhD6tSB');
    });
    tile_group.add_tile(discord_tile);

    const community_tile = new beestat.component.tile()
      .set_background_color(beestat.style.color.purple.base)
      .set_background_hover_color(beestat.style.color.purple.light)
      .set_text_color('#fff')
      .set_icon('forum')
      .set_text('Join the beestat Community');
    community_tile.addEventListener('click', function() {
      window.open('https://community.beestat.io');
    });
    tile_group.add_tile(community_tile);

    tile_group.render(parent);

    const p2 = document.createElement('p');
    p2.innerText = 'Looking for a way to contribute more but don\'t want to change your recurring support amount?';
    parent.appendChild(p2);

    const pay_links = {
      'usd': {
        'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
        'live': 'https://donate.stripe.com/7sIcPp4Gt6APais144'
      },
      'cad': {
        'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
        'live': 'https://donate.stripe.com/28obLl4Gte3hfCMdR4'
      },
      'aud': {
        'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
        'live': 'https://donate.stripe.com/dR66r12ylcZd3U4aER'
      },
      'gbp': {
        'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
        'live': 'https://donate.stripe.com/4gwbLl3Cpe3hais3cs'
      }
    };

    const one_time_gift_tile = new beestat.component.tile()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_icon('gift')
      .set_text('Make a One-Time Gift');
    one_time_gift_tile.addEventListener('click', function() {
      window.open(
        pay_links[beestat.setting('units.currency')][window.environment] +
        '?prefilled_email=' + beestat.user.get().email_address +
        '&client_reference_id=' + beestat.user.get().user_id
      );
    });

    one_time_gift_tile.render(parent);
  } else {
    const p3 = document.createElement('p');
    p3.innerText = 'Beestat is completely free to use and does not run ads or sell your data. If you find this service useful, please consider contributing. Your gift directly supports operating costs and project development.';
    parent.appendChild(p3);

    const p4 = document.createElement('p');
    p4.innerText = 'I would like to give...';
    parent.appendChild(p4);

    // Amount
    const amount_container = document.createElement('div');
    Object.assign(amount_container.style, {
      'display': 'flex',
      'flex-wrap': 'wrap',
      'align-items': 'center',
      'grid-gap': `${beestat.style.size.gutter}px`
    });
    parent.appendChild(amount_container);

    const tile_group_amount = new beestat.component.tile_group();

    const amounts = [
      1 * this.state_.currency_multiplier,
      2 * this.state_.currency_multiplier,
      3 * this.state_.currency_multiplier
    ];
    amounts.forEach(function(amount) {
      const amount_formatted = new Intl.NumberFormat('en-US', {
        'style': 'currency',
        'currency': beestat.setting('units.currency')
      }).format(amount);

      const tile_amount = new beestat.component.tile()
        .set_background_color(beestat.style.color.bluegray.light)
        .set_background_hover_color(beestat.style.color.green.base)
        .set_text_color('#fff')
        .set_text(amount_formatted + ' / month');
      tile_group_amount.add_tile(tile_amount);

      if (
        amount === self.state_.contribute_amount &&
        self.state_.contribute_amount_other_enabled === false
      ) {
        tile_amount
          .set_background_color(beestat.style.color.green.base);
      } else {
        tile_amount
          .set_background_color(beestat.style.color.bluegray.light)
          .set_background_hover_color(beestat.style.color.green.base);

        tile_amount.addEventListener('click', function() {
          self.state_.contribute_amount_other_enabled = false;
          self.state_.contribute_amount = amount;
          self.rerender();
        });
      }
    });

    const tile_amount_other = new beestat.component.tile()
      .set_text_color('#fff')
      .set_text('Other Amount');
    if (this.state_.contribute_amount_other_enabled === true) {
      tile_amount_other
        .set_background_color(beestat.style.color.green.base);
    } else {
      tile_amount_other
        .set_background_color(beestat.style.color.bluegray.light)
        .set_background_hover_color(beestat.style.color.green.base);
    }

    tile_amount_other.addEventListener('click', function() {
      self.state_.contribute_amount_other_enabled = true;
      self.rerender();
    });
    tile_group_amount.add_tile(tile_amount_other);

    tile_group_amount.render($(amount_container));

    if (this.state_.contribute_amount_other_enabled === true) {
      const other_amount_input = new beestat.component.input.text()
        .set_width(100)
        .set_icon('currency_usd')
        .set_value(Number(this.state_.contribute_amount_other).toFixed(2))
        .set_maxlength(6)
        .set_requirements({
          'required': true,
          'type': 'decimal',
          'min_value': 1
        })
        .set_transform({
          'type': 'round',
          'decimals': 2
        });
      other_amount_input.addEventListener('blur', function() {
        if (this.meets_requirements() === true) {
          self.state_.contribute_amount_other = this.get_value();
          self.rerender();
        }
      });
      other_amount_input.render($(amount_container));
    }

    // Frequency
    const tile_group_frequency = new beestat.component.tile_group();
    tile_group_frequency.style({
      'margin-top': `${beestat.style.size.gutter}px`
    });

    const intervals = [
      'year',
      'month'
    ];
    intervals.forEach(function(frequency) {
      const tile_frequency = new beestat.component.tile()
        .set_background_color(beestat.style.color.bluegray.light)
        .set_background_hover_color(beestat.style.color.lightblue.base)
        .set_text_color('#fff')
        .set_text('Pay ' + frequency.charAt(0).toUpperCase() + frequency.slice(1) + 'ly');
      tile_group_frequency.add_tile(tile_frequency);

      if (frequency === self.state_.contribute_interval) {
        tile_frequency
          .set_background_color(beestat.style.color.lightblue.base);
      } else {
        tile_frequency
          .set_background_color(beestat.style.color.bluegray.light)
          .set_background_hover_color(beestat.style.color.lightblue.base);

        tile_frequency.addEventListener('click', function() {
          self.state_.contribute_interval = frequency;
          self.rerender();
        });
      }
    });

    tile_group_frequency.render(parent);

    // Review
    const review_container = document.createElement('div');
    Object.assign(review_container.style, {
      'padding': `${beestat.style.size.gutter}px`,
      'background': beestat.style.color.bluegray.dark,
      'margin-top': `${beestat.style.size.gutter}px`,
      'margin-bottom': `${beestat.style.size.gutter}px`
    });

    let contribute_amount;
    if (this.state_.contribute_amount_other_enabled === true) {
      contribute_amount = this.state_.contribute_amount_other;
    } else {
      contribute_amount = this.state_.contribute_amount;
    }

    if (this.state_.contribute_interval === 'year') {
      contribute_amount *= 12;
    }

    contribute_amount = Math.round(contribute_amount * 100) / 100;
    const contribute_amount_formatted = new Intl.NumberFormat('en-US', {
      'style': 'currency',
      'currency': beestat.setting('units.currency')
    }).format(contribute_amount);
    const contribute_interval = this.state_.contribute_interval;

    review_container.innerText = 'Give ' + contribute_amount_formatted + ' / ' + contribute_interval + ' until I cancel.';
    parent.appendChild(review_container);

    // Buttons
    const button_container = document.createElement('div');
    Object.assign(button_container.style, {
      'text-align': 'right'
    });
    parent.appendChild($(button_container));

    const continue_tile = new beestat.component.tile()
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .set_size('large')
      .set_icon('credit_card_lock')
      .set_text('Continue to Payment');
    continue_tile.addEventListener('click', function() {
      self.state_.stripe_connecting = true;

      this
        .set_background_color(beestat.style.color.gray.base)
        .set_background_hover_color()
        .removeEventListener('click');

      window.open('api/?resource=stripe_payment_link&method=open&arguments={"attributes":{"amount":' + (contribute_amount * 100) + ',"currency":"' + beestat.setting('units.currency') + '","interval":"' + contribute_interval + '"}}&api_key=' + beestat.api.api_key);

      setTimeout(function() {
        self.rerender();
      }, 5000);
    });

    continue_tile.render($(button_container));

    if (this.state_.stripe_connecting === true) {
      const api_call = new beestat.api()
        .add_call('stripe_event', 'read_id')
        .set_callback(function(response) {
          beestat.cache.set('stripe_event', response);
        });

      window.setTimeout(function() {
        api_call.send();
        self.rerender();
      }, 5000);
    }
  }
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.contribute.prototype.get_title_ = function() {
  return 'Contribute';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute.prototype.decorate_top_right_ = function(parent) {
  if (beestat.user.contribution_is_active() === false) {
    const menu = (new beestat.component.menu()).render(parent);

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('One-Time Gift')
      .set_icon('gift')
      .set_callback(function() {
        window.open(
          'https://donate.stripe.com/7sIcPp4Gt6APais144' +
          '?prefilled_email=' + beestat.user.get().email_address +
          '&client_reference_id=' + beestat.user.get().user_id

        );
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Support on Patreon')
      .set_icon('patreon')
      .set_callback(function() {
        window.open('https://patreon.com/beestat');
      }));
  }
};
