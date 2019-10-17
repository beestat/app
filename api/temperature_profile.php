<?php

/**
 * Some functionality for generating and working with temperature profiles.
 * Per ecobee documentation: The values supplied for any given 5-minute
 * interval is the value at the start of the interval and is not an average.
 *
 * @author Jon Ziebell
 */
class temperature_profile extends cora\api {

  public static $exposed = [
    'private' => [],
    'public' => []
  ];

  public static $cache = [
    'generate' => 604800 // 7 Days
  ];

  /**
   * Generate a temperature profile for the specified thermostat.
   *
   * @param int $thermostat_id
   *
   * @return array
   */
  public function generate($thermostat_id) {
    set_time_limit(0);

    // Make sure the thermostat_id provided is one of yours since there's no
    // user_id security on the runtime_thermostat table.
    $thermostats = $this->api('thermostat', 'read_id');
    if (isset($thermostats[$thermostat_id]) === false) {
      throw new Exception('Invalid thermostat_id.', 10300);
    }

    /**
     * This is an interesting thing to fiddle with. Basically, the longer the
     * minimum sample duration, the better your score. For example, let's say
     * I set this to 10m and my 30° delta is -1°. If I increase the time to
     * 60m, I may find that my 30° delta decreases to -0.5°.
     *
     * Initially I thought something was wrong, but this makes logical sense.
     * If I'm only utilizing datasets where the system was completely off for
     * a longer period of time, then I can infer that the outdoor conditions
     * were favorable to allowing that to happen. Higher minimums most likely
     * only include sunny periods with low wind.
     *
     * For now this is set to 30m, which I feel is an appropriate requirement.
     * I am not factoring in any variables outside of temperature for now.
     * Note that 30m is a MINIMUM due to the event_runtime_thermostat_text_id logic that
     * will go back in time by 30m to account for sensor changes if the
     * calendar event changes.
     */
    $minimum_sample_duration = [
      'heat' => 300,
      'cool' => 300,
      'resist' => 1800
    ];

    /**
     * How long the system must be on/off for before starting a sample. Setting
     * this to 5 minutes will use the very first sample which is fine if you
     * assume the temperature in the sample is taken at the end of the 5m.
     */
    $minimum_off_for = 300;
    $minimum_on_for = 300;

    /**
     * Increasing this value will decrease the number of data points by
     * allowing for larger outdoor temperature swings in a single sample. For
     * example, a value of 1 will start a new sample if the temperature
     * changes by 1°, and a value of 5 will start a new sample if the
     * temperature changes by 5°.
     */
    $smoothing = 1;

    /**
     * Require this many individual samples in a delta for a specific outdoor
     * temperature. Increasing this basically cuts off the extremes where
     * there are fewer samples.
     */
    $required_samples = 2;

    /**
     * Require this many individual points before a valid temperature profile
     * can be returned.
     */
    $required_points = 5;

    /**
     * How far back to query for additional data. For example, when the
     * event_runtime_thermostat_text_id changes I pull data from 30m ago. If that data is
     * not available in the current runtime chunk, then it will fail. This
     * will make sure that data is always included.
     */
    $max_lookback = 1800; // 30 min

    /**
     * How far in the future to query for additional data. For example, if a
     * sample ends 20 minutes prior to an event change, I need to look ahead
     * to see if an event change is in the future. If so, I need to adjust for
     * that because the sensor averages will already be wrong.
     */
    $max_lookahead = 1800; // 30 min

    // Get some stuff
    $thermostat = $this->api('thermostat', 'get', $thermostat_id);

    // Figure out all the starting and ending times. Round begin/end to the
    // nearest 5 minutes to help with the looping later on.
    $end_timestamp = time();
    $begin_timestamp = strtotime('-1 year', $end_timestamp);

    // Round to 5 minute intervals.
    $begin_timestamp = floor($begin_timestamp / 300) * 300;
    $end_timestamp = floor($end_timestamp / 300) * 300;

    $group_thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'thermostat_group_id' => $thermostat['thermostat_group_id'],
          'inactive' => 0
        ]
      ]
    );

    // Get all of the relevant data
    $thermostat_ids = [];
    foreach($group_thermostats as $thermostat) {
      $thermostat_ids[] = $thermostat['thermostat_id'];
    }

    /**
     * Get the largest possible chunk size given the number of thermostats I
     * have to select data for. This is necessary to prevent the script from
     * running out of memory. Also, as of PHP 7, structures have 6-7x of
     * memory overhead.
     */
    $memory_limit = 16; // mb
    $memory_per_thermostat_per_day = 0.6; // mb
    $days = (int) floor($memory_limit / ($memory_per_thermostat_per_day * count($thermostat_ids)));

    $chunk_size = $days * 86400;

    if($chunk_size === 0) {
      throw new Exception('Too many thermostats; cannot generate temperature profile.', 10301);
    }

    $current_timestamp = $begin_timestamp;
    $chunk_end_timestamp = 0;
    $five_minutes = 300;
    $thirty_minutes = 1800;
    $all_off_for = 0;
    $cool_on_for = 0;
    $heat_on_for = 0;
    $samples = [];
    $times = [
      'heat' => [],
      'cool' => [],
      'resist' => []
    ];
    $begin_runtime = [];

    while($current_timestamp <= $end_timestamp) {
      // Get a new chunk of data.
      if($current_timestamp >= $chunk_end_timestamp) {
        $chunk_end_timestamp = $current_timestamp + $chunk_size;

        $query = '
          select
            `timestamp`,
            `thermostat_id`,
            `indoor_temperature`,
            `outdoor_temperature`,
            `compressor_1`,
            `compressor_2`,
            `compressor_mode`,
            `auxiliary_heat_1`,
            `auxiliary_heat_2`,
            `event_runtime_thermostat_text_id`,
            `climate_runtime_thermostat_text_id`
          from
            `runtime_thermostat`
          where
                `thermostat_id` in (' . implode(',', $thermostat_ids) . ')
            and `timestamp` >= "' . date('Y-m-d H:i:s', ($current_timestamp - $max_lookback)) . '"
            and `timestamp` < "' . date('Y-m-d H:i:s', ($chunk_end_timestamp + $max_lookahead)) . '"
        ';
        $result = $this->database->query($query);

        $runtime = [];
        while($row = $result->fetch_assoc()) {
          if(
            $thermostat['system_type']['detected']['heat'] === 'compressor' ||
            $thermostat['system_type']['detected']['heat'] === 'geothermal'
          ) {
            if($row['compressor_mode'] === 'heat') {
              $row['heat'] = max(
                $row['compressor_1'],
                $row['compressor_2']
              );
            } else {
              $row['heat'] = 0;
            }
            $row['auxiliary_heat'] = max(
              $row['auxiliary_heat_1'],
              $row['auxiliary_heat_2']
            );
          } else {
            $row['heat'] = max(
              $row['auxiliary_heat_1'],
              $row['auxiliary_heat_2']
            );
            $row['auxiliary_heat'] = 0;
          }

          if($row['compressor_mode'] === 'cool') {
            $row['cool'] = max(
              $row['compressor_1'],
              $row['compressor_2']
            );
          } else {
            $row['cool'] = 0;
          }

          $timestamp = strtotime($row['timestamp']);
          if (isset($runtime[$timestamp]) === false) {
            $runtime[$timestamp] = [];
          }
          $runtime[$timestamp][$row['thermostat_id']] = $row;
        }
      }

      if(
        isset($runtime[$current_timestamp]) === true && // Had data for at least one thermostat
        isset($runtime[$current_timestamp][$thermostat_id]) === true // Had data for the requested thermostat
      ) {
        $current_runtime = $runtime[$current_timestamp][$thermostat_id];
        if($current_runtime['outdoor_temperature'] !== null) {
          // Rounds to the nearest degree (because temperatures are stored in tenths).
          $current_runtime['outdoor_temperature'] = round($current_runtime['outdoor_temperature'] / 10) * 10;

          // Applies further smoothing if required.
          $current_runtime['outdoor_temperature'] = round($current_runtime['outdoor_temperature'] / $smoothing) * $smoothing;
        }

        /**
         * OFF START
         */

        $most_off = true;
        $all_off = true;
        if(
          count($runtime[$current_timestamp]) < count($thermostat_ids)
        ) {
          // If I didn't get data at this timestamp for all thermostats in the
          // group, all off can't be true.
          $all_off = false;
          $most_off = false;
        }
        else {
          foreach($runtime[$current_timestamp] as $runtime_thermostat_id => $thermostat_runtime) {
            if(
              $thermostat_runtime['compressor_1'] !== 0 ||
              $thermostat_runtime['compressor_2'] !== 0 ||
              $thermostat_runtime['auxiliary_heat_1'] !== 0 ||
              $thermostat_runtime['auxiliary_heat_2'] !== 0 ||
              $thermostat_runtime['outdoor_temperature'] === null ||
              $thermostat_runtime['indoor_temperature'] === null ||
              (
                // Wasn't syncing this until mid-November 2018. Just going with December to be safe.
                $thermostat_runtime['climate_runtime_thermostat_text_id'] === null &&
                $current_timestamp > 1543640400
              )
            ) {
              // If I did have data at this timestamp for all thermostats in the
              // group, check and see if were fully off. Also if any of the
              // things used in the algorithm are just missing, assume the
              // system might have been running.
              $all_off = false;

              // If everything _but_ the requested thermostat is off. This is
              // used for the heat/cool scores as I need to only gather samples
              // when everything else is off.
              if($runtime_thermostat_id !== $thermostat_id) {
                $most_off = false;
              }
            }
          }
        }

        // Assume that the runtime rows represent data at the end of that 5
        // minutes.
        if($all_off === true) {
          $all_off_for += $five_minutes;

          // Store the begin runtime row if the system has been off for the
          // requisite length. This gives the temperatures a chance to settle.
          if($all_off_for === $minimum_off_for) {
            $begin_runtime['resist'] = $current_runtime;
          }
        }
        else {
          $all_off_for = 0;
        }

        /**
         * HEAT START
         */

        // Track how long the heat has been on for.
        if($current_runtime['heat'] > 0) {
          $heat_on_for += $current_runtime['heat'];
        } else {
          if($heat_on_for > 0) {
            $times['heat'][] = $heat_on_for;
          }
          $heat_on_for = 0;
        }

        // Store the begin runtime for heat when the heat has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $heat_on_for >= $minimum_on_for &&
          $current_runtime['auxiliary_heat'] === 0 &&
          isset($begin_runtime['heat']) === false
        ) {
          $begin_runtime['heat'] = $current_runtime;
        }

        /**
         * COOL START
         */

        // Track how long the cool has been on for.
        if($current_runtime['cool'] > 0) {
          $cool_on_for += $current_runtime['cool'];
        } else {
          if($cool_on_for > 0) {
            $times['cool'][] = $cool_on_for;
          }
          $cool_on_for = 0;
        }

        // Store the begin runtime for cool when the cool has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $cool_on_for >= $minimum_on_for &&
          isset($begin_runtime['cool']) === false
        ) {
          $begin_runtime['cool'] = $current_runtime;
        }


        // Look for changes which would trigger a sample to be gathered.
        if(
          (
            // Heat
            // Gather a "heat" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'heat') &&
            isset($begin_runtime['heat']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['heat']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['heat']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['heat']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Cool
            // Gather a "cool" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'cool') &&
            isset($begin_runtime['cool']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['cool']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['cool']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['cool']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Resist
            // Gather an "off" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - The system turned back on after being off
            ($sample_type = 'resist') &&
            isset($begin_runtime['resist']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['resist']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['resist']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['resist']['climate_runtime_thermostat_text_id'] ||
              $all_off === false
            )
          )
        ) {
          // By default the end sample is the previous sample (five minutes ago).
          $offset = $five_minutes;

          // If event_runtime_thermostat_text_id or climate_runtime_thermostat_text_id changes, need to ignore data
          // from the previous 30 minutes as there are sensors changing during
          // that time.
          if(
            $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime[$sample_type]['event_runtime_thermostat_text_id'] ||
            $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime[$sample_type]['climate_runtime_thermostat_text_id']
          ) {
            $offset = $thirty_minutes;
          } else {
            // Start looking ahead into the next 30 minutes looking for changes
            // to event_runtime_thermostat_text_id and climate_runtime_thermostat_text_id.
            $lookahead = $five_minutes;
            while($lookahead <= $thirty_minutes) {
              if(
                isset($runtime[$current_timestamp + $lookahead]) === true &&
                isset($runtime[$current_timestamp + $lookahead][$thermostat_id]) === true &&
                (
                  $runtime[$current_timestamp + $lookahead][$thermostat_id]['event_runtime_thermostat_text_id'] !== $current_runtime['event_runtime_thermostat_text_id'] ||
                  $runtime[$current_timestamp + $lookahead][$thermostat_id]['climate_runtime_thermostat_text_id'] !== $current_runtime['climate_runtime_thermostat_text_id']
                )
              ) {
                $offset = ($thirty_minutes - $lookahead);
                break;
              }

              $lookahead += $five_minutes;
            }
          }

          // Now use the offset to set the proper end_runtime. This simply makes
          // sure the data is present and then uses it. In the case where the
          // desired data is missing, I *could* look back further but I'm not
          // going to bother. It's pretty rare and adds some unwanted complexity
          // to this.
          if(
            isset($runtime[$current_timestamp - $offset]) === true &&
            isset($runtime[$current_timestamp - $offset][$thermostat_id]) === true &&
            ($current_timestamp - $offset) > strtotime($begin_runtime[$sample_type]['timestamp'])
          ) {
            $end_runtime = $runtime[$current_timestamp - $offset][$thermostat_id];
          } else {
            $end_runtime = null;
          }

          if($end_runtime !== null) {
            $delta = $end_runtime['indoor_temperature'] - $begin_runtime[$sample_type]['indoor_temperature'];
            $duration = strtotime($end_runtime['timestamp']) - strtotime($begin_runtime[$sample_type]['timestamp']);

            if($duration > 0) {
              $sample = [
                'type' => $sample_type,
                'outdoor_temperature' => $begin_runtime[$sample_type]['outdoor_temperature'],
                'delta' => $delta,
                'duration' => $duration,
                'delta_per_hour' => $delta / $duration * 3600,
              ];
              $samples[] = $sample;
            }
          }

          // If in this block of code a change in runtime was detected, so
          // update $begin_runtime[$sample_type] to the current runtime.
          $begin_runtime[$sample_type] = $current_runtime;
        }

        $previous_runtime = $current_runtime;
      }

      // After a change was detected it automatically moves begin to the
      // current_runtime to start a new sample. This might be invalid so need to
      // unset it if so.
      if(
        $heat_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null ||
        $current_runtime['auxiliary_heat'] > 0
      ) {
        unset($begin_runtime['heat']);
      }
      if(
        $cool_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null
      ) {
        unset($begin_runtime['cool']);
      }
      if($all_off_for === 0) {
        unset($begin_runtime['resist']);
      }

      $current_timestamp += $five_minutes;
    }

    // Process the samples
    $deltas_raw = [];
    foreach($samples as $sample) {
      $is_valid_sample = true;
      if($sample['duration'] < $minimum_sample_duration[$sample['type']]) {
        $is_valid_sample = false;
      }

      if($is_valid_sample === true) {
        if(isset($deltas_raw[$sample['type']]) === false) {
          $deltas_raw[$sample['type']] = [];
        }
        if(isset($deltas_raw[$sample['type']][$sample['outdoor_temperature']]) === false) {
          $deltas_raw[$sample['type']][$sample['outdoor_temperature']] = [
            'deltas_per_hour' => []
          ];
        }

        $deltas_raw[$sample['type']][$sample['outdoor_temperature']]['deltas_per_hour'][] = $sample['delta_per_hour'];

      }
    }

    $deltas = [];
    foreach($deltas_raw as $type => $raw) {
      if(isset($deltas[$type]) === false) {
        $deltas[$type] = [];
      }
      foreach($raw as $outdoor_temperature => $data) {
        if(
          isset($deltas[$type][$outdoor_temperature]) === false &&
          count($data['deltas_per_hour']) >= $required_samples
        ) {
          $deltas[$type][$outdoor_temperature] = round(array_median($data['deltas_per_hour']), 2);
        }
      }
    }

    // Generate the final temperature profile and save it.
    $temperature_profile = [];
    foreach($deltas as $type => $data) {
      if(count($data) < $required_points) {
        continue;
      }

      ksort($deltas[$type]);

      // For heating/cooling, factor in cycle time.
      if(count($times[$type]) > 0) {
        $cycles_per_hour = round(60 / (array_median($times[$type]) / 60), 2);
      } else {
        $cycles_per_hour = null;
      }


      $linear_trendline = $this->api(
        'temperature_profile',
        'get_linear_trendline',
        [
          'data' => $deltas[$type]
        ]
      );
      $temperature_profile[$type] = [
        'deltas' => $deltas[$type],
        'linear_trendline' => $linear_trendline,
        'cycles_per_hour' => $cycles_per_hour,
        'metadata' => [
          'generated_at' => date('Y-m-d H:i:s')
        ]
      ];

      $temperature_profile[$type]['score'] = $this->api(
        'temperature_profile',
        'get_score',
        [
          'type' => $type,
          'temperature_profile' => $temperature_profile[$type]
        ]
      );

    }

    // Only actually save this profile to the thermostat if it was run with the
    // default settings (aka the last year). Anything else is not valid to save.
    // if($save === true) {
      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'temperature_profile' => $temperature_profile
          ]
        ]
      );
    // }

    $this->database->set_time_zone(0);

    // Force these to actually return, but set them to null if there's no data.
    foreach(['heat', 'cool', 'resist'] as $type) {
      if(
        isset($temperature_profile[$type]) === false ||
        count($temperature_profile[$type]['deltas']) === 0
      ) {
        $temperature_profile[$type] = null;
      }
    }

    return $temperature_profile;
  }

  /**
   * Get the properties of a linear trendline for a given set of data.
   *
   * @param array $data
   *
   * @return array [slope, intercept]
   */
  public function get_linear_trendline($data) {
    // Requires at least two points.
    if(count($data) < 2) {
      return null;
    }

    $sum_x = 0;
    $sum_y = 0;
    $sum_xy = 0;
    $sum_x_squared = 0;
    $n = 0;

    foreach($data as $x => $y) {
      $sum_x += $x;
      $sum_y += $y;
      $sum_xy += ($x * $y);
      $sum_x_squared += pow($x, 2);
      $n++;
    }

    $slope = (($n * $sum_xy) - ($sum_x * $sum_y)) / (($n * $sum_x_squared) - (pow($sum_x, 2)));
    $intercept = (($sum_y) - ($slope * $sum_x)) / ($n);

    return [
      'slope' => round($slope, 2),
      'intercept' => round($intercept, 2)
    ];
  }

  /**
   * Get the score from a linear trendline. For heating and cooling the slope
   * is most of the score. For resist it is all of the score.
   *
   * Slope score is calculated as a percentage between 0 and whatever 3
   * standard deviations from the mean is. For example, if that gives a range
   * from 0-5, a slope of 2.5 would give you a base score of 0.5 which is then
   * weighted in with the rest of the factors.
   *
   * Cycles per hour score is calculated as a flat 0.25 base score for every
   * CPH under 4. For example, a CPH of 1
   *
   * @param array $temperature_profile
   *
   * @return int
   */
  public function get_score($type, $temperature_profile) {
    if(
      $temperature_profile['linear_trendline'] === null
    ) {
      return null;
    }

    $weights = [
      'heat' => [
        'slope' => 0.6,
        'cycles_per_hour' => 0.1,
        'balance_point' => 0.3
      ],
      'cool' => [
        'slope' => 0.6,
        'cycles_per_hour' => 0.1,
        'balance_point' => 0.3
      ],
      'resist' => [
        'slope' => 1
      ]
    ];

    // Slope score
    switch($type) {
      case 'heat':
        $slope_mean = 0.042;
        $slope_standard_deviation = 0.179;
        $balance_point_mean = -12.235;
        // This is arbitrary. The actual SD is really high due to what I think
        // is poor data. Further investigating but for now this does a pretty
        // good job.
        $balance_point_standard_deviation = 20;
      break;
      case 'cool':
        $slope_mean = 0.066;
        $slope_standard_deviation = 0.29;
        $balance_point_mean = 90.002;
        // This is arbitrary. The actual SD is really high due to what I think
        // is poor data. Further investigating but for now this does a pretty
        // good job.
        $balance_point_standard_deviation = 20;
      break;
      case 'resist':
        $slope_mean = 0.034;
        $slope_standard_deviation = 0.018;
      break;
    }

    $parts = [];
    $slope_max = $slope_mean + ($slope_standard_deviation * 3);
    $parts['slope'] = ($slope_max - $temperature_profile['linear_trendline']['slope']) / $slope_max;
    $parts['slope'] = max(0, min(1, $parts['slope']));

    if($type === 'heat' || $type === 'cool') {
      if($temperature_profile['linear_trendline']['slope'] == 0) {
        $parts['balance_point'] = 1;
      } else {
        $balance_point_min = $balance_point_mean - ($balance_point_standard_deviation * 3);
        $balance_point_max = $balance_point_mean + ($balance_point_standard_deviation * 3);
        $balance_point = -$temperature_profile['linear_trendline']['intercept'] / $temperature_profile['linear_trendline']['slope'];
        $parts['balance_point'] = ($balance_point - $balance_point_min) / ($balance_point_max - $balance_point_min);
        $parts['balance_point'] = max(0, min(1, $parts['balance_point']));
      }
    }

    // Cycles per hour score
    if($temperature_profile['cycles_per_hour'] !== null) {
      $parts['cycles_per_hour'] = (4 - $temperature_profile['cycles_per_hour']) * 0.25;
      $parts['cycles_per_hour'] = max(0, min(1, $parts['cycles_per_hour']));
    }

    $score = 0;
    foreach($parts as $key => $value) {
      $score += $value * $weights[$type][$key];
    }

    return round($score * 10, 1);
  }

}
