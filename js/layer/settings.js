/**
 * Setting layer.
 */
beestat.layer.settings = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.settings, beestat.layer);

beestat.layer.settings.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('setting')).render(parent);

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

  // Settings
  cards.push([
    {
      'card': new beestat.component.card.settings(),
      'size': 12
    }
  ]);

  // Manage Thermostats
  cards.push([
    {
      'card': new beestat.component.card.manage_thermostats(),
      'size': 12
    }
  ]);

  // Manage API Key
  cards.push([
    {
      'card': new beestat.component.card.manage_api_key(),
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
