/**
 * Top-level namespace.
 */
var beestat = {};

beestat.ecobee_thermostat_models = {
  'apolloEms': 'ecobee4 EMS',
  'apolloSmart': 'ecobee4',
  'athenaEms': 'ecobee3 EMS',
  'athenaSmart': 'ecobee3',
  'corSmart': 'Côr',
  'idtEms': 'Smart EMS',
  'idtSmart': 'Smart',
  'nikeEms': 'ecobee3 lite EMS',
  'nikeSmart': 'ecobee3 lite',
  'siEms': 'Smart Si EMS',
  'siSmart': 'Smart Si',
  'vulcanSmart': 'Smart Thermostat',
  'aresSmart': 'Smart Thermostat Premium',
  'artemisSmart': 'Smart Thermostat Enhanced',
  'attisPro': 'Smart Thermostat Lite',
  'attisRetail': 'Smart Thermostat Essential'
};

/**
 * Get a default value for an argument if it is not currently set.
 *
 * @param {mixed} argument The argument to check.
 * @param {mixed} default_value The value to use if argument is undefined.
 *
 * @return {mixed}
 */
beestat.default_value = function(argument, default_value) {
  return (argument === undefined) ? default_value : argument;
};

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service_worker.js').then(function(registration) {

      /*
       * Registration was successful
       * console.log('ServiceWorker registration successful with scope: ', registration.scope);
       */
    }, function(error) {

      /*
       * registration failed :(
       * console.log('ServiceWorker registration failed: ', err);
       */
    });
  });
}

/**
 * Dispatch the resize event every now and then.
 */
window.addEventListener('resize', rocket.throttle(100, function() {
  beestat.dispatcher.dispatchEvent('resize');
}));

// First run
var $ = rocket.extend(rocket.$, rocket);
$.ready(function() {
  moment.suppressDeprecationWarnings = true;
  if (window.environment === 'live') {
    Sentry.init({
      'release': window.commit,
      'dsn': 'https://af9fd2cf6cda49dcb93dcaf02fe39fc6@sentry.io/3736982',
      'ignoreErrors': ['window.webkit.messageHandlers'],
      'integrations': [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      'replaysSessionSampleRate': 0.01, // 1%
      'replaysOnErrorSampleRate': 1.0, // 100%
    });
  }
  (new beestat.layer.load()).render();
});
