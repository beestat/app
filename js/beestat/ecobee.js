beestat.ecobee = {};

/**
 * Check to see if ecobee is down. If so, render the footer component.
 */
beestat.ecobee.notify_if_down = function() {
  // Turning this off to review and/or deprecate.
  return;

  if (
    beestat.cache !== undefined &&
    beestat.cache.thermostat !== undefined &&
    beestat.user.get() !== undefined
  ) {
    var last_update = moment.utc(beestat.user.get().sync_status.thermostat);
    var down = last_update.isBefore(moment().subtract(15, 'minutes'));

    if (beestat.ecobee.down_notification_ === undefined) {
      beestat.ecobee.down_notification_ = new beestat.component.down_notification();
    }

    if (
      down === true &&
      window.is_demo === false
    ) {
      beestat.ecobee.down_notification_.render($('body'));
    } else {
      beestat.ecobee.down_notification_.dispose();
    }
  }
};
