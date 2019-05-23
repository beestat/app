/**
 * Air filter info.
 */
beestat.component.modal.filter_info = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.filter_info, beestat.component.modal);

beestat.component.modal.filter_info.prototype.decorate_contents_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  for (var type in thermostat.filters) {
    this.decorate_single_(parent, type);
  }
};

/**
 * Decorate a single filter row.
 *
 * @param {rocket.Elements} parent
 * @param {string} type The type of filter.
 */
beestat.component.modal.filter_info.prototype.decorate_single_ = function(parent, type) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var icon;
  var title;
  switch (type) {
  case 'furnace':
    icon = 'fire';
    title = 'Furnace';
    break;
  case 'uv_lamp':
    icon = 'wb_incandescent';
    title = 'UV Lamp';
    break;
  case 'humidifier':
    icon = 'water_percent';
    title = 'Humidifier';
    break;
  case 'dehumidifier':
    icon = 'format_color_reset';
    title = 'Dehumidifier';
    break;
  case 'ventilator':
    icon = 'toys';
    title = 'Ventilator';
    break;
  }

  var title_container = $.createElement('div')
    .style({
      'display': 'inline-flex',
      'align-items': 'center'
    });
  parent.appendChild(title_container);

  (new beestat.component.icon(icon)
    .set_size(24)
  ).render(title_container);

  title_container.appendChild($.createElement('span')
    .innerHTML(title)
    .style('margin-left', beestat.style.size.gutter / 4));

  var outer_container = $.createElement('div')
    .style({
      'background': beestat.style.color.gray.light,
      'padding': (beestat.style.size.gutter / 2),
      'margin-bottom': beestat.style.size.gutter,
      'border-radius': beestat.style.size.border_radius
    });
  parent.appendChild(outer_container);

  var inner_container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  outer_container.appendChild(inner_container);

  var last_changed = moment(thermostat.filters[type].last_changed);

  var runtime_hours = Math.round(thermostat.filters[type].runtime / 3600);

  var replace_in;
  if (thermostat.filters[type].life_units === 'month') {
    var replace_on = moment(thermostat.filters[type].last_changed)
      .add(thermostat.filters[type].life, thermostat.filters[type].life_units);
    replace_in = replace_on.diff(moment(), 'days');

    if (replace_in < 0) {
      replace_in = Math.abs(replace_in) + 'd overdue';
    } else if (replace_in === 0) {
      replace_in = 'Now';
    } else if (replace_in < 35) {
      replace_in += 'd';
    } else {
      var duration = moment.duration(replace_in, 'days');
      replace_in = Math.floor(duration.asMonths()) +
        'mo ' +
        duration.get('days') +
        'd';
    }
  } else if (thermostat.filters[type].life_units === 'hour') {
    replace_in = thermostat.filters[type].life - runtime_hours;

    if (replace_in < 0) {
      replace_in = Math.abs(replace_in) + 'h overdue';
    } else if (replace_in === 0) {
      replace_in = 'Now';
    } else {
      replace_in += 'h';
    }
  } else {
    throw new Error('Unsupported thermostat filter life units.');
  }

  var lifespan;
  lifespan = thermostat.filters[type].life;
  if (thermostat.filters[type].life_units === 'hour') {
    lifespan += ' runtime';
  }
  lifespan += ' ' + thermostat.filters[type].life_units;
  if (thermostat.filters[type].life > 1) {
    lifespan += 's';
  }

  var fields = [
    {
      'name': 'Last Changed',
      'value': last_changed.format('ddd, MMM D, YYYY')
    },
    {
      'name': 'Lifespan',
      'value': lifespan
    },
    {
      'name': 'Replace In',
      'value': replace_in
    },
    {
      'name': 'Runtime',
      'value': runtime_hours + 'h'
    }
  ];

  fields.forEach(function(field) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    inner_container.appendChild(div);

    div.appendChild($.createElement('div')
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'margin-bottom': (beestat.style.size.gutter / 4)
      })
      .innerHTML(field.name));
    div.appendChild($.createElement('div').innerHTML(field.value));
  });
};

beestat.component.modal.filter_info.prototype.get_title_ = function() {
  return 'Filter Info';
};
