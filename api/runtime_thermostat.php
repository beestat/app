<?php

/**
 * All of the raw thermostat data sits here. Many millions of rows.
 *
 * @author Jon Ziebell
 */
class runtime_thermostat extends cora\crud {

  public static $exposed = [
    'private' => [
      'read',
      'sync',
      'download'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 900, // 15 Minutes
    'read' => 900,  // 15 Minutes
  ];

  /**
   * The user_id column is not present on this table to reduce data overhead.
   * No public reads are performed on this table so as long as thermostat_id
   * is always used on reads in this class then this is fine.
   */
  public static $user_locked = false;

  /**
   * List of columns that are synced from ecobee.
   */
  private static $ecobee_columns = [
    'compCool1',         // compressor_1
    'compCool2',         // compressor_2
    'compHeat1',         // compressor_1
    'compHeat2',         // compressor_2
    'auxHeat1',          // auxiliary_heat_1
    'auxHeat2',          // auxiliary_heat_2
    'fan',               // fan
    'humidifier',        // accessory
    'dehumidifier',      // accessory
    'ventilator',        // accessory
    'economizer',        // accessory
    'hvacMode',          // system_mode
    'zoneAveTemp',       // indoor_temperature
    'zoneHumidity',      // indoor_humidity
    'outdoorTemp',       // outdoor_temperature
    'outdoorHumidity',   // outdoor_humidity
    'zoneCalendarEvent', // event_runtime_thermostat_text_id
    'zoneClimate',       // climate_runtime_thermostat_text_id
    'zoneCoolTemp',      // setpoint_cool
    'zoneHeatTemp'       // setpoint_heat
  ];

  /**
   * Main function for syncing thermostat data. Looks at the current state of
   * things and decides which direction (forwards or backwards) makes the most
   * sense.
   *
   * @param int $thermostat_id Optional thermostat_id to sync. If not set will
   * sync all thermostats attached to this user.
   */
  public function sync($thermostat_id = null) {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return;
    }

    set_time_limit(0);

    if($thermostat_id === null) {
      $thermostat_ids = array_keys(
        $this->api(
          'thermostat',
          'read_id',
          [
            'attributes' => [
              'inactive' => 0
            ]
          ]
        )
      );
    } else {
      $this->user_lock($thermostat_id);
      $thermostat_ids = [$thermostat_id];
    }

    foreach($thermostat_ids as $thermostat_id) {
      // Get a lock to ensure that this is not invoked more than once at a time
      // per thermostat.
      $lock_name = 'runtime->sync(' . $thermostat_id . ')';
      $this->database->get_lock($lock_name);

      $thermostat = $this->api('thermostat', 'get', $thermostat_id);

      if(
        $thermostat['sync_begin'] === $thermostat['first_connected'] ||
        (
          $thermostat['sync_begin'] !== null &&
          strtotime($thermostat['sync_begin']) <= strtotime('-1 year')
        )
      ) {
        $this->sync_forwards($thermostat_id);
      } else {
        $this->sync_backwards($thermostat_id);
      }

      // If only syncing one thermostat this will delay the sync of the other
      // thermostat. Not a huge deal, just FYI.
      $this->api(
        'user',
        'update_sync_status',
        [
          'key' => 'runtime'
        ]
      );

      $this->database->release_lock($lock_name);
    }
  }

