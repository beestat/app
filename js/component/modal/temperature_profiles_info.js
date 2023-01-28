/**
 * Temperature Profiles Details
 */
beestat.component.modal.temperature_profiles_info = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.temperature_profiles_info, beestat.component.modal);

beestat.component.modal.temperature_profiles_info.prototype.decorate_contents_ = function(parent) {
  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  const container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  const fields = [];

  [
    'heat_1',
    'heat_2',
    'auxiliary_heat_1',
    'auxiliary_heat_2',
    'cool_1',
    'cool_2',
    'resist'
  ].forEach(function(type) {
    if (thermostat.profile.temperature[type] !== null) {
      const profile = thermostat.profile.temperature[type];

      // Convert the data to Celsius if necessary
      const deltas_converted = {};
      for (let key in profile.deltas) {
        deltas_converted[beestat.temperature({'temperature': key})] =
          beestat.temperature({
            'temperature': (profile.deltas[key]),
            'delta': true,
            'round': 3
          });
      }

      profile.deltas = deltas_converted;
      const linear_trendline = beestat.math.get_linear_trendline(profile.deltas);

      fields.push({
        'name': beestat.series['indoor_' + type + '_delta'].name,
        'value':
          'Slope = ' +
          linear_trendline.slope.toFixed(4) +
          '<br/>Intercept = ' +
          linear_trendline.intercept.toFixed(4) + beestat.setting('units.temperature')
      });
    }
  });

  fields.forEach(function(field) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    container.appendChild(div);

    div.appendChild($.createElement('div')
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'margin-bottom': (beestat.style.size.gutter / 4)
      })
      .innerHTML(field.name));
    div.appendChild($.createElement('div').innerHTML(field.value));
  });
};

beestat.component.modal.temperature_profiles_info.prototype.get_title_ = function() {
  return 'Temperature Profiles Info';
};
