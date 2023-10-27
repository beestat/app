/**
 * Banner asking people to rate and review the app.
 */
beestat.component.card.rate_app_reminder = function() {
  const self = this;

  beestat.dispatcher.addEventListener(
    'setting.ui.rate_app_reminder_hide_until',
    function() {
      self.rerender();
    }
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.rate_app_reminder, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.rate_app_reminder.prototype.decorate_contents_ = function(parent) {
  const self = this;

  // Don't render anything if the user dismissed this card.
  if (beestat.component.card.rate_app_reminder.should_show() === false) {
    window.setTimeout(function() {
      self.dispose();
    }, 0);
    return;
  }

  parent.style('background', beestat.style.color.bluegray.base);

  let icon;
  let store_name;
  let store_url;

  if (beestat.platform() === 'ios') {
    icon = 'apple';
    store_name = 'the App Store';
    store_url = 'https://apps.apple.com/us/app/beestat/id6469190206?platform=ipad';
  } else if (beestat.platform() === 'android') {
    icon = 'google_play';
    store_name = 'Google Play';
    store_url = 'https://play.google.com/store/apps/details?id=io.beestat';
  } else {
    throw new Error('Unsupported platform.');
  }

  new beestat.component.tile()
    .set_icon(icon)
    .set_size('large')
    .set_text(
      'Rate now on ' + store_name
    )
    .set_background_color(beestat.style.color.green.dark)
    .set_background_hover_color(beestat.style.color.green.light)
    .addEventListener('click', function() {
      window.open(store_url);
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.rate_app_reminder.prototype.get_title_ = function() {
  return 'Like the app? Leave a rating or review!';
};

/**
 * Decorate the close button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.rate_app_reminder.prototype.decorate_top_right_ = function(parent) {
  new beestat.component.tile()
    .set_type('pill')
    .set_shadow(false)
    .set_icon('close')
    .set_text_color('#fff')
    .set_background_hover_color(beestat.style.color.bluegray.light)
    .addEventListener('click', function() {
      beestat.setting(
        'ui.rate_app_reminder_hide_until',
        moment().utc()
          .add(1000, 'year')
          .format('YYYY-MM-DD HH:mm:ss')
      );
    })
    .render(parent);
};

/**
 * Determine whether or not this card should be shown.
 *
 * @return {boolean} Whether or not to show the card.
 */
beestat.component.card.rate_app_reminder.should_show = function() {
  return (
    beestat.user.get().user_id === 1 &&
    (
      beestat.platform() === 'android' ||
      beestat.platform() === 'ios'
    ) &&
    beestat.setting('meta.opens.' + beestat.platform()) > 10 &&
    (
      beestat.setting('ui.rate_app_reminder_hide_until') === undefined ||
      moment.utc(beestat.setting('ui.rate_app_reminder_hide_until')).isBefore(moment.utc())
    )
  );
};
