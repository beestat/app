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
    'setting.visualize.floor_plan_id'
  ], function() {
    (new beestat.layer.visualize()).render();
  });

  (new beestat.component.header('visualize')).render(parent);

  var cards = [
    [
      {
        'card': new beestat.component.card.visualize_settings(),
        'size': 12
      }
    ],
    [
      {
        'card': new beestat.component.card.floor_plan_editor(
          beestat.setting('thermostat_id')
        ),
        'size': 6
      },
      {
        'card': new beestat.component.card.three_d()
          .set_floor_plan_id(beestat.setting('visualize.floor_plan_id')),
        'size': 6
      }
    ]
  ];

  (new beestat.component.layout(cards)).render(parent);
};
