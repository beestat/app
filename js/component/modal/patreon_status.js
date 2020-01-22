/**
 * Patreon Status.
 */
beestat.component.modal.patreon_status = function() {
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
  var self = this;

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
    self.rerender();
  });

  setTimeout(function() {
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

  var status;
  switch (user.patreon_status.patron_status) {
  case 'active_patron':
    status = 'Active Patron';
    break;
  case 'declined_patron':
    status = 'Declined Patron';
    break;
  case 'former_patron':
    status = 'Former Patron';
    break;
  default:
    status = 'Unknown';
    break;
  }

  var last_charged;
  if (user.patreon_status.last_charge_date === null) {
    last_charged = 'Never';
  } else {
    last_charged = moment.utc(user.patreon_status.last_charge_date).local()
      .format('MMM Do, YYYY');
  }

  var fields = [
    {
      'name': 'Status',
      'value': status
    },
    {
      'name': 'Last Charged',
      'value': last_charged
    },
    {
      'name': 'Current Pledge',
      'value': formatter.format(user.patreon_status.will_pay_amount_cents / 100)
    },
    {
      'name': 'Lifetime Support',
      'value': formatter.format(user.patreon_status.lifetime_support_cents / 100)
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
      .innerHTML(field.name));
    div.appendChild($.createElement('div').innerHTML(field.value));
  });
};

beestat.component.modal.patreon_status.prototype.get_title_ = function() {
  return 'Patreon Status';
};
