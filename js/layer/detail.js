/**
 * Detail layer.
 */
beestat.layer.detail = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.detail, beestat.layer);

beestat.layer.detail.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('detail')).render(parent);

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

  if (beestat.component.card.patreon.should_show() === true) {
    cards.push([
      {
        'card': new beestat.component.card.patreon(),
        'size': 12
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
      'card': new beestat.component.card.runtime_sensor_detail(
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
