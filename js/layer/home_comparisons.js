/**
 * Home comparisons layer.
 */
beestat.layer.home_comparisons = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.home_comparisons, beestat.layer);

beestat.layer.home_comparisons.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('home_comparisons')).render(parent);

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[thermostat.thermostat_group_id];

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
      'card': new beestat.component.card.comparison_settings(),
      'size': 8
    },
    {
      'card': new beestat.component.card.my_home(),
      'size': 4
    }
  ]);

  // Scores and graph
  if (thermostat_group.temperature_profile !== null) {
    cards.push([
      {
        'card': new beestat.component.card.score.heat(),
        'size': 4
      },
      {
        'card': new beestat.component.card.score.cool(),
        'size': 4
      },
      {
        'card': new beestat.component.card.score.resist(),
        'size': 4
      }
    ]);

    if (
      (
        thermostat_group.temperature_profile.heat !== undefined &&
        thermostat_group.temperature_profile.heat.linear_trendline.slope < 0
      ) ||
      (
        thermostat_group.temperature_profile.cool !== undefined &&
        thermostat_group.temperature_profile.cool.linear_trendline.slope < 0
      )
    ) {
      cards.push([
        {
          'card': new beestat.component.card.comparison_issue(),
          'size': 12
        }
      ]);
    }

    cards.push([
      {
        'card': new beestat.component.card.temperature_profiles(),
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
