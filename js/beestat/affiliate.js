beestat.affiliate = {};

beestat.affiliate.links = {
  'bosch_glm20': {
    'USA': 'https://amzn.to/3P3z2Ea',
    'CAN': 'https://amzn.to/3RieCZx'
  },
  'ecobee_smart_thermostat_premium': {
    'USA': 'https://amzn.to/3A7vv3S',
    'CAN': 'https://amzn.to/3R0spV0'
  },
  'ecobee_smart_sensor_2_pack': {
    'USA': 'https://amzn.to/3SprUVB',
    'CAN': 'https://amzn.to/3pSh8tR'
  }
};

/**
 * Link getter for affiliate links in the currently active thermostat's
 * country. Defaults to USA.
 *
 * @param {string} type
 *
 * @return {string}
 */
beestat.affiliate.get_link = function(type) {
  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  let country_iso_3 = 'USA';
  if (thermostat.address_id !== null) {
    const address = beestat.cache.address[thermostat.address_id];
    if (beestat.address.is_valid(address.address_id) === true) {
      country_iso_3 = address.normalized.components.country_iso_3;
    }
  }
  return beestat.affiliate.links[type][country_iso_3] ||
    beestat.affiliate.links[type].USA;
};
