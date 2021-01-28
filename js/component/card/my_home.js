/**
 * Home properties.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.my_home = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

  beestat.dispatcher.addEventListener('cache.thermostat', function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.my_home, beestat.component.card);

beestat.component.card.my_home.prototype.decorate_contents_ = function(parent) {
  this.decorate_system_type_(parent);
  this.decorate_region_(parent);
  this.decorate_property_(parent);
};

/**
 * Decorate the heating and cooling system types.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.my_home.prototype.decorate_system_type_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  (new beestat.component.title('System')).render(parent);

  const heat = beestat.thermostat.get_system_type(
    thermostat.thermostat_id,
    'heat'
  );
  const heat_auxiliary = beestat.thermostat.get_system_type(
    thermostat.thermostat_id,
    'heat_auxiliary'
  );
  const cool = beestat.thermostat.get_system_type(
    thermostat.thermostat_id,
    'cool'
  );

  var button_group = new beestat.component.button_group();
  button_group.add_button(new beestat.component.button()
    .set_type('pill')
    .set_background_color(beestat.series.compressor_heat_1.color)
    .set_text_color('#fff')
    .set_icon('fire')
    .set_text(heat.charAt(0).toUpperCase() + heat.slice(1)));
  button_group.add_button(new beestat.component.button()
    .set_type('pill')
    .set_background_color(beestat.series.auxiliary_heat_1.color)
    .set_text_color('#fff')
    .set_icon('fire')
    .set_text(heat_auxiliary.charAt(0).toUpperCase() + heat_auxiliary.slice(1)));
  button_group.add_button(new beestat.component.button()
    .set_type('pill')
    .set_background_color(beestat.series.compressor_cool_1.color)
    .set_text_color('#fff')
    .set_icon('snowflake')
    .set_text(cool.charAt(0).toUpperCase() + cool.slice(1)));

  button_group.render(parent);
};

/**
 * Decorate the geographical region.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.my_home.prototype.decorate_region_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];
  var address = beestat.cache.address[thermostat.address_id];

  (new beestat.component.title('Region')).render(parent);

  var region;
  if (
    address.normalized !== null &&
    address.normalized.components !== undefined
  ) {
    region =
      address.normalized.components.state_abbreviation ||
      address.normalized.components.locality ||
      '';

    if (region !== '') {
      region += ', ';
    }

    region += address.normalized.components.country_iso_3;
  } else {
    region = null;
  }

  var button_group = new beestat.component.button_group();
  if (region !== null) {
    var button = new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.green.base)
      .set_text_color('#fff')
      .set_icon('map_marker')
      .set_text(region);
    button_group.add_button(button);
  } else {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.gray.dark)
      .set_text_color('#fff')
      .set_icon('border_none_variant')
      .set_text('No Data'));
  }
  button_group.render(parent);
};

/**
 * Decorate the property characteristics.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.my_home.prototype.decorate_property_ = function(parent) {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];

  (new beestat.component.title('Property')).render(parent);

  var button_group = new beestat.component.button_group();

  if (thermostat.property.structure_type !== null) {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.purple.base)
      .set_text_color('#fff')
      .set_icon('home_floor_a')
      .set_text(thermostat.property.structure_type.charAt(0).toUpperCase() +
        thermostat.property.structure_type.slice(1)));
  }

  if (
    thermostat.property.stories !== null &&
    (
      thermostat.property.structure_type === 'detached' ||
      thermostat.property.structure_type === 'townhouse' ||
      thermostat.property.structure_type === 'semi-detached'
    )
  ) {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.purple.base)
      .set_text_color('#fff')
      .set_icon('layers')
      .set_text(thermostat.property.stories +
        (thermostat.property.stories === 1 ? ' Story' : ' Stories')));
  }

  if (thermostat.property.square_feet !== null) {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.purple.base)
      .set_text_color('#fff')
      .set_icon('view_quilt')
      .set_text(Number(thermostat.property.square_feet).toLocaleString() + ' sqft'));
  }

  if (thermostat.property.age !== null) {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.purple.base)
      .set_text_color('#fff')
      .set_icon('clock_outline')
      .set_text(thermostat.property.age + ' Years'));
  }

  if (button_group.get_buttons().length === 0) {
    button_group.add_button(new beestat.component.button()
      .set_type('pill')
      .set_background_color(beestat.style.color.gray.dark)
      .set_text_color('#fff')
      .set_icon('border_none_variant')
      .set_text('No Data'));
  }

  button_group.render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.my_home.prototype.get_title_ = function() {
  return 'My Home';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.my_home.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Change System Type')
    .set_icon('tune')
    .set_callback(function() {
      (new beestat.component.modal.change_system_type(self.thermostat_id_)).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/cc594772031e41a58ff38e04e66cf0ec');
    }));
};
