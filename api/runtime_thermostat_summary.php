<?php

/**
 * Summary table for runtime_thermostat.
 *
 * @author Jon Ziebell
 */
class runtime_thermostat_summary extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'sync'
    ],
    'public' => []
  ];

  public static $cache = [
    // Can't have these on right now because beestat loads and fires this API
    // call off. Then it syncs all the data and calls these again to get updated
    // data...if they're cached that just returns empty. So need to be able to
    // bypass the cache or something to get that to work. Or just don't call the
    // API call to begin with on first load if there's nothing there.

    // 'read' => 3600,  // 1 hour
    // 'read_id' => 3600,  // 1 hour
  ];

  /**
   * Read from the runtime_thermostat_summary table. Fixes temperature columns
   * to return as decimals.
   *
   * @param array $attributes
   * @param array $columns
   *
   * @return array
   */
  public function read($attributes = [], $columns = []) {
    $thermostats = $this->api('thermostat', 'read_id');

    if(isset($attributes['thermostat_id']) === true) {
      $thermostat_ids = [$attributes['thermostat_id']];
    } else {
      $thermostat_ids = array_keys($thermostats);
    }

    $runtime_thermostat_summaries = [];
    foreach($thermostat_ids as $thermostat_id) {
      $thermostat = $thermostats[$thermostat_id];
      $attributes['thermostat_id'] = $thermostat_id;

      // Get a base time for relative calculations
      $local_time_zone = new DateTimeZone($thermostat['time_zone']);
      $utc_time_zone = new DateTimeZone('UTC');
      $date_time = new DateTime(date('Y-m-d H:i:s'), $utc_time_zone);
      $date_time->setTimezone($local_time_zone);

      if($date_time->getOffset() < 0) {
        $base = strtotime($date_time->getOffset() . ' seconds');
      } else {
        $base = strtotime('+' . $date_time->getOffset() . ' seconds');
      }

      // If a date was given, apply the base time adjustment to correct for time
      // zones.
      if(isset($attributes['date']) === true) {
        if(is_array($attributes['date']) === true) {
          $attributes['date']['value'] = date(
            'Y-m-d',
            strtotime($attributes['date']['value'], $base)
          );
        } else {
          $attributes['date'] = date(
            'Y-m-d',
            strtotime($attributes['date'], $base)
          );
        }
      }

      $runtime_thermostat_summaries = array_merge(
        $runtime_thermostat_summaries,
        parent::read($attributes, $columns)
      );
    }

    foreach($runtime_thermostat_summaries as &$runtime_thermostat_summary) {
      $runtime_thermostat_summary['avg_outdoor_temperature'] /= 10;
      $runtime_thermostat_summary['min_outdoor_temperature'] /= 10;
      $runtime_thermostat_summary['max_outdoor_temperature'] /= 10;
      $runtime_thermostat_summary['avg_indoor_temperature'] /= 10;
      $runtime_thermostat_summary['sum_heating_degree_days'] /= 10;
      $runtime_thermostat_summary['sum_cooling_degree_days'] /= 10;
    }

    return $runtime_thermostat_summaries;
  }

  /**
   * Populate from the max populated date until now.
   *
   * @param int $thermostat_id
   */
  public function populate_forwards($thermostat_id) {
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    $query = '
      select
        max(`date`) `max_date`
        #"2021-01-20" `max_date`
      from
        `runtime_thermostat_summary`
      where
            `user_id` = ' . $this->database->escape($this->session->get_user_id()) . '
        and `thermostat_id` = ' . $this->database->escape($thermostat_id) . '
    ';
    $result = $this->database->query($query);
    $row = $result->fetch_assoc();

    if($row['max_date'] === null) {
      if($thermostat['data_begin'] === null) {
        $populate_begin = strtotime($thermostat['first_connected']);
      } else {
        $populate_begin = strtotime($thermostat['data_begin']); // Just grab everything
      }
    } else {
      $populate_begin = strtotime($row['max_date']);
    }
    $populate_end = time();

    $populate_begin = date('Y-m-d', $populate_begin);
    $populate_end = date('Y-m-d', $populate_end);

    return $this->populate($thermostat_id, $populate_begin, $populate_end);
  }

  /**
   * Populate from the beginning of time until the min populated date.
   *
   * @param int $thermostat_id
   */
  public function populate_backwards($thermostat_id) {
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    // If there's no data do nothing.
    if ($thermostat['data_begin'] === null) {
      return;
    }

    $query = '
      select
        min(`date`) `min_date`
      from
        `runtime_thermostat_summary`
      where
            `user_id` = ' . $this->database->escape($this->session->get_user_id()) . '
        and `thermostat_id` = ' . $this->database->escape($thermostat_id) . '
    ';
    $result = $this->database->query($query);
    $row = $result->fetch_assoc();

    if($row['min_date'] === null) {
      $populate_end = time();
    } else {
      // Include
      $populate_end = strtotime($row['min_date']);
    }
    $populate_begin = strtotime($thermostat['data_begin']);

    $populate_begin = date('Y-m-d', $populate_begin);
    $populate_end = date('Y-m-d', $populate_end);

    $this->populate($thermostat_id, $populate_begin, $populate_end);
  }

  /**
   * Populate the runtime_thermostat_summary table.
   *
   * @param int $thermostat_id
   * @param string $populate_begin Local date to begin populating, inclusive.
   * @param string $populate_end Local date to end populating, inclusive.
   */
  public function populate($thermostat_id, $populate_begin, $populate_end) {
    $degree_days_base_temperature = 650; // 65°F * 10 (database storage)
    $degree_days_base_time_interval = 5 / 1440; // 5 minutes out of 1440 minutes per day.

    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    // Convert date strings to timestamps to make them easier to work with.
    $populate_begin = strtotime($populate_begin . ' 00:00:00');
    $populate_end = strtotime($populate_end . ' 23:59:59');

    $chunk_begin = $populate_begin;
    $chunk_end = $populate_begin;

    $data = [];
    do {
      $chunk_end = strtotime('+1 week', $chunk_begin);

      // MySQL "between" is inclusive so go back 5 minutes to avoid
      // double-counting rows.
      $chunk_end = strtotime('-5 minute', $chunk_end);

      // Don't overshoot into data that's already populated
      $chunk_end = min($chunk_end, $populate_end);

      $chunk_begin_datetime = get_utc_datetime(
        date('Y-m-d H:i:s', $chunk_begin),
        $thermostat['time_zone']
      );

      $chunk_end_datetime = get_utc_datetime(
        date('Y-m-d H:i:s', $chunk_end),
        $thermostat['time_zone']
      );

      $runtime_thermostats = $this->api(
        'runtime_thermostat',
        'read',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'timestamp' => [
              'operator' => 'between',
              'value' => [$chunk_begin_datetime, $chunk_end_datetime]
            ]
          ]
        ]
      );

      foreach($runtime_thermostats as $runtime_thermostat) {
        $date = get_local_datetime(
          $runtime_thermostat['timestamp'],
          $thermostat['time_zone'],
          'Y-m-d'
        );

        if(isset($data[$date]) === false) {
          $data[$date] = [
            'count' => 0,
            'sum_fan' => 0,
            'min_outdoor_temperature' => INF,
            'max_outdoor_temperature' => -INF,
            'sum_auxiliary_heat_1' => 0,
            'sum_auxiliary_heat_2' => 0,
            'sum_compressor_cool_1' => 0,
            'sum_compressor_cool_2' => 0,
            'sum_compressor_heat_1' => 0,
            'sum_compressor_heat_2' => 0,
            'sum_humidifier' => 0,
            'sum_dehumidifier' => 0,
            'sum_ventilator' => 0,
            'sum_economizer' => 0,
            'sum_heating_degree_days' => 0,
            'sum_cooling_degree_days' => 0,
            'avg_outdoor_temperature' => [],
            'avg_outdoor_humidity' => [],
            'avg_indoor_temperature' => [],
            'avg_indoor_humidity' => []
          ];
        }

        if($runtime_thermostat['outdoor_temperature'] !== null) {
          $runtime_thermostat['outdoor_temperature'] *= 10;
        }

        $runtime_thermostat['indoor_temperature'] *= 10;

        $data[$date]['count']++;
        $data[$date]['sum_fan'] += $runtime_thermostat['fan'];

        if ($runtime_thermostat['outdoor_temperature'] !== null) {
          $data[$date]['min_outdoor_temperature'] = min($runtime_thermostat['outdoor_temperature'], $data[$date]['min_outdoor_temperature']);
          $data[$date]['max_outdoor_temperature'] = max($runtime_thermostat['outdoor_temperature'], $data[$date]['max_outdoor_temperature']);
        }

        $data[$date]['sum_auxiliary_heat_1'] += $runtime_thermostat['auxiliary_heat_1'];
        $data[$date]['sum_auxiliary_heat_2'] += $runtime_thermostat['auxiliary_heat_2'];

        if($runtime_thermostat['compressor_mode'] === 'cool') {
          $data[$date]['sum_compressor_cool_1'] += $runtime_thermostat['compressor_1'];
          $data[$date]['sum_compressor_cool_2'] += $runtime_thermostat['compressor_2'];
        } else if($runtime_thermostat['compressor_mode'] === 'heat') {
          $data[$date]['sum_compressor_heat_1'] += $runtime_thermostat['compressor_1'];
          $data[$date]['sum_compressor_heat_2'] += $runtime_thermostat['compressor_2'];
        }

        if($runtime_thermostat['accessory_type'] === 'humidifier') {
          $data[$date]['sum_humidifier'] += $runtime_thermostat['accessory'];
        } else if($runtime_thermostat['compressor_mode'] === 'dehumidifier') {
          $data[$date]['sum_dehumidifier'] += $runtime_thermostat['accessory'];
        } else if($runtime_thermostat['compressor_mode'] === 'ventilator') {
          $data[$date]['sum_ventilator'] += $runtime_thermostat['accessory'];
        } else if($runtime_thermostat['compressor_mode'] === 'economizer') {
          $data[$date]['sum_economizer'] += $runtime_thermostat['accessory'];
        }

        if ($runtime_thermostat['outdoor_temperature'] !== null) {
          $data[$date]['avg_outdoor_temperature'][] = $runtime_thermostat['outdoor_temperature'];

          // CDD
          if($runtime_thermostat['outdoor_temperature'] > $degree_days_base_temperature) {
            $data[$date]['sum_cooling_degree_days'] +=
              (($runtime_thermostat['outdoor_temperature']) - $degree_days_base_temperature) * $degree_days_base_time_interval;
          }

          // HDD
          if($runtime_thermostat['outdoor_temperature'] < $degree_days_base_temperature) {
            $data[$date]['sum_heating_degree_days'] +=
              ($degree_days_base_temperature - $runtime_thermostat['outdoor_temperature']) * $degree_days_base_time_interval;
          }
        }
        if ($runtime_thermostat['outdoor_humidity'] !== null) {
          $data[$date]['avg_outdoor_humidity'][] = $runtime_thermostat['outdoor_humidity'];
        }

        $data[$date]['avg_indoor_temperature'][] = $runtime_thermostat['indoor_temperature'];
        $data[$date]['avg_indoor_humidity'][] = $runtime_thermostat['indoor_humidity'];

      }

      $chunk_begin = strtotime('+5 minute', $chunk_end);
    } while ($chunk_end < $populate_end);

    // Write to the database.
    foreach($data as $date => &$row) {
      if (count($row['avg_outdoor_temperature']) > 0) {
        $row['avg_outdoor_temperature'] = round(array_sum($row['avg_outdoor_temperature']) / count($row['avg_outdoor_temperature']));
      } else {
        $row['avg_outdoor_temperature'] = null;
      }

      if (count($row['avg_outdoor_humidity']) > 0) {
        $row['avg_outdoor_humidity'] = round(array_sum($row['avg_outdoor_humidity']) / count($row['avg_outdoor_humidity']));
      } else {
        $row['avg_outdoor_humidity'] = null;
      }

      if ($row['min_outdoor_temperature'] === INF) {
        $row['min_outdoor_temperature'] = null;
      }

      if ($row['max_outdoor_temperature'] === -INF) {
        $row['max_outdoor_temperature'] = null;
      }

      $row['avg_indoor_temperature'] = round(array_sum($row['avg_indoor_temperature']) / count($row['avg_indoor_temperature']));
      $row['avg_indoor_humidity'] = round(array_sum($row['avg_indoor_humidity']) / count($row['avg_indoor_humidity']));

      $row['date'] = $date;
      $row['user_id'] = $thermostat['user_id'];
      $row['thermostat_id'] = $thermostat['thermostat_id'];

      $existing_runtime_thermostat_summary = $this->get([
        'thermostat_id' => $thermostat['thermostat_id'],
        'date' => $date
      ]);

      if($existing_runtime_thermostat_summary === null) {
        $this->create($row);
      } else {
        $row['runtime_thermostat_summary_id'] = $existing_runtime_thermostat_summary['runtime_thermostat_summary_id'];
        $this->update($row);
      }
    }
  }
}
