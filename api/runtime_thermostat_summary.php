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
    }

    return $runtime_thermostat_summaries;
  }

  /**
   * Populate the runtime_thermostat_summary table.
   *
   * @param int $thermostat_id
   */
  public function populate($thermostat_id) {
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    $query = '
      select
        min(`date`) `min_date`,
        max(`date`) `max_date`
      from
        `runtime_thermostat_summary`
      where
            `user_id` = ' . $this->database->escape($this->session->get_user_id()) . '
        and `thermostat_id` = ' . $this->database->escape($thermostat_id) . '
    ';
    $result = $this->database->query($query);
    $row = $result->fetch_assoc();

    if($row['min_date'] === null || $row['max_date'] === null) {
      $start = 'now() - interval 10 year'; // Just grab everything
    } else {
      if(strtotime($row['min_date']) > strtotime($thermostat['sync_begin'])) {
        $start = '"' . date('Y-m-d 00:00:00', strtotime($thermostat['sync_begin'])) . '"';
      } else {
        $start = '"' . date('Y-m-d 00:00:00', strtotime($row['max_date'] . ' - 1 day')) . '"';
      }
    }

    // TODO
    // Query takes a full second to run for my data which would add some amount of time for the sync...
    // Going to need to add a stop as well so only adding in relevant data points as the backwards sync runs
    //
    // TODO
    // timezone convert!

    $query = '
      insert into
        `runtime_thermostat_summary`
      select
        null `runtime_summary_id`,
        `thermostat`.`user_id` `user_id`,
        `thermostat_id` `thermostat_id`,
        date(convert_tz(`timestamp`, "UTC", "' . $thermostat['time_zone'] . '")) `date`,
        count(*) `count`,
        sum(case when `compressor_mode` = "cool" then `compressor_1` else 0 end) `sum_compressor_cool_1`,
        sum(case when `compressor_mode` = "cool" then `compressor_2` else 0 end) `sum_compressor_cool_2`,
        sum(case when `compressor_mode` = "heat" then `compressor_1` else 0 end) `sum_compressor_heat_1`,
        sum(case when `compressor_mode` = "heat" then `compressor_2` else 0 end) `sum_compressor_heat_2`,
        sum(`auxiliary_heat_1`) `sum_auxiliary_heat_1`,
        sum(`auxiliary_heat_2`) `sum_auxiliary_heat_2`,
        sum(`fan`) `sum_fan`,
        sum(case when `accessory_type` = "humidifier" then `accessory` else 0 end) `sum_humidifier`,
        sum(case when `accessory_type` = "dehumidifier" then `accessory` else 0 end) `sum_dehumidifier`,
        sum(case when `accessory_type` = "ventilator" then `accessory` else 0 end) `sum_ventilator`,
        sum(case when `accessory_type` = "economizer" then `accessory` else 0 end) `sum_economizer`,
        round(avg(`outdoor_temperature`)) `avg_outdoor_temperature`,
        round(avg(`outdoor_humidity`)) `avg_outdoor_humidity`,
        min(`outdoor_temperature`) `min_outdoor_temperature`,
        max(`outdoor_temperature`) `max_outdoor_temperature`,
        round(avg(`indoor_temperature`)) `avg_indoor_temperature`,
        round(avg(`indoor_humidity`)) `avg_indoor_humidity`,
        0 `deleted`
      from
        `runtime_thermostat`
      join
        `thermostat` using(`thermostat_id`)
      where
            convert_tz(`timestamp`, "UTC", "' . $thermostat['time_zone'] . '") > ' . $start . '
        and thermostat_id = ' . $thermostat['thermostat_id'] . '
      group by
        `thermostat_id`,
        date(convert_tz(`timestamp`, "UTC", "' . $thermostat['time_zone'] . '"))
      on duplicate key update
        `count` = values(`count`),
        `sum_compressor_cool_1` = values(`sum_compressor_cool_1`),
        `sum_compressor_cool_2` = values(`sum_compressor_cool_2`),
        `sum_compressor_heat_1` = values(`sum_compressor_heat_1`),
        `sum_compressor_heat_2` = values(`sum_compressor_heat_2`),
        `sum_auxiliary_heat_1` = values(`sum_auxiliary_heat_1`),
        `sum_auxiliary_heat_2` = values(`sum_auxiliary_heat_2`),
        `sum_fan` = values(`sum_fan`),
        `sum_humidifier` = values(`sum_humidifier`),
        `sum_dehumidifier` = values(`sum_dehumidifier`),
        `sum_ventilator` = values(`sum_ventilator`),
        `sum_economizer` = values(`sum_economizer`),
        `avg_outdoor_temperature` = values(`avg_outdoor_temperature`),
        `avg_outdoor_humidity` = values(`avg_outdoor_humidity`),
        `min_outdoor_temperature` = values(`min_outdoor_temperature`),
        `max_outdoor_temperature` = values(`max_outdoor_temperature`),
        `avg_indoor_temperature` = values(`avg_indoor_temperature`),
        `avg_indoor_humidity` = values(`avg_indoor_humidity`)
    ';
    $this->database->query($query);
  }
}
