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
  'vulcanSmart': 'SmartThermostat',
  'aresSmart': 'SmartThermostat Premium',
  'artemisSmart': 'SmartThermostat Enhanced'
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
 * Dispatch a breakpoint event every time a browser resize crosses one of the
 * breakpoints. Typically a component will use this event to rerender itself
 * when CSS breakpoints are not feasible or appropriate.
 */
beestat.width = window.innerWidth;
window.addEventListener('resize', rocket.throttle(100, function() {
  var breakpoints = [
    600,
    650,
    800,
    1000
  ];

  breakpoints.forEach(function(breakpoint) {
    if (
      (
        beestat.width > breakpoint &&
        window.innerWidth <= breakpoint
      ) ||
      (
        beestat.width < breakpoint &&
        window.innerWidth >= breakpoint
      )
    ) {
      beestat.width = window.innerWidth;
      beestat.dispatcher.dispatchEvent('breakpoint');
    }
  });

  beestat.dispatcher.dispatchEvent('resize');
}));

// First run
var $ = rocket.extend(rocket.$, rocket);
$.ready(function() {
  if (window.environment === 'live') {
    Sentry.init({
      'dsn': 'https://af9fd2cf6cda49dcb93dcaf02fe39fc6@sentry.io/3736982',
      'ignoreErrors': ['window.webkit.messageHandlers']
    });
  }
  (new beestat.layer.load()).render();
});
