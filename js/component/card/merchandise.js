/**
 * Contribute benefits.
 */
beestat.component.card.merchandise = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.merchandise, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.merchandise.prototype.decorate_contents_ = function(parent) {
  const p = document.createElement('p');
  p.innerText = 'Slap a sticker on your furnace and another on a water bottle to support your favorite thermostat analytics platform! Stickers are high quality, made in the USA, and shipped within 3 business days.';
  parent.appendChild(p);

  const flex_container = document.createElement('div');
  Object.assign(flex_container.style, {
    'display': 'flex',
    'grid-gap': `${beestat.style.size.gutter}px`,
    'align-items': 'center',
    'flex-wrap': 'wrap'
  });
  parent.appendChild(flex_container);

  const sticker_logo_text_container = document.createElement('div');
  Object.assign(sticker_logo_text_container.style, {
    'background': beestat.style.color.gray.dark,
    'padding': `${beestat.style.size.gutter}px`,
    'border-radius': `${beestat.style.size.border_radius}px`,
    'text-align': 'right',
    'color': beestat.style.color.gray.dark
  });
  const sticker_logo_text_img = document.createElement('img');
  sticker_logo_text_img.setAttribute('src', 'img/merchandise/sticker_logo_text.png');
  sticker_logo_text_img.style.height = '48px';
  sticker_logo_text_img.style.marginTop = '8px';
  sticker_logo_text_img.style.marginBottom = '8px';
  sticker_logo_text_container.appendChild(sticker_logo_text_img);
  flex_container.appendChild(sticker_logo_text_container);

  const sticker_logo_container = document.createElement('div');
  Object.assign(sticker_logo_container.style, {
    'background': beestat.style.color.gray.dark,
    'padding': `${beestat.style.size.gutter}px`,
    'border-radius': `${beestat.style.size.border_radius}px`,
    'text-align': 'right',
    'color': beestat.style.color.gray.dark
  });
  const sticker_logo_img = document.createElement('img');
  sticker_logo_img.setAttribute('src', 'img/merchandise/sticker_logo.png');
  sticker_logo_img.style.height = '64px';
  sticker_logo_container.appendChild(sticker_logo_img);

  flex_container.appendChild(sticker_logo_container);

  // Buy button
  const tile_container = document.createElement('div');
  Object.assign(tile_container.style, {
    'flex-grow': '1',
    'text-align': 'center'
  });

  const pay_data = {
    'usd': {
      'amount': 5,
      'payment_link': {
        'dev': 'https://buy.stripe.com/test_5kA5nK3dG5yy2L6aF8',
        'live': 'https://buy.stripe.com/14k5mXa0N9N13U47sx'
      }
    },
    'cad': {
      'amount': 7,
      'payment_link': {
        'dev': 'https://buy.stripe.com/test_3csg2og0sgdc71m14w',
        'live': 'https://buy.stripe.com/aEUg1B1uh6APbmweV0'
      }
    },
    'aud': {
      'amount': 7,
      'payment_link': {
        'dev': 'https://buy.stripe.com/test_aEU2bycOg4uugBW14v',
        'live': 'https://buy.stripe.com/6oE6r15Kx2kzgGQbIQ'
      }
    },
    'gbp': {
      'amount': 5,
      'payment_link': {
        'dev': 'https://buy.stripe.com/test_eVaeYkg0s1ii2L66oR',
        'live': 'https://buy.stripe.com/28og1B2yl4sH76g6ov'
      }
    }
  };

  const amount_formatted = new Intl.NumberFormat('en-US', {
    'style': 'currency',
    'currency': beestat.setting('units.currency')
  }).format(pay_data[beestat.setting('units.currency')].amount);

  const pay_tile = new beestat.component.tile()
    .set_background_color(beestat.style.color.lightblue.base)
    .set_background_hover_color(beestat.style.color.lightblue.light)
    .set_text_color('#fff')
    .set_size('large')
    .set_icon('sticker_emoji')
    .set_text([
      'Buy Sticker 2-Pack',
      amount_formatted
    ])
    .render($(tile_container));
  pay_tile.addEventListener('click', function() {
    window.open(
      pay_data[beestat.setting('units.currency')].payment_link[window.environment] +
      '?prefilled_email=' + beestat.user.get().email_address +
      '&client_reference_id=' + beestat.user.get().user_id
    );
  });
  flex_container.appendChild(tile_container);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.merchandise.prototype.get_title_ = function() {
  return 'Merch!';
};
