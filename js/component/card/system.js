/**
 * System card. Shows a big picture of your thermostat, it's sensors, and lets
 * you switch between thermostats.
 *
 * @param {number} thermostat_id
 */
beestat.component.card.system = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

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

  if (beestat.user.has_early_access() === true) {
    this.decorate_time_to_temperature_(parent);
  }
};

/**
 * Decorate the circle containing temperature and humidity.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_circle_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var temperature = beestat.temperature(thermostat.temperature);
  var temperature_whole = Math.floor(temperature);
  var temperature_fractional = (temperature % 1).toFixed(1).substring(2);

  var circle = $.createElement('div')
    .style({
      'padding': (beestat.style.size.gutter * 3),
      'border-radius': '50%',
      'background': beestat.thermostat.get_color(this.thermostat_id_),
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

  (new beestat.component.icon('water_percent', 'Humidity')
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
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

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
      'temperature': thermostat.weather.temperature
    }));
  temperature_container.appendChild(temperature_whole_container);

  var humidity_container = $.createElement('div')
    .style({
      'display': 'inline-flex',
      'align-items': 'center'
    });
  circle.appendChild(humidity_container);

  (new beestat.component.icon('water_percent', 'Humidity')
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
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var render_icon = function(icon_parent, icon, color, subscript, tooltip) {
    (new beestat.component.icon(icon, tooltip)
      .set_size(24)
      .set_color(color)
    ).render(icon_parent);

    if (subscript !== undefined) {
      var sub = $.createElement('sub')
        .style({
          'font-size': '10px',
          'font-weight': beestat.style.font_weight.bold,
          'color': color
        })
        .innerHTML(subscript);
      icon_parent.appendChild(sub);
    } else {
      // A little spacer to help things look less uneven.
      icon_parent.appendChild($.createElement('span')
        .style('margin-right', beestat.style.size.gutter / 4));
    }
  };

  if (thermostat.running_equipment.length === 0) {
    render_icon(parent, 'cancel', beestat.style.color.gray.base, 'none', 'No equipment running');
  } else {
    thermostat.running_equipment.forEach(function(equipment) {
      let subscript;
      let tooltip;
      switch (equipment) {
      case 'fan':
        render_icon(parent, 'fan', beestat.style.color.gray.light, undefined, 'Fan');
        break;
      case 'cool_1':
        tooltip = 'Cool';
        if (thermostat.system_type.detected.cool.stages > 1) {
          subscript = '1';
          tooltip += ' 1';
        } else {
          subscript = undefined;
        }
        render_icon(parent, 'snowflake', beestat.style.color.blue.light, subscript, tooltip);
        break;
      case 'cool_2':
        render_icon(parent, 'snowflake', beestat.style.color.blue.light, '2', 'Cool 2');
        break;
      case 'heat_1':
        tooltip = 'Heat';
        if (thermostat.system_type.detected.heat.stages > 1) {
          subscript = '1';
          tooltip += ' 1';
        } else {
          subscript = undefined;
        }
        render_icon(parent, 'fire', beestat.style.color.orange.base, subscript, tooltip);
        break;
      case 'heat_2':
        render_icon(parent, 'fire', beestat.style.color.orange.base, '2', 'Heat 2');
        break;
      case 'heat_3':
        render_icon(parent, 'fire', beestat.style.color.orange.base, '3', 'Heat 3');
        break;
      case 'auxiliary_heat_1':
        tooltip = 'Aux heat';
        if (thermostat.system_type.detected.auxiliary_heat.stages > 1) {
          subscript = '1';
          tooltip += ' 1';
        } else {
          subscript = undefined;
        }
        render_icon(parent, 'fire', beestat.style.color.red.base, subscript, tooltip);
        break;
      case 'auxiliary_heat_2':
        render_icon(parent, 'fire', beestat.style.color.red.base, '2', 'Aux heat 2');
        break;
      case 'auxiliary_heat_3':
        render_icon(parent, 'fire', beestat.style.color.red.base, '3', 'Aux heat 3');
        break;
      case 'humidifier':
        render_icon(parent, 'water_percent', beestat.style.color.gray.base, '', 'Humidifier');
        break;
      case 'dehumidifier':
        render_icon(parent, 'water_off', beestat.style.color.gray.base, '', 'Dehumidifier');
        break;
      case 'ventilator':
        render_icon(parent, 'air_purifier', beestat.style.color.gray.base, 'v', 'Ventilator');
        break;
      case 'economizer':
        render_icon(parent, 'cash', beestat.style.color.gray.base, '', 'Economizer');
        break;
      }
    });
  }
};

/**
 * Decorate the climate text on the bottom right.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_climate_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  var climate = beestat.thermostat.get_current_climate(
    thermostat.thermostat_id
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
 * Decorate time to heat/cool. This is how long it will take your home to heat
 * or cool to the desired setpoint.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_time_to_temperature_ = function(parent) {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];
  const indoor_temperature = thermostat.temperature;

  const operating_mode = beestat.thermostat.get_operating_mode(
    thermostat.thermostat_id
  );

  // Convert "heat_1" etc to "heat"
  const simplified_operating_mode = operating_mode.replace(/[_\d]|auxiliary/g, '');

  /**
   * If the system is off or if we've already reached the setpoint, don't show
   * this. The HVAC system can still be running due to minimum runtimes or if
   * the setpoint changes suddenly.
   */
  if (
    operating_mode === 'off' ||
    (
      simplified_operating_mode === 'heat' &&
      indoor_temperature >= thermostat.setpoint_heat
    ) ||
    (
      simplified_operating_mode === 'cool' &&
      indoor_temperature <= thermostat.setpoint_cool
    )
  ) {
    return;
  }

  const container = $.createElement('div').style({
    'background': beestat.style.color.bluegray.dark,
    'padding': beestat.style.size.gutter / 2,
    'text-align': 'center',
    'margin-top': beestat.style.size.gutter
  });
  parent.appendChild(container);

  let header_text = 'Time to ' + simplified_operating_mode;
  let text;
  if (
    thermostat.profile === null ||
    thermostat.profile.temperature[operating_mode] === null
  ) {
    // If there is no profile data; TTT is unknown.
    text = 'Unknown';
  } else {
    const linear_trendline = thermostat.profile.temperature[operating_mode].linear_trendline;
    const outdoor_temperature = thermostat.weather.temperature;
    const degrees_per_hour = (linear_trendline.slope * outdoor_temperature) + linear_trendline.intercept;

    header_text += ' (' +
      beestat.temperature({
        'temperature': degrees_per_hour,
        'delta': true,
        'units': true
      }) +
      ' / h)';

    if (degrees_per_hour < 0.05) {
      // If the degrees would display as 0.0/h, go for "never" as the time.
      text = 'Never';
    } else {
      let degrees_to_go;
      let hours_to_go;
      switch (simplified_operating_mode) {
      case 'heat':
        degrees_to_go = thermostat.setpoint_heat - indoor_temperature;
        hours_to_go = degrees_to_go / degrees_per_hour;
        text = beestat.time(hours_to_go * 60 * 60)
          .replace(/^0h /, '');
        break;
      case 'cool':
        degrees_to_go = indoor_temperature - thermostat.setpoint_cool;
        hours_to_go = degrees_to_go / degrees_per_hour;
        text = beestat.time(hours_to_go * 60 * 60)
          .replace(/^0h /, '');
        break;
      }

      /**
       * Show the actual time the temperature will be reached if there are
       * less than 12 hours to go. Otherwise it's mostly irrelevant.
       */
      if (hours_to_go <= 12) {
        text += ' (' +
          moment()
            .add(hours_to_go, 'hour')
            .format('h:mm a') +
          ')';
      }
    }
  }

  container.appendChild(
    $.createElement('div')
      .style('font-weight', 'bold')
      .innerText(header_text)
  );
  container.appendChild($.createElement('div').innerText(text));
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.system.prototype.decorate_top_right_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

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
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

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

  var climate = beestat.thermostat.get_current_climate(
    thermostat.thermostat_id
  );

  // Is the temperature overridden?
  var override = (
    thermostat.setpoint_heat !== climate.heatTemp ||
    thermostat.setpoint_cool !== climate.coolTemp
  );

  // Get the heat/cool values to display.
  var heat;
  if (override === true) {
    heat = thermostat.setpoint_heat;
  } else {
    heat = climate.heatTemp;
  }

  var cool;
  if (override === true) {
    cool = thermostat.setpoint_cool;
  } else {
    cool = climate.coolTemp;
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
