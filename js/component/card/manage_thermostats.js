/**
 * Setting
 */
beestat.component.card.manage_thermostats = function() {
  const self = this;

  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.ecobee_thermostat'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.manage_thermostats, beestat.component.card);

/**
 * Decorate contents.
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.card.manage_thermostats.prototype.decorate_contents_ = function(parent) {
  const self = this;

  var p = document.createElement('p');
  p.innerText = 'Thermostats directly connected to your ecobee account are automatically added and synced. In some cases, shared thermostats cannot be automatically detected. Add them here.';
  parent.appendChild(p);

  // Existing
  (new beestat.component.title('Existing Thermostats')).render(parent);

  var sorted_ecobee_thermostats = $.values(beestat.cache.ecobee_thermostat)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  const table = document.createElement('table');
  sorted_ecobee_thermostats.forEach(function(ecobee_thermostat) {
    const tr = document.createElement('tr');

    const td_name = document.createElement('td');
    td_name.style.paddingRight = `${beestat.style.size.gutter}px`;
    const td_identifier = document.createElement('td');
    const td_delete = document.createElement('td');

    td_name.innerText = ecobee_thermostat.name || '(Sync Queued)';
    td_identifier.innerText = ecobee_thermostat.identifier;

    const tile_delete = new beestat.component.tile()
      .set_icon('trash_can')
      .set_shadow(false)
      .set_text_color(beestat.style.color.red.base)
      .render($(td_delete));

    tile_delete.addEventListener('click', function() {
      self.show_loading_();

      new beestat.api()
        .add_call(
          'ecobee_thermostat',
          'update',
          {
            'attributes': {
              'ecobee_thermostat_id': ecobee_thermostat.ecobee_thermostat_id,
              'inactive': 1
            }
          },
          'delete'
        )
        .add_call(
          'ecobee_thermostat',
          'read_id',
          {
            'attributes': {
              'inactive': 0
            }
          },
          'read_id'
        )
        .set_callback(function(response) {
          beestat.cache.set('ecobee_thermostat', response.read_id);
        })
        .send();
      })

    tr.appendChild(td_name);
    tr.appendChild(td_identifier);
    tr.appendChild(td_delete);

    table.appendChild(tr);
  });

  parent.appendChild(table);

  // New
  (new beestat.component.title('Add Thermostat')).render(parent);

  const container = document.createElement('div');
  parent.appendChild(container);

  Object.assign(container.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'grid-gap': `${beestat.style.size.gutter}px`,
  });

  const input_container = document.createElement('div');
  container.appendChild(input_container);

  const new_identifier = new beestat.component.input.text()
    .set_width(150)
    .set_maxlength(12)
    .set_inputmode('numeric')
    .set_placeholder('Serial #')
    .render($(input_container));

  const button_container = document.createElement('div');
  container.appendChild(button_container);

  const tile_add = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Add Thermostat')
    .addEventListener('click', function() {
      if (new_identifier.get_value()?.length === 12) {
        self.show_loading_();

        new beestat.api()
          .add_call(
            'ecobee_thermostat',
            'create',
            {
              'attributes': {
                'identifier': new_identifier.get_value()
              }
            },
            'create'
          )
          .add_call(
            'ecobee_thermostat',
            'read_id',
            {
              'attributes': {
                'inactive': 0
              }
            },
            'read_id'
          )
          .set_callback(function(response) {
            beestat.cache.set('ecobee_thermostat', response.read_id);
          })
          .send();
      }
    })
    .render($(button_container));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.manage_thermostats.prototype.get_title_ = function() {
  return 'Manage Thermostats';
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.manage_thermostats.prototype.decorate_top_right_ = function(parent) {
  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('TODO');
    }));
};
