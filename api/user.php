<?php

/**
 * A user. Users in beestat aren't much of a thing, but everyone still gets
 * one as sessions are connected to them.
 *
 * @author Jon Ziebell
 */
class user extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'update_setting',
      'log_out',
      'sync_patreon_status',
      'unlink_patreon_account',
      'create_api_key',
      'recycle_api_key',
      'delete_api_key',
      'session_read_id',
    ],
    'public' => ['force_log_in']
  ];

  /**
   * Selects a user.
   *
   * @param array $attributes
   * @param array $columns
   *
   * @return array
   */
  public function read($attributes = [], $columns = []) {
    $users = parent::read($attributes, $columns);
    foreach($users as &$user) {
      unset($user['password']);
    }
    return $users;
  }

  /**
   * Creates a user. Username and password are both required. The password is
   * hashed with bcrypt.
   *
   * @param array $attributes
   *
   * @return int
   */
  public function create($attributes) {
    $attributes['password'] = password_hash(
      $attributes['password'],
      PASSWORD_BCRYPT
    );
    return parent::create($attributes);
  }

  /**
   * Create an anonymous user so we can log in and have access to everything
   * without having to spend the time creating an actual user.
   */
  public function create_anonymous_user() {
    $username = bin2hex(random_bytes(20));
    $password = bin2hex(random_bytes(20));
    $user = $this->create([
      'username' => $username,
      'password' => $password,
      'anonymous' => 1
    ]);
    $this->force_log_in($user['user_id']);
  }

  /**
   * Updates a user. If the password is changed then it is re-hashed with
   * bcrypt and a new salt is generated.
   *
   * @param array $attributes
   *
   * @return array
   */
  public function update($attributes) {
    if(isset($attributes['password']) === true) {
      $attributes['password'] = password_hash($attributes['password'], PASSWORD_BCRYPT);
    }
    return parent::update($attributes);
  }

  /**
   * Deletes a user.
   *
   * @param int $id
   *
   * @return int
   */
  public function delete($id) {
    return parent::delete($id);
  }

  /**
   * Log in by checking the provided password against the stored password for
   * the provided username. If it's a match, get a session key from Cora and
   * set the cookie.
   *
   * @param string $username
   * @param string $password
   *
   * @return bool True if success, false if failure.
   */
  public function log_in($username, $password) {
    $user = $this->read(['username' => $username], ['user_id', 'password']);
    if(count($user) !== 1) {
      return false;
    }
    else {
      $user = $user[0];
    }

    if(password_verify($password, $user['password']) === true) {
      $this->session->request(null, null, $user['user_id']);
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Force log in as a specific user. This is never public and is used as part
   * of the user merging logic.
   *
   * @param int $user_id
   */
  public function force_log_in($user_id) {
    $this->session->request(null, null, $user_id);
    header('Location: ' . $this->setting->get('beestat_root_uri'));
  }

  /**
   * Logs out the currently logged in user.
   */
  public function log_out() {
    if($this->setting->is_demo() === true) {
      return;
    }

    $this->session->delete();

    header('Location: https://auth.ecobee.com/logout?federated&client_id=' . $this->setting->get('ecobee_client_id') . '&returnTo=' . str_replace('app.', '', $this->setting->get('beestat_root_uri')));
  }

  /**
   * Set a setting on a user. This utilizes a lock because all settings are
   * stored in a single JSON column. If multiple settings are updated rapidly,
   * they will both read from the user at the same time, then run their
   * updates sequentially and overwrite each other with old data.
   *
   * Don't release the lock either...wait for the database connection to close
   * and the transaction to commit otherwise anything waiting will start and
   * get old data.
   *
   * @param string $key
   * @param string $value
   *
   * @return array The new settings list.
   */
  public function update_setting($key, $value) {
    $lock_name = 'user->update_setting(' . $this->session->get_user_id() . ')';
    $this->database->get_lock($lock_name, 1);

    $user = $this->get($this->session->get_user_id());
    if($user['settings'] === null) {
      $settings = [];
    } else {
      $settings = $user['settings'];
    }

    $settings = $this->update_setting_($settings, $key, $value);

    // Disallow setting changes in the demo.
    if($this->setting->is_demo() === false) {
      $this->update(
        [
          'user_id' => $this->session->get_user_id(),
          'settings' => $settings
        ]
      );
    }

    return $settings;
  }

  /**
   * Recursively update the setting array.
   *
   * @param array $settings Settings array
   * @param string $key Key to update. Dots indicate a path.
   * @param mixed $value Value to set.
   *
   * @return array Updated settings array.
   */
  private function update_setting_($settings, $key, $value) {
    $path = explode('.', $key);
    if(count($path) > 1) {
      $this_key = array_shift($path);
      if(isset($settings[$this_key]) === false) {
        $settings[$this_key] = [];
      }
      $settings[$this_key] = $this->update_setting_(
        $settings[$this_key],
        implode('.', $path),
        $value
      );
    } else {
      $settings[$key] = $value;
    }

    return $settings;
  }

  /**
   * Get a specific setting.
   *
   * @param string $key The setting to get. Supports dotted paths.
   *
   * @return mixed The setting. Null if not set.
   */
  public function get_setting($key) {
    $user = $this->get($this->session->get_user_id());
    return $this->get_setting_($user['settings'], $key);
  }

  /**
   * Recursive helper function for getting a setting.
   *
   * @param array $settings Settings array
   * @param string $key The key of the setting to get.
   *
   * @return mixed The setting. Null if not set.
   */
  private function get_setting_($settings, $key) {
    $path = explode('.', $key);
    if(count($path) > 1) {
      $this_key = array_shift($path);
      if(isset($settings[$this_key]) === true) {
        return $this->get_setting_($settings[$this_key], implode('.', $path));
      } else {
        return null;
      }
    } else {
      if(isset($settings[$key]) === true) {
        return $settings[$key];
      } else {
        return null;
      }
    }
  }

  /**
   * Set a sync_status on a user to the current datetime.
   *
   * @param string $key
   *
   * @return array The new sync status.
   */
  public function update_sync_status($key) {
    $user = $this->get($this->session->get_user_id());
    if($user['sync_status'] === null) {
      $sync_status = [];
    } else {
      $sync_status = $user['sync_status'];
    }

    $sync_status[$key] = date('Y-m-d H:i:s');

    $this->update(
      [
        'user_id' => $this->session->get_user_id(),
        'sync_status' => $sync_status
      ]
    );

    return $sync_status;
  }

  /**
   * Get the current user's Patreon status.
   */
  public function sync_patreon_status() {
    $lock_name = 'user->sync_patreon_status(' . $this->session->get_user_id() . ')';
    $this->database->get_lock($lock_name);

    $response = $this->api(
      'patreon',
      'patreon_api',
      [
        'method' => 'GET',
        'endpoint' => 'identity',
        'arguments' => [
          'fields' => [
            'member' => 'patron_status,is_follower,pledge_relationship_start,lifetime_support_cents,currently_entitled_amount_cents,last_charge_date,last_charge_status,will_pay_amount_cents',
          ],
          'include' => 'memberships'
        ]
      ]
    );

    // Assuming all went well and we are connected to this user's Patreon
    // account, see if they are actually a Patron. If they are or at the very
    // least were at some point, mark it. Otherwise just mark them as connected
    // but inactive.
    if(
      isset($response['data']) === true &&
      isset($response['data']['relationships']) === true &&
      isset($response['data']['relationships']['memberships']) === true &&
      isset($response['data']['relationships']['memberships']['data']) === true &&
      isset($response['data']['relationships']['memberships']['data'][0]) === true &&
      isset($response['data']['relationships']['memberships']['data'][0]['id']) === true
    ) {
      $id = $response['data']['relationships']['memberships']['data'][0]['id'];
      foreach($response['included'] as $include) {
        if($include['id'] === $id) {
          $this->update(
            [
              'user_id' => $this->session->get_user_id(),
              'patreon_status' => $include['attributes']
            ]
          );
        }
      }
    } else {
      if(isset($response['errors']) === true) {
        // Error like revoked access.
        $this->update(
          [
            'user_id' => $this->session->get_user_id(),
            'patreon_status' => null
          ]
        );
      } else {
        // Worked but didn't get the expected response for "active_patron"
        $this->update(
          [
            'user_id' => $this->session->get_user_id(),
            'patreon_status' => [
              'patron_status' => 'not_patron'
            ]
          ]
        );
      }
    }

    $this->update_sync_status('patreon');
    $this->database->release_lock($lock_name);
  }

  /**
   * Unlink the Patreon account for the current user.
   */
  public function unlink_patreon_account() {
    $patreon_tokens = $this->api('patreon_token', 'read_id');
    foreach($patreon_tokens as $patreon_token) {
      $this->api(
        'patreon_token',
        'delete',
        [
          'id' => $patreon_token['patreon_token_id']
        ]
      );
    }

    $this->update(
      [
        'user_id' => $this->session->get_user_id(),
        'patreon_status' => null
      ]
    );
  }

  /**
   * Get the current user's API session if one exists. Only returns sessions
   * where api_user_id is not null. Should only ever be one API session per user.
   *
   * @return array|null Full session row including session_key (the API key), or null if none exists
   */
  public function get_api_session() {
    $sessions = $this->session_read_id();

    // Return the first API session (should only be one)
    if(count($sessions) > 0) {
      return reset($sessions);
    }

    return null;
  }

  /**
   * Create a new API key for the current user. Only one API key allowed per user.
   * Generates a secure 40-character API key and creates both api_user and session
   * records. The session_key field contains the API key.
   *
   * @return array The created session row
   * @throws cora\exception if user already has an API key
   */
  public function create_api_key() {
    // Check if user already has an API key
    $existing = $this->get_api_session();
    if($existing !== null) {
      throw new cora\exception('User already has an API key. Use recycle_api_key to generate a new one.', 10001);
    }

    // Generate secure API key
    $api_key = bin2hex(random_bytes(20));

    // Create api_user record
    $api_user_id = $this->database->create(
      'cora\api_user',
      [
        'name' => $this->session->get_user_id(),
        'api_key' => $api_key,
        'session_key' => $api_key
      ],
      'id'
    );

    // Create session record linking user to api_user
    return $this->database->create(
      'cora\session',
      [
        'session_key' => $api_key,
        'user_id' => $this->session->get_user_id(),
        'api_user_id' => $api_user_id,
        'created_by' => ip2long($_SERVER['REMOTE_ADDR'])
      ]
    );
  }

  /**
   * Regenerate the API key for the current user. If no API key exists, creates
   * a new one. Generates a new secure 40-character key and updates both the
   * api_user and session records with the new key.
   *
   * @return array The updated session row with the new session_key
   */
  public function recycle_api_key() {
    // Check if user has an API key and get the session
    $existing = $this->get_api_session();
    if($existing === null) {
      return $this->create_api_key();
    }

    // Generate new API key
    $new_api_key = bin2hex(random_bytes(20));

    // Update api_user record
    $this->database->update(
      'cora\api_user',
      [
        'api_user_id' => $existing['api_user_id'],
        'api_key' => $new_api_key,
        'session_key' => $new_api_key
      ]
    );

    // Update session record with new session_key
    $this->database->update(
      'cora\session',
      [
        'session_id' => $existing['session_id'],
        'session_key' => $new_api_key
      ]
    );

    // Read back the updated session to return full data
    return $this->get_api_session();
  }

  /**
   * Delete the current user's API key. Soft-deletes both the session and
   * api_user records (sets deleted = 1). If no API key exists, does nothing.
   */
  public function delete_api_key() {
    // Check if user has an API key and get the session
    $existing = $this->get_api_session();
    if($existing !== null) {
      $this->database->delete('cora\session', $existing['session_id']);
      $this->database->delete('cora\api_user', $existing['api_user_id']);
    }
  }

  /**
   * Read all API sessions for the current user, indexed by session_id.
   * Only returns sessions where api_user_id is not null (filters out normal
   * login sessions). Used by frontend to populate session cache.
   *
   * @return array API sessions indexed by session_id (e.g., [123 => [...], 456 => [...]])
   */
  public function session_read_id() {
    $sessions = $this->database->read(
      'cora\session',
      [
        'user_id' => $this->session->get_user_id(),
        'deleted' => 0
      ]
    );

    // Index by session_id, only including API sessions
    $sessions_indexed = [];
    foreach($sessions as $session) {
      if($session['api_user_id'] !== null) {
        $sessions_indexed[$session['session_id']] = $session;
      }
    }

    return $sessions_indexed;
  }

}
