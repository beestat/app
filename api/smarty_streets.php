<?php

/**
 * High level functionality for interacting with the SmartyStreets API.
 *
 * @author Jon Ziebell
 */

/**
 * Smarty Streets provides address lookup for normalizing address strings.
 * This is useful for turning bad data into good data. For example, much of
 * the data beestat gets has inconsistent naming (IN vs Indiana) between
 * thermostats. This fixes those issues, provides geocoding, and increases the
 * amount of trust I can put in locations for various reports.
 */
class smarty_streets extends external_api {

  protected static $log_mysql = 'all';

  protected static $cache = true;
  protected static $cache_for = null;

  /**
   * Send an API call to smarty_streets and return the response.
   *
   * @param string $address_string The address to look up.
   * @param array $country The country the address is in.
   *
   * @return array The response of this API call.
   */
  public function smarty_streets_api($address_string, $country) {
    // Smarty doesn't like this.
    if(trim($address_string) === '') {
      return null;
    }

    // Smarty has a different endpoint for USA vs International.
    if ($country === 'USA') {
      $url = 'https://us-street.api.smartystreets.com/street-address';
      $url .= '?' . http_build_query([
        'street' => $address_string,
        'auth-id' => $this->setting->get('smarty_streets_auth_id'),
        'auth-token' => $this->setting->get('smarty_streets_auth_token')
      ]);
    } else {
      $url = 'https://international-street.api.smartystreets.com/verify';
      $url .= '?' . http_build_query([
        'freeform' => $address_string,
        'country' => $country,
        'geocode' => 'true',
        'auth-id' => $this->setting->get('smarty_streets_auth_id'),
        'auth-token' => $this->setting->get('smarty_streets_auth_token')
      ]);
    }

    $curl_response = $this->curl([
      'url' => $url
    ]);

    $response = json_decode($curl_response, true);

    if ($response === null || count($response) === 0) {
      return null;
    } else {
      // Smarty doesn't return this but I want it.
      if($country === 'USA') {
        $response[0]['components']['country_iso_3'] = 'USA';
      }
      return $response[0];
    }
  }

  /**
   * Generate a cache key from a URL. Just hashes it.
   *
   * @param array $arguments
   *
   * @return string
   */
  protected function generate_cache_key($arguments) {
    return sha1($arguments['url']);
  }

  /**
   * Determine whether or not a request should be cached. For this, cache
   * valid JSON responses with status code 200.
   *
   * @param array $arguments
   * @param string $curl_response
   * @param array $curl_info
   *
   * @return boolean
   */
  protected function should_cache($arguments, $curl_response, $curl_info) {
    return (
      $curl_info['http_code'] === 200 &&
      json_decode($curl_response, true) !== null
    );
  }
}
