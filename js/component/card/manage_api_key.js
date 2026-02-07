/**
 * Manage API Key card. Allows users to create, regenerate, and delete their
 * API keys. Listens to cache.session changes to automatically update the UI.
 */
beestat.component.card.manage_api_key = function() {
  const self = this;

  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.session'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.manage_api_key, beestat.component.card);

/**
 * Decorate contents.
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.card.manage_api_key.prototype.decorate_contents_ = function(parent) {
  // Introduction text
  var intro = document.createElement('p');
  intro.innerText = 'API keys allow you to access your beestat data programmatically. Keep your API key secure and do not share it publicly.';
  parent.appendChild(intro);

  // Find API session in cache
  var api_session = null;
  var sessions = $.values(beestat.cache.session);
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].api_user_id !== null) {
      api_session = sessions[i];
      break;
    }
  }

  if (api_session === null) {
    this.render_no_key_state_(parent);
  } else {
    this.render_existing_key_state_(parent, api_session);
  }
};

/**
 * Render state when no API key exists.
 *
 * @param {Element} parent Parent element
 */
beestat.component.card.manage_api_key.prototype.render_no_key_state_ = function(parent) {
  const self = this;

  const button_container = document.createElement('div');
  parent.appendChild(button_container);

  const tile_create = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Create API Key')
    .addEventListener('click', function() {
      self.show_loading_();

      new beestat.api()
        .add_call(
          'user',
          'create_api_key',
          {},
          'session'
        )
        .add_call(
          'user',
          'session_read_id',
          {},
          'session_read_id'
        )
        .set_callback(function(response) {
          beestat.cache.set('session', response.session_read_id);
          self.hide_loading_();
        })
        .send();
    })
    .render($(button_container));
};

/**
 * Render state when API key exists. Displays the API key (session_key),
 * created timestamp, copy button, and management buttons (regenerate/delete).
 *
 * @param {Element} parent Parent element
 * @param {Object} session Session row from database (session_key is the API key)
 */
beestat.component.card.manage_api_key.prototype.render_existing_key_state_ = function(parent, session) {
  const self = this;

  parent.appendChild(
    $.createElement('p')
      .style('font-weight', '500')
      .innerText('Your API Key')
  );

  // API Key display with copy functionality
  const key_container = document.createElement('div');
  key_container.style.cssText = 'display: flex; flex-direction: row; align-items: center; gap: ' + beestat.style.size.gutter + 'px; margin-bottom: ' + beestat.style.size.gutter + 'px; padding: ' + (beestat.style.size.gutter / 2) + 'px; background-color: ' + beestat.style.color.bluegray.light + '; border-radius: ' + beestat.style.size.border_radius + 'px; font-family: monospace; font-size: 14px;';

  const key_text = document.createElement('span');
  key_text.innerText = session.session_key;
  key_text.style.flex = '1';
  key_container.appendChild(key_text);

  const copy_button_container = document.createElement('div');
  key_container.appendChild(copy_button_container);

  const copy_button = new beestat.component.tile()
    .set_icon('content_copy')
    .set_shadow(false)
    .set_size(24)
    .set_background_color('transparent')
    .set_background_hover_color(beestat.style.color.bluegray.base)
    .set_text_color(beestat.style.color.gray.base)
    .addEventListener('click', function() {
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(session.session_key).then(function() {
          // Show temporary success feedback
          copy_button.set_icon('check');
          setTimeout(function() {
            copy_button.set_icon('content_copy');
          }, 2000);
        });
      }
    })
    .render($(copy_button_container));

  parent.appendChild(key_container);

  // Created date
  var created_text = document.createElement('p');
  created_text.style.fontSize = '12px';
  created_text.style.color = beestat.style.color.gray.base;
  created_text.innerText = 'Created: ' + moment.utc(session.created_at).local().format('M/D/YYYY h:mm A');
  parent.appendChild(created_text);

  // Management buttons
  parent.appendChild(
    $.createElement('p')
      .style({
        'font-weight': '500',
        'margin-top': (beestat.style.size.gutter * 2) + 'px'
      })
      .innerText('Manage')
  );

  const button_container = document.createElement('div');
  button_container.style.cssText = 'display: flex; flex-direction: row; gap: ' + beestat.style.size.gutter + 'px;';
  parent.appendChild(button_container);

  // Recycle button
  const recycle_container = document.createElement('div');
  button_container.appendChild(recycle_container);

  const tile_recycle = new beestat.component.tile()
    .set_background_color(beestat.style.color.blue.base)
    .set_background_hover_color(beestat.style.color.blue.light)
    .set_text_color('#fff')
    .set_text('Regenerate Key')
    .set_icon('refresh')
    .addEventListener('click', function() {
      if (confirm('Regenerating your API key will invalidate the current key. Any applications using the old key will stop working. Continue?')) {
        self.show_loading_();

        new beestat.api()
          .add_call(
            'user',
            'recycle_api_key',
            {},
            'session'
          )
          .add_call(
            'user',
            'session_read_id',
            {},
            'session_read_id'
          )
          .set_callback(function(response) {
            beestat.cache.set('session', response.session_read_id);
            self.hide_loading_();
          })
          .send();
      }
    })
    .render($(recycle_container));

  // Delete button
  const delete_container = document.createElement('div');
  button_container.appendChild(delete_container);

  const tile_delete = new beestat.component.tile()
    .set_background_color(beestat.style.color.red.base)
    .set_background_hover_color(beestat.style.color.red.light)
    .set_text_color('#fff')
    .set_text('Delete Key')
    .set_icon('trash_can')
    .addEventListener('click', function() {
      if (confirm('Are you sure you want to delete your API key? This cannot be undone.')) {
        self.show_loading_();

        new beestat.api()
          .add_call(
            'user',
            'delete_api_key',
            {},
            'delete'
          )
          .add_call(
            'user',
            'session_read_id',
            {},
            'session_read_id'
          )
          .set_callback(function(response) {
            beestat.cache.set('session', response.session_read_id);
            self.hide_loading_();
          })
          .send();
      }
    })
    .render($(delete_container));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.manage_api_key.prototype.get_title_ = function() {
  return 'Manage API Key';
};

/**
 * Decorate the top right.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.manage_api_key.prototype.decorate_top_right_ = function(parent) {
  var link = $.createElement('a')
    .setAttribute('href', 'https://api.beestat.io/doc')
    .setAttribute('target', '_blank')
    .innerText('API Documentation');
  parent.appendChild(link);
};
