beestat.address = {};

/**
 * Get the parts of an address in two separate lines.
 *
 * @param {number} address_id
 *
 * @return {array}
 */
beestat.address.get_lines = function(address_id) {
  const address = beestat.cache.address[address_id];

  if (address.normalized === null) {
    return null;
  }

  console.log(address);

  // US Address
  if (address.normalized.components.country_iso_3 === 'USA') {
    return [
      address.normalized.delivery_line_1,
      [
        address.normalized.components.city_name,
        address.normalized.components.state_abbreviation + ',',
        address.normalized.components.zipcode
      ].join(' ')
    ];
  } else {
    return [
      address.normalized.address1,
      address.normalized.address2
    ];
  }
};

/**
 * Get whether or not this address was validated and thus has address components/metadata, is geocoded, etc.
 *
 * @param {number} address_id
 *
 * @return {boolean}
 */
beestat.address.is_valid = function(address_id) {
  const address = beestat.cache.address[address_id];
  return address.normalized !== null;
};
