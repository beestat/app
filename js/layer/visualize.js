/**
 * Visualize layer.
 */
beestat.layer.visualize = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.visualize, beestat.layer);

beestat.layer.visualize.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  beestat.dispatcher.addEventListener([
    'setting.visualize.floor_plan_id',
    'setting.visualize.hide_affiliate'
  ], function() {
    (new beestat.layer.visualize()).render();
  });

  (new beestat.component.header('visualize')).render(parent);

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

  if (
    beestat.setting('visualize.floor_plan_id') !== null &&
    beestat.setting('visualize.floor_plan_id') !== undefined
  ) {
    cards.push([
      {
        'card': new beestat.component.card.floor_plan_editor(
          beestat.setting('thermostat_id')
        ),
        'size': 12
      }
    ]);

    cards.push([
      {
        'card': new beestat.component.card.visualize_settings(),
        'size': 12
      }
    ]);

    if (
      beestat.setting('visualize.hide_affiliate') === false &&
      window.is_demo === false
    ) {
      cards.push([
        {
          'card': new beestat.component.card.visualize_affiliate(),
          'size': 12
        }
      ]);
    }

    cards.push([
      {
        'card': new beestat.component.card.three_d()
          .set_floor_plan_id(beestat.setting('visualize.floor_plan_id')),
        'size': 12
      }
    ]);
  } else {
    cards.push([
      {
        'card': new beestat.component.card.visualize_intro(
          beestat.setting('thermostat_id')
        ),
        'size': 12
      }
    ]);
    cards.push([
      {
        'card': new beestat.component.card.visualize_video(),
        'size': 12
      }
    ]);
  }

  // Footer
  cards.push([
    {
      'card': new beestat.component.card.footer(),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
