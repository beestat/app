/**
 * Header component for all of the layers.
 *
 * @param {string} active_layer The currently active layer.
 */
beestat.component.header = function(active_layer) {
  const self = this;

  this.active_layer_ = active_layer;

  beestat.dispatcher.addEventListener([
    'view_announcements',
    'cache.user'
  ], function() {
    self.rerender();
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.header, beestat.component);

beestat.component.header.prototype.rerender_on_resize_ = true;

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.header.prototype.decorate_ = function(parent) {
  // Define base widths for every part of the header at different sizes.
  const switcher_width = this.get_switcher_width_();
  this.dimensions_ = {
    'large': {
      'logo': 160,
      'navigation': 565,
      'switcher': switcher_width,
      'menu': 50,
      'right_margin': 16
    },
    'medium': {
      'logo': 160,
      'navigation': 225,
      'switcher': switcher_width,
      'menu': 50,
      'right_margin': 16
    },
    'small': {
      'logo': 55,
      'navigation': 225,
      'switcher': switcher_width,
      'menu': 50,
      'right_margin': 16
    }
  };

  /**
   * Figure out which configuration will fit, preferring the largest first
   * with the switcher, then without the switcher. Same pattern as we get
   * smaller.
   */
  if (
    window.innerWidth >= (
      this.dimensions_.large.logo +
      this.dimensions_.large.navigation +
      this.dimensions_.large.switcher +
      this.dimensions_.large.menu +
      this.dimensions_.large.right_margin
    )
  ) {
    this.dimension_ = 'large';
    this.switcher_enabled_ = true;
  } else if (
    window.innerWidth >= (
      this.dimensions_.large.logo +
      this.dimensions_.large.navigation +
      this.dimensions_.large.menu +
      this.dimensions_.large.right_margin
    )
  ) {
    this.dimension_ = 'large';
    this.switcher_enabled_ = false;
  } else if (
    window.innerWidth >= (
      this.dimensions_.medium.logo +
      this.dimensions_.medium.navigation +
      this.dimensions_.medium.switcher +
      this.dimensions_.medium.menu +
      this.dimensions_.medium.right_margin
    )
  ) {
    this.dimension_ = 'medium';
    this.switcher_enabled_ = true;
  } else if (
    window.innerWidth >= (
      this.dimensions_.medium.logo +
      this.dimensions_.medium.navigation +
      this.dimensions_.medium.menu +
      this.dimensions_.medium.right_margin
    )
  ) {
    this.dimension_ = 'medium';
    this.switcher_enabled_ = false;
  } else if (
    window.innerWidth >= (
      this.dimensions_.small.logo +
      this.dimensions_.small.navigation +
      this.dimensions_.small.switcher +
      this.dimensions_.small.menu +
      this.dimensions_.small.right_margin
    )
  ) {
    this.dimension_ = 'small';
    this.switcher_enabled_ = true;
  } else if (
    window.innerWidth >= (
      this.dimensions_.small.logo +
      this.dimensions_.small.navigation +
      this.dimensions_.small.menu +
      this.dimensions_.small.right_margin
    )
  ) {
    this.dimension_ = 'small';
    this.switcher_enabled_ = false;
  } else {
    this.dimension_ = 'small';
    this.switcher_enabled_ = false;
  }

  // Decorate all the parts into a flex row.
  const row = $.createElement('div').style({
    'display': 'flex',
    'align-items': 'center',
    'flex-grow': '1',
    'margin': '-' + (beestat.style.size.gutter / 2) + 'px 0 ' + (beestat.style.size.gutter / 4) + 'px -' + beestat.style.size.gutter + 'px'
  });

  this.decorate_logo_(row);
  this.decorate_navigation_(row);
  if (this.switcher_enabled_ === true) {
    this.decorate_switcher_(row);
  }
  this.decorate_menu_(row);

  parent.appendChild(row);
};

/**
 * Decorate the logo.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.header.prototype.decorate_logo_ = function(parent) {
  const column = $.createElement('div')
    .style({
      'flex': '0 0 ' + this.dimensions_[this.dimension_].logo + 'px',
      'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px'
    });

  if (this.dimension_ === 'medium' || this.dimension_ === 'large') {
    column.style({
      'margin': '8px 0 4px 0'
    });
    (new beestat.component.logo(32)).render(column);
  } else {
    // column.style({'flex': '0 0 ' + dimensions[dimension].logo + 'px'});
    const img = $.createElement('img')
      .setAttribute('src', '/favicon.png')
      .style({
        'width': '32px',
        'height': '32px',
        'margin-top': '11px',
        'margin-bottom': '6px'
      });
    column.appendChild(img);
  }

  parent.appendChild(column);
};

/**
 * Decorate the navigation buttons.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.header.prototype.decorate_navigation_ = function(parent) {
  const self = this;

  const pages = [
    {
      'layer': 'detail',
      'text': 'Detail',
      'icon': 'eye_circle'
    },
    {
      'layer': 'analyze',
      'text': 'Analyze',
      'icon': 'home_search'
    },
    {
      'layer': 'visualize',
      'text': 'Visualize',
      'icon': 'floor_plan'
    },
    {
      'layer': 'compare',
      'text': 'Compare',
      'icon': 'earth'
    },
    {
      'layer': 'air_quality',
      'text': 'Air Quality',
      'icon': 'weather_windy'
    }
  ];

  const column = $.createElement('div').style({
    'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px'
  });

  // If the swithcer is enabled, that takes up extra space. If not, this does.
  if (this.switcher_enabled_ === true) {
    column.style({
      'flex': '0 0 ' + this.dimensions_[this.dimension_].navigation + 'px'
    });
  } else {
    column.style({
      'flex': '1'
    });
  }

  const tile_group = new beestat.component.tile_group();
  pages.forEach(function(page) {
    const button = new beestat.component.tile()
      .set_icon(page.icon)
      .set_shadow(false)
      .set_text_color(beestat.style.color.bluegray.dark);

    if (self.dimension_ === 'large') {
      button.set_text(page.text);
    }

    if (self.active_layer_ === page.layer) {
      button
        .set_background_color('#fff')
        .set_text_color(beestat.style.color.bluegray.dark);
    } else {
      button
        .set_text_color('#fff')
        .set_background_hover_color('#fff')
        .set_text_hover_color(beestat.style.color.bluegray.dark);

      button.addEventListener('click', function() {
        (new beestat.layer[page.layer]()).render();
      });
    }

    tile_group.add_tile(button);
  });

  tile_group.render(column);

  parent.appendChild(column);
};

/**
 * Decorate the thermostat switcher.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.header.prototype.decorate_switcher_ = function(parent) {
  const column = $.createElement('div').style({
    'flex': '1',
    'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px',
    'text-align': 'right'
  });

  const change_thermostat_tile_group = new beestat.component.tile_group();

  const sorted_thermostats = $.values(beestat.cache.thermostat)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  sorted_thermostats.forEach(function(thermostat) {
    if (thermostat.thermostat_id !== beestat.setting('thermostat_id')) {
      const change_thermostat_tile = new beestat.component.tile.thermostat.switcher(thermostat.thermostat_id)
        .set_size('medium')
        .set_text_color('#fff')
        .set_background_color(beestat.style.color.bluegray.base)
        .set_background_hover_color('#fff')
        .set_text_hover_color(beestat.style.color.bluegray.dark)
        .addEventListener('click', function() {
          beestat.setting('thermostat_id', thermostat.thermostat_id, function() {
            window.location.reload();
          });
        });

      change_thermostat_tile_group.add_tile(change_thermostat_tile);
    }
  });

  change_thermostat_tile_group.render(column);

  parent.appendChild(column);
};

/**
 * Get the width of the thermostat switcher box. This could change due to any
 * number of factors, but it should more or less work.
 *
 * @return {number} Width in pixels.
 */
beestat.component.header.prototype.get_switcher_width_ = function() {
  let width = 0;

  const sorted_thermostats = $.values(beestat.cache.thermostat)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  sorted_thermostats.forEach(function(thermostat) {
    if (thermostat.thermostat_id !== beestat.setting('thermostat_id')) {
      const change_thermostat_tile = new beestat.component.tile.thermostat.switcher(
        thermostat.thermostat_id
      );
      const text_dimensions = beestat.text_dimensions(
        change_thermostat_tile.get_text_(),
        13,
        300
      );

      width += text_dimensions.width;

      // Left/right padding on the button 8+8=16
      width += 16;

      // Left margin between buttons
      width += 8;
    }
  });

  // Left padding on the column
  width += 16;

  return width;
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.header.prototype.decorate_menu_ = function(parent) {
  // Menu
  const last_read_announcement_id = beestat.setting('last_read_announcement_id');
  const unread_announcement_count = Object.keys(beestat.cache.announcement)
    .filter(function(announcement_id) {
      return announcement_id > last_read_announcement_id;
    }).length;

  const column = $.createElement('div').style({
    'flex': '0 0 ' + this.dimensions_[this.dimension_].menu + 'px',
    'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px',
    'text-align': 'right'
  });

  const menu = new beestat.component.menu();
  if (unread_announcement_count > 0) {
    menu
      .set_bubble_text(unread_announcement_count)
      .set_bubble_color(beestat.style.color.red.base);
  }
  menu.render(column);

  if (Object.keys(beestat.cache.ecobee_thermostat).length > 1) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Switch Thermostat')
      .set_icon('swap_horizontal')
      .set_callback(function() {
        (new beestat.component.modal.change_thermostat()).render();
      }));
  }

  if (window.is_demo === false) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Support beestat')
      .set_icon('heart')
      .set_callback(function() {
        new beestat.layer.contribute().render();
      }));
  }

  const announcements_menu_item = new beestat.component.menu_item()
    .set_text('Announcements')
    .set_icon('bullhorn')
    .set_callback(function() {
      (new beestat.component.modal.announcements()).render();
    });

  if (unread_announcement_count > 0) {
    announcements_menu_item
      .set_bubble_text(unread_announcement_count)
      .set_bubble_color(beestat.style.color.red.base);
  }
  menu.add_menu_item(announcements_menu_item);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Data')
    .set_icon('download')
    .set_callback(function() {
      (new beestat.component.modal.download_data()).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Settings')
    .set_icon('cog')
    .set_callback(function() {
      (new beestat.layer.settings()).render();
    }));

  if (beestat.platform() === 'ios' || beestat.platform() === 'android') {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Open Ecobee App')
      .set_icon('open_in_app')
      .set_callback(function() {
        window.location.replace('ecobee://beestat');
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Log Out')
    .set_icon('exit_to_app')
    .set_callback(function() {
      window.location.replace(
        window.location.href +
        'api/?resource=user&method=log_out&arguments={}&api_key=' +
        window.beestat_api_key_local
      );
    }));

  parent.appendChild(column);
};

