<?php

/**
 * Tokens for authorizing access to ecobee accounts.
 *
 * @author Jon Ziebell
 */
class ecobee_token extends cora\crud {

  /**
   * Create an ecobee token. Does the normal CRUD create and also extracts the
   * ecobee_account_id from the token and attaches it to the user. A user only
   * has one ecobee_token row so this really only runs once per user.
   *
   * @param array $attributes
   *
   * @return int
   */
  public function create($attributes) {
    $this->api(
      'user',
      'update',
      [
        'attributes' => [
          'user_id' => $this->session->get_user_id(),
          'ecobee_account_id' => $this->get_ecobee_account_id($attributes)
        ]
      ]
    );

    return parent::create($attributes);
  }

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
   * Get an ecobee_account_id from the ecobee JWT.
   *
   * @param ecobee_token $ecobee_token The ecobee_token.
   *
   * @return string The ecobee_account_id.
   */
  public function get_ecobee_account_id($ecobee_token) {
    $access_token_decoded = json_decode(
      base64_decode(
        str_replace(
          '_',
          '/',
          str_replace(
            '-',
            '+',
            explode(
              '.',
              $ecobee_token['access_token']
            )[1]
          )
        )
      ),
      true
    );

    return explode('|', $access_token_decoded['sub'])[1];
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
          'ecobee_type' => 'jwt',
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
      $database->release_lock($lock_name);
      throw new cora\exception('Could not refresh ecobee token; ecobee returned no token.', 10002, true, null, false);
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

    $this->api(
      'user',
      'update',
      [
        'attributes' => [
          'user_id' => $this->session->get_user_id(),
          'ecobee_account_id' => $this->get_ecobee_account_id($ecobee_token)
        ]
      ]
    );

    $database->release_lock($lock_name);

    return $ecobee_token;
  }

  /**
   * Delete an ecobee token and log the user out. Make sure to delete the
   * token prior to logging out so the right permissions are present.
   *
   * @param int $id
   *
   * @return int
   */
  public function delete($id) {
    $return = parent::delete($id);
    $this->api('user', 'log_out');
    return $return;
  }

}
