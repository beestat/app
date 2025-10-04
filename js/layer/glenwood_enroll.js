/**
 * Glenwood layer.
 */
beestat.layer.glenwood_enroll = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.glenwood_enroll, beestat.layer);

beestat.layer.glenwood_enroll.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('glenwood_enroll')).render(parent);

  // All the cards
  var cards = [];

  cards.push([
    {
      'card': new beestat.component.card.glenwood_terms(),
      'size': 12
    }
  ]);

  cards.push([
    {
      'card': new beestat.component.card.glenwood_enroll(),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
