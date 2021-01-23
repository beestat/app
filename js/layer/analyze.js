/**
 * Analyze layer.
 */
beestat.layer.analyze = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.analyze, beestat.layer);

beestat.layer.analyze.prototype.decorate_ = function(parent) {
  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('analyze')).render(parent);

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
      'card': new beestat.component.card.runtime_thermostat_summary(
        thermostat.thermostat_id
      ),
      'size': 12
    }
  ]);

  cards.push([
    {
      'card': new beestat.component.card.temperature_profiles(
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