  /**
   * Sync backwards. When running for the first time it will sync from now all
   * the way back to the first connected date. If it is called again it will
   * check to see if a full backwards sync has already completed. If it has,
   * it will throw an exception. If not, it will resume the backwards sync.
   *
   * @param int $thermostat_id
   */
  private function sync_backwards($thermostat_id) {
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    if($thermostat['sync_begin'] === $thermostat['first_connected']) {
      throw new \Exception('Full sync already performed; must call sync_forwards() now.', 10200);
    }

    if($thermostat['sync_begin'] === null) {
      // Sync from when the thermostat was first connected until now.
      $sync_begin = strtotime($thermostat['first_connected']);
      $sync_end = time();
    }
    else {
      // Sync from when the thermostat was first connected until sync_end.
      $sync_begin = strtotime($thermostat['first_connected']);
      $sync_end = strtotime($thermostat['sync_begin']);
    }

    // Only sync up to the past year of data. Outside of this there won't even
    // be a partition for the data to go into.
    $sync_begin = max(strtotime('-1 year'), $sync_begin);

    $chunk_begin = $sync_end;
    $chunk_end = $sync_end;

    /**
     * Loop over the dates and do the actual sync. Each chunk is wrapped in a
     * transaction for a little bit of protection against exceptions
     * introducing bad data and causing the whole sync to fail. Commit any
     * open transactions first though.
     */
    $this->database->commit_transaction();
    do {
      $this->database->start_transaction();

      $chunk_begin = strtotime('-1 week', $chunk_end);
      $chunk_begin = max($chunk_begin, $sync_begin);

      $this->sync_($thermostat['thermostat_id'], $chunk_begin, $chunk_end);

      // Update the thermostat with the current sync range
      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'sync_begin' => date('Y-m-d H:i:s', $chunk_begin),
            'sync_end' => date(
              'Y-m-d H:i:s',
              max(
                $sync_end,
                strtotime($thermostat['sync_end'])
              )
            )
          ]
        ]
      );

      // Populate on the fly.
      $this->api(
        'runtime_thermostat_summary',
        'populate',
        $thermostat_id
      );

      // Because I am doing day-level syncing this will end up fetching an
      // overlapping day of data every time. But if I properly switch this to
      // interval-level syncing this should be correct or at the very least
      // return a minimal one extra row of data.
      $chunk_end = $chunk_begin;

      $this->database->commit_transaction();
    } while ($chunk_begin > $sync_begin);
  }

  /**
   * Sync forwards from thermostat.sync_end until now. This should be used for
   * all syncs except the first one.
   *
   * @param int $thermostat_id
   */
  private function sync_forwards($thermostat_id) {
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    // Sync from the last sync time until now. Go a couple hours back in time to
    // cover that 1 hour delay.
    $sync_begin = strtotime($thermostat['sync_end'] . ' -2 hours');
    $sync_end = time();

    $chunk_begin = $sync_begin;
    $chunk_end = $sync_begin;

    // Loop over the dates and do the actual sync. Each chunk is wrapped in a
    // transaction for a little bit of protection against exceptions introducing
    // bad data and causing the whole sync to fail.
    do {
      $this->database->start_transaction();

      $chunk_end = strtotime('+1 week', $chunk_begin);
      $chunk_end = min($chunk_end, $sync_end);

      $this->sync_($thermostat['thermostat_id'], $chunk_begin, $chunk_end);

      // Update the thermostat with the current sync range
      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'sync_end' => date('Y-m-d H:i:s', $chunk_end)
          ]
        ]
      );

      $chunk_begin = strtotime('+1 day', $chunk_end);

      $this->database->commit_transaction();
    } while ($chunk_end < $sync_end);

    // Populate at the end of a full sync forwards.
    $this->api(
      'runtime_thermostat_summary',
      'populate',
      $thermostat_id
    );
  }

  /**
   * Get the runtime report data for a specified thermostat. Originally this
   * was basically a 1:1 import from ecobee. But due to the size of the data
   * this now does some fancy logic to merge certain columns down and alter
   * their data types just a bit.
   *
   * @param int $thermostat_id
   * @param int $begin
   * @param int $end
   */
  private function sync_($thermostat_id, $begin, $end) {
    $this->user_lock($thermostat_id);

    $thermostat = $this->api('thermostat', 'get', $thermostat_id);
    $ecobee_thermostat = $this->api('ecobee_thermostat', 'get', $thermostat['ecobee_thermostat_id']);

    /**
     * Round begin/end down to the next 5 minutes. This keep things tidy.
     * Without this, I would query for rows between 10:35:16, for example, and
     * not get the row at 10:35:00. But the interval function would return it
     * and then duplicate databse entry.
     */
    $begin = floor($begin / 300) * 300;
    $end = floor($end / 300) * 300;

    $begin_interval = $this->get_interval($begin);
    $end_interval = $this->get_interval($end);

    $begin_date = date('Y-m-d', $begin);
    $end_date = date('Y-m-d', $end);

    $response = $this->api(
      'ecobee',
      'ecobee_api',
      [
        'method' => 'GET',
        'endpoint' => 'runtimeReport',
        'arguments' => [
          'body' => json_encode([
            'selection' => [
              'selectionType' => 'thermostats',
              'selectionMatch' => $ecobee_thermostat['identifier']
            ],
            'startDate' => $begin_date,
            'endDate' => $end_date,
            'startInterval' => $begin_interval,
            'endInterval' => $end_interval,
            'columns' => implode(',', self::$ecobee_columns),
            'includeSensors' => false
          ])
        ]
      ]
    );

    /**
     * Read any existing rows from the database so we know if this is an
     * insert or an update. Note that even though I have $begin and $end
     * already defined, I always look in the database according to what ecobee
     * actually returned just in case the returned data goes outside of what I
     * requested for some reason.
     */
    $columns_begin = $this->get_columns(
      $response['reportList'][0]['rowList'][0]
    );
    $columns_end = $this->get_columns(
      $response['reportList'][0]['rowList'][count($response['reportList'][0]['rowList']) - 1]
    );

    $existing_rows = $this->database->read(
      'runtime_thermostat',
      [
        'thermostat_id' => $thermostat_id,
        'timestamp' => [
          'value' => [
            $this->get_utc_datetime(
              date(
                'Y-m-d H:i:s',
                strtotime($columns_begin['date'] . ' ' . $columns_begin['time'] . ' -1 hour')
              ),
              $thermostat['time_zone']
            ),
            $this->get_utc_datetime(
              $columns_end['date'] . ' ' . $columns_end['time'],
              $thermostat['time_zone']
            )
          ],
          'operator' => 'between'
        ]
      ]
    );

    $existing_timestamps = [];
    foreach($existing_rows as $existing_row) {
      $existing_timestamps[$existing_row['timestamp']] = $existing_row['runtime_thermostat_id'];
    }

    // Loop over the ecobee data
    foreach ($response['reportList'][0]['rowList'] as $row) {
      $columns = $this->get_columns($row);

      /**
       * If any of these values are null just throw the whole row away. This
       * should very rarely happen as ecobee reports 0 values. The driver of
       * this is the summary table...trying to aggregate sums for these values
       * is easy, but in order to accurately represent those sums I need to
       * know how many rows were included. I would have to store one count per
       * sum in the summary table to manage that...or just not store the data
       * to begin with.
       *
       * Also threw in null checks on a bunch of other fields just to simplify
       * the code later on. This happens so rarely that throwing away a whole
       * row for a null value shouldn't have any noticeable negative effect.
       *
       * Note: Don't ignore zoneHeatTemp or zoneCoolTemp. Sometimes those are
       * legit null as the thermostat may be for heat/cool only (see #160).
       */
      if(
        $columns['hvacMode'] === null ||
        $columns['zoneAveTemp'] === null ||
        $columns['zoneHumidity'] === null ||
        $columns['outdoorTemp'] === null ||
        $columns['outdoorHumidity'] === null ||
        $columns['compHeat1'] === null ||
        $columns['compHeat2'] === null ||
        $columns['compCool1'] === null ||
        $columns['compCool2'] === null ||
        $columns['auxHeat1'] === null ||
        $columns['auxHeat2'] === null ||
        $columns['fan'] === null ||
        $columns['humidifier'] === null ||
        $columns['dehumidifier'] === null ||
        $columns['ventilator'] === null ||
        $columns['economizer'] === null
      ) {
        continue;
      }

      // Date and time are first two columns of the returned data. It is
      // returned in thermostat time, so convert it to UTC first.
      $timestamp = $this->get_utc_datetime(
        $columns['date'] . ' ' . $columns['time'],
        $thermostat['time_zone']
      );

      $data = [];

      $data['thermostat_id'] = $thermostat_id;
      $data['timestamp'] = $timestamp;

      if ($columns['compCool1'] > 0 || $columns['compCool2'] > 0) {
        $data['compressor_mode'] = 'cool';
        $data['compressor_1'] = $columns['compCool1'] - $columns['compCool2'];
        $data['compressor_2'] = $columns['compCool2'];
      } else if ($columns['compHeat1'] > 0 || $columns['compHeat2'] > 0) {
        $data['compressor_mode'] = 'heat';
        $data['compressor_1'] = $columns['compHeat1'] - $columns['compHeat2'];
        $data['compressor_2'] = $columns['compHeat2'];
      } else {
        $data['compressor_mode'] = 'off';
        $data['compressor_1'] = 0;
        $data['compressor_2'] = 0;
      }

      $data['auxiliary_heat_1'] = $columns['auxHeat1'] - $columns['auxHeat2'];
      $data['auxiliary_heat_2'] = $columns['auxHeat2'];

      $data['fan'] = $columns['fan'];

      if($columns['humidifier'] > 0) {
        $data['accessory_type'] = 'humidifier';
        $data['accessory'] = $columns['humidifier'];
      } else if($columns['dehumidifier'] > 0) {
        $data['accessory_type'] = 'dehumidifier';
        $data['accessory'] = $columns['dehumidifier'];
      } else if($columns['ventilator'] > 0) {
        $data['accessory_type'] = 'ventilator';
        $data['accessory'] = $columns['ventilator'];
      } else if($columns['economizer'] > 0) {
        $data['accessory_type'] = 'economizer';
        $data['accessory'] = $columns['economizer'];
      } else {
        $data['accessory_type'] = 'off';
        $data['accessory'] = 0;
      }

      $system_modes = [
        'auto' => 'auto',
        'cool' => 'cool',
        'heat' => 'heat',
        'auxHeatOnly' => 'auxiliary_heat',
        'off' => 'off'
      ];
      $data['system_mode'] = $system_modes[$columns['hvacMode']];

      $data['indoor_temperature'] = $columns['zoneAveTemp'] * 10;
      $data['indoor_humidity'] = round($columns['zoneHumidity']);

      $data['outdoor_temperature'] = $columns['outdoorTemp'] * 10;
      $data['outdoor_humidity'] = round($columns['outdoorHumidity']);

      $data['event_runtime_thermostat_text_id'] = $this->api(
        'runtime_thermostat_text',
        'get_create',
        $columns['zoneCalendarEvent']
      )['runtime_thermostat_text_id'];
      $data['climate_runtime_thermostat_text_id'] = $this->api(
        'runtime_thermostat_text',
        'get_create',
        $columns['zoneClimate']
      )['runtime_thermostat_text_id'];

      $data['setpoint_cool'] = $columns['zoneCoolTemp'] * 10;
      $data['setpoint_heat'] = $columns['zoneHeatTemp'] * 10;

      // Create or update the database
      if(isset($existing_timestamps[$timestamp]) === true) {
        $data['runtime_thermostat_id'] = $existing_timestamps[$timestamp];
        $this->database->update('runtime_thermostat', $data, 'id');
      }
      else {
        $existing_timestamps[$timestamp] = $this->database->create('runtime_thermostat', $data, 'id');
      }
    }
  }

  /**
   * Get the ecobee "interval" value from a timestamp.
   *
   * @param string $timestamp The timestamp.
   *
   * @return int The interval.
   */
  private function get_interval($timestamp) {
    $hours = date('G', $timestamp);
    $minutes = date('i', $timestamp);

    return ($hours * 12) + floor($minutes / 5);
  }

  /**
   * Convert a string CSV row to cleaned up array of columns.
   *
   * @param string $row
   *
   * @return array
   */
  private function get_columns($row) {
    $return = [];

    $columns = explode(',', substr($row, 0, -1));
    $return['date'] = array_splice($columns, 0, 1)[0];
    $return['time'] = array_splice($columns, 0, 1)[0];

    for($i = 0; $i < count($columns); $i++) {
      $columns[$i] = trim($columns[$i]);
      $return[self::$ecobee_columns[$i]] = $columns[$i] === '' ? null : $columns[$i];
    }

    return $return;
  }

  /**
   * Convert a local datetime string to a UTC datetime string.
   *
   * @param string $local_datetime Local datetime string.
   * @param string $local_time_zone The local time zone to convert from.
   *
   * @return string The UTC datetime string.
   */
  private function get_utc_datetime($local_datetime, $local_time_zone) {
    $local_time_zone = new DateTimeZone($local_time_zone);
    $utc_time_zone = new DateTimeZone('UTC');
    $date_time = new DateTime($local_datetime, $local_time_zone);
    $date_time->setTimezone($utc_time_zone);

    return $date_time->format('Y-m-d H:i:s');
  }

  /**
   * Convert a UTC datetime string to a UTC datetime string.
   *
   * @param string $utc_datetime Local datetime string.
   * @param string $local_time_zone The local time zone to convert from.
   *
   * @return string The UTC datetime string.
   */
  private function get_local_datetime($utc_datetime, $local_time_zone) {
    $local_time_zone = new DateTimeZone($local_time_zone);
    $utc_time_zone = new DateTimeZone('UTC');
    $date_time = new DateTime($utc_datetime, $utc_time_zone);
    $date_time->setTimezone($local_time_zone);

    return $date_time->format('Y-m-d H:i:s');
  }

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
    $max_range = 2592000; // 30 days
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
      throw new \Exception('Max range is 30 days.', 10205);
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
   * Download all data that exists for a specific thermostat.
   *
   * @param int $thermostat_id
   * @param string $download_begin Optional; the date to begin the download.
   * @param string $download_end Optional; the date to end the download.
   */
  public function download($thermostat_id, $download_begin = null, $download_end = null) {
    set_time_limit(120);

    $this->user_lock($thermostat_id);

    $thermostat = $this->api('thermostat', 'get', $thermostat_id);
    $ecobee_thermostat = $this->api(
      'ecobee_thermostat',
      'get',
      $thermostat['ecobee_thermostat_id']
    );

    if($download_begin === null) {
      $download_begin = strtotime($thermostat['first_connected']);
    } else {
      $download_begin = strtotime($download_begin);
    }

    if($download_end === null) {
      $download_end = time();
    } else {
      $download_end = strtotime($download_end);
    }

    $chunk_begin = $download_begin;
    $chunk_end = $download_begin;

    $bytes = 0;

    $output = fopen('php://output', 'w');
    $needs_header = true;
    do {
      $chunk_end = strtotime('+1 week', $chunk_begin);
      $chunk_end = min($chunk_end, $download_end);

      $runtime_thermostats = $this->database->read(
        'runtime_thermostat',
        [
          'thermostat_id' => $thermostat_id,
          'timestamp' => [
            'value' => [date('Y-m-d H:i:s', $chunk_begin), date('Y-m-d H:i:s', $chunk_end)] ,
            'operator' => 'between'
          ]
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


      if ($needs_header === true && count($runtime_thermostats) > 0) {
        $headers = array_keys($runtime_thermostats[0]);

        // Remove the IDs and rename two columns.
        unset($headers[array_search('runtime_thermostat_id', $headers)]);
        unset($headers[array_search('thermostat_id', $headers)]);
        $headers[array_search('event_runtime_thermostat_text_id', $headers)] = 'event';
        $headers[array_search('climate_runtime_thermostat_text_id', $headers)] = 'climate';

        $bytes += fputcsv($output, $headers);
        $needs_header = false;
      }

      foreach($runtime_thermostats as $runtime_thermostat) {
        unset($runtime_thermostat['runtime_thermostat_id']);
        unset($runtime_thermostat['thermostat_id']);

        $runtime_thermostat['timestamp'] = $this->get_local_datetime(
          $runtime_thermostat['timestamp'],
          $thermostat['time_zone']
        );

        // Return temperatures in a human-readable format.
        foreach(['indoor_temperature', 'outdoor_temperature', 'setpoint_heat', 'setpoint_cool'] as $key) {
          if($runtime_thermostat[$key] !== null) {
            $runtime_thermostat[$key] /= 10;
          }
        }

        // Replace event and climate with their string values.
        if ($runtime_thermostat['event_runtime_thermostat_text_id'] !== null) {
          $runtime_thermostat['event_runtime_thermostat_text_id'] = $runtime_thermostat_texts[$runtime_thermostat['event_runtime_thermostat_text_id']]['value'];
        }

        if ($runtime_thermostat['climate_runtime_thermostat_text_id'] !== null) {
          $runtime_thermostat['climate_runtime_thermostat_text_id'] = $runtime_thermostat_texts[$runtime_thermostat['climate_runtime_thermostat_text_id']]['value'];
        }

        $bytes += fputcsv($output, $runtime_thermostat);
      }

      $chunk_begin = strtotime('+1 day', $chunk_end);
    } while ($chunk_end < $download_end);
    fclose($output);

    header('Content-type: text/csv');
    header('Content-Length: ' . $bytes);
    header('Content-Disposition: attachment; filename="Beestat Export - ' . $ecobee_thermostat['identifier'] . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');

    die();
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
