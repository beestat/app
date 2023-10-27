/**
 * Determine what platform the app is being accessed from. Defaults to
 * "desktop" if "android" or "ios" are not specified in the browser query
 * string.
 *
 * @return {string} The platform.
 */
beestat.platform = function() {
  const platform = new URLSearchParams(window.location.search).get('platform');

  switch (platform) {
  case 'android':
  case 'ios':
    return platform;
  }

  return 'browser';
};
