<?php

/**
 * Tokens for authorizing access to ecobee accounts.
 *
 * @author Jon Ziebell
 */
class ecobee_token extends cora\crud {

  /**
   * This should be called when connecting a new user. Get the access/refresh
   * tokens, then attach them to a brand new anonymous user.
   *
   * @param string $code The code from ecobee used to obtain the
   * access/refresh tokens.
   *
   * @return array The access/refresh tokens.
   */
  public function obtain($code) {
    // Obtain the access and refresh tokens from the authorization code.
    $response = $this->api(
      'ecobee',
      'ecobee_api',
      [
        'method' => 'POST',
        'endpoint' => 'token',
        'arguments' => [
          'grant_type' => 'authorization_code',
          'code' => $code,
          'redirect_uri' => $this->setting->get('ecobee_redirect_uri')
        ]
      ]
    );

    // Make sure we got the expected result.
    if (
      isset($response['access_token']) === false ||
      isset($response['refresh_token']) === false
    ) {
      throw new cora\exception('Could not get first ecobee token.', 10000);
    }

    return [
      'access_token' => $response['access_token'],
      'refresh_token' => $response['refresh_token'],
      'timestamp' => date('Y-m-d H:i:s'),
      'deleted' => 0
    ];
  }

  /**
   * Get some new tokens. A database lock is obtained prior to getting a token
   * so that no other API call can attempt to get a token at the same time.
   * This way if two API calls fire off to ecobee at the same time, then
   * return at the same time, then call token->refresh() at the same time,
   * only one can run and actually refresh at a time. If the transactionless
   * one runs after that's fine as it will look up the token prior to
   * refreshing.
   *
   * @return array The new token.
   */
  public function refresh() {
    $database = cora\database::get_transactionless_instance();

    $lock_name = 'ecobee_token->refresh(' . $this->session->get_user_id() . ')';
    $database->get_lock($lock_name, 3);

    $ecobee_tokens = $database->read(
      'ecobee_token',
      [
        'user_id' => $this->session->get_user_id(),
        'deleted' => false
      ]
    );
    if(count($ecobee_tokens) === 0) {
      throw new cora\exception('Could not refresh ecobee token; no token found.', 10001);
    }
    $ecobee_token = $ecobee_tokens[0];

    $response = $this->api(
      'ecobee',
      'ecobee_api',
      [
        'method' => 'POST',
        'endpoint' => 'token',
        'arguments' => [
          'grant_type' => 'refresh_token',
          'refresh_token' => $ecobee_token['refresh_token']
        ]
      ]
    );

    if (
      isset($response['access_token']) === false ||
      isset($response['refresh_token']) === false
    ) {
      $this->delete($ecobee_token['ecobee_token_id']);
      $this->api('user', 'log_out', ['all' => true]);
      $database->release_lock($lock_name);
      throw new cora\exception('Could not refresh ecobee token; ecobee returned no token.', 10002);
    }

    $ecobee_token = $database->update(
      'ecobee_token',
      [
        'ecobee_token_id' => $ecobee_token['ecobee_token_id'],
        'access_token' => $response['access_token'],
        'refresh_token' => $response['refresh_token'],
        'timestamp' => date('Y-m-d H:i:s')
      ]
    );

    $database->release_lock($lock_name);

    return $ecobee_token;
  }

  /**
   * Delete an ecobee token. If this happens immediately log out all of this
   * user's currently logged in sessions.
   *
   * @param int $id
   *
   * @return int
   */
  public function delete($id) {
    $database = cora\database::get_transactionless_instance();

    // Need to delete the token before logging out or else the delete fails.
    $return = $database->delete($this->resource, $id);

    return $return;
  }

}
