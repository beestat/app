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
    'sync' => 180 // 3 Minutes
  ];

  /**
   * Normal read_id, but filter out unsupported sensor types.
   *
   * @param array $attributes
   * @param array $columns
   *
   * @return array
   */
  public function read_id($attributes = [], $columns = []) {
    $sensors = parent::read_id($attributes, $columns);

    $return = [];
    foreach($sensors as $sensor) {
      if (
        in_array(
          $sensor['type'],
          ['ecobee3_remote_sensor', 'thermostat']
        ) === true
      ) {
        $return[$sensor['sensor_id']] = $sensor;
      } else if (
        in_array(
          $sensor['type'],
          ['monitor_sensor', 'control_sensor']
        ) === true
      ) {
        /**
         * Support for these sensor types is rudimentary. It's enough to get
         * temperature but some of these legacy sensors split a single sensor
         * up into multiple sensors. For example, thermostat temperature,
         * humidity, and motion are three different sensors. Newer sensors
         * show up as a single sensor with more than one capability. To make
         * sense of this I would have to do a good deal of merging etc in the
         * GUI.
         *
         * I don't really think it's worth the clutter or the time investment.
         */
        foreach($sensor['capability'] as $capability) {
          if($capability['type'] === 'temperature') {
            $return[$sensor['sensor_id']] = $sensor;
          }
        }
      }
    }

    return $return;
  }

  /**
   * Sync all sensors for the current user. If we fail to get a lock, fail
   * silently (catch the exception) and just return false.
   *
   * @return boolean true if the sync ran, false if not.
   */
  public function sync() {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return;
    }

    try {
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
    } catch(cora\exception $e) {
      return false;
    }
  }

}
