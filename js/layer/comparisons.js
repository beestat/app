/**
 * Home comparisons layer.
 */
beestat.layer.comparisons = function() {
  beestat.layer.apply(this, arguments);
};
beestat.extend(beestat.layer.comparisons, beestat.layer);

beestat.layer.comparisons.prototype.decorate_ = function(parent) {
  /*
   * Set the overflow on the body so the scrollbar is always present so
   * highcharts graphs render properly.
   */
  $('body').style({
    'overflow-y': 'scroll',
    'background': beestat.style.color.bluegray.light,
    'padding': '0 ' + beestat.style.size.gutter + 'px'
  });

  (new beestat.component.header('comparisons')).render(parent);

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
      'size': 6
    },
    {
      'card': new beestat.component.card.my_home(),
      'size': 6
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

    cards.push([
      {
        'card': new beestat.component.card.temperature_profiles(thermostat_group.thermostat_group_id),
        'size': 12
      }
    ]);
  }

  if (thermostat_group.profile !== null) {
    if (beestat.user.has_early_access() === true) {
      cards.push([
        {
          'card': new beestat.component.card.early_access(),
          'size': 12
        }
      ]);
      cards.push([
        {
          'card': new beestat.component.card.metrics(thermostat_group.thermostat_group_id),
          'size': 12
        }
      ]);
      cards.push([
        {
          'card': new beestat.component.card.temperature_profiles_new(thermostat_group.thermostat_group_id),
          'size': 12
        }
      ]);
    }
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
