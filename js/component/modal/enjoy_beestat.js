/**
 * Options for hiding the contribute reminder.
 */
beestat.component.modal.enjoy_beestat = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.enjoy_beestat, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.enjoy_beestat.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Beestat is completely free to use and does not run ads or sell your data. If you want to help, <strong>consider supporting the project</strong>. Among other benefits, it will hide this banner permanently.'));
  parent.appendChild($.createElement('p').innerHTML('If you prefer not to give, you can hide this banner. Please keep using and enjoying beestat! :)'));
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.enjoy_beestat.prototype.get_title_ = function() {
  return 'Enjoy beestat?';
};

/**
 * Hide the contribute reminder for some amount of time.
 *
 * @param {number} amount How long.
 * @param {string} unit The unit (day, month, etc).
 */
beestat.component.modal.enjoy_beestat.prototype.hide_contribute_reminder_ = function(amount, unit) {
  beestat.setting(
    'contribute_reminder_hide_until',
    moment().utc()
      .add(amount, unit)
      .format('YYYY-MM-DD HH:mm:ss')
  );
};

/**
 * Get the buttons on the modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.enjoy_beestat.prototype.get_buttons_ = function() {
  var self = this;

  var hide = new beestat.component.tile()
    .set_background_color('#fff')
    .set_shadow(false)
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.bluegray.base)
    .set_text('Hide for one month')
    .addEventListener('click', function() {
      self.hide_contribute_reminder_(1, 'month');
      self.dispose();
    });

  var link = new beestat.component.tile()
    .set_text('Support beestat')
    .set_icon('heart')
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .addEventListener('click', function() {
      new beestat.layer.contribute().render();
    });

  return [
    hide,
    link
  ];
};
