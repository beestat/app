/**
 * Change thermostat
 */
beestat.component.modal.change_thermostat = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.change_thermostat, beestat.component.modal);

beestat.component.modal.change_thermostat.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  var sorted_thermostats = $.values(beestat.cache.thermostat)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  sorted_thermostats.forEach(function(thermostat) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    container.appendChild(div);

    self.decorate_thermostat_(div, thermostat.thermostat_id);
  });
};

beestat.component.modal.change_thermostat.prototype.decorate_thermostat_ = function(parent, thermostat_id) {
  var thermostat = beestat.cache.thermostat[thermostat_id];

  var container_height = 60;
  var gutter = beestat.style.size.gutter / 2;
  var thermostat_height = container_height - (gutter * 2);

  var container = $.createElement('div')
    .style({
      'height': container_height,
      'border-radius': container_height,
      'padding-right': (beestat.style.size.gutter / 2),
      'transition': 'background 200ms ease',
      'user-select': 'none'
    });

  if (thermostat_id == beestat.cache.thermostat[beestat.setting('thermostat_id')].thermostat_id) {
    container.style({
      'background': '#4b6584',
      'color': '#fff'
    });
  } else {
    container.style({
      'cursor': 'pointer'
    });

    container
      .addEventListener('mouseover', function() {
        container.style('background', beestat.style.color.gray.base);
      })
      .addEventListener('mouseout', function() {
        container.style('background', '');
      })
      .addEventListener('click', function() {
        container.removeEventListener();
        beestat.setting('thermostat_id', thermostat_id, function() {
          window.location.reload();
        });
      });
  }

  parent.appendChild(container);

  var temperature = beestat.temperature({
    'temperature': thermostat.temperature,
    'round': 0
  });

  var left = $.createElement('div')
    .style({
      'background': beestat.get_thermostat_color(thermostat_id),
      'font-weight': beestat.style.font_weight.light,
      'border-radius': '50%',
      'width': thermostat_height,
      'height': thermostat_height,
      'line-height': thermostat_height,
      'color': '#fff',
      'font-size': '20px',
      'text-align': 'center',
      'float': 'left',
      'margin': gutter
    })
    .innerHTML(temperature);
  container.appendChild(left);

  var right = $.createElement('div')
    .style({
      'line-height': container_height,
      'font-weight': beestat.style.font_weight.bold,
      'white-space': 'nowrap',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis'
    })
    .innerHTML(thermostat.name);
  container.appendChild(right);
};

beestat.component.modal.change_thermostat.prototype.get_title_ = function() {
  return 'Change Thermostat';
};
