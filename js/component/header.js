/**
 * Header component for all of the layers.
 *
 * @param {string} active_layer The currently active layer.
 */
beestat.component.header = function(active_layer) {
  var self = this;

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

beestat.component.header.prototype.rerender_on_breakpoint_ = true;

beestat.component.header.prototype.decorate_ = function(parent) {
  var self = this;

  var pages = [
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

  pages.push();

  var gutter = beestat.style.size.gutter;

  var row = $.createElement('div').style({
    'display': 'flex',
    'align-items': 'center',
    'flex-grow': '1',
    'margin': '-' + (gutter / 2) + 'px 0 ' + (gutter / 4) + 'px -' + gutter + 'px'
  });
  parent.appendChild(row);

  // Logo
  var column_logo = $.createElement('div').style({'padding': gutter + 'px 0 0 ' + gutter + 'px'});
  row.appendChild(column_logo);
  if (beestat.width > 600) {
    column_logo.style({
      'flex': '0 0 160px',
      'margin': '8px 0 4px 0'
    });
    (new beestat.component.logo(32)).render(column_logo);
  } else {
    column_logo.style({'flex': '0 0 32px'});
    var img = $.createElement('img')
      .setAttribute('src', '/favicon.png')
      .style({
        'width': '32px',
        'height': '32px',
        'margin-top': '11px',
        'margin-bottom': '6px'
      });
    column_logo.appendChild(img);
  }

  // Navigation
  var column_navigation = $.createElement('div').style({
    'flex': '1',
    'padding': gutter + 'px 0 0 ' + gutter + 'px'
  });
  row.appendChild(column_navigation);

  var tile_group = new beestat.component.tile_group();
  pages.forEach(function(page) {
    var button = new beestat.component.tile()
      .set_icon(page.icon)
      .set_shadow(false)
      .set_text_color(beestat.style.color.bluegray.dark);

    if (beestat.width > 850) {
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

  tile_group.render(column_navigation);

  // Menu

  var last_read_announcement_id = beestat.setting('last_read_announcement_id');
  var unread_announcement_count = Object.keys(beestat.cache.announcement)
    .filter(function(announcement_id) {
      return announcement_id > last_read_announcement_id;
    }).length;

  var column_menu = $.createElement('div').style({
    'flex': '0 0 50px',
    'padding': gutter + 'px 0 0 ' + gutter + 'px',
    'text-align': 'right'
  });
  row.appendChild(column_menu);
  var menu = new beestat.component.menu();
  if (unread_announcement_count > 0) {
    menu
      .set_bubble_text(unread_announcement_count)
      .set_bubble_color(beestat.style.color.red.base);
  }
  menu.render(column_menu);

  if (Object.keys(beestat.cache.ecobee_thermostat).length > 1) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Switch Thermostat')
      .set_icon('swap_horizontal')
      .set_callback(function() {
        (new beestat.component.modal.change_thermostat()).render();
      }));
  }

  var announcements_menu_item = new beestat.component.menu_item()
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

  if (window.is_demo === false) {
    if (beestat.user.patreon_is_connected() === false) {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Link Patreon')
        .set_icon('patreon')
        .set_callback(function() {
          (new beestat.component.modal.patreon_status()).render();
          window.open('../api/?resource=patreon&method=authorize&arguments={}&api_key=ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2');
        }));
    } else {
      menu.add_menu_item(new beestat.component.menu_item()
        .set_text('Patreon Status')
        .set_icon('patreon')
        .set_callback(function() {
          (new beestat.component.modal.patreon_status()).render();
        }));
    }
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Settings')
    .set_icon('cog')
    .set_callback(function() {
      (new beestat.layer.settings()).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Log Out')
    .set_icon('exit_to_app')
    .set_callback(function() {
      new beestat.api()
        .set_callback(function() {
          window.location.href = window.location.href.replace('app.', '');
        })
        .add_call('user', 'log_out')
        .send();
    }));
};
