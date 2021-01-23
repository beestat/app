/**
 * Compare layer.
 */
beestat.layer.compare = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.compare, beestat.layer);

beestat.layer.compare.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('compare')).render(parent);

  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  // All the cards
  const cards = [];

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
      'card': new beestat.component.card.compare_notification(),
      'size': 12
    }
  ]);

  cards.push([
    {
      'card': new beestat.component.card.comparison_settings(
        thermostat.thermostat_id
      ),
      'size': 6
    },
    {
      'card': new beestat.component.card.my_home(
        thermostat.thermostat_id
      ),
      'size': 6
    }
  ]);

  cards.push([
    {
      'card': new beestat.component.card.metrics(
        thermostat.thermostat_id
      ),
      'size': 12
    }
  ]);

  // Footer
  cards.push([
    {
      'card': new beestat.component.card.footer(),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
