beestat.user = {};

/**
 * Determine whether or not the current user is an active Patron.
 *
 * @return {boolean}
 */
beestat.user.patreon_is_active = function() {
  const user = beestat.user.get();
  return (
    user.patreon_status !== null &&
    user.patreon_status.patron_status === 'active_patron'
  );
};

/**
 * Determine whether or not the current user is an active Stripe giver.
 *
 * @return {boolean}
 */
beestat.user.stripe_is_active = function() {
  const stripe_events = Object.values(beestat.cache.stripe_event);
  for (let i = 0; i < stripe_events.length; i++) {
    if (
      stripe_events[i].type === 'invoice.paid' &&
      moment.unix(stripe_events[i].data.period_end).isAfter(moment()) === false
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Determine whether or not the current user is an active contributor.
 *
 * @return {boolean}
 */
beestat.user.contribution_is_active = function() {
  return beestat.user.patreon_is_active() === true ||
    beestat.user.stripe_is_active() === true;
};

/**
 * Is the user connected to Patreon.
 *
 * @return {boolean} true if yes, false if no.
 */
beestat.user.patreon_is_connected = function() {
  return beestat.user.get().patreon_status !== null;
};

/**
 * Whether or not the current user gets access to early release features.
 *
 * @return {boolean}
 */
beestat.user.has_early_access = function() {
  const user = beestat.user.get();
  return user.user_id === 1 ||
    beestat.user.contribution_is_active() === true;
};

/**
 * Get the current user.
 *
 * @return {object} The current user.
 */
beestat.user.get = function() {
  const user_id = Object.keys(beestat.cache.user)[0];
  return beestat.cache.user[user_id];
};
