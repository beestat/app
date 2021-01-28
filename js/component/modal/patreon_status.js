/**
 * Patreon Status.
 */
beestat.component.modal.patreon_status = function() {
  var self = this;

  beestat.dispatcher.addEventListener(
    'cache.user',
    function() {
      self.rerender();
    }
  );

  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.patreon_status, beestat.component.modal);

beestat.component.modal.patreon_status.prototype.decorate_contents_ = function(parent) {
  var user = beestat.user.get();

  if (user.patreon_status === null) {
    this.decorate_wait_(parent);
  } else {
    this.decorate_status_(parent);
  }
};

/**
 * Do some wait logic and get an updated user every 5 seconds.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.patreon_status.prototype.decorate_wait_ = function(parent) {
  parent.appendChild(
    $.createElement('div')
      .style({
        'margin-top': beestat.style.size.gutter
      })
      .innerText('Waiting for Patreon to connect...')
  );

  var api = new beestat.api();

  api.add_call('user', 'read_id');

  api.set_callback(function(response) {
    beestat.cache.set('user', response);
  });

  window.setTimeout(function() {
    api.send();
  }, 5000);
};

/**
 * Decorate the patreon details if they exist.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.patreon_status.prototype.decorate_status_ = function(parent) {
  var user = beestat.user.get();

  // Create our number formatter.
  var formatter = new Intl.NumberFormat(
    'en-US',
    {
      'style': 'currency',
      'currency': 'USD'
    }
  );

  var container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  let patron_status;
  switch (user.patreon_status.patron_status) {
  case 'active_patron':
    patron_status = 'Active Patron';
    break;
  case 'declined_patron':
    patron_status = 'Declined Patron';
    break;
  case 'former_patron':
    patron_status = 'Former Patron';
    break;
  case 'not_patron':
    patron_status = 'Not Patron';
    break;
  default:
    patron_status = 'Unknown';
    break;
  }

  let last_charged;
  switch (user.patreon_status.last_charge_date) {
  case undefined:
    last_charged = 'Unknown';
    break;
  case null:
    last_charged = 'Never';
    break;
  default:
    last_charged = moment.utc(user.patreon_status.last_charge_date).local()
      .format('MMM Do, YYYY');
    break;
  }

  let current_pledge;
  switch (user.patreon_status.will_pay_amount_cents) {
  case undefined:
    current_pledge = 'Unknown';
    break;
  case null:
    current_pledge = formatter.format(0);
    break;
  default:
    current_pledge = formatter.format(user.patreon_status.will_pay_amount_cents / 100);
    break;
  }

  let lifetime_support;
  switch (user.patreon_status.lifetime_support_cents) {
  case undefined:
    lifetime_support = 'Unknown';
    break;
  case null:
    lifetime_support = formatter.format(0);
    break;
  default:
    lifetime_support = formatter.format(user.patreon_status.lifetime_support_cents / 100);
    break;
  }

  var fields = [
    {
      'name': 'Status',
      'value': patron_status
    },
    {
      'name': 'Last Charged',
      'value': last_charged
    },
    {
      'name': 'Current Pledge',
      'value': current_pledge
    },
    {
      'name': 'Lifetime Support',
      'value': lifetime_support
    }
  ];

  fields.forEach(function(field) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    container.appendChild(div);

    div.appendChild($.createElement('div')
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'margin-bottom': (beestat.style.size.gutter / 4)
      })
      .innerText(field.name));
    div.appendChild($.createElement('div').innerText(field.value));
  });

  if (beestat.user.patreon_is_connected() === true) {
    const last_update = moment.utc(beestat.user.get().sync_status.patreon)
      .local()
      .fromNow();

    parent.appendChild(
      $.createElement('div')
        .innerText('Patreon status is automatically updated every 24 hours. Your last update was ' + last_update + '.')
    );
  }
};

/**
 * Get the modal title.
 *
 * @return {string} The modal title.
 */
beestat.component.modal.patreon_status.prototype.get_title_ = function() {
  return 'Patreon Status';
};

/**
 * Get the buttons on the modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.patreon_status.prototype.get_buttons_ = function() {
  if (beestat.user.patreon_is_connected() === true) {
    var refresh = new beestat.component.button()
      .set_text('Refresh Status')
      .set_icon('refresh')
      .set_background_color(beestat.style.color.green.base)
      .set_background_hover_color(beestat.style.color.green.light)
      .set_text_color('#fff')
      .addEventListener('click', function() {
        this
          .set_background_color(beestat.style.color.gray.base)
          .set_background_hover_color()
          .removeEventListener('click');

        new beestat.api()
          .add_call(
            'user',
            'sync_patreon_status',
            {},
            'sync_patreon_status'
          )
          .add_call('user', 'read_id', {}, 'user')
          .set_callback(function(response) {
            // Update the cache.
            beestat.cache.set('user', response.user);
          })
          .send();
      });

    return [refresh];
  }

  return [];
};
