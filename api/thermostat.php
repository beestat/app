<?php

/**
 * Any type of thermostat.
 *
 * @author Jon Ziebell
 */
class thermostat extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'sync',
      'dismiss_alert',
      'restore_alert'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 300 // 5 Minutes
  ];

  /**
   * Sync all thermostats for the current user with their associated service.
   */
  public function sync() {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return;
    }

    $lock_name = 'thermostat->sync(' . $this->session->get_user_id() . ')';
    $this->database->get_lock($lock_name);

    $this->api('ecobee_thermostat', 'sync');

    $this->api(
      'user',
      'update_sync_status',
      ['key' => 'thermostat']
    );

    $this->database->release_lock($lock_name);
  }

  /**
   * Dismiss an alert.
   *
   * @param int $thermostat_id
   * @param string $guid
   */
  public function dismiss_alert($thermostat_id, $guid) {
    $thermostat = $this->get($thermostat_id);
    foreach($thermostat['alerts'] as &$alert) {
      if($alert['guid'] === $guid) {
        $alert['dismissed'] = true;
        break;
      }
    }
    $this->update(
      [
        'thermostat_id' => $thermostat_id,
        'alerts' => $thermostat['alerts']
      ]
    );
  }

  /**
   * Restore a dismissed alert.
   *
   * @param int $thermostat_id
   * @param string $guid
   */
  public function restore_alert($thermostat_id, $guid) {
    $thermostat = $this->get($thermostat_id);
    foreach($thermostat['alerts'] as &$alert) {
      if($alert['guid'] === $guid) {
        $alert['dismissed'] = false;
        break;
      }
    }
    $this->update(
      [
        'thermostat_id' => $thermostat_id,
        'alerts' => $thermostat['alerts']
      ]
    );
  }
}
