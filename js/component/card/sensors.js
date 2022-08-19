/**
 * Sensors
 */
beestat.component.card.sensors = function() {
  var self = this;

  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.thermostat',
      'cache.ecobee_thermostat'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.sensors, beestat.component.card);

beestat.component.card.sensors.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var sensors = [];
  var internal_sensor;

  const thermostat_sensors = Object.values(beestat.cache.sensor).filter(function(sensor) {
    return sensor.thermostat_id === beestat.setting('thermostat_id');
  })
    .sort(function(a, b) {
      return a.name.localeCompare(b.name, 'en', {'sensitivity': 'base'});
    });

  thermostat_sensors.forEach(function(sensor) {
    if (sensor.type === 'thermostat') {
      internal_sensor = sensor;
    } else {
      sensors.push(sensor);
    }
  });

  /*
   * Decorate the thermostat's internal sensor, if it has one. The Cor
   * thermostats, for example, do not.
   */
  if (internal_sensor !== undefined) {
    var internal_sensor_container = $.createElement('div');
    parent.appendChild(internal_sensor_container);
    this.decorate_sensor_(internal_sensor_container, internal_sensor.sensor_id);
  }

  // Decorate the rest of the sensors
  if (sensors.length > 0) {
    var sensor_container = $.createElement('div')
      .style({
        'display': 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
        'margin': '0 0 ' + beestat.style.size.gutter + 'px -' + beestat.style.size.gutter + 'px',
        'border-radius': beestat.style.size.border_radius
      });
    parent.appendChild(sensor_container);

    sensors.forEach(function(sensor) {
      var div = $.createElement('div')
        .style({
          'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px'
        });
      sensor_container.appendChild(div);

      self.decorate_sensor_(div, sensor.sensor_id);
    });
  }
};

/**
 * Decorate an individual sensor.
 *
 * @param {rocket.Elements} parent
 * @param {number} sensor_id
 */
beestat.component.card.sensors.prototype.decorate_sensor_ = function(parent, sensor_id) {
  var sensor = beestat.cache.sensor[sensor_id];
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var container = $.createElement('div')
    .style({
      'background': beestat.style.color.bluegray.dark,
      'padding': (beestat.style.size.gutter / 2)
    });
  parent.appendChild(container);

  var display_name = sensor.name;
  if (sensor.type === 'thermostat') {
    display_name += ' (Thermostat)';
  }

  var name = $.createElement('div')
    .style({
      'font-weight': beestat.style.font_weight.bold,
      'margin-bottom': (beestat.style.size.gutter / 4),
      'white-space': 'nowrap',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis'
    })
    .innerHTML(display_name);
  container.appendChild(name);

  // Construct the table
  var table = $.createElement('table').style('width', '100%');
  var tr = $.createElement('tr');
  var td_temperature = $.createElement('td')
    .style({
      'font-size': '18px',
      'width': '40px'
    })
    .innerHTML((sensor.temperature === null) ? '???' : beestat.temperature({
      'temperature': sensor.temperature,
      'type': 'string'
    }));
  var td_above_below = $.createElement('td')
    .style({
      'width': '24px'
    });
  var td_icons = $.createElement('td')
    .style({
      'text-align': 'right'
    });

  if (sensor.temperature < thermostat.temperature && sensor.temperature !== null) {
    (new beestat.component.icon('menu_down'))
      .set_color(beestat.style.color.blue.base)
      .render(td_above_below);
  } else if (sensor.temperature > thermostat.temperature && sensor.temperature !== null) {
    (new beestat.component.icon('menu_up'))
      .set_color(beestat.style.color.red.base)
      .render(td_above_below);
  }

  if (
    sensor.type !== 'monitor_sensor' &&
    sensor.type !== 'control_sensor'
  ) {
    // Occupancy is not supported for these legacy sensor types.
    if (sensor.occupancy === true) {
      (new beestat.component.icon('eye', 'Occupied')).render(td_icons);
    } else {
      (new beestat.component.icon('eye_off', 'Unoccupied'))
        .set_color(beestat.style.color.bluegray.light)
        .render(td_icons);
    }
  }

  td_icons.appendChild($.createElement('span').style({
    'display': 'inline-block',
    'width': (beestat.style.size.gutter / 4)
  }));

  if (sensor.in_use === true) {
    (new beestat.component.icon('check', 'In use')).render(td_icons);
  } else {
    (new beestat.component.icon('check', 'Not in use'))
      .set_color(beestat.style.color.bluegray.light)
      .render(td_icons);
  }

  table.appendChild(tr);
  tr.appendChild(td_temperature);
  tr.appendChild(td_above_below);
  tr.appendChild(td_icons);
  container.appendChild(table);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.sensors.prototype.get_title_ = function() {
  return 'Sensors';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.sensors.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);
  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/d279d6fb4afc4f199409be2eb323140b');
    }));
};
