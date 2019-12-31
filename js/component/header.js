/**
 * Header component for all of the layers.
 *
 * @param {string} active_layer The currently active layer.
 */
beestat.component.header = function(active_layer) {
  var self = this;

  this.active_layer_ = active_layer;

  beestat.dispatcher.addEventListener('view_announcements', function() {
    self.rerender();
  });

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.header, beestat.component);

beestat.component.header.prototype.rerender_on_breakpoint_ = true;

beestat.component.header.prototype.decorate_ = function(parent) {
  var self = this;

  var pages;
  pages = [
    {
      'layer': 'dashboard',
      'text': 'Dashboard',
      'icon': 'gauge'
    },
    {
      'layer': 'home_comparisons',
      'text': 'Home Comparisons',
      'icon': 'home'
    }
  ];

  var gutter = beestat.style.size.gutter;

  var row = $.createElement('div').style({
    'display': 'flex',
    'align-items': 'center',
    'flex-grow': '1',
    'margin': '-' + gutter + 'px 0 0 -' + gutter + 'px'
  });
  parent.appendChild(row);

  // Logo
  var column_logo = $.createElement('div').style({'padding': gutter + 'px 0 0 ' + gutter + 'px'});
  row.appendChild(column_logo);
  if (beestat.width > 600) {
    column_logo.style({'flex': '0 0 160px'});
    (new beestat.component.logo()).render(column_logo);
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

  var button_group = new beestat.component.button_group();
  pages.forEach(function(page) {
    var button = new beestat.component.button()
      .set_icon(page.icon)
      .set_text_color(beestat.style.color.bluegray.dark);

    if (beestat.width > 500) {
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

    button_group.add_button(button);
  });

  button_group.render(column_navigation);

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

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Link Patreon')
    .set_icon('patreon')
    .set_callback(function() {
      (new beestat.component.modal.enjoy_beestat()).render();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Log Out')
    .set_icon('exit_to_app')
    .set_callback(function() {
      new beestat.api()
        .set_callback(function() {
          window.location.href = window.location.href.replace('app.', '');
        })
        .add_call(
          'user',
          'log_out',
          {'all': false}
        )
        .send();
    }));
};
