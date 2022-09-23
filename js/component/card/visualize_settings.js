/**
 * Visualize settings.
 */
beestat.component.card.visualize_settings = function() {
  const self = this;
  beestat.dispatcher.addEventListener([
    'cache.floor_plan',
    'cache.data.three_d__runtime_sensor'
  ],
  function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.visualize_settings, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_settings.prototype.decorate_contents_ = function(parent) {
  const grid = document.createElement('div');
  Object.assign(grid.style, {
    'display': 'grid',
    'grid-template-columns': 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))',
    'grid-gap': `${beestat.style.size.gutter}px`,
    'margin-bottom': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(grid);

  const left_container = document.createElement('div');
  grid.appendChild(left_container);
  const right_container = document.createElement('div');
  grid.appendChild(right_container);

  const data_type_container = document.createElement('div');
  Object.assign(data_type_container.style, {
    'margin-bottom': `${beestat.style.size.gutter}px`
  });
  this.decorate_data_type_(data_type_container);
  left_container.appendChild(data_type_container);

  const heat_map_values_container = document.createElement('div');
  this.decorate_heat_map_values_(heat_map_values_container);
  left_container.appendChild(heat_map_values_container);

  const time_period_container = document.createElement('div');
  this.decorate_time_period_(time_period_container);
  right_container.appendChild(time_period_container);

  // If at least one sensor is on the floor plan and the data is loading.
  if (
    beestat.cache.data.three_d__runtime_sensor === undefined &&
    Object.keys(beestat.floor_plan.get_sensor_ids_map(
      beestat.setting('visualize.floor_plan_id')
    )).length > 0
  ) {
    this.show_loading_('Fetching');
  }
};

/**
 * Decorate the type options.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.visualize_settings.prototype.decorate_data_type_ = function(parent) {
  const self = this;

  (new beestat.component.title('Data Type')).render($(parent));

  const types = [
    {
      'code': 'temperature',
      'name': 'Temperature',
      'icon': 'thermometer'
    },
    {
      'code': 'occupancy',
      'name': 'Occupancy',
      'icon': 'eye'
    }
  ];

  const color = beestat.style.color.green.base;
  const tile_group = new beestat.component.tile_group();
  types.forEach(function(type) {
    const tile = new beestat.component.tile()
      .set_background_hover_color(color)
      .set_text_color('#fff')
      .set_icon(type.icon)
      .set_text(type.name);

    if (beestat.setting('visualize.data_type') === type.code) {
      tile.set_background_color(color);
    } else {
      tile
        .set_background_color(beestat.style.color.bluegray.light)
        .addEventListener('click', function() {
          beestat.setting('visualize.data_type', type.code);
          self.rerender();
        });
    }
    tile_group.add_tile(tile);
  });

  tile_group.render($(parent));
};
/**
 * Decorate the type options.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.visualize_settings.prototype.decorate_heat_map_values_ = function(parent) {
  const self = this;

  (new beestat.component.title('Heat Map Values')).render($(parent));

  const types = [
    {
      'code': 'relative',
      'name': 'Dynamic',
      'icon': 'arrow_expand_horizontal'
    },
    {
      'code': 'absolute',
      'name': 'Static',
      'icon': 'arrow_horizontal_lock'
    }
  ];

  const container = document.createElement('div');
  Object.assign(container.style, {
    'display': 'flex',
    'flex-wrap': 'wrap',
    'grid-gap': `${beestat.style.size.gutter}px`
  });
  parent.appendChild(container);

  const color = beestat.style.color.orange.base;
  const tile_group = new beestat.component.tile_group();

  types.forEach(function(type) {
    const tile = new beestat.component.tile()
      .set_background_hover_color(color)
      .set_text_color('#fff')
      .set_icon(type.icon)
      .set_text(type.name);

    if (beestat.setting('visualize.heat_map_values') === type.code) {
      tile.set_background_color(color);
    } else {
      tile
        .set_background_color(beestat.style.color.bluegray.light)
        .addEventListener('click', function() {
          beestat.setting('visualize.heat_map_values', type.code);
          self.rerender();
        });
    }
    tile_group.add_tile(tile);
  });
  tile_group.render($(container));

  if (beestat.setting('visualize.heat_map_values') === 'absolute') {
    const min_max_container = document.createElement('div');
    container.appendChild(min_max_container);

    let type;
    let inputmode;
    if (beestat.setting('visualize.data_type') === 'temperature') {
      type = 'decimal';
      inputmode = 'decimal';
    } else {
      type = 'integer';
      inputmode = 'numeric';
    }

    const min = new beestat.component.input.text()
      .set_maxlength('5')
      .set_inputmode(inputmode)
      .set_requirements({
        'type': type,
        'required': true
      })
      .set_transform({
        'type': 'round',
        'decimals': 1
      })
      .set_value(
        beestat.temperature(beestat.setting(
          'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.min'
        ))
      )
      .set_width(50);
    min.addEventListener('change', function() {
      if (min.meets_requirements() === true) {
        beestat.setting(
          'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.min',
          beestat.temperature({
            'temperature': min.get_value(),
            'input_temperature_unit': beestat.setting('units.temperature'),
            'output_temperature_unit': '°F'
          })
        );
      } else {
        min.set_value(
          beestat.temperature(beestat.setting(
            'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.min'
          )),
          false
        );
      }
    });

    const max = new beestat.component.input.text()
      .set_maxlength('5')
      .set_inputmode(inputmode)
      .set_requirements({
        'type': type,
        'required': true
      })
      .set_value(
        beestat.temperature(beestat.setting(
          'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.max'
        )),
        false
      )
      .set_width(50);
    max.addEventListener('change', function() {
      if (max.meets_requirements() === true) {
        // Round to one decimal.
        const value = Math.round(max.get_value() * 10) / 10;
        max.set_value(value, false);

        beestat.setting(
          'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.max',
          beestat.temperature({
            'temperature': max.get_value(),
            'input_temperature_unit': beestat.setting('units.temperature'),
            'output_temperature_unit': '°F'
          })
        );
      } else {
        max.set_value(
          beestat.temperature(beestat.setting(
            'visualize.heat_map_absolute.' + beestat.setting('visualize.data_type') + '.max'
          )),
          false
        );
      }
    });

    let span;

    span = document.createElement('span');
    span.style.display = 'inline-block';
    min.render($(span));
    min_max_container.appendChild(span);

    span = document.createElement('span');
    span.innerText = 'to';
    Object.assign(span.style, {
      'display': 'inline-block',
      'margin-left': `${beestat.style.size.gutter}px`,
      'margin-right': `${beestat.style.size.gutter}px`
    });
    min_max_container.appendChild(span);

    span = document.createElement('span');
    span.style.display = 'inline-block';
    max.render($(span));
    min_max_container.appendChild(span);

    span = document.createElement('span');
    switch (beestat.setting('visualize.data_type')) {
    case 'temperature':
      span.innerText = beestat.setting('units.temperature');
      break;
    case 'occupancy':
      span.innerText = '%';
      break;
    }

    Object.assign(span.style, {
      'display': 'inline-block',
      'margin-left': `${beestat.style.size.gutter}px`
    });
    min_max_container.appendChild(span);
  }
};

/**
 * Decorate the type options.
 *
 * @param {HTMLDivElement} parent
 */
beestat.component.card.visualize_settings.prototype.decorate_time_period_ = function(parent) {
  const self = this;

  (new beestat.component.title('Time Period')).render($(parent));

  const color = beestat.style.color.purple.base;

  const tile_group_dynamic = new beestat.component.tile_group();

  // Current Day
  const current_day_tile = new beestat.component.tile()
    .set_background_hover_color(color)
    .set_text_color('#fff')
    .set_icon('calendar')
    .set_text('Today');

  if (
    beestat.setting('visualize.range_type') === 'dynamic' &&
    beestat.setting('visualize.range_dynamic') === 0
  ) {
    current_day_tile.set_background_color(color);
  } else {
    current_day_tile
      .set_background_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        beestat.setting({
          'visualize.range_type': 'dynamic',
          'visualize.range_dynamic': 0
        });
        beestat.cache.delete('data.three_d__runtime_sensor');
        self.rerender();
      });
  }
  tile_group_dynamic.add_tile(current_day_tile);

  // Yesterday
  const yesterday_tile = new beestat.component.tile()
    .set_background_hover_color(color)
    .set_text_color('#fff')
    .set_icon('calendar')
    .set_text('Yesterday');

  if (
    beestat.setting('visualize.range_type') === 'dynamic' &&
    beestat.setting('visualize.range_dynamic') === 1
  ) {
    yesterday_tile.set_background_color(color);
  } else {
    yesterday_tile
      .set_background_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        beestat.setting({
          'visualize.range_type': 'dynamic',
          'visualize.range_dynamic': 1
        });
        beestat.cache.delete('data.three_d__runtime_sensor');
        self.rerender();
      });
  }
  tile_group_dynamic.add_tile(yesterday_tile);

  // Current Week
  const week_tile = new beestat.component.tile()
    .set_background_hover_color(color)
    .set_text_color('#fff')
    .set_icon('calendar_week')
    .set_text('7 Day Average');

  if (
    beestat.setting('visualize.range_type') === 'dynamic' &&
    beestat.setting('visualize.range_dynamic') === 7
  ) {
    week_tile.set_background_color(color);
  } else {
    week_tile
      .set_background_color(beestat.style.color.bluegray.light)
      .addEventListener('click', function() {
        beestat.setting({
          'visualize.range_type': 'dynamic',
          'visualize.range_dynamic': 7
        });
        beestat.cache.delete('data.three_d__runtime_sensor');
        self.rerender();
      });
  }
  tile_group_dynamic.add_tile(week_tile);

  // Custom
  const tile_group_static = new beestat.component.tile_group();
  const custom_tile = new beestat.component.tile()
    .set_background_hover_color(color)
    .set_text_color('#fff')
    .set_icon('calendar_edit')
    .set_text('Custom');

  custom_tile
    .addEventListener('click', function() {
      new beestat.component.modal.visualize_custom().render();
    });

  if (beestat.setting('visualize.range_type') === 'static') {
    custom_tile.set_background_color(color);
  } else {
    custom_tile.set_background_color(beestat.style.color.bluegray.light);
  }
  tile_group_static.add_tile(custom_tile);

  // Static range
  if (beestat.setting('visualize.range_type') === 'static') {
    const static_range_tile = new beestat.component.tile()
      .set_shadow(false)
      .set_text(
        beestat.date(beestat.setting('visualize.range_static.begin')) +
        ' to ' +
        beestat.date(beestat.setting('visualize.range_static.end'))
      );
    tile_group_static.add_tile(static_range_tile);

    const static_range_edit_tile = new beestat.component.tile()
      .set_background_color(beestat.style.color.bluegray.light)
      .set_background_hover_color(color)
      .set_text_color('#fff')
      .set_icon('pencil');
    static_range_edit_tile
      .addEventListener('click', function() {
        new beestat.component.modal.visualize_custom().render();
      });
    tile_group_static.add_tile(static_range_edit_tile);
  }

  tile_group_dynamic
    .style({
      'margin-bottom': `${beestat.style.size.gutter}px`
    })
    .render($(parent));
  tile_group_static.render($(parent));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.visualize_settings.prototype.get_title_ = function() {
  return 'Visualize Settings';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_settings.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/24f548ddd7fc464d846e113470f80c35');
    }));
};

