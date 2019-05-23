/**
 * Top-level namespace.
 */
var beestat = {};

beestat.cards = {};

beestat.ecobee_thermostat_models = {
  'apolloEms': 'apolloEms',
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
  'vulcanSmart': 'vulcanSmart'
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

/**
 * Get the climate for whatever climate_ref is specified.
 *
 * @param {string} climate_ref The ecobee climateRef
 *
 * @return {object} The climate
 */
beestat.get_climate = function(climate_ref) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  var climates = ecobee_thermostat.json_program.climates;

  for (var i = 0; i < climates.length; i++) {
    if (climates[i].climateRef === climate_ref) {
      return climates[i];
    }
  }
};

/**
 * Get the color a thermostat should be based on what equipment is running.
 *
 * @return {string}
 */
beestat.get_thermostat_color = function(thermostat_id) {
  var thermostat = beestat.cache.thermostat[thermostat_id];
  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  if (
    ecobee_thermostat.json_equipment_status.indexOf('compCool2') !== -1 ||
    ecobee_thermostat.json_equipment_status.indexOf('compCool1') !== -1
  ) {
    return beestat.style.color.blue.light;
  } else if (
    ecobee_thermostat.json_settings.hasHeatPump === true &&
    (
      ecobee_thermostat.json_equipment_status.indexOf('auxHeat3') !== -1 ||
      ecobee_thermostat.json_equipment_status.indexOf('auxHeat2') !== -1 ||
      ecobee_thermostat.json_equipment_status.indexOf('auxHeat1') !== -1 ||
      ecobee_thermostat.json_equipment_status.indexOf('auxHotWater') !== -1
    )
  ) {
    return beestat.style.color.red.base;
  } else if (
    (
      ecobee_thermostat.json_settings.hasHeatPump === false &&
      (
        ecobee_thermostat.json_equipment_status.indexOf('auxHeat3') !== -1 ||
        ecobee_thermostat.json_equipment_status.indexOf('auxHeat2') !== -1 ||
        ecobee_thermostat.json_equipment_status.indexOf('auxHeat1') !== -1 ||
        ecobee_thermostat.json_equipment_status.indexOf('compHotWater') !== -1 ||
        ecobee_thermostat.json_equipment_status.indexOf('auxHotWater') !== -1
      )
    ) ||
    (
      ecobee_thermostat.json_settings.hasHeatPump === true &&
      (
        ecobee_thermostat.json_equipment_status.indexOf('heatPump1') !== -1 ||
        ecobee_thermostat.json_equipment_status.indexOf('heatPump2') !== -1
      )
    )
  ) {
    return beestat.style.color.orange.base;
  }
  return beestat.style.color.bluegray.dark;
};

/**
 * Get the current user.
 *
 * @return {object}
 */
beestat.get_user = function() {
  var user_id = Object.keys(beestat.cache.user)[0];
  return beestat.cache.user[user_id];
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
    500,
    600
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
}));

/**
 * Whether or not the current user gets access to early release features.
 *
 * @return {boolean} Early access or not.
 */
beestat.has_early_access = function() {
  var user = beestat.get_user();
  return user.user_id === 1 ||
  (
    user.json_patreon_status !== null &&
    user.json_patreon_status.patron_status === 'active_patron' &&
    user.json_patreon_status.currently_entitled_amount_cents >= 500
  );
};

// First run
var $ = rocket.extend(rocket.$, rocket);
$.ready(function() {
  (new beestat.layer.load()).render();
});
