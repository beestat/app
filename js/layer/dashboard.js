/**
 * Dashboard layer.
 */
beestat.layer.dashboard = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.dashboard, beestat.layer);

beestat.layer.dashboard.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('dashboard')).render(parent);

  // All the cards
  var cards = [];

  if (window.is_demo === true) {
    cards.push([
      {
        'card': new beestat.component.card.demo(),
        'size': 12
      }
    ]);
  }

  cards.push([
    {
      'card': new beestat.component.card.system(),
      'size': 4
    },
    {
      'card': new beestat.component.card.sensors(),
      'size': 4
    },
    {
      'card': new beestat.component.card.alerts(),
      'size': 4
    }
  ]);

  // Show the Patreon card by default; look for reasons to hide it.
  var show_patreon_card = true;

  var user = beestat.get_user();
  if (
    user.patreon_status !== null &&
    user.patreon_status.patron_status === 'active_patron'
  ) {
    show_patreon_card = false;
  }

  if (
    (
      beestat.setting('patreon_hide_until') !== undefined &&
      moment.utc(beestat.setting('patreon_hide_until')).isAfter(moment.utc())
    ) ||
    window.is_demo === true
  ) {
    show_patreon_card = false;
  }

  if (show_patreon_card === true) {
    cards.push([
      {
        'card': new beestat.component.card.patreon(),
        'size': 12,
        'global': 'patreon' // TODO REMOVE THIS
      }
    ]);
  }

  cards.push([
    {
      'card': new beestat.component.card.runtime_thermostat_detail(
        beestat.setting('thermostat_id')
      ),
      'size': 12
    }
  ]);
  cards.push([
    {
      'card': new beestat.component.card.runtime_thermostat_summary(
        beestat.setting('thermostat_id')
      ),
      'size': 12
    }
  ]);
  cards.push([
    {
      'card': new beestat.component.card.footer(),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
