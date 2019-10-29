<?php

namespace cora;

/**
 * Offers session-related functions.
 *
 * @author Jon Ziebell
 */
final class session {

  /**
   * The session_key for this session.
   *
   * @var string
   */
  private $session_key = null;

  /**
   * The user_id for this session.
   *
   * @var int
   */
  private $user_id = null;

  /**
   * The singleton.
   *
   * @var session
   */
  private static $instance;

  /**
   * Constructor
   */
  private function __construct() {}

  /**
   * Use this function to instantiate this class instead of calling new
   * session() (which isn't allowed anyways). This avoids confusion from
   * trying to use dependency injection by passing an instance of this class
   * around everywhere.
   *
   * @return session A new session object or the already created one.
   */
  public static function get_instance() {
    if(isset(self::$instance) === false) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  /**
   * Return whether or not this class has been instantiated.
   *
   * @return bool
   */
  public static function has_instance() {
    return isset(self::$instance);
  }

  /**
   * Request a session. This method sets a couple cookies and returns the
   * session key. By default, all cookies except those set in
   * $additional_cookie_values are marked as httponly, which means only the
   * server can access them. Use the following table to determine when the
   * local cookie will be set to expire.
   *
   * timeout | life | expire
   * -------------------------------
   * null    | null | never expires due to inactivity, never expires due to time limit
   * null    | set  | never expires due to inactivity, expires in life seconds
   * set     | null | expires after timeout inactivity, never expires due to time limit
   * set     | set  | expires after timeout inactivity, expires in life seconds
   *
   * @param int $timeout How long, in seconds, until the session expires due
   * to inactivity. Set to null for no timeout.
   * @param int $life How long, in seconds, until the session expires. Set to
   * null for no expiration.
   * @param int $user_id An optional external integer pointer to another
   * table. This will most often be user.user_id, but could be something like
   * person.person_id or player.player_id.
   * @param array $additional_cookie_values Set additional values in the
   * cookie by setting this value. Doing this is generally discouraged as
   * cookies add state to the application, but something like a username for a
   * "remember me" checkbox is reasonable.
   *
   * @return string The generated session key.
   */
  public function request($timeout = null, $life = null, $user_id = null, $additional_cookie_values = null) {
    $database = database::get_instance();
    $session_key = $this->generate_session_key();

    $database->create(
      'cora\session',
      [
        'session_key' => $session_key,
        'timeout' => $timeout,
        'life' => $life,
        'user_id' => $user_id,
        'created_by' => ip2long($_SERVER['REMOTE_ADDR']),
        'last_used_by' => ip2long($_SERVER['REMOTE_ADDR']),
        'last_used_at' => date('Y-m-d H:i:s')
      ]
    );

    // Set the local cookie expiration.
    if($life !== null) {
      $expire = time() + $life;
    }
    else {
      if($timeout === null) {
        $expire = 4294967295; // 2038
      }
      else {
        $expire = 0; // Browser close
      }
    }

    // Set all of the necessary cookies. Both *_session_key and *_user_id are
    // read every API request and made available to the API.
    $this->set_cookie('session_key', $session_key, $expire);
    if(isset($additional_cookie_values) === true) {
      foreach($additional_cookie_values as $key => $value) {
        $this->set_cookie($key, $value, $expire, false);
      }
    }

    $this->session_key = $session_key;
    $this->user_id = $user_id;

    return $session_key;
  }

  /**
   * Similar to the Linux touch command, this method "touches" the session and
   * updates last_used_at and last_used_by. This is executed every time a
   * request that requires a session is sent to the API. Note that this uses
   * the cookie sent by the client directly so there is no default way to
   * touch a session unless you are the one logged in to it.
   *
   * @param $string session_key The session_key to use. If not set, will use
   * $_COOKIE['session_key'].
   *
   * @return bool True if it was successfully updated, false if the session
   * does not exist or is expired. Basically, return bool whether or not the
   * sesion is valid.
   */
  public function touch($session_key = null) {
    if($session_key === null && isset($_COOKIE['session_key']) === true) {
      $session_key = $_COOKIE['session_key'];
    }

    if($session_key === null) {
      return false;
    }

    $database = database::get_instance();

    $sessions = $database->read(
      'cora\session',
      [
        'session_key' => $session_key,
        'deleted' => 0
      ]
    );
    if(count($sessions) === 1) {
      $session = $sessions[0];

      // Check for expired session.
      if(
        (
          $session['timeout'] !== null &&
          (strtotime($session['last_used_at']) + strtotime($session['timeout'])) < time()
        ) ||
        (
          $session['life'] !== null &&
          (strtotime($session['last_used_at']) + strtotime($session['life'])) < time()
        )
      ) {
        $this->delete_cookie('session_key');
        return false;
      }

      $database->update(
        'cora\session',
        [
          'session_id' => $session['session_id'],
          'last_used_at' => date('Y-m-d H:i:s'),
          'last_used_by' => ip2long($_SERVER['REMOTE_ADDR'])
        ]
      );

      $this->session_key = $session['session_key'];
      $this->user_id = $session['user_id'];
    }
    else {
      $this->delete_cookie('session_key');
      return false;
    }
  }

  private function invalidate_cookies() {

  }

  /**
   * Delete the session with the provided session_key. If no session_key is
   * provided, delete the current session. This function is provided to aid
   * session management. Call it with no parameters for something like
   * user->log_out(), or set $session_key to end a specific session. You would
   * typically want to have your own permission layer on top of that to enable
   * only admins to do that.
   *
   * @param string $session_key The session key of the session to delete.
   *
   * @return bool True if it was successfully deleted. Could return false for
   * a non-existent session key or if it was already deleted.
   */
  public function delete($session_key = null) {
    $database = database::get_instance();
    if($session_key === null) {
      $session_key = $this->session_key;
    }

    $sessions = $database->read('cora\session', ['session_key' => $session_key]);
    if(count($sessions) === 1) {
      $database->update(
        'cora\session',
        [
          'session_id' => $sessions[0]['session_id'],
          'deleted' => 1
        ]
      );
      // Remove these if the current session got logged out.
      if($session_key === $this->session_key) {
        $this->session_key = null;
        $this->user_id = null;
      }
      return true;
    }

    return false;
  }

  /**
   * Get the user_id on this session. Useful for getting things like the
   * user_id for the currently logged in user.
   *
   * @return int The current user_id.
   */
  public function get_user_id() {
    return $this->user_id;
  }

  public function delete_user_id() {
    $this->user_id = null;
  }

  /**
   * Generate a random (enough) session key.
   *
   * @return string The generated session key.
   */
  private function generate_session_key() {
    return strtolower(sha1(uniqid(mt_rand(), true)));
  }

  /**
   * Sets a cookie. If you want to set custom cookies, use the
   * $additional_cookie_values argument on $session->create().
   *
   * @param string $name The name of the cookie.
   * @param mixed $value The value of the cookie.
   * @param int $expire When the cookie should expire.
   * @param bool $httponly True if the cookie should only be accessible on the
   * server.
   *
   * @throws \Exception If The cookie fails to set.
   */
  private function set_cookie($name, $value, $expire, $httponly = true) {
    $this->setting = setting::get_instance();
    $path = '/'; // The current directory that the cookie is being set in.
    $secure = $this->setting->get('force_ssl');

    preg_match(
      '/https?:\/\/(.*?)\//',
      $this->setting->get('beestat_root_uri'),
      $matches
    );
    $domain = $matches[1];

    $cookie_success = setcookie(
      $name,
      $value,
      $expire,
      $path,
      $domain,
      $secure,
      $httponly
    );

    if($cookie_success === false) {
      throw new \Exception('Failed to set cookie.', 1400);
    }
  }

  /**
   * Delete a cookie. This will remove the cookie value and set it to expire 1
   * day ago.
   *
   * @param string $name The name of the cookie to delete.
   */
  private function delete_cookie($name) {
    $this->set_cookie($name, '', time() - 86400);
  }

}
