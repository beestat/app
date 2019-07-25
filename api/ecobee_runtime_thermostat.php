<?php

/**
 * All of the raw thermostat data sits here. Many millions of rows.
 *
 * @author Jon Ziebell
 */
class ecobee_runtime_thermostat extends cora\crud {

  public static $exposed = [
    'private' => [
      'get_recent_activity',
      'get_aggregate_runtime',
      'sync'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 3600, // 1 Hour
    'get_recent_activity' => 300, // 5 Minutes
    'get_aggregate_runtime' => 3600, // 1 Hour
  ];

  public static $converged = [];

  public static $user_locked = true;

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
      $thermostat_ids = [$thermostat_id];
    }

    foreach($thermostat_ids as $thermostat_id) {
      // Get a lock to ensure that this is not invoked more than once at a time
      // per thermostat.
      $lock_name = 'ecobee_runtime_thermostat->sync(' . $thermostat_id . ')';
      $this->database->get_lock($lock_name);

      $thermostat = $this->api('thermostat', 'get', $thermostat_id);

      if($thermostat['sync_begin'] !== $thermostat['first_connected']) {
        $this->sync_backwards($thermostat_id);
      } else {
        $this->sync_forwards($thermostat_id);
      }

      // TODO: If only syncing one thermostat this will delay the sync of the
      // other thermostat. Not a huge deal, just FYI.
      $this->api(
        'user',
        'update_sync_status',
        [
          'key' => 'ecobee_runtime_thermostat'
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
      throw new \Exception('Full sync already performed; must call sync_forwards() now.');
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

    $chunk_begin = $sync_end;
    $chunk_end = $sync_end;

    // Loop over the dates and do the actual sync. Each chunk is wrapped in a
    // transaction for a little bit of protection against exceptions introducing
    // bad data and causing the whole sync to fail.
    do {
      $this->database->start_transaction();

      $chunk_begin = strtotime('-1 week', $chunk_end);
      $chunk_begin = max($chunk_begin, $sync_begin);

      $this->sync_($thermostat['ecobee_thermostat_id'], $chunk_begin, $chunk_end);

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

    // Sync from the last sync time until now.
    $sync_begin = strtotime($thermostat['sync_end']);
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

      $this->sync_($thermostat['ecobee_thermostat_id'], $chunk_begin, $chunk_end);

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
  }

  /**
   * Get the runtime report data for a specified thermostat.
   *
   * @param int $ecobee_thermostat_id
   * @param int $begin
   * @param int $end
   */
  private function sync_($ecobee_thermostat_id, $begin, $end) {
    $ecobee_thermostat = $this->api('ecobee_thermostat', 'get', $ecobee_thermostat_id);

    /**
     * TODO: There is some issue related to the sync where we can miss small
     * chunks of time if begin/end are the same day or something like that. It
     * seems to happen around UTC 00:00:00 so 7:00pm or so local time. This
     * happens to fix it by forcing sycing backwards by an extra day so that
     * chunk of time can't be missed. Need to properly fix...maybe next time I
     * take a pass at the syncing...
     */
    if(date('Y-m-d', $begin) === date('Y-m-d', $end)) {
      $begin = strtotime('-1 day', $begin);
    }

    $begin = date('Y-m-d', $begin);
    $end = date('Y-m-d', $end);

    $columns = [
      'auxHeat1' => 'auxiliary_heat_1',
      'auxHeat2' => 'auxiliary_heat_2',
      'auxHeat3' => 'auxiliary_heat_3',
      'compCool1' => 'compressor_cool_1',
      'compCool2' => 'compressor_cool_2',
      'compHeat1' => 'compressor_heat_1',
      'compHeat2' => 'compressor_heat_2',
      'dehumidifier' => 'dehumidifier',
      'dmOffset' => 'demand_management_offset',
      'economizer' => 'economizer',
      'fan' => 'fan',
      'humidifier' => 'humidifier',
      'hvacMode' => 'hvac_mode',
      'outdoorHumidity' => 'outdoor_humidity',
      'outdoorTemp' => 'outdoor_temperature',
      'sky' => 'sky',
      'ventilator' => 'ventilator',
      'wind' => 'wind',
      'zoneAveTemp' => 'zone_average_temperature',
      'zoneCalendarEvent' => 'zone_calendar_event',
      'zoneClimate' => 'zone_climate',
      'zoneCoolTemp' => 'zone_cool_temperature',
      'zoneHeatTemp' => 'zone_heat_temperature',
      'zoneHumidity' => 'zone_humidity',
      'zoneHumidityHigh' => 'zone_humidity_high',
      'zoneHumidityLow' => 'zone_humidity_low',
      'zoneHvacMode' => 'zone_hvac_mode',
      'zoneOccupancy' => 'zone_occupancy'
    ];

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
            'startDate' => $begin,
            'endDate' => $end,
            'columns' => implode(',', array_keys($columns)),
            'includeSensors' => false
          ])
        ]
      ]
    );

    $time_zone_offset = $ecobee_thermostat['json_location']['timeZoneOffsetMinutes'];

    foreach($response['reportList'][0]['rowList'] as $row) {
      // Prepare the row!
      $row = substr($row, 0, -1); // Strip the trailing comma,
      $row = explode(',', $row);
      $row = array_map('trim', $row);

      // Date and time are first two columns of the returned data. It is
      // returned in thermostat time, so convert it to UTC first.
      list($date, $time) = array_splice($row, 0, 2);
      $timestamp = date(
        'Y-m-d H:i:s',
        strtotime(
          $date . ' ' . $time . ' ' . ($time_zone_offset < 0 ? '+' : '-') . abs($time_zone_offset) . ' minute'
        )
      );

      $data = [
        'ecobee_thermostat_id' => $ecobee_thermostat_id,
        'timestamp' => $timestamp
      ];

      $i = 0;
      foreach($columns as $ecobee_key => $database_key) {
        $data[$database_key] = ($row[$i] === '' ? null : $row[$i]);
        $i++;
      }

      $existing_rows = $this->read([
        'ecobee_thermostat_id' => $ecobee_thermostat_id,
        'timestamp' => $timestamp
      ]);

      if(count($existing_rows) > 0) {
        $data['ecobee_runtime_thermostat_id'] = $existing_rows[0]['ecobee_runtime_thermostat_id'];
        $this->update($data);
      }
      else {
        $this->create($data);
      }
    }
  }

  /**
   * Query thermostat data and aggregate the results.
   *
   * @param int $ecobee_thermostat_id Thermostat to get data for.
   * @param string $time_period day|week|month|year|all
   * @param string $group_by hour|day|week|month|year
   * @param int $time_count How many time periods to include.
   *
   * @return array The aggregate runtime data.
   */
  public function get_aggregate_runtime($ecobee_thermostat_id, $time_period, $group_by, $time_count) {
    if(in_array($time_period, ['day', 'week', 'month', 'year', 'all']) === false) {
      throw new Exception('Invalid time period');
    }

    $ecobee_thermostat = $this->api('ecobee_thermostat', 'get', $ecobee_thermostat_id);
    $this->database->set_time_zone($ecobee_thermostat['json_location']['timeZoneOffsetMinutes']);

    $select = [];
    $group_by_order_by = [];
    switch($group_by) {
      case 'week':
        /**
         * Week is a special case. If grouping by week, month, year, you can
         * get one week listed twice if it spans across months. So the month
         * group by is undesirable in this case.
         *
         * The second argument of 3 to the yearweek() function will cause
         * MySQL to return the ISO 8601 week of the year.
         *
         * https://stackoverflow.com/a/11804076
         */
        $select[] = 'yearweek(`timestamp`, 3) `yearweek`';
        $group_by_order_by[] = 'yearweek(`timestamp`, 3)';
      break;
      case 'day':
        $select[] = 'day(`timestamp`) `day`';
        $group_by_order_by[] = 'day(`timestamp`)';
      case 'month':
        $select[] = 'month(`timestamp`) `month`';
        $group_by_order_by[] = 'month(`timestamp`)';
      case 'year':
        $select[] = 'year(`timestamp`) `year`';
        $group_by_order_by[] = 'year(`timestamp`)';
      break;
    }
    $group_by_order_by = array_reverse($group_by_order_by);

    /**
     * Determine the appropriate start date. See #139 for more info. Basically
     * this allows you to select "Past 2 months, grouped by month" and get
     * data starting at the first of the previous month until now, instead of
     * data starting 60 days ago which may include a third month.
     */
    switch($time_period) {
      case 'week':
        $start = 'date_format(now() - interval ' . (intval($time_count) - 1) . ' ' . $time_period . ' - interval (date_format(now(), "%w") - 1) day, "%Y-%m-%d 00:00:00")';
      break;
      case 'day':
        $start = 'date_format(now() - interval ' . (intval($time_count) - 1) . ' ' . $time_period . ', "%Y-%m-%d 00:00:00")';
      break;
      case 'month':
        $start = 'date_format(now() - interval ' . (intval($time_count) - 1) . ' ' . $time_period . ', "%Y-%m-01 00:00:00")';
      break;
      case 'year':
        $start = 'date_format(now() - interval ' . (intval($time_count) - 1) . ' ' . $time_period . ', "%Y-01-01 00:00:00")';
      break;
    }

    /**
     * This is a smidge sloppy but it gets the job done. Basically need to
     * subtract all higher tier heat/cool modes from the lower ones to avoid
     * double-counting.
     */
    $select[] = 'count(*) `count`';
    $select[] = 'cast(avg(`outdoor_temperature`) as decimal(4,1)) `average_outdoor_temperature`';
    $select[] = 'cast(min(`outdoor_temperature`) as decimal(4,1)) `min_outdoor_temperature`';
    $select[] = 'cast(max(`outdoor_temperature`) as decimal(4,1)) `max_outdoor_temperature`';
    $select[] = 'cast(avg(`zone_average_temperature`) as decimal(4,1)) `zone_average_temperature`';
    $select[] = 'cast(avg(`zone_heat_temperature`) as decimal(4,1)) `zone_heat_temperature`';
    $select[] = 'cast(avg(`zone_cool_temperature`) as decimal(4,1)) `zone_cool_temperature`';
    $select[] = 'cast(sum(greatest(0, (cast(`compressor_heat_1` as signed) - cast(`compressor_heat_2` as signed)))) as unsigned) `compressor_heat_1`';
    $select[] = 'cast(sum(`compressor_heat_2`) as unsigned) `compressor_heat_2`';
    $select[] = 'cast(sum(greatest(0, (cast(`auxiliary_heat_1` as signed) - cast(`auxiliary_heat_2` as signed) - cast(`auxiliary_heat_3` as signed)))) as unsigned) `auxiliary_heat_1`';
    $select[] = 'cast(sum(greatest(0, (cast(`auxiliary_heat_2` as signed) - cast(`auxiliary_heat_3` as signed)))) as unsigned) `auxiliary_heat_2`';
    $select[] = 'cast(sum(`auxiliary_heat_3`) as unsigned) `auxiliary_heat_3`';
    $select[] = 'cast(sum(greatest(0, (cast(`compressor_cool_1` as signed) - cast(`compressor_cool_2` as signed)))) as unsigned) `compressor_cool_1`';
    $select[] = 'cast(sum(`compressor_cool_2`) as unsigned) `compressor_cool_2`';

    // The zone_average_temperature check is for if data exists in the table but
    // is otherwise likely to be all null (like the bad data from February
    // 2019).
    $query = '
      select ' .
        implode(',', $select) . ' ' . '
      from
        `ecobee_runtime_thermostat`
      where
            `user_id` = ' . $this->session->get_user_id() . '
        and `ecobee_thermostat_id` = "' . $this->database->escape($ecobee_thermostat_id) . '" ' .
        ($time_period !== 'all' ? ('and `timestamp` >= ' . $start) : '') . '
        and `timestamp` <= now()
        and `zone_average_temperature` is not null
    ';

    if(count($group_by_order_by) > 0) {
      $query .= 'group by ' .
        implode(', ', $group_by_order_by) . '
      order by ' .
        implode(', ', $group_by_order_by);
    }

    $result = $this->database->query($query);
    $return = [];
    while($row = $result->fetch_assoc()) {
      // Cast to floats for nice responses. The database normally handles this
      // in regular read operations.
      foreach(['average_outdoor_temperature', 'min_outdoor_temperature', 'max_outdoor_temperature', 'zone_average_temperature', 'zone_heat_temperature', 'zone_cool_temperature'] as $key) {
        if($row[$key] !== null) {
          $row[$key] = (float) $row[$key];
        }
      }

      if(isset($row['yearweek']) === true) {
        $row['year'] = (int) substr($row['yearweek'], 0, 4);
        $row['week'] = (int) substr($row['yearweek'], 4);
        unset($row['yearweek']);
      }

      $return[] = $row;
    }

    $this->database->set_time_zone(0);

    return $return;
  }

  /**
   * Get recent thermostat activity. Max range is 30 days.
   *
   * @param int $ecobee_thermostat_id Thermostat to get data for.
   * @param string $begin Begin date/time.
   * @param string $end End date/time.
   *
   * @return array The rows in the desired date range.
   */
  public function get_recent_activity($ecobee_thermostat_id, $begin, $end) {
    $thermostat = $this->api(
      'thermostat',
      'get',
      [
        'attributes' => [
          'ecobee_thermostat_id' => $ecobee_thermostat_id
        ]
      ]
    );

    $ecobee_thermostat = $this->api('ecobee_thermostat', 'get', $thermostat['ecobee_thermostat_id']);
    $this->database->set_time_zone($ecobee_thermostat['json_location']['timeZoneOffsetMinutes']);

    $offset = $ecobee_thermostat['json_location']['timeZoneOffsetMinutes'];
    $end = ($end === null ? (time() + ($offset * 60)) : strtotime($end));
    $begin = ($begin === null ? strtotime('-14 day', $end) : strtotime($begin));

    if(($end - $begin) > 2592000) {
      throw new Exception('Date range exceeds maximum of 30 days.');
    }

    $query = '
      select
        `ecobee_thermostat_id`,
        `ecobee_runtime_thermostat_id`,
        `timestamp`,

        cast(greatest(0, (cast(`compressor_heat_1` as signed) - cast(`compressor_heat_2` as signed))) as unsigned) `compressor_heat_1`,
        `compressor_heat_2`,
        cast(greatest(0, (cast(`auxiliary_heat_1` as signed) - cast(`auxiliary_heat_2` as signed) - cast(`auxiliary_heat_3` as signed))) as unsigned) `auxiliary_heat_1`,
        cast(greatest(0, (cast(`auxiliary_heat_2` as signed) - cast(`auxiliary_heat_3` as signed))) as unsigned) `auxiliary_heat_2`,
        `auxiliary_heat_3`,
        cast(greatest(0, (cast(`compressor_cool_1` as signed) - cast(`compressor_cool_2` as signed))) as unsigned) `compressor_cool_1`,
        `compressor_cool_2`,

        `fan`,
        `dehumidifier`,
        `economizer`,
        `humidifier`,
        `ventilator`,
        `hvac_mode`,
        `outdoor_temperature`,
        `zone_average_temperature`,
        `zone_heat_temperature`,
        `zone_cool_temperature`,
        `zone_humidity`,
        `outdoor_humidity`,
        `zone_calendar_event`,
        `zone_climate`
      from
        `ecobee_runtime_thermostat`
      where
            `user_id` = ' . $this->database->escape($this->session->get_user_id()) . '
        and `ecobee_thermostat_id` = ' . $this->database->escape($ecobee_thermostat_id) . '
        and `timestamp` >= ' . $this->database->escape(date('Y-m-d H:i:s', $begin)) . '
        and `timestamp` <= ' . $this->database->escape(date('Y-m-d H:i:s', $end)) . '
      order by
        timestamp
    ';

    $result = $this->database->query($query);

    $return = [];
    while($row = $result->fetch_assoc()) {
      $return[] = $row;
    }

    $this->database->set_time_zone(0);

    return $return;
  }

}
