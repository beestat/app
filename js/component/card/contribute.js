/**
 * Main contribute card.
 */
beestat.component.card.contribute = function() {
  beestat.component.card.apply(this, arguments);

  this.state_.contribute_type = 'recurring';
  this.state_.contribute_frequency = 'yearly';
  this.state_.contribute_amount = 2;
  this.state_.contribute_amount_other = 5;
  this.state_.contribute_amount_other_enabled = false;
};
beestat.extend(beestat.component.card.contribute, beestat.component.card);

beestat.component.card.contribute.payment_links = {
  'monthly': {
    '1': 'https://buy.stripe.com/test_6oEeYk3dG2mmbhC28f',
    '2': 'https://buy.stripe.com/test_dR6eYk29C6CC99ubIR',
    '3': 'https://buy.stripe.com/test_eVadUg29C5yyadybIQ'
  },
  'yearly': {
    '12': 'https://buy.stripe.com/test_9AQ2by29CaSSgBW3cg',
    '24': 'https://buy.stripe.com/test_eVa4jGdSk2mmgBW5kq',
    '36': 'https://buy.stripe.com/test_4gwg2o7tWe5485q6ot'
  }
};

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.contribute.prototype.decorate_contents_ = function(parent) {
  const self = this;

  const p1 = document.createElement('p');
  p1.innerText = 'Beestat is completely free to use and does not run ads or sell your data. If you find this service useful, please consider contributing. Your gift directly supports operating costs and project development.';
  parent.appendChild(p1);

  const p2 = document.createElement('p');
  p2.innerText = 'I would like to give...';
  parent.appendChild(p2);

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
    1,
    2,
    3
  ];
  amounts.forEach(function(amount) {
    const tile_amount = new beestat.component.tile()
      .set_background_color(beestat.style.color.bluegray.light)
      .set_background_hover_color(beestat.style.color.green.base)
      .set_text_color('#fff')
      .set_text('$' + amount + ' / month');
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
      .set_value(this.state_.contribute_amount_other)
      .set_maxlength(6)
      .set_requirements({
        'required': true,
        'type': 'number',
        'min_value': 1,
        'max_value': 100
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

  const frequencies = [
    'yearly',
    'monthly'
  ];
  frequencies.forEach(function(frequency) {
    const tile_frequency = new beestat.component.tile()
      .set_background_color(beestat.style.color.bluegray.light)
      .set_background_hover_color(beestat.style.color.lightblue.base)
      .set_text_color('#fff')
      .set_text(frequency.charAt(0).toUpperCase() + frequency.slice(1));
    tile_group_frequency.add_tile(tile_frequency);

    if (frequency === self.state_.contribute_frequency) {
      tile_frequency
        .set_background_color(beestat.style.color.lightblue.base);
    } else {
      tile_frequency
        .set_background_color(beestat.style.color.bluegray.light)
        .set_background_hover_color(beestat.style.color.lightblue.base);

      tile_frequency.addEventListener('click', function() {
        self.state_.contribute_frequency = frequency;
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

  if (this.state_.contribute_frequency === 'yearly') {
    contribute_amount *= 12;
  }

  contribute_amount = Math.round(contribute_amount * 100) / 100;
  const contribute_amount_formatted = new Intl.NumberFormat('en-US', {
    'style': 'currency',
    'currency': 'USD'
  }).format(contribute_amount);
  const contribute_frequency = this.state_.contribute_frequency.replace('ly', '');

  review_container.innerText = 'Give ' + contribute_amount_formatted + ' / ' + contribute_frequency + ' until I cancel.';
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
    window.open(
      beestat.component.card.contribute.payment_links[self.state_.contribute_frequency][contribute_amount] +
      '?prefilled_email=' + beestat.user.get().email_address +
      '&client_reference_id=' + beestat.user.get().user_id
    );
  });

  continue_tile.render($(button_container));
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
  const menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('One-Time Gift')
    .set_icon('gift')
    .set_callback(function() {
      window.open('https://donate.stripe.com/test_bIY2by6pS1ii99u8wG');
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/TODO');
    }));
};
