/**
 * No thermostats layer.
 */
beestat.layer.no_thermostats = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.no_thermostats, beestat.layer);

beestat.layer.no_thermostats.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('no_thermostats')).render(parent);

  // All the cards
  const cards = [];

  // Manage Thermostats
  cards.push([
    {
      'card': new beestat.component.card.manage_thermostats(),
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
