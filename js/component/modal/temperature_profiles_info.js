/**
 * Temperature Profiles Details
 *
 * @param {object} profile The profile object to display info for.
 */
beestat.component.modal.temperature_profiles_info = function(profile) {
  this.profile_ = profile;
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.temperature_profiles_info, beestat.component.modal);

beestat.component.modal.temperature_profiles_info.prototype.decorate_contents_ = function(parent) {
  var date_container = $.createElement('div')
    .style({
      'margin-bottom': '16px',
      'font-weight': beestat.style.font_weight.light
    });
  var generated_at_m = moment(this.profile_.metadata.generated_at);
  var duration_weeks = Math.round(this.profile_.metadata.duration / 7);
  var duration_text = ' from the past';
  if (duration_weeks === 0) {
    duration_text += ' few days';
  } else if (duration_weeks === 1) {
    duration_text += ' week';
  } else if (duration_weeks >= 52) {
    duration_text += ' year';
  } else {
    duration_text += ' ' + duration_weeks + ' weeks';
  }
  duration_text += ' of data';

  date_container.innerText(
    'Generated ' + generated_at_m.format('MMM Do, YYYY @ h a') + duration_text + ' (updated weekly).'
  );
  parent.appendChild(date_container);

  const container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  const fields = [];
  var self = this;

  [
    'heat_1',
    'heat_2',
    'auxiliary_heat_1',
    'auxiliary_heat_2',
    'cool_1',
    'cool_2',
    'resist'
  ].forEach(function(type) {
    if (self.profile_.temperature[type] !== null) {
      const profile = self.profile_.temperature[type];

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

      const linear_trendline = beestat.math.get_linear_trendline(deltas_converted);

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
