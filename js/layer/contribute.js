/**
 * Contribute layer.
 */
beestat.layer.contribute = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.contribute, beestat.layer);

beestat.layer.contribute.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header()).render(parent);

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
      'card': new beestat.component.card.contribute(),
      'size': 9
    },
    {
      'card': new beestat.component.card.contribute(),
      'size': 3
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
