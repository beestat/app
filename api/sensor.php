<?php

/**
 * Sensor for any thermostat type.
 *
 * @author Jon Ziebell
 */
class sensor extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'sync'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 300 // 5 Minutes
  ];

  public static $converged = [];

  public static $user_locked = true;

  /**
   * Sync all sensors connected to this account. Once Nest support is
   * added this will need to check for all connected accounts and run the
   * appropriate ones.
   */
  public function sync() {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return;
    }

    $lock_name = 'sensor->sync(' . $this->session->get_user_id() . ')';
    $this->database->get_lock($lock_name);

    $this->api('ecobee_sensor', 'sync');

    $this->api(
      'user',
      'update_sync_status',
      [
        'key' => 'sensor'
      ]
    );

    $this->database->release_lock($lock_name);
  }

}
