/**
 * Air Quality layer.
 */
beestat.layer.air_quality = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.air_quality, beestat.layer);

beestat.layer.air_quality.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('air_quality')).render(parent);

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

  if (beestat.thermostat.supports_air_quality(beestat.setting('thermostat_id')) === false) {
    cards.push([
      {
        'card': new beestat.component.card.air_quality_not_supported(
          beestat.setting('thermostat_id')
        ),
        'size': 12
      }
    ]);
  }

  cards.push([
    {
      'card': new beestat.component.card.air_quality_detail(
        beestat.setting('thermostat_id')
      ),
      'size': 12
    }
  ]);

  cards.push([
    {
      'card': new beestat.component.card.air_quality_summary(
        beestat.setting('thermostat_id')
      ),
      'size': 12
    }
  ]);

  (new beestat.component.layout(cards)).render(parent);
};
