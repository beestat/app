/**
 * Simple global event dispatcher. Anything can use this to dispatch events by
 * calling beestat.dispatcher.dispatchEvent('{{event_name}}') which anything
 * else can be listening for.
 */
beestat.dispatcher_ = function() {
  // Class only exists so it can extend rocket.EventTarget.
};
beestat.extend(beestat.dispatcher_, rocket.EventTarget);
beestat.dispatcher = new beestat.dispatcher_();

/**
 * Do the normal event listener stuff. Extends the rocket version just a bit
 * to allow passing multiple event types at once for brevity.
 *
 * @param {string|array} type The event type or an array of event types.
 * @param {Function} listener Event Listener.
 */
beestat.dispatcher_.prototype.addEventListener = function(type, listener) {
  if (typeof type === 'object') {
    for (var i = 0; i < type.length; i++) {
      rocket.EventTarget.prototype.addEventListener.apply(this, [type[i], listener]);
    }
  } else {
    rocket.EventTarget.prototype.addEventListener.apply(this, arguments);
  }
  return this;
};
