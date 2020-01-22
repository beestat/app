beestat.user = {};

/**
 * Determine whether or not the current user is an active Patron.
 *
 * @return {boolean} true if yes, false if no.
 */
beestat.user.patreon_is_active = function() {
  var user = beestat.user.get();
  return (
    user.patreon_status !== null &&
    user.patreon_status.patron_status === 'active_patron'
  );
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
 * @return {boolean} Early access or not.
 */
beestat.user.has_early_access = function() {
  var user = beestat.user.get();
  return user.user_id === 1 ||
  (
    user.patreon_status !== null &&
    user.patreon_status.patron_status === 'active_patron' &&
    user.patreon_status.currently_entitled_amount_cents >= 500
  );
};

/**
 * Get the current user.
 *
 * @return {object} The current user.
 */
beestat.user.get = function() {
  var user_id = Object.keys(beestat.cache.user)[0];
  return beestat.cache.user[user_id];
};
