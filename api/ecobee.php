<?php

/**
 * High level functionality for interacting with the ecobee API.
 *
 * @author Jon Ziebell
 */
class ecobee extends external_api {

  public static $exposed = [
    'private' => [],
    'public' => [
      'authorize',
      'initialize'
    ]
  ];

  protected static $log_mysql = 'all';
  protected static $log_mysql_verbose = false;

  protected static $cache = false;
  protected static $cache_for = null;

  /**
   * If the original API call fails, the ecobee token is updated outside of
   * the current transaction to ensure it doesn't get rolled back due to an
   * exception.
   *
   * The problem with that is that all subsequent API calls need this
   * value...so it's stored here statically on the class and used instead of
   * the old database value.
   */
  protected static $ecobee_token = null;

  /**
   * Redirect to ecobee to do the oAuth.
   */
  public function authorize($redirect = null) {
    $state = '';
    if ($redirect !== null) {
      $state = '&state=' . base64url_encode(json_encode(['redirect' => $redirect]));
    }
    header('Location: https://api.ecobee.com/authorize?response_type=code&client_id=' . $this->setting->get('ecobee_client_id') . '&redirect_uri=' . $this->setting->get('ecobee_redirect_uri') . '&scope=smartRead' . $state);
  }

  /**
   * Obtain the first set of tokens for an ecobee user.
   *
   * @param string $code The code used to get tokens from ecobee with.
   * @param string $state The state parameter passed back from ecobee (base64url encoded JSON).
   * @param string $error Error short description.
   * @param string $error_description Error long description.
   */
  public function initialize($code = null, $state = null, $error = null, $error_description = null) {
    if($code !== null) {
      // This is returned, not created in the database because the user may not
      // exist yet.
      $ecobee_token = $this->api('ecobee_token', 'obtain', ['code' => $code]);

      /**
       * I registered an ecobee account (demo@beestat.io). It doesn't have any
       * thermostats, so if we run into this account just go to the demo page.
       * Presently this is just for Google Play so they can log in with fake
       * credentials and approve the app.
       */
      if($ecobee_token['ecobee_account_id'] === 'd90d2785-890b-4743-8b51-477020a7f6e9') {
        header('Location: https://demo.beestat.io/');
        die();
      }

      $existing_user = $this->database->read(
        'user',
        [
          'ecobee_account_id' => $ecobee_token['ecobee_account_id'],
          'deleted' => false
        ]
      );

      // If at least one of the thermostats from the ecobee API call already
      // exists and all of them have matching user_ids, log in as that user.
      // Otherwise create a new user and save the tokens to it.
      if(
        count($existing_user) > 0
      ) {
        $this->api(
          'user',
          'force_log_in',
          ['user_id' => $existing_user[count($existing_user) - 1]['user_id']]
        );

        // Look for existing tokens (in case access was revoked and then re-
        // granted). Include deleted tokens and revive that row since each user
        // is limited to one token row.
        $existing_ecobee_token = $this->api(
          'ecobee_token',
          'read',
          [
            'attributes' => [
              'deleted' => [0, 1]
            ]
          ]
        )[0];

        $this->api(
          'ecobee_token',
          'update',
          [
            'attributes' => array_merge(
              ['ecobee_token_id' => $existing_ecobee_token['ecobee_token_id']],
              $ecobee_token
            )
          ]
        );
      }
      else {
        $this->api('user', 'create_anonymous_user');
        $this->api('ecobee_token', 'create', ['attributes' => $ecobee_token]);
      }

      // Redirect to the proper location.
      $redirect_uri = $this->setting->get('beestat_root_uri');
      if ($state !== null) {
        $decoded_state = base64url_decode($state);
        $parsed_state = json_decode($decoded_state, true);
        if (is_array($parsed_state) && isset($parsed_state['redirect']) && !empty($parsed_state['redirect'])) {
          $redirect_uri .= $parsed_state['redirect'];
        }
      }
      header('Location: ' . $redirect_uri);
    }
    else if(isset($error) === true) {
      throw new cora\exception($error_description, 10506, false);
    }
    else {
      throw new cora\exception('Unhandled error', 10507, false);
    }
  }

