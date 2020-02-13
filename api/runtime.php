<?php

/**
 * All of the raw thermostat data sits here. Many millions of rows.
 *
 * @author Jon Ziebell
 */
class runtime extends cora\api {

  public static $exposed = [
    'private' => [
      'sync',
      'download'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 900 // 15 Minutes
  ];

  /**
   * The user_id column is not present on this table to reduce data overhead.
   * No public reads are performed on this table so as long as thermostat_id
   * is always used on reads in this class then this is fine.
   */
  public static $user_locked = false;

  /**
   * Main function for syncing thermostat data. Looks at the current state of
   * things and decides which direction (forwards or backwards) makes the most
   * sense.
   *
   * @param int $thermostat_id Optional thermostat_id to sync. If not set will
   * sync all thermostats attached to this user.
   *
   * @return boolean true if the sync ran, false if not.
   */
  public function sync($thermostat_id = null) {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return;
    }

    set_time_limit(0);

    try {
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

          // Update data_begin one last time. This is updated as sync_backwards
          // runs, but after that it never gets updated to account for data
          // removed from the database.
          $runtime_thermostats = $this->database->read(
            'runtime_thermostat',
            [
              'thermostat_id' => $thermostat_id
            ],
            [],
            'timestamp',
            1
          );

          $this->api(
            'thermostat',
            'update',
            [
              'attributes' => [
                'thermostat_id' => $thermostat_id,
                'data_begin' => $runtime_thermostats[0]['timestamp']
              ]
            ]
          );
        } else {
          $this->sync_backwards($thermostat_id);
        }

        $this->database->release_lock($lock_name);
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
    } catch(cora\exception $e) {
      return false;
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
    $do_data_end = ($thermostat['data_end'] === null);
    do {
      $this->database->start_transaction();

      $chunk_begin = strtotime('-1 week', $chunk_end);
      $chunk_begin = max($chunk_begin, $sync_begin);

      $data_dates = $this->sync_($thermostat['thermostat_id'], $chunk_begin, $chunk_end);

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

      // Populate data_begin as we continue to sync backwards.
      if($data_dates['data_begin'] !== null) {
        $this->api(
          'thermostat',
          'update',
          [
            'attributes' => [
              'thermostat_id' => $thermostat['thermostat_id'],
              'data_begin' => date('Y-m-d H:i:s', $data_dates['data_begin'])
            ]
          ]
        );
      }

      // Populate data_begin the first loop iteration only.
      if ($do_data_end === true && $data_dates['data_end'] !== null) {
        $this->api(
          'thermostat',
          'update',
          [
            'attributes' => [
              'thermostat_id' => $thermostat['thermostat_id'],
              'data_end' => date('Y-m-d H:i:s', $data_dates['data_end'])
            ]
          ]
        );
        $do_data_end = false;
      }

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

    // Sync from the last data until now. You would think going backwards in
    // time is unnecessary, but there have been some ecobee bugs where their API
    // returns the wrong data. Frankly, this is easier than trying to be super
    // precise and then missing data. Three hours should be enough to catch
    // everything.
    $sync_begin = strtotime($thermostat['data_end'] . ' -3 hour');
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

      $data_dates = $this->sync_($thermostat['thermostat_id'], $chunk_begin, $chunk_end);

      // Update the thermostat with the current sync range. Property sync_end is
      // when we last synced data to. Property data_end is timestamp of the last
      // inserted/updated row.
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
      if ($data_dates['data_end'] !== null) {
        $this->api(
          'thermostat',
          'update',
          [
            'attributes' => [
              'thermostat_id' => $thermostat['thermostat_id'],
              'data_end' => date('Y-m-d H:i:s', $data_dates['data_end'])
            ]
          ]
        );
      }

      $chunk_begin = $chunk_end;

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
   *
   * @return array The first and last updated or inserted timestamp.
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
            'columns' => implode(
              ',',
              [
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
              ]
            ),
            'includeSensors' => true
          ])
        ]
      ]
    );

    $return = $this->sync_runtime_thermostat($thermostat, $response);
    $this->sync_runtime_sensor($thermostat, $response);

    return $return;
  }

  /**
   * Sync thermostat data.
   *
   * @param array $thermostat The thermostat.
   * @param array $response The ecobee API response.
   *
   * @return array The first and last timestamps created or updated in this
   * sync.
   */
  private function sync_runtime_thermostat($thermostat, $response) {
    $data_begin = null;
    $data_end = null;

    /**
     * Read any existing rows from the database so we know if this is an
     * insert or an update. Note that even though I have $begin and $end
     * already defined, I always look in the database according to what ecobee
     * actually returned just in case the returned data goes outside of what I
     * requested for some reason.
     */
    $ecobee_columns = array_merge(['date', 'time'], explode(',', $response['columns']));
    $columns_begin = $this->get_columns(
      $response['reportList'][0]['rowList'][0],
      $ecobee_columns
    );
    $columns_end = $this->get_columns(
      $response['reportList'][0]['rowList'][count($response['reportList'][0]['rowList']) - 1],
      $ecobee_columns
    );

    $existing_rows = $this->database->read(
      'runtime_thermostat',
      [
        'thermostat_id' => $thermostat['thermostat_id'],
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
              date(
                'Y-m-d H:i:s',
                strtotime($columns_end['date'] . ' ' . $columns_end['time'] . ' +1 hour')
              ),
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
      $columns = $this->get_columns(
        $row,
        $ecobee_columns
      );

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
        $columns['HVACmode'] === null ||
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

      $data['thermostat_id'] = $thermostat['thermostat_id'];
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

      // Ecobee does not report fan usage when it does not control the fan, so
      // this will mark the fan as running when certain equipment is on.
      $data['fan'] = max(
        $columns['fan'],
        $data['compressor_1'],
        $data['compressor_2'],
        $data['auxiliary_heat_1'],
        $data['auxiliary_heat_2'],
        $data['accessory']
      );

      $system_modes = [
        'auto' => 'auto',
        'cool' => 'cool',
        'heat' => 'heat',
        'auxHeatOnly' => 'auxiliary_heat',
        'off' => 'off'
      ];
      $data['system_mode'] = $system_modes[$columns['HVACmode']];

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

      if ($data_begin === null) {
        $data_begin = $timestamp;
      }
      $data_end = $timestamp;

      // Create or update the database
      if(isset($existing_timestamps[$timestamp]) === true) {
        $data['runtime_thermostat_id'] = $existing_timestamps[$timestamp];
        $this->database->update('runtime_thermostat', $data, 'id');
      }
      else {
        $existing_timestamps[$timestamp] = $this->database->create('runtime_thermostat', $data, 'id');
      }
    }

    return [
      'data_begin' => (($data_begin === null) ? null : strtotime($data_begin)),
      'data_end' => (($data_end === null) ? null : strtotime($data_end))
    ];
  }

  /**
   * Sync sensor data.
   *
   * @param array $thermostat The thermostat.
   * @param array $response The ecobee API response.
   */
  private function sync_runtime_sensor($thermostat, $response) {
    /**
     * Read any existing rows from the database so we know if this is an
     * insert or an update. Note that even though I have $begin and $end
     * already defined, I always look in the database according to what ecobee
     * actually returned just in case the returned data goes outside of what I
     * requested for some reason.
     */
    if (
      count($response['sensorList']) > 0 &&
      count($response['sensorList'][0]['data']) > 0
    ) {
      $ecobee_columns = $response['sensorList'][0]['columns'];
      $columns_begin = $this->get_columns(
        $response['sensorList'][0]['data'][0],
        $response['sensorList'][0]['columns']
      );
      $columns_end = $this->get_columns(
        $response['sensorList'][0]['data'][count($response['sensorList'][0]['data']) - 1],
        $ecobee_columns
      );

      // Get a list of sensors
      $sensors = $this->api(
        'sensor',
        'read',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id']
          ]
        ]
      );

      // Get a list of sensors indexed by code
      $sensors_by_identifier = [];
      foreach($sensors as $sensor) {
        $sensors_by_identifier[$sensor['identifier']] = $sensor;
      }

      $existing_rows = $this->database->read(
        'runtime_sensor',
        [
          'sensor_id' => array_column($sensors, 'sensor_id'),
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
                date(
                  'Y-m-d H:i:s',
                  strtotime($columns_end['date'] . ' ' . $columns_end['time'] . ' +1 hour')
                ),
                $thermostat['time_zone']
              )
            ],
            'operator' => 'between'
          ]
        ]
      );

      $existing_timestamps = [];
      foreach($existing_rows as $existing_row) {
        if (isset($existing_timestamps[$existing_row['sensor_id']]) === false) {
          $existing_timestamps[$existing_row['sensor_id']] = [];
        }
        $existing_timestamps[$existing_row['sensor_id']][$existing_row['timestamp']] = $existing_row['runtime_sensor_id'];
      }

      // Loop over the ecobee data. Ecobee if you're reading this please don't
      // format your identifiers like this in the future.
      foreach ($response['sensorList'][0]['data'] as $row) {
        $columns = $this->get_columns(
          $row,
          $ecobee_columns
        );

        $datas = [];

        foreach ($columns as $key => $value) {
          if ($key === 'date' || $key === 'time') {
            continue;
          }

          $sensor_identifier = substr($key, 0, strrpos($key, ':'));
          $capability_identifier = substr($key, strrpos($key, ':') + 1);

          /**
           * Most of the time the pattern is that a sensor will have an
           * identifier in the format XX:YY. Then the runtime report will
           * return data keyed by XX:YY:ZZ, where ZZ is the capability_id as
           * defined in sensor.capabilities.
           *
           * Some sensors have an identifier in the format XX:YY:ZZ, with a
           * single entry in the capabilities array with no id. This makes
           * little sense, but whatever. In these cases ecobee keys data by
           * XX:YY:ZZ in the runtime report. This is a different pattern which
           * has to be accounted for.
           *
           * For now I am simply ignoring this situation.
           */
          if (isset($sensors_by_identifier[$sensor_identifier]) === true) {
            $sensor = $sensors_by_identifier[$sensor_identifier];
            $sensor_id = $sensors_by_identifier[$sensor_identifier]['sensor_id'];

            if (isset($datas[$sensor['sensor_id']]) === false) {
              $datas[$sensor['sensor_id']] = [
                'sensor_id' => $sensor['sensor_id'],
                'timestamp' => $this->get_utc_datetime(
                  $columns['date'] . ' ' . $columns['time'],
                  $thermostat['time_zone']
                )
              ];
            }

            foreach($sensor['capability'] as $capability) {
              if(
                $capability['id'] == $capability_identifier &&
                in_array($capability['type'], ['temperature', 'occupancy']) === true
              ) {
                if ($value === null) {
                  continue 3; // If temperature or occupancy are null, ignore
                } else {
                  $datas[$sensor['sensor_id']][$capability['type']] = ($capability['type'] === 'temperature') ? ($value * 10) : $value;
                }
              }
            }
          }
        }

        // Create or update the database
        foreach ($datas as $data) {
          if(isset($existing_timestamps[$data['sensor_id']][$data['timestamp']]) === true) {
            $data['runtime_sensor_id'] = $existing_timestamps[$data['sensor_id']][$data['timestamp']];
            $this->database->update('runtime_sensor', $data, 'id');
          }
          else {
            $existing_timestamps[$data['sensor_id']][$data['timestamp']] = $this->database->create('runtime_sensor', $data, 'id');
          }
        }
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
   * @param string $row The CSV row string.
   * @param array $columns The column headers.
   *
   * @return array
   */
  private function get_columns($row, $columns) {
    $return = [];

    // Explode and remove trailing comma if present.
    if (substr($row, -1, 1) === ',') {
      $row = substr($row, 0, -1);
    }
    $data = explode(',', $row);

    for ($i = 0; $i < count($data); $i++) {
      $data[$i] = trim($data[$i]);
      $return[$columns[$i]] = $data[$i] === '' ? null : $data[$i];
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
   * Download all data that exists for a specific thermostat.
   *
   * @param int $thermostat_id
   * @param string $download_begin The timestamp to begin the download. If a
   * time zone is not specified, UTC is assumed.
   * @param string $download_end The timestamp to end the download. If a time
   * zone is not specified, UTC is assumed.
   */
  public function download($thermostat_id, $download_begin, $download_end) {
    set_time_limit(120);

    $this->user_lock($thermostat_id);

    $thermostat = $this->api('thermostat', 'get', $thermostat_id);
    $ecobee_thermostat = $this->api(
      'ecobee_thermostat',
      'get',
      $thermostat['ecobee_thermostat_id']
    );

    // Allow for inverted arguments.
    if (strtotime($download_end) < strtotime($download_begin)) {
      $temp = $download_begin;
      $download_begin = $download_end;
      $download_end = $temp;
    }

    // Clamp
    $download_begin = strtotime($download_begin);
    $download_begin = max(strtotime($thermostat['first_connected']), $download_begin);
    $download_begin = min(time(), $download_begin);

    $download_end = strtotime($download_end);
    $download_end = max(strtotime($thermostat['first_connected']), $download_end);
    $download_end = min(time(), $download_end);

    // Round begin/end down to the next 5 minutes.
    $download_begin = floor($download_begin / 300) * 300;
    $download_end = floor($download_end / 300) * 300;

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
            'value' => [date('Y-m-d H:i:s', $chunk_begin), date('Y-m-d H:i:s', $chunk_end)],
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

      $runtime_thermostats_by_timestamp = [];
      foreach($runtime_thermostats as $runtime_thermostat) {
        unset($runtime_thermostat['runtime_thermostat_id']);
        unset($runtime_thermostat['thermostat_id']);

        // Return temperatures in a human-readable format.
        foreach(['indoor_temperature', 'outdoor_temperature', 'setpoint_heat', 'setpoint_cool'] as $key) {
          if($runtime_thermostat[$key] !== null) {
            $runtime_thermostat[$key] /= 10;
            if(
              isset($thermostat['setting']['temperature_unit']) === true &&
              $thermostat['setting']['temperature_unit'] === '°C'
            ) {
              $runtime_thermostat[$key] =
                round(($runtime_thermostat[$key] - 32) * (5 / 9), 1);
            }
          }
        }

        // Replace event and climate with their string values.
        if ($runtime_thermostat['event_runtime_thermostat_text_id'] !== null) {
          $runtime_thermostat['event_runtime_thermostat_text_id'] = $runtime_thermostat_texts[$runtime_thermostat['event_runtime_thermostat_text_id']]['value'];
        }

        if ($runtime_thermostat['climate_runtime_thermostat_text_id'] !== null) {
          $runtime_thermostat['climate_runtime_thermostat_text_id'] = $runtime_thermostat_texts[$runtime_thermostat['climate_runtime_thermostat_text_id']]['value'];
        }

        $strtotime = strtotime($runtime_thermostat['timestamp']);
        $runtime_thermostats_by_timestamp[$strtotime] = $runtime_thermostat;

        // Now remove it since it's not used.
        unset($runtime_thermostats_by_timestamp[$strtotime]['timestamp']);
      }

      $current_timestamp = $chunk_begin;
      while($current_timestamp <= $chunk_end) {
        $local_datetime = $this->get_local_datetime(
          date('Y-m-d H:i:s', $current_timestamp),
          $thermostat['time_zone']
        );

        if(isset($runtime_thermostats_by_timestamp[$current_timestamp]) === true) {
          $csv_row = array_merge(
            [$local_datetime],
            $runtime_thermostats_by_timestamp[$current_timestamp]
          );
        } else {
          $csv_row = [$local_datetime];
        }
        $bytes += fputcsv($output, $csv_row);
        $current_timestamp += 300;
      }

      $chunk_begin = $chunk_end;
    } while ($chunk_end < $download_end);
    fclose($output);

    $this->cora->set_headers([
      'Content-Type' => 'text/csv',
      'Content-Length' => $bytes,
      'Content-Disposition' => 'attachment; filename="Beestat Export - ' . $ecobee_thermostat['identifier'] . '.csv"',
      'Pragma' => 'no-cache',
      'Expires' => '0',
    ], true);
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
