/**
 * Ecobee is down!
 */
beestat.component.down_notification = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.down_notification, beestat.component);

beestat.component.down_notification.prototype.rerender_on_breakpoint_ = false;

/**
 * Decorate a floating banner at the bottom of the page.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.down_notification.prototype.decorate_ = function(parent) {
  var div = $.createElement('div');
  div.style({
    'position': 'fixed',
    'bottom': '0px',
    'left': '0px',
    'width': '100%',
    'text-align': 'center',
    'padding-left': beestat.style.size.gutter,
    'padding-right': beestat.style.size.gutter,
    'background': beestat.style.color.red.dark
  });

  var last_update = moment.utc(beestat.user.get().sync_status.thermostat).local()
    .format('h:m a');
  div.appendChild($.createElement('p').innerText('Ecobee seems to be down. Your data will update as soon as possible. Last update was at ' + last_update + '.'));

  parent.appendChild(div);
};
