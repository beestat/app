<?php

/**
 * All of the raw thermostat data sits here. Many millions of rows.
 *
 * @author Jon Ziebell
 */
class runtime_thermostat extends cora\crud {

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
   * Read data from the runtime_thermostat table. Basically just a crud read
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
    $this->user_lock($attributes['thermostat_id']);

    // Check for exceptions.
    if (isset($attributes['thermostat_id']) === false) {
      throw new \Exception('Missing required attribute: thermostat_id.', 10201);
    }

    if (isset($attributes['timestamp']) === false) {
      throw new \Exception('Missing required attribute: timestamp.', 10202);
    }

    if (
      is_array($attributes['timestamp']) === true &&
      in_array($attributes['timestamp']['operator'], ['>', '>=', '<', '<=']) === true &&
      is_array($attributes['timestamp']['value']) === true
    ) {
      if(count($attributes['timestamp']['value']) === 1) {
        $attributes['timestamp']['value'] = $attributes['timestamp']['value'][0];
      } else {
        throw new \Exception('Must only specify one timestamp value unless using the "between" operator.', 10204);
      }
    }

    $thermostat = $this->api('thermostat', 'get', $attributes['thermostat_id']);
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
      throw new \Exception('Max range is 31 days. ' . (time() - strtotime($attributes['timestamp']['value'])), 10205);
    }

    // Accept timestamps in roughly any format; always convert back to something nice and in UTC
    if (is_array($attributes['timestamp']['value']) === true) {
      $attributes['timestamp']['value'][0] = date('c', strtotime($attributes['timestamp']['value'][0]));
      $attributes['timestamp']['value'][1] = date('c', strtotime($attributes['timestamp']['value'][1]));
    } else {
      $attributes['timestamp']['value'] = date('c', strtotime($attributes['timestamp']['value']));
    }

    // Read the data.
    $runtime_thermostats = $this->database->read(
      'runtime_thermostat',
      [
        'timestamp' => $attributes['timestamp'],
        'thermostat_id' => $attributes['thermostat_id']
      ],
      [],
      'timestamp' // order by
    );

    // Get the appropriate runtime_thermostat_texts.
    $runtime_thermostat_text_ids = array_unique(array_merge(
      array_column($runtime_thermostats, 'event_runtime_thermostat_text_id'),
      array_column($runtime_thermostats, 'climate_runtime_thermostat_text_id')
    ));
    $runtime_thermostat_texts = $this->api(
      'runtime_thermostat_text',
      'read_id',
      [
        'attributes' => [
          'runtime_thermostat_text_id' => $runtime_thermostat_text_ids
        ]
      ]
    );

    // Clean up the data just a bit.
    foreach ($runtime_thermostats as &$runtime_thermostat) {
      $runtime_thermostat['timestamp'] = date(
        'c',
        strtotime($runtime_thermostat['timestamp'])
      );

      foreach([
        'indoor_temperature',
        'outdoor_temperature',
        'setpoint_cool',
        'setpoint_heat'
      ] as $key) {
        if ($runtime_thermostat[$key] !== null) {
          $runtime_thermostat[$key] /= 10;
        }
      }

      if ($runtime_thermostat['event_runtime_thermostat_text_id'] !== null) {
        $runtime_thermostat['event'] = $runtime_thermostat_texts[
          $runtime_thermostat['event_runtime_thermostat_text_id']
        ]['value'];
      } else {
        $runtime_thermostat['event'] = null;
      }
      unset($runtime_thermostat['event_runtime_thermostat_text_id']);

      if ($runtime_thermostat['climate_runtime_thermostat_text_id'] !== null) {
        $runtime_thermostat['climate'] = $runtime_thermostat_texts[
          $runtime_thermostat['climate_runtime_thermostat_text_id']
        ]['value'];
      } else {
        $runtime_thermostat['climate'] = null;
      }
      unset($runtime_thermostat['climate_runtime_thermostat_text_id']);
    }

    return $runtime_thermostats;
  }

  /**
   * Since this table does not have a user_id column, security must be handled
   * manually. Call this with a thermostat_id to verify that the current user
   * has access to the requested thermostat.
   *
   * @param int $thermostat_id
   *
   * @throws \Exception If the current user doesn't have access to the
   * requested thermostat.
   */
  private function user_lock($thermostat_id) {
    $thermostats = $this->api('thermostat', 'read_id');
    if (isset($thermostats[$thermostat_id]) === false) {
      throw new \Exception('Invalid thermostat_id.', 10203);
    }
  }

}
