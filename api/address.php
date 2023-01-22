<?php

/**
 * An address is a discrete object that is normalized and verified using a
 * third party service. In order to prevent duplication and extra API calls
 * (which cost money), they are stored separately instead of simply as columns
 * on a different table.
 *
 * @author Jon Ziebell
 */
class address extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id'
    ],
    'public' => []
  ];

  /**
   * Search for an address based on an address string. This will make an API
   * call to SmartyStreets using that address string (after first checking
   * the cache to see if we've done it before), then it will either create the
   * address row for this user or return the existing one if it already
   * exists.
   *
   * For example:
   *
   * 1. 123 Sesame St. (query smarty, insert row)
   * 2. 123 Sesame Street (query smarty, return existing row)
   * 3. 123 Sesame Street (query smarty (cached), return existing row)
   *
   * @param string $address Address components (line_1, locality,
   * administrative_area, postal_code)
   * @param string $country ISO 3 country code
   *
   * @return array The address row.
   */
  public function search($address, $country) {
    $skip_lookup = false;

    /**
     * If any of these fields are missing, set normalized to null and skip the
     * SmartyStreets lookup. Also, line_1 must have a number and text.
     */
    foreach(['line_1', 'locality', 'administrative_area', 'postal_code'] as $key) {
      if(
        isset($address[$key]) === false ||
        trim($address[$key]) === '' ||
        $address[$key] === null
      ) {
        $skip_lookup = true;
        $normalized = null;
        break;
      }
    }

    // Don't even bother sending to Smarty if there's no number in address line 1.
    if(
      isset($address['line_1']) === true &&
      preg_match('/\d+ [0-9]*[a-z]+/i', trim(preg_replace('/[^a-z0-9 ]/i', ' ', $address['line_1']))) !== 1
    ) {
      $skip_lookup = true;
      $normalized = null;
    }

    // If normalized wasn't overrridden, check with SmartyStreets.
    if($skip_lookup === false) {
      $address_string = $address['line_1'] . ', ' . $address['locality'] . ', ' . $address['administrative_area'] . ', ' . $address['postal_code'];
      $normalized = $this->api(
        'smarty_streets',
        'smarty_streets_api',
        [
          'address_string' => $address_string,
          'country' => $country
        ]
      );
    }

    $key = $this->generate_key($normalized);
    $existing_address = $this->get([
      'key' => $key
    ]);

    if($existing_address === null) {
      return $this->create([
        'key' => $key,
        'normalized' => $normalized
      ]);
    }
    else {
      /**
       * There was an issue at some point that caused addresses to be inserted
       * with null/[] as the normalized column even though Smarty returned
       * actual valid data for the address. I *think* this may have been
       * caused by addresses that were originally created when a Smarty
       * subscription was down. Once an address exists, it was then never
       * updated, so while a successful API call was sent to Smarty, the
       * actual address was never updated.
       *
       * This fixes that by updating the address row with the current Smarty
       * response. Sometimes Smarty cannot find an address and to fix that I
       * will manually set the normalized column despite it normally being
       * null. This won't override that because it will never set normalized
       * to null.
       */
      if ($normalized !== null) {
        return $this->update([
          'address_id' => $existing_address['address_id'],
          'normalized' => $normalized
        ]);
      } else {
        return $existing_address;
      }
    }
  }

  /**
   * Generate a key from the normalized address to see whether or not it's
   * been stored before. Note that SmartyStreets does not recommend using the
   * DPBC as a unique identifier. I am here, but the key is not intended to be
   * a unique identifier for an address. It's meant to be a representation of
   * the full details of an address. If the ZIP code changes for someone's
   * house, I need to store that as a new address or the actual address will
   * be incorrect.
   *
   * @link https://smartystreets.com/docs/addresses-have-unique-identifier
   *
   * @param string $normalized Normalized address as returned from
   * SmartyStreets
   *
   * @return string
   */
  private function generate_key($normalized) {
    if(isset($normalized['delivery_point_barcode']) === true) {
      return sha1($normalized['delivery_point_barcode']);
    } else {
      $string = '';
      if(isset($normalized['address1']) === true) {
        $string .= $normalized['address1'];
      }
      if(isset($normalized['address2']) === true) {
        $string .= $normalized['address2'];
      }
      if(isset($normalized['address3']) === true) {
        $string .= $normalized['address3'];
      }
      return sha1($string);
    }
  }

}
