/**
 * System card. Shows a big picture of your thermostat, it's sensors, and lets
 * you switch between thermostats.
 */
beestat.component.card.system = function() {
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
beestat.extend(beestat.component.card.system, beestat.component.card);

beestat.component.card.system.prototype.decorate_contents_ = function(parent) {
  this.decorate_circle_(parent);
  this.decorate_weather_(parent);
  this.decorate_equipment_(parent);
  this.decorate_climate_(parent);
};

/**
 * Decorate the circle containing temperature and humidity.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_circle_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var temperature = beestat.temperature(thermostat.temperature);
  var temperature_whole = Math.floor(temperature);
  var temperature_fractional = (temperature % 1).toFixed(1).substring(2);

  var circle = $.createElement('div')
    .style({
      'padding': (beestat.style.size.gutter * 3),
      'border-radius': '50%',
      'background': beestat.get_thermostat_color(beestat.setting('thermostat_id')),
      'height': '180px',
      'width': '180px',
      'margin': beestat.style.size.gutter + 'px auto ' + beestat.style.size.gutter + 'px auto',
      'text-align': 'center',
      'text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.2)'
    });
  parent.appendChild(circle);

  var temperature_container = $.createElement('div');
  circle.appendChild(temperature_container);

  var temperature_whole_container = $.createElement('span')
    .style({
      'font-size': '48px',
      'font-weight': beestat.style.font_weight.light
    })
    .innerHTML(temperature_whole);
  temperature_container.appendChild(temperature_whole_container);

  var temperature_fractional_container = $.createElement('span')
    .style({
      'font-size': '24px'
    })
    .innerHTML('.' + temperature_fractional);
  temperature_container.appendChild(temperature_fractional_container);

  var humidity_container = $.createElement('div')
    .style({
      'display': 'inline-flex',
      'align-items': 'center'
    });
  circle.appendChild(humidity_container);

  (new beestat.component.icon('water_percent')
    .set_size(24)
  ).render(humidity_container);

  humidity_container.appendChild(
    $.createElement('span').innerHTML(thermostat.humidity + '%')
  );
};

/**
 * Decorate the weather
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.card.system.prototype.decorate_weather_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var circle = $.createElement('div')
    .style({
      'padding': (beestat.style.size.gutter / 2),
      'border-radius': '50%',
      'background': beestat.style.color.bluegray.light,
      'height': '66px',
      'width': '66px',
      'text-align': 'center',
      'text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.2)',
      'position': 'absolute',
      'top': '90px',
      'left': '50%',
      'margin-left': '40px',
      'cursor': 'pointer',
      'transition': 'background 200ms ease'
    });
  parent.appendChild(circle);

  circle
    .addEventListener('mouseover', function() {
      circle.style('background', beestat.style.color.gray.dark);
    })
    .addEventListener('mouseout', function() {
      circle.style('background', beestat.style.color.bluegray.light);
    })
    .addEventListener('click', function() {
      (new beestat.component.modal.weather()).render();
    });

  var temperature_container = $.createElement('div');
  circle.appendChild(temperature_container);

  var temperature_whole_container = $.createElement('span')
    .style({
      'font-size': '22px',
      'font-weight': beestat.style.font_weight.light
    })
    .innerHTML(beestat.temperature({
      'round': 0,
      'units': false,
      'temperature': (thermostat.weather.temperature / 10)
    }));
  temperature_container.appendChild(temperature_whole_container);

  var humidity_container = $.createElement('div')
    .style({
      'display': 'inline-flex',
      'align-items': 'center'
    });
  circle.appendChild(humidity_container);

  (new beestat.component.icon('water_percent')
    .set_size(16)
  ).render(humidity_container);

  humidity_container.appendChild(
    $.createElement('span')
      .innerHTML(thermostat.weather.humidity_relative + '%')
      .style({
        'font-size': '10px'
      })
  );
};

/**
 * Decorate the running equipment list on the bottom left.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_equipment_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  var running_equipment = [];

  if (ecobee_thermostat.equipment_status.indexOf('fan') !== -1) {
    running_equipment.push('fan');
  }

  if (ecobee_thermostat.equipment_status.indexOf('ventilator') !== -1) {
    running_equipment.push('ventilator');
  }
  if (ecobee_thermostat.equipment_status.indexOf('humidifier') !== -1) {
    running_equipment.push('humidifier');
  }
  if (ecobee_thermostat.equipment_status.indexOf('dehumidifier') !== -1) {
    running_equipment.push('dehumidifier');
  }
  if (ecobee_thermostat.equipment_status.indexOf('economizer') !== -1) {
    running_equipment.push('economizer');
  }

  if (ecobee_thermostat.equipment_status.indexOf('compCool2') !== -1) {
    running_equipment.push('cool_2');
  } else if (ecobee_thermostat.equipment_status.indexOf('compCool1') !== -1) {
    running_equipment.push('cool_1');
  }

  if (ecobee_thermostat.settings.hasHeatPump === true) {
    if (ecobee_thermostat.equipment_status.indexOf('heatPump3') !== -1) {
      running_equipment.push('heat_3');
    } else if (ecobee_thermostat.equipment_status.indexOf('heatPump2') !== -1) {
      running_equipment.push('heat_2');
    } else if (ecobee_thermostat.equipment_status.indexOf('heatPump') !== -1) {
      running_equipment.push('heat_1');
    }
    if (ecobee_thermostat.equipment_status.indexOf('auxHeat3') !== -1) {
      running_equipment.push('aux_3');
    } else if (ecobee_thermostat.equipment_status.indexOf('auxHeat2') !== -1) {
      running_equipment.push('aux_2');
    } else if (ecobee_thermostat.equipment_status.indexOf('auxHeat1') !== -1) {
      running_equipment.push('aux_1');
    }
  } else if (ecobee_thermostat.equipment_status.indexOf('auxHeat3') !== -1) {
    running_equipment.push('heat_3');
  } else if (ecobee_thermostat.equipment_status.indexOf('auxHeat2') !== -1) {
    running_equipment.push('heat_2');
  } else if (ecobee_thermostat.equipment_status.indexOf('auxHeat1') !== -1) {
    running_equipment.push('heat_1');
  }

  if (ecobee_thermostat.equipment_status.indexOf('compHotWater') !== -1) {
    running_equipment.push('heat_1');
  }
  if (ecobee_thermostat.equipment_status.indexOf('auxHotWater') !== -1) {
    running_equipment.push('aux_1');
  }

  var render_icon = function(icon_parent, icon, color, text) {
    (new beestat.component.icon(icon)
      .set_size(24)
      .set_color(color)
    ).render(icon_parent);

    if (text !== undefined) {
      var sub = $.createElement('sub')
        .style({
          'font-size': '10px',
          'font-weight': beestat.style.font_weight.bold,
          'color': color
        })
        .innerHTML(text);
      icon_parent.appendChild(sub);
    } else {
      // A little spacer to help things look less uneven.
      icon_parent.appendChild($.createElement('span')
        .style('margin-right', beestat.style.size.gutter / 4));
    }
  };

  if (running_equipment.length === 0) {
    running_equipment.push('nothing');
  }

  running_equipment.forEach(function(equipment) {
    switch (equipment) {
    case 'nothing':
      render_icon(parent, 'cancel', beestat.style.color.gray.base, 'none');
      break;
    case 'fan':
      render_icon(parent, 'fan', beestat.style.color.gray.light);
      break;
    case 'cool_1':
      render_icon(parent, 'snowflake', beestat.style.color.blue.light, '1');
      break;
    case 'cool_2':
      render_icon(parent, 'snowflake', beestat.style.color.blue.light, '2');
      break;
    case 'heat_1':
      render_icon(parent, 'fire', beestat.style.color.orange.base, '1');
      break;
    case 'heat_2':
      render_icon(parent, 'fire', beestat.style.color.orange.base, '2');
      break;
    case 'heat_3':
      render_icon(parent, 'fire', beestat.style.color.orange.base, '3');
      break;
    case 'aux_1':
      render_icon(parent, 'fire', beestat.style.color.red.base, '1');
      break;
    case 'aux_2':
      render_icon(parent, 'fire', beestat.style.color.red.base, '2');
      break;
    case 'aux_3':
      render_icon(parent, 'fire', beestat.style.color.red.base, '3');
      break;
    case 'humidifier':
      render_icon(parent, 'water_percent', beestat.style.color.gray.base, '');
      break;
    case 'dehumidifier':
      render_icon(parent, 'water_off', beestat.style.color.gray.base, '');
      break;
    case 'ventilator':
      render_icon(parent, 'air_purifier', beestat.style.color.gray.base, 'v');
      break;
    case 'economizer':
      render_icon(parent, 'cash', beestat.style.color.gray.base, '');
      break;
    }
  });
};

/**
 * Decorate the climate text on the bottom right.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_climate_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  var climate = beestat.get_climate(
    ecobee_thermostat.program.currentClimateRef
  );

  var climate_container = $.createElement('div')
    .style({
      'display': 'inline-flex',
      'align-items': 'center',
      'float': 'right'
    });
  parent.appendChild(climate_container);

  var icon;
  if (climate.climateRef === 'home') {
    icon = 'home';
  } else if (climate.climateRef === 'away') {
    icon = 'update';
  } else if (climate.climateRef === 'sleep') {
    icon = 'alarm_snooze';
  } else {
    icon = (climate.isOccupied === true) ? 'home' : 'update';
  }

  (new beestat.component.icon(icon)
    .set_size(24)
  ).render(climate_container);

  climate_container.appendChild($.createElement('span')
    .innerHTML(climate.name)
    .style('margin-left', beestat.style.size.gutter / 4));
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_top_right_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Thermostat Info')
    .set_icon('thermostat')
    .set_callback(function() {
      (new beestat.component.modal.thermostat_info()).render();
    }));

  if ($.values(thermostat.filters).length > 0) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Filter Info')
      .set_icon('air_filter')
      .set_callback(function() {
        (new beestat.component.modal.filter_info()).render();
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/System-44b441bdd99b4c3991d6e0ace2dce893');
    }));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.system.prototype.get_title_ = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  return 'System - ' + thermostat.name;
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle of the card.
 */
beestat.component.card.system.prototype.get_subtitle_ = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  var climate = beestat.get_climate(
    ecobee_thermostat.program.currentClimateRef
  );

  // Is the temperature overridden?
  var override = (
    ecobee_thermostat.runtime.desiredHeat !== climate.heatTemp ||
    ecobee_thermostat.runtime.desiredCool !== climate.coolTemp
  );

  // Get the heat/cool values to display.
  var heat;
  if (override === true) {
    heat = ecobee_thermostat.runtime.desiredHeat / 10;
  } else {
    heat = climate.heatTemp / 10;
  }

  var cool;
  if (override === true) {
    cool = ecobee_thermostat.runtime.desiredCool / 10;
  } else {
    cool = climate.coolTemp / 10;
  }

  // Translate ecobee strings to GUI strings.
  var hvac_modes = {
    'off': 'Off',
    'auto': 'Auto',
    'auxHeatOnly': 'Aux',
    'cool': 'Cool',
    'heat': 'Heat'
  };

  var hvac_mode = hvac_modes[ecobee_thermostat.settings.hvacMode];

  heat = beestat.temperature({
    'temperature': heat
  });
  cool = beestat.temperature({
    'temperature': cool
  });

  var subtitle = hvac_mode;

  if (ecobee_thermostat.settings.hvacMode !== 'off') {
    if (override === true) {
      subtitle += ' / Overridden';
    } else {
      subtitle += ' / Schedule';
    }
  }

  if (ecobee_thermostat.settings.hvacMode === 'auto') {
    subtitle += ' / ' + heat + ' - ' + cool;
  } else if (
    ecobee_thermostat.settings.hvacMode === 'heat' ||
    ecobee_thermostat.settings.hvacMode === 'auxHeatOnly'
  ) {
    subtitle += ' / ' + heat;
  } else if (
    ecobee_thermostat.settings.hvacMode === 'cool'
  ) {
    subtitle += ' / ' + cool;
  }

  return subtitle;
};
