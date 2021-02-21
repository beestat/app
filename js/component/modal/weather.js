/**
 * Current weather.
 */
beestat.component.modal.weather = function() {
  var self = this;

  beestat.dispatcher.addEventListener(
    'cache.thermostat',
    function() {
      self.rerender();
    }
  );

  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.weather, beestat.component.modal);

beestat.component.modal.weather.prototype.decorate_contents_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var icon;
  var icon_color;
  switch (thermostat.weather.condition) {
  case 'sunny':
    icon = 'weather_sunny';
    icon_color = beestat.style.color.yellow.base;
    break;
  case 'few_clouds':
  case 'partly_cloudy':
    icon = 'weather_partly_cloudy';
    icon_color = beestat.style.color.gray.base;
    break;
  case 'mostly_cloudy':
  case 'overcast':
    icon = 'weather_cloudy';
    icon_color = beestat.style.color.gray.base;
    break;
  case 'drizzle':
  case 'rain':
  case 'showers':
    icon = 'weather_pouring';
    icon_color = beestat.style.color.blue.light;
    break;
  case 'freezing_rain':
  case 'hail':
  case 'pellets':
    icon_color = beestat.style.color.lightblue.base;
    icon = 'weather_hail';
    break;
  case 'snow':
  case 'flurries':
  case 'freezing_snow':
    icon_color = beestat.style.color.lightblue.light;
    icon = 'weather_snowy';
    break;
  case 'blizzard':
    icon = 'weather_snowy_heavy';
    icon_color = beestat.style.color.lightblue.light;
    break;
  case 'thunderstorm':
    icon = 'weather_lightning_rainy';
    icon_color = beestat.style.color.red.base;
    break;
  case 'windy':
    icon = 'weather_windy';
    icon_color = beestat.style.color.gray.base;
    break;
  case 'tornado':
    icon = 'weather_tornado';
    icon_color = beestat.style.color.gray.base;
    break;
  case 'fog':
    icon = 'weather_fog';
    icon_color = beestat.style.color.gray.base;
    break;
  case 'haze':
  case 'smoke':
  case 'dust':
    icon = 'weather_hazy';
    icon_color = beestat.style.color.gray.base;
    break;
  default:
    icon = 'cloud_question';
    icon_color = beestat.style.color.gray.base;
    break;
  }

  var condition = thermostat.weather.condition.replace('_', ' ');
  condition = condition.charAt(0).toUpperCase() + condition.slice(1);

  var tr;
  var td;

  var table = $.createElement('table');

  tr = $.createElement('tr');
  table.appendChild(tr);

  td = $.createElement('td')
    .setAttribute('rowspan', '2')
    .style({
      'padding-right': beestat.style.size.gutter
    });
  (new beestat.component.icon(icon))
    .set_size(64)
    .set_color(icon_color)
    .render(td);
  tr.appendChild(td);

  td = $.createElement('td');
  td.appendChild(
    $.createElement('span')
      .innerText(
        beestat.temperature({
          'round': 0,
          'units': true,
          'temperature': thermostat.weather.temperature
        })
      )
      .style({
        'font-size': '24px'
      })
  );
  td.appendChild(
    $.createElement('span')
      .innerText(condition)
      .style({
        'font-size': '18px',
        'padding-left': (beestat.style.size.gutter / 2)
      })
  );
  tr.appendChild(td);

  tr = $.createElement('tr').style('color', beestat.style.color.gray.base);
  table.appendChild(tr);

  td = $.createElement('td');
  // Low
  td.appendChild($.createElement('span').innerText('Low: '));
  td.appendChild(
    $.createElement('span')
      .innerText(
        beestat.temperature({
          'round': 0,
          'units': false,
          'temperature': thermostat.weather.temperature_low
        })
      )
      .style({
        'padding-right': (beestat.style.size.gutter / 2)
      })
  );
  // High
  td.appendChild($.createElement('span').innerText('High: '));
  td.appendChild(
    $.createElement('span')
      .innerText(
        beestat.temperature({
          'round': 0,
          'units': false,
          'temperature': thermostat.weather.temperature_high
        })
      )
  );

  tr.appendChild(td);

  parent.appendChild(table);

  var container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  var bearings = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW'
  ];

  var fields = [
    {
      'name': 'Humidity',
      'value': thermostat.weather.humidity_relative + '%'
    },
    {
      'name': 'Dew Point',
      'value': beestat.temperature({
        'round': 0,
        'units': true,
        'temperature': thermostat.weather.dew_point
      })
    },
    {
      'name': 'Wind',
      'value': thermostat.weather.wind_speed === 0
        ? '0mph'
        : thermostat.weather.wind_speed + 'mph ' + bearings[Math.floor(((thermostat.weather.wind_bearing / 22.5) + 0.5) % 16)]
    },
    {
      'name': 'Pressure',
      'value': thermostat.weather.barometric_pressure + 'mb'
    }
  ];

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

beestat.component.modal.weather.prototype.get_title_ = function() {
  return 'Weather';
};
