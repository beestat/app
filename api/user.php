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
    ],
    'public' => []
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

}
