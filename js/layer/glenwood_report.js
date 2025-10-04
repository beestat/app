/**
 * Glenwood layer.
 */
beestat.layer.glenwood_report = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.glenwood_report, beestat.layer);

beestat.layer.glenwood_report.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('glenwood_report')).render(parent);

  // All the cards
  var cards = [];

  cards.push([
    {
      'card': new beestat.component.card.glenwood_report(),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
