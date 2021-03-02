<?php

/**
 * Tokens for authorizing access to Patreon accounts.
 *
 * @author Jon Ziebell
 */
class patreon_token extends cora\crud {

  /**
   * Obtain Patreon access & refresh tokens. If a token already exists for
   * this user, overwrite it.
   *
   * @param string $code The code from patreon used to obtain the
   * access/refresh tokens.
   *
   * @return array The patreon_token row.
   */
  public function obtain($code) {
    // Obtain the access and refresh tokens from the authorization code.
    $response = $this->api(
      'patreon',
      'patreon_api',
      [
        'method' => 'POST',
        'endpoint' => 'token',
        'arguments' => [
          'grant_type' => 'authorization_code',
          'code' => $code,
          'redirect_uri' => $this->setting->get('patreon_redirect_uri')
        ]
      ]
    );

    // Make sure we got the expected result.
    if (
      isset($response['access_token']) === false ||
      isset($response['refresh_token']) === false
    ) {
      throw new cora\exception('Could not get first Patreon token.', 10100);
    }

    $new_patreon_token = [
      'access_token' => $response['access_token'],
      'refresh_token' => $response['refresh_token']
    ];

    $existing_patreon_tokens = $this->read();
    if(count($existing_patreon_tokens) > 0) {
      $new_patreon_token['patreon_token_id'] = $existing_patreon_tokens[0]['patreon_token_id'];
      $this->update(
        $new_patreon_token
      );
    }
    else {
      $this->create($new_patreon_token);
    }

    return $this->read()[0];
  }

  /**
   * Get some new tokens. A database lock is obtained prior to getting a token
   * so that no other API call can attempt to get a token at the same time.
   * This way if two API calls fire off to patreon at the same time, then
   * return at the same time, then call token->refresh() at the same time,
   * only one can run and actually refresh at a time. If the transactionless
   * one runs after that's fine as it will look up the token prior to
   * refreshing.
   */
  public function refresh() {
    $database = cora\database::get_transactionless_instance();

    $lock_name = 'patreon_token->refresh(' . $this->session->get_user_id() . ')';
    $database->get_lock($lock_name, 3);

    $patreon_tokens = $database->read(
      'patreon_token',
      [
        'user_id' => $this->session->get_user_id(),
        'deleted' => false
      ]
    );
    if(count($patreon_tokens) === 0) {
      throw new cora\exception('Could not refresh Patreon token; no token found.', 10101);
    }
    $patreon_token = $patreon_tokens[0];

    $response = $this->api(
      'patreon',
      'patreon_api',
      [
        'method' => 'POST',
        'endpoint' => 'token',
        'arguments' => [
          'grant_type' => 'refresh_token',
          'refresh_token' => $patreon_token['refresh_token']
        ]
      ]
    );

    if (
      isset($response['access_token']) === false ||
      isset($response['refresh_token']) === false
    ) {
      $this->delete($patreon_token['patreon_token_id']);
      $database->release_lock($lock_name);
      throw new cora\exception('Could not refresh Patreon token; Patreon returned no token.', 10102, true, null, false);
    }

    $database->update(
      'patreon_token',
      [
        'patreon_token_id' => $patreon_token['patreon_token_id'],
        'access_token' => $response['access_token'],
        'refresh_token' => $response['refresh_token'],
        'timestamp' => date('Y-m-d H:i:s')
      ]
    );

    $database->release_lock($lock_name);
  }

  /**
   * Delete a Patreon token and log the user out. Make sure to delete the
   * token prior to logging out so the right permissions are present.
   *
   * @param int $id
   *
   * @return int
   */
  public function delete($id) {
    return parent::delete($id);
  }

}
