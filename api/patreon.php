<?php

/**
 * High level functionality for interacting with the Patreon API.
 *
 * @author Jon Ziebell
 */
class patreon extends external_api {

  public static $exposed = [
    'private' => [
      'authorize',
      'initialize'
    ],
    'public' => []
  ];

  protected static $log_mysql = 'all';

  protected static $cache = false;
  protected static $cache_for = null;

  /**
   * Redirect to Patreon to do the oAuth. Note: Put a space between scopes and
   * urlencode the whole thing if it includes special characters.
   */
  public function authorize() {
    header('Location: https://www.patreon.com/oauth2/authorize?response_type=code&client_id=' . $this->setting->get('patreon_client_id') . '&redirect_uri=' . $this->setting->get('patreon_redirect_uri') . '&scope=identity');
  }

  /**
   * Obtain the first set of tokens for a a patreon user, then sync that
   * user's Patreon settings, then return code that closes the window.
   *
   * @param string $code The code used to get tokens from patreon with.
   */
  public function initialize($code = null) {
    if($code !== null) {
      $this->api('patreon_token', 'obtain', ['code' => $code]);
      $this->api('user', 'sync_patreon_status');
    }

    echo '<html><head><title></title></head><body><script type="text/javascript">window.close();</script></body></html><!--';

    $this->cora->set_headers([
      'Content-Type' => 'text/html'
    ], true);

    // Need to commit the transaction so the stuff gets saved.
    $this->database->commit_transaction();
  }

  /**
   * Send an API call to patreon and return the response.
   *
   * @param string $method GET or POST
   * @param string $endpoint The API endpoint
   * @param array $arguments POST or GET parameters
   * @param boolean $auto_refresh_token Whether or not to automatically get a
   * new token if the old one is expired.
   * @param string $patreon_token Force-use a specific token.
   *
   * @return array The response of this API call.
   */
  public function patreon_api($method, $endpoint, $arguments, $auto_refresh_token = true, $patreon_token = null) {
    $curl = [
      'method' => $method
    ];

    // Authorize/token endpoints don't use the /1/ in the URL. Everything else
    // does.
    $full_endpoint = $endpoint;
    if ($full_endpoint !== 'authorize' && $full_endpoint !== 'token') {
      $full_endpoint = '/v2/' . $full_endpoint;

      // For non-authorization endpoints, add the access_token header. Will use
      // provided token if set, otherwise will get the one for the logged in
      // user.
      if($patreon_token === null) {
        $patreon_tokens = $this->api(
          'patreon_token',
          'read',
          []
        );
        if(count($patreon_tokens) !== 1) {
          throw new Exception('No token for this user');
        }
        $patreon_token = $patreon_tokens[0];
      }

      $curl['header'] = [
        'Authorization: Bearer ' . $patreon_token['access_token'],
        'Content-Type: application/x-www-form-urlencoded'
      ];
    }
    else {
      $full_endpoint = '/' . $full_endpoint;
    }
    $curl['url'] = 'https://www.patreon.com/api/oauth2' . $full_endpoint;

    if ($method === 'GET') {
      $curl['url'] .= '?' . http_build_query($arguments);
    }

    if ($method === 'POST') {
      // Attach the client_id to all POST requests. It errors if you include it
      // in a GET.
      $arguments['client_id'] = $this->setting->get('patreon_client_id');

      $curl['post_fields'] = http_build_query($arguments);
    }

    $curl_response = $this->curl($curl);

    $response = json_decode($curl_response, true);
    if ($response === null) {
      // If this hasn't already been logged, log the error.
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response);
      }
      throw new Exception('Invalid JSON');
    }

 // "response": "{\"errors\":[{\"code\":1,\"code_name\":\"Unauthorized\",\"detail\":\"The server could not verify that you are authorized to access the URL requested. You either supplied the wrong credentials (e.g. a bad password), or your browser doesn't understand how to supply the credentials required.\",\"id\":\"f4776cc7-0965-4d24-833a-98c449c8ffc8\",\"status\":\"401\",\"title\":\"Unauthorized\"}]}"

    // If the token was expired, refresh it and try again. Trying again sets
    // auto_refresh_token to false to prevent accidental infinite refreshing if
    // something bad happens.
    if (isset($response['errors']) === true && $response['errors'][0]['status'] === '401') {
      // Authentication token has expired. Refresh your tokens.
      if ($auto_refresh_token === true) {
        $this->api('patreon_token', 'refresh');
        return $this->patreon_api($method, $endpoint, $arguments, false);
      }
      else {
        if($this::$log_mysql !== 'all') {
          $this->log_mysql($curl_response);
        }
        throw new Exception($response['errors'][0]['detail']);
      }
    }
    else if (isset($response['errors']) === true) {
      // Any other error
      if($this::$log_mysql !== 'all') {
        $this->log_mysql($curl_response);
      }
      throw new Exception($response['errors'][0]['detail']);
    }
    else {
      return $response;
    }
  }
}