  /**
   * Send an API call to ecobee and return the response.
   *
   * @param string $method GET or POST
   * @param string $endpoint The API endpoint
   * @param array $arguments POST or GET parameters
   * @param boolean $auto_refresh_token Whether or not to automatically get a
   * new token if the old one is expired.
   *
   * @return array The response of this API call.
   */
  public function ecobee_api($method, $endpoint, $arguments, $auto_refresh_token = true) {
    $curl = [
      'method' => $method
    ];

    // Attach the client_id to all requests.
    $arguments['client_id'] = $this->setting->get('ecobee_client_id');

    // Authorize/token endpoints don't use the /1/ in the URL. Everything else
    // does.
    $full_endpoint = $endpoint;
    if ($full_endpoint !== 'authorize' && $full_endpoint !== 'token') {
      $full_endpoint = '/1/' . $full_endpoint;

      // For non-authorization endpoints, add the access_token header. Will use
      // provided token if set, otherwise will get the one for the logged in
      // user.
      if(self::$ecobee_token === null) {
        $ecobee_tokens = $this->api(
          'ecobee_token',
          'read',
          []
        );
        if(count($ecobee_tokens) !== 1) {
          $this->api('user', 'log_out');
          throw new cora\exception('No ecobee access for this user.', 10501, false);
        }
        $ecobee_token = $ecobee_tokens[0];
      } else {
        $ecobee_token = self::$ecobee_token;
      }

      $curl['header'] = [
        'Authorization: Bearer ' . $ecobee_token['access_token']
      ];
    }
    else {
      $full_endpoint = '/' . $full_endpoint;
    }
    $curl['url'] = 'https://api.ecobee.com' . $full_endpoint;

    // Allow a completely custom endpoint if desired.
    if(str_starts_with($endpoint, 'https://') === true) {
      $curl['url'] = $endpoint;
    }

    if ($method === 'GET') {
      $curl['url'] .= '?' . http_build_query($arguments);
    }

    if ($method === 'POST') {
      $curl['post_fields'] = http_build_query($arguments);
    }

    $curl_response = $this->curl($curl);

    $response = json_decode($curl_response, true);
    if ($response === null) {
      // If this hasn't already been logged, log the error.
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      throw new cora\exception(
        'Ecobee returned invalid JSON.',
        10502,
        true,
        [
          'curl_response' => $curl_response
        ]
      );
    }

    // If the token was expired, refresh it and try again. Trying again sets
    // auto_refresh_token to false to prevent accidental infinite refreshing if
    // something bad happens.
    if (isset($response['status']) === true && $response['status']['code'] === 14) {
      // Authentication token has expired. Refresh your tokens.
      if ($auto_refresh_token === true) {
        self::$ecobee_token = $this->api('ecobee_token', 'refresh');
        return $this->ecobee_api($method, $endpoint, $arguments, false);
      }
      else {
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response);
        }
        throw new cora\exception($response['status']['message'], 10503);
      }
    }
    else if (isset($response['status']) === true && $response['status']['code'] === 16) {
      // Token has been deauthorized by user. You must re-request authorization.
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      $this->api('ecobee_token', 'delete', $ecobee_token['ecobee_token_id']);
      throw new cora\exception('Ecobee access was revoked by user.', 10500, false, null, false);
    }
    else if (isset($response['status']) === true && $response['status']['code'] === 2) {
      // Not authorized.
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      throw new cora\exception('Ecobee access was revoked by user.', 10508, false, $response['status']['message'], false);
    }
    else if (isset($response['status']) === true && $response['status']['code'] === 9) {
      // Invalid selection. No thermostats in selection. Ensure permissions and selection.
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      throw new cora\exception('No thermostats found.', 10511, false, null, false);
    }
    else if (isset($response['status']) === true && $response['status']['code'] === 3) {
      if (
        isset($response['status']['message']) === true &&
        stripos($response['status']['message'], 'Illegal instant due to time zone offset transition') !== false
      ) {
        // Processing error. Illegal instant due to time zone offset transition (daylight savings time 'gap'): ...
        // Happens when you try to use a time that doesn't exist due to daylight savings spring forward
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response, true);
        }
        throw new cora\exception('Illegal instant due to time zone offset transition.', 10509, false, null, false);
      } else if (
        isset($response['status']['message']) === true &&
        stripos($response['status']['message'], 'User cannot access thermostat with id') !== false
      ) {
        // Processing error. User cannot access thermostat with id ...
        // Not sure why this happens
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response, true);
        }
        throw new cora\exception('User cannot access thermostat.', 10510, false, null, false);
      } else if (
        isset($response['status']['message']) === true &&
        stripos($response['status']['message'], 'Processing error. Error populating API thermostats.') !== false
      ) {
        // Processing error. Error populating API thermostats. ...

        // Appears to happen when specifying "includeNotificationSettings" in
        // the /thermostat API call when using a thermostat serial number from
        // the /homes endpoint. I believe the /homes endpoint is out of date
        // and errornously returning the thermostat, then asking for the
        // thermostat, specifically the notification settings, breaks the
        // ecobee API.
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response, true);
        }
        throw new cora\exception('No thermostats found.', 10511, false, null, false);
      } else if (
        isset($response['status']['message']) === true &&
        stripos($response['status']['message'], 'Processing error.') !== false
      ) {
        // Processing error. Generic error...this started happening in August
        // 2024 when attempting to sync any date range that included
        // the "missing hour" from daylight savings.
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response, true);
        }
        throw new cora\exception('Generic processing error.', 10512, false, null, false);
      }
    }
    else if (isset($response['status']) === true && $response['status']['code'] !== 0) {
      // Any other error
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      throw new cora\exception($response['status']['message'], 10504);
    }
    else if (isset($response['error']) === true) {
      // Authorization errors are a bit different
      // https://www.ecobee.com/home/developer/api/documentation/v1/auth/auth-req-resp.shtml

      if($response['error'] === 'invalid_grant') {
        $ecobee_token = $this->api('ecobee_token', 'read')[0];
        $this->api('ecobee_token', 'delete', $ecobee_token['ecobee_token_id']);
      }

      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response, true);
      }
      throw new cora\exception(isset($response['error_description']) === true ? $response['error_description'] : $response['error'], 10505, true, null, false);
    }
    else {
      return $response;
    }
  }
}