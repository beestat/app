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
      'sync_patreon_status'
    ],
    'public' => []
  ];

  public static $converged = [];

  public static $user_locked = true;

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
    $username = strtolower(sha1(uniqid(mt_rand(), true)));
    $password = strtolower(sha1(uniqid(mt_rand(), true)));
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
   * @param int $id
   * @param array $attributes
   *
   * @return int
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
  }

  /**
   * Logs out the currently logged in user.
   *
   * @return bool True if it was successfully invalidated. Could return false
   * for a non-existant session key or if it was already logged out. In the
   * case of multiple sessions, return true if all open sessions were
   * successfully deleted, false if not.
   */
  public function log_out($all) {
    if($this->setting->is_demo() === true) {
      return;
    }

    if($all === true) {
      $database = cora\database::get_instance();
      $sessions = $database->read(
        'cora\session',
        [
          'user_id' => $this->session->get_user_id(),
          'api_user_id' => null
        ]
      );
      $success = true;
      foreach($sessions as $session) {
        $success &= $this->session->delete($session['session_key']);
      }
      return $success;
    }
    else {
      return $this->session->delete();
    }
  }

  /**
   * Set a setting on a user.
   *
   * @param string $key
   * @param string $value
   *
   * @return array The new settings list.
   */
  public function update_setting($key, $value) {
    $user = $this->get($this->session->get_user_id());
    if($user['json_settings'] === null) {
      $settings = [];
    } else {
      $settings = $user['json_settings'];
    }

    $settings[$key] = $value;

    if($this->setting->is_demo() === false) {
      $this->update(
        [
          'user_id' => $this->session->get_user_id(),
          'json_settings' => $settings
        ]
      );
    }

    return $settings;
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
    if($user['json_sync_status'] === null) {
      $sync_status = [];
    } else {
      $sync_status = $user['json_sync_status'];
    }

    $sync_status[$key] = date('Y-m-d H:i:s');

    $this->update(
      [
        'user_id' => $this->session->get_user_id(),
        'json_sync_status' => $sync_status
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
              'json_patreon_status' => $include['attributes']
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
            'json_patreon_status' => null
          ]
        );
      } else {
        // Worked but didn't get the expected response for "active_patron"
        $this->update(
          [
            'user_id' => $this->session->get_user_id(),
            'json_patreon_status' => [
              'patron_status' => 'not_patron'
            ]
          ]
        );
      }
    }

    $this->update_sync_status('patreon');
    $this->database->release_lock($lock_name);
  }

}
