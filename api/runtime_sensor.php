<?php

/**
 * All of the raw sensor data sits here. Many millions of rows.
 *
 * @author Jon Ziebell
 */
class runtime_sensor extends cora\crud {

  public static $exposed = [
    'private' => [
      'read'
    ],
    'public' => []
  ];

  public static $cache = [
    'read' => 900 // 15 Minutes
  ];

  /**
   * The user_id column is not present on this table to reduce data overhead.
   * No public reads are performed on this table so as long as thermostat_id
   * is always used on reads in this class then this is fine.
   */
  public static $user_locked = false;

  /**
   * Read data from the runtime_sensor table. Basically just a crud read
   * but has custom security for thermostat_id since user_id is not on the
   * table.
   *
   * @param array $attributes Timestamps can be specified in any format. If no
   * time zone information is sent, UTC is assumed.
   * @param array $columns
   *
   * @return array
   */
  public function read($attributes = [], $columns = []) {
    $this->user_lock($attributes['sensor_id']);

    // Check for exceptions.
    if (isset($attributes['sensor_id']) === false) {
      throw new \Exception('Missing required attribute: sensor_id.', 10401);
    }

    if (isset($attributes['timestamp']) === false) {
      throw new \Exception('Missing required attribute: timestamp.', 10402);
    }

    if (
      is_array($attributes['timestamp']) === true &&
      in_array($attributes['timestamp']['operator'], ['>', '>=', '<', '<=']) === true &&
      is_array($attributes['timestamp']['value']) === true
    ) {
      if(count($attributes['timestamp']['value']) === 1) {
        $attributes['timestamp']['value'] = $attributes['timestamp']['value'][0];
      } else {
        throw new \Exception('Must only specify one timestamp value unless using the "between" operator.', 10404);
      }
    }

    $sensor = $this->api('sensor', 'get', $attributes['sensor_id']);
    $thermostat = $this->api('thermostat', 'get', $sensor['thermostat_id']);
    $max_range = 2678000; // 31 days
    if (
      (
        is_array($attributes['timestamp']) === true &&
        $attributes['timestamp']['operator'] === 'between' &&
        abs(strtotime($attributes['timestamp']['value'][0]) - strtotime($attributes['timestamp']['value'][1]))  > $max_range
      ) ||
      (
        is_array($attributes['timestamp']) === true &&
        in_array($attributes['timestamp']['operator'], ['>', '>=']) === true &&
        time() - strtotime($attributes['timestamp']['value']) > $max_range
      ) ||
      (
        is_array($attributes['timestamp']) === true &&
        in_array($attributes['timestamp']['operator'], ['<', '<=']) === true &&
        strtotime($attributes['timestamp']['value']) - min(strtotime($thermostat['first_connected']), strtotime($thermostat['sync_begin'])) > $max_range
      )
    ) {
      throw new \Exception('Max range is 31 days. ' . (time() - strtotime($attributes['timestamp']['value'])), 10405);
    }

    // Accept timestamps in roughly any format; always convert back to something nice and in UTC
    if (is_array($attributes['timestamp']['value']) === true) {
      $attributes['timestamp']['value'][0] = date('c', strtotime($attributes['timestamp']['value'][0]));
      $attributes['timestamp']['value'][1] = date('c', strtotime($attributes['timestamp']['value'][1]));
    } else {
      $attributes['timestamp']['value'] = date('c', strtotime($attributes['timestamp']['value']));
    }

    // Read the data.
    $runtime_sensors = $this->database->read(
      'runtime_sensor',
      [
        'timestamp' => $attributes['timestamp'],
        'sensor_id' => $attributes['sensor_id']
      ],
      [],
      'timestamp' // order by
    );

    // Clean up the data just a bit.
    foreach ($runtime_sensors as &$runtime_sensor) {
      $runtime_sensor['timestamp'] = date(
        'c',
        strtotime($runtime_sensor['timestamp'])
      );

      if ($runtime_sensor['temperature'] !== null) {
        $runtime_sensor['temperature'] /= 10;
      }

      // Normalize air quality from 0-350 to 0-100;
      if ($runtime_sensor['air_quality'] !== null) {
        $runtime_sensor['air_quality'] = round($runtime_sensor['air_quality'] / 350 * 100);
      }
    }

    return $runtime_sensors;
  }


  /**
   * Since this table does not have a user_id column, security must be handled
   * manually. Call this with a sensor_id to verify that the current user has
   * access to the requested sensor_id.
   *
   * @param int $sensor_id
   *
   * @throws \Exception If the current user doesn't have access to the
   * requested sensor.
   */
  private function user_lock($sensor_id) {
    $sensors = $this->api('sensor', 'read_id');
    if (isset($sensors[$sensor_id]) === false) {
      throw new \Exception('Invalid sensor_id.', 10403);
    }
  }

}
