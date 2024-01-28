<?php

/**
 * Some functionality for generating and working with profiles. Per ecobee
 * documentation: The values supplied for any given 5-minute interval is the
 * value at the start of the interval and is not an average.
 *
 * @author Jon Ziebell
 */
class profile extends cora\crud {

  public static $exposed = [
    'private' => ['generate'],
    'public' => ['read_id']
  ];

  public static $cache = [];

  /**
   * Generate a profile for the specified thermostat.
   *
   * @param int $thermostat_id
   * @param boolean $debug If debug is enabled, running this API call will
   * download a CSV full of useful debugging info.
   *
   * @return array
   */
  public function generate($thermostat_id, $debug = false) {
    set_time_limit(0);

    if($debug === true) {
      $output = fopen('php://output', 'w');
      $bytes = 0;
    }

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
      'heat_1' => 300,
      'heat_2' => 300,
      'auxiliary_heat_1' => 300,
      'auxiliary_heat_2' => 300,
      'cool_1' => 300,
      'cool_2' => 300,
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

    /**
     * Attempt to ignore the effects of solar heating by only looking at
     * samples when the sun is down.
     */
    $ignore_solar_gain = $this->api(
      'user',
      'get_setting',
      'thermostat.' . $thermostat_id . '.profile.ignore_solar_gain'
    );
    /**
     * Allow a custom start date.
     */
    $custom_range_begin = $this->api(
      'user',
      'get_setting',
      'thermostat.' . $thermostat_id . '.profile.range_begin'
    );

    if($thermostat['system_type']['reported']['heat']['equipment'] !== null) {
      $system_type_heat = $thermostat['system_type']['reported']['heat']['equipment'];
    } else {
      $system_type_heat = $thermostat['system_type']['detected']['heat']['equipment'];
    }
    if($thermostat['system_type']['reported']['cool']['equipment'] !== null) {
      $system_type_cool = $thermostat['system_type']['reported']['cool']['equipment'];
    } else {
      $system_type_cool = $thermostat['system_type']['detected']['cool']['equipment'];
    }

    if($thermostat['system_type']['reported']['heat']['stages'] !== null) {
      $heat_stages = $thermostat['system_type']['reported']['heat']['stages'];
    } else {
      $heat_stages = $thermostat['system_type']['detected']['heat']['stages'];
    }
    if($thermostat['system_type']['reported']['cool']['stages'] !== null) {
      $cool_stages = $thermostat['system_type']['reported']['cool']['stages'];
    } else {
      $cool_stages = $thermostat['system_type']['detected']['cool']['stages'];
    }

    // Figure out all the starting and ending times. Round begin/end to the
    // nearest 5 minutes to help with the looping later on.
    $end_timestamp = time();

    if($custom_range_begin !== null) {
      $begin_timestamp = max(
        strtotime($custom_range_begin),
        strtotime('-1 year', $end_timestamp)
      );
    } else {
      $begin_timestamp = strtotime('-1 year', $end_timestamp);
    }

    // Round to 5 minute intervals.
    $begin_timestamp = floor($begin_timestamp / 300) * 300;
    $end_timestamp = floor($end_timestamp / 300) * 300;

    $group_thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'address_id' => $thermostat['address_id'],
          'inactive' => 0
        ]
      ]
    );

    // Get latitude/longitude. If that's not possible, disable solar gain
    // check.
    if($ignore_solar_gain === true) {
      if($thermostat['address_id'] === null) {
        $ignore_solar_gain = false;
      } else {
        $address = $this->api('address', 'get', $thermostat['address_id']);
        if(
          isset($address['normalized']['metadata']) === false ||
          isset($address['normalized']['metadata']['latitude']) === false ||
          isset($address['normalized']['metadata']['longitude']) === false
        ) {
          $ignore_solar_gain = false;
        } else {
          $latitude = $address['normalized']['metadata']['latitude'];
          $longitude = $address['normalized']['metadata']['longitude'];
        }
      }
    }

    // Get all of the relevant data
    $thermostat_ids = [];
    foreach($group_thermostats as $group_thermostat) {
      $thermostat_ids[] = $group_thermostat['thermostat_id'];
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
    $heat_1_on_for = 0;
    $heat_2_on_for = 0;
    $auxiliary_heat_1_on_for = 0;
    $auxiliary_heat_2_on_for = 0;
    $cool_1_on_for = 0;
    $cool_2_on_for = 0;
    $samples = [];
    $first_timestamp = null;
    $setpoints = [
      'heat' => [],
      'cool' => []
    ];
    $runtime_seconds = [
      'heat_1' => 0,
      'heat_2' => 0,
      'auxiliary_heat_1' => 0,
      'auxiliary_heat_2' => 0,
      'cool_1' => 0,
      'cool_2' => 0
    ];
    $degree_days_base_temperature = 65;
    $degree_days = [];
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
            `system_mode`,
            `setpoint_heat`,
            `setpoint_cool`,
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

        // Move some things around so that heat/cool/aux columns are
        // consistently represented instead of having to do this logic
        // throughout the generator.
        $runtime = [];
        $degree_days_date = date('Y-m-d', $current_timestamp);
        $degree_days_temperatures = [];
        while($row = $result->fetch_assoc()) {
          $timestamp = strtotime($row['timestamp']);
          $date = date('Y-m-d', $timestamp);

          // Degree days
          if($date !== $degree_days_date) {
            $degree_days[] = (array_mean($degree_days_temperatures) / 10) - $degree_days_base_temperature;
            $degree_days_date = $date;
            $degree_days_temperatures = [];
          }
          $degree_days_temperatures[] = $row['outdoor_temperature'];

          if($first_timestamp === null) {
            $first_timestamp = $row['timestamp'];
          }

          // Normalizing heating and cooling a bit.
          if(
            $system_type_heat === 'compressor' ||
            $system_type_heat === 'geothermal'
          ) {
            if($row['compressor_mode'] === 'heat') {
              $row['heat_1'] = $row['compressor_1'];
              $row['heat_2'] = $row['compressor_2'];
            } else {
              $row['heat_1'] = 0;
              $row['heat_2'] = 0;
            }
          } else {
            $row['heat_1'] = $row['auxiliary_heat_1'];
            $row['heat_2'] = $row['auxiliary_heat_2'];
            $row['auxiliary_heat_1'] = 0;
            $row['auxiliary_heat_2'] = 0;
          }

          if($row['compressor_mode'] === 'cool') {
            $row['cool_1'] = $row['compressor_1'];
            $row['cool_2'] = $row['compressor_2'];
          } else {
            $row['cool_1'] = 0;
            $row['cool_2'] = 0;
          }

          // No longer needed.
          unset($row['compressor_1']);
          unset($row['compressor_2']);
          unset($row['compressor_mode']);

          $runtime_seconds['heat_1'] += $row['heat_1'];
          $runtime_seconds['heat_2'] += $row['heat_2'];
          $runtime_seconds['auxiliary_heat_1'] += $row['auxiliary_heat_1'];
          $runtime_seconds['auxiliary_heat_2'] += $row['auxiliary_heat_2'];
          $runtime_seconds['cool_1'] += $row['cool_1'];
          $runtime_seconds['cool_2'] += $row['cool_2'];

          // Ignore data between sunrise and sunset.
          if($ignore_solar_gain === true) {
            $sun_info = date_sun_info($timestamp, $latitude, $longitude);
            if(
              $timestamp > $sun_info['sunrise'] &&
              $timestamp < $sun_info['sunset']
            ) {
              continue;
            }
          }

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

        // List of thermostat_ids that have data for this timestamp.
        $relevant_thermostat_ids = [];
        foreach($group_thermostats as $possible_relevant_thermostat) {
          if(
            $possible_relevant_thermostat['data_begin'] === null ||
            strtotime($possible_relevant_thermostat['data_begin']) <= $current_timestamp
          ) {
            $relevant_thermostat_ids[] = $possible_relevant_thermostat['thermostat_id'];
          }
        }

        if($debug === true) {
          $debug_data = [
            'sample' => null
          ];
        }

        if($current_runtime['outdoor_temperature'] !== null) {
          // Rounds to the nearest degree (because temperatures are stored in tenths).
          $current_runtime['outdoor_temperature'] = round($current_runtime['outdoor_temperature'] / 10);

          // Applies further smoothing if required.
          $current_runtime['outdoor_temperature'] = round($current_runtime['outdoor_temperature'] / $smoothing) * $smoothing;
        }

        // Log the setpoint.
        if(
          $current_runtime['system_mode'] === 'heat' ||
          $current_runtime['system_mode'] === 'auto'
        ) {
          $setpoints['heat'][] = $current_runtime['setpoint_heat'];
        }

        if(
          $current_runtime['system_mode'] === 'cool' ||
          $current_runtime['system_mode'] === 'auto'
        ) {
          $setpoints['cool'][] = $current_runtime['setpoint_cool'];
        }

        /**
         * OFF START
         */

        $most_off = true;
        $all_off = true;
        if(
          count($runtime[$current_timestamp]) < count($relevant_thermostat_ids)
        ) {
          // If I didn't get data at this timestamp for all thermostats in the
          // group, all off can't be true.
          $all_off = false;
          $most_off = false;
        }
        else {
          foreach($runtime[$current_timestamp] as $runtime_thermostat_id => $thermostat_runtime) {
            if(
              $thermostat_runtime['heat_1'] !== 0 ||
              $thermostat_runtime['heat_2'] !== 0 ||
              $thermostat_runtime['cool_1'] !== 0 ||
              $thermostat_runtime['cool_2'] !== 0 ||
              $thermostat_runtime['auxiliary_heat_1'] !== 0 ||
              $thermostat_runtime['auxiliary_heat_2'] !== 0 ||
              $thermostat_runtime['outdoor_temperature'] === null ||
              $thermostat_runtime['indoor_temperature'] === null
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
         * HEAT 1 START
         */

        // Track how long the heat has been on for.
        if($current_runtime['heat_1'] > 0) {
          $heat_1_on_for += $current_runtime['heat_1'];
        } else {
          $heat_1_on_for = 0;
        }

        // Store the begin runtime for heat when the heat has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $heat_1_on_for >= $minimum_on_for &&
          $current_runtime['auxiliary_heat_1'] === 0 &&
          $current_runtime['auxiliary_heat_2'] === 0 &&
          isset($begin_runtime['heat_1']) === false
        ) {
          $begin_runtime['heat_1'] = $current_runtime;
        }

        /**
         * HEAT 2 START
         */

        // Track how long the heat has been on for.
        if($current_runtime['heat_2'] > 0) {
          $heat_2_on_for += $current_runtime['heat_2'];
        } else {
          $heat_2_on_for = 0;
        }

        // Store the begin runtime for heat when the heat has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $heat_2_on_for >= $minimum_on_for &&
          $current_runtime['auxiliary_heat_1'] === 0 &&
          $current_runtime['auxiliary_heat_2'] === 0 &&
          isset($begin_runtime['heat_2']) === false
        ) {
          $begin_runtime['heat_2'] = $current_runtime;
        }

        /**
         * AUXILIARY HEAT 1 START
         */

        // Track how long the heat has been on for.
        if($current_runtime['auxiliary_heat_1'] > 0) {
          $auxiliary_heat_1_on_for += $current_runtime['auxiliary_heat_1'];
        } else {
          $auxiliary_heat_1_on_for = 0;
        }

        // Store the begin runtime for auxiliary heat when the auxiliary heat
        // has been on for this thermostat only for the required minimum and
        // everything else is off. The exception is normal heat as aux heat
        // often runs with it.
        if(
          $most_off === true &&
          $auxiliary_heat_1_on_for >= $minimum_on_for &&
          isset($begin_runtime['auxiliary_heat_1']) === false
        ) {
          $begin_runtime['auxiliary_heat_1'] = $current_runtime;
        }

        /**
         * AUXILIARY HEAT 2 START
         */

        // Track how long the heat has been on for.
       if($current_runtime['auxiliary_heat_2'] > 0) {
          $auxiliary_heat_2_on_for += $current_runtime['auxiliary_heat_2'];
        } else {
          $auxiliary_heat_2_on_for = 0;
        }

        // Store the begin runtime for auxiliary heat when the auxiliary heat
        // has been on for this thermostat only for the required minimum and
        // everything else is off. The exception is normal heat as aux heat
        // often runs with it.
        if(
          $most_off === true &&
          $auxiliary_heat_2_on_for >= $minimum_on_for &&
          isset($begin_runtime['auxiliary_heat_2']) === false
        ) {
          $begin_runtime['auxiliary_heat_2'] = $current_runtime;
        }

        /**
         * COOL 1 START
         */

        // Track how long the cool has been on for.
        if($current_runtime['cool_1'] > 0) {
          $cool_1_on_for += $current_runtime['cool_1'];
        } else {
          $cool_1_on_for = 0;
        }

        // Store the begin runtime for cool when the cool has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $cool_1_on_for >= $minimum_on_for &&
          $current_runtime['cool_2'] === 0 &&
          isset($begin_runtime['cool_1']) === false
        ) {
          $begin_runtime['cool_1'] = $current_runtime;
        }

        /**
         * COOL 2 START
         */

        // Track how long the cool has been on for.
        if($current_runtime['cool_2'] > 0) {
          $cool_2_on_for += $current_runtime['cool_2'];
        } else {
          $cool_2_on_for = 0;
        }

        // Store the begin runtime for cool when the cool has been on for this
        // thermostat only for the required minimum and everything else is off.
        if(
          $most_off === true &&
          $cool_2_on_for >= $minimum_on_for &&
          isset($begin_runtime['cool_2']) === false
        ) {
          $begin_runtime['cool_2'] = $current_runtime;
        }

        // Look for changes which would trigger a sample to be gathered.
        if(
          (
            // Heat 1
            // Gather a "heat_1" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'heat_1') &&
            isset($begin_runtime['heat_1']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['heat_1']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['heat_1']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['heat_1']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Heat 2
            // Gather a "heat_2" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'heat_2') &&
            isset($begin_runtime['heat_2']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['heat_2']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['heat_2']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['heat_2']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Auxiliary Heat 1
            // Gather an "auxiliary_heat_1" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'auxiliary_heat_1') &&
            isset($begin_runtime['auxiliary_heat_1']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['auxiliary_heat_1']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['auxiliary_heat_1']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['auxiliary_heat_1']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Auxiliary Heat 2
            // Gather an "auxiliary_heat_2" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'auxiliary_heat_2') &&
            isset($begin_runtime['auxiliary_heat_2']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['auxiliary_heat_2']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['auxiliary_heat_2']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['auxiliary_heat_2']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Cool 1
            // Gather a "cool_1" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'cool_1') &&
            isset($begin_runtime['cool_1']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['cool_1']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['cool_1']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['cool_1']['climate_runtime_thermostat_text_id'] ||
              $most_off === false
            )
          ) ||
          (
            // Cool 2
            // Gather a "cool_2" delta for one of the following reasons.
            // - The outdoor temperature changed
            // - The calendar event changed
            // - The climate changed
            // - One of the other thermostats in this group turned on
            ($sample_type = 'cool_2') &&
            isset($begin_runtime['cool_2']) === true &&
            isset($previous_runtime) === true &&
            (
              $current_runtime['outdoor_temperature'] !== $begin_runtime['cool_2']['outdoor_temperature'] ||
              $current_runtime['event_runtime_thermostat_text_id'] !== $begin_runtime['cool_2']['event_runtime_thermostat_text_id'] ||
              $current_runtime['climate_runtime_thermostat_text_id'] !== $begin_runtime['cool_2']['climate_runtime_thermostat_text_id'] ||
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
            while($lookahead < $thirty_minutes) {
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

            if($duration >= $minimum_sample_duration[$sample_type]) {
              $sample = [
                'type' => $sample_type,
                'outdoor_temperature' => $begin_runtime[$sample_type]['outdoor_temperature'],
                'delta' => $delta,
                'duration' => $duration,
                'delta_per_hour' => $delta / $duration * 3600
              ];

              if($debug === true) {
                $debug_data['sample'] = json_encode(
                  $sample +
                  [
                    'begin' => $begin_runtime[$sample_type]['timestamp'],
                    'end' => $end_runtime['timestamp']
                  ]
                );
              }

              $samples[] = $sample;
            }
          }

          // If in this block of code a change in runtime was detected, so
          // update $begin_runtime[$sample_type] to the current runtime.
          $begin_runtime[$sample_type] = $current_runtime;
        }

        if($debug === true && isset($previous_runtime) === true) {
          $debug_row = array_merge($previous_runtime, $debug_data);
          if($bytes === 0) {
            $bytes += fputcsv($output, array_keys($debug_row));
          }
          $bytes += fputcsv($output, array_values($debug_row));
        }

        $previous_runtime = $current_runtime;
      }

      // After a change was detected it automatically moves begin to the
      // current_runtime to start a new sample. This might be invalid so need to
      // unset it if so.
      if(
        $heat_1_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null ||
        $current_runtime['auxiliary_heat_1'] > 0 ||
        $current_runtime['auxiliary_heat_2'] > 0
      ) {
        unset($begin_runtime['heat_1']);
      }
      if(
        $heat_2_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null ||
        $current_runtime['auxiliary_heat_1'] > 0 ||
        $current_runtime['auxiliary_heat_2'] > 0
      ) {
        unset($begin_runtime['heat_2']);
      }
      if(
        $auxiliary_heat_1_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null
      ) {
        unset($begin_runtime['auxiliary_heat_1']);
      }
      if(
        $auxiliary_heat_2_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null
      ) {
        unset($begin_runtime['auxiliary_heat_2']);
      }
      if(
        $cool_1_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null
      ) {
        unset($begin_runtime['cool_1']);
      }
      if(
        $cool_2_on_for === 0 ||
        $current_runtime['outdoor_temperature'] === null ||
        $current_runtime['indoor_temperature'] === null
      ) {
        unset($begin_runtime['cool_2']);
      }
      if($all_off_for === 0) {
        unset($begin_runtime['resist']);
      }

      $current_timestamp += $five_minutes;
    }

    // Process the samples
    $deltas_raw = [];
    foreach($samples as $sample) {
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

    // Get the raw thermostat with the generated columns to store the data in
    // the profile. The CRUD read doesn't return them.
    $thermostat_database = $this->database->read(
      'thermostat',
      [
        'thermostat_id' => $thermostat_id
      ]
    );
    $thermostat_database = end($thermostat_database);

    // Generate the final profile and save it.
    $profile = [
      'temperature' => [
        'heat_1' => null,
        'heat_2' => null,
        'auxiliary_heat_1' => null,
        'auxiliary_heat_2' => null,
        'cool_1' => null,
        'cool_2' => null,
        'resist' => null
      ],
      'setpoint' => [
        'heat' => null,
        'cool' => null
      ],
      'degree_days' => [
        'heat' => null,
        'cool' => null
      ],
      'differential' => [
        'heat' => null,
        'cool' => null
      ],
      'setback' => [
        'heat' => null,
        'cool' => null
      ],
      'runtime' => [
        'heat_1' => round($runtime_seconds['heat_1'] / 60),
        'heat_2' => round($runtime_seconds['heat_2'] / 60),
        'auxiliary_heat_1' => round($runtime_seconds['auxiliary_heat_1'] / 60),
        'auxiliary_heat_2' => round($runtime_seconds['auxiliary_heat_2'] / 60),
        'cool_1' => round($runtime_seconds['cool_1'] / 60),
        'cool_2' => round($runtime_seconds['cool_2'] / 60),
      ],
      'runtime_per_degree_day' => [
        'heat_1' => null,
        'heat_2' => null,
        'cool_1' => null,
        'cool_2' => null,
        'auxiliary_heat_1' => null,
        'auxiliary_heat_2' => null
      ],
      'balance_point' => [
        'heat_1' => null,
        'heat_2' => null,
        'resist' => null
      ],
      'property' => [
        'age' => $thermostat_database['property_age'],
        'square_feet' => $thermostat_database['property_square_feet'],
        'stories' => $thermostat_database['property_stories'],
        'structure_type' => $thermostat_database['property_structure_type']
      ],
      'system_type' => [
        'heat' => $thermostat_database['system_type_heat'],
        'heat_stages' => $thermostat_database['system_type_heat_stages'],
        'auxiliary_heat' => $thermostat_database['system_type_auxiliary_heat'],
        'auxiliary_heat_stages' => $thermostat_database['system_type_auxiliary_heat_stages'],
        'cool' => $thermostat_database['system_type_cool'],
        'cool_stages' => $thermostat_database['system_type_cool_stages']
      ],
      'address' => [
        'latitude' => $thermostat_database['address_latitude'],
        'longitude' => $thermostat_database['address_longitude']
      ],
      'metadata' => [
        'generated_at' => date('c'),
        'duration' => $first_timestamp === null ? null : round((time() - strtotime($first_timestamp)) / 86400),
      ]
    ];

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
          $deltas[$type][$outdoor_temperature] = round(array_median($data['deltas_per_hour']) / 10, 2);
        }
      }
    }

    foreach($deltas as $type => $data) {
      if(count($data) < $required_points) {
        continue;
      }

      ksort($deltas[$type]);

      $this->remove_outliers($deltas[$type]);

      $profile['temperature'][$type] = [
        'deltas' => $deltas[$type],
        'linear_trendline' => $this->get_linear_trendline($deltas[$type])
      ];
    }

    if(
      $system_type_cool !== null &&
      $system_type_cool !== 'none' &&
      count($setpoints['cool']) > 0
    ) {
      $profile['setpoint']['cool'] = round(array_mean($setpoints['cool'])) / 10;
    }

    if(
      $system_type_heat !== null &&
      $system_type_heat !== 'none' &&
      count($setpoints['heat']) > 0
    ) {
      $profile['setpoint']['heat'] = round(array_mean($setpoints['heat'])) / 10;
    }

    // Heating and cooling degree days.
    foreach($degree_days as $degree_day) {
      if($degree_day < 0) {
        $profile['degree_days']['heat'] += ($degree_day * -1);
      } else {
        $profile['degree_days']['cool'] += ($degree_day);
      }
    }
    if ($profile['degree_days']['cool'] !== null) {
      $profile['degree_days']['cool'] = round($profile['degree_days']['cool']);
    }
    if ($profile['degree_days']['heat'] !== null) {
      $profile['degree_days']['heat'] = round($profile['degree_days']['heat']);
    }

    // Runtime per degree day
    if(
      $profile['degree_days']['heat'] !== null &&
      $profile['degree_days']['heat'] > 0
    ) {
      if(
        $system_type_heat !== null &&
        $system_type_heat !== 'none'
      ) {
        if($profile['runtime']['heat_1'] > 0) {
          $profile['runtime_per_degree_day']['heat_1'] = round($profile['runtime']['heat_1'] / $profile['degree_days']['heat'], 2);
        }
        if($profile['runtime']['heat_2'] > 0) {
          $profile['runtime_per_degree_day']['heat_2'] = round($profile['runtime']['heat_2'] / $profile['degree_days']['heat'], 2);
        }
        if($profile['runtime']['auxiliary_heat_1'] > 0) {
          $profile['runtime_per_degree_day']['auxiliary_heat_1'] = round($profile['runtime']['auxiliary_heat_1'] / $profile['degree_days']['heat'], 2);
        }
        if($profile['runtime']['auxiliary_heat_2'] > 0) {
          $profile['runtime_per_degree_day']['auxiliary_heat_2'] = round($profile['runtime']['auxiliary_heat_2'] / $profile['degree_days']['heat'], 2);
        }
      }
    }

    if(
      $profile['degree_days']['cool'] !== null &&
      $profile['degree_days']['cool'] > 0
    ) {
      if(
        $system_type_cool !== null &&
        $system_type_cool !== 'none'
      ) {
        if($profile['runtime']['cool_1'] > 0) {
          $profile['runtime_per_degree_day']['cool_1'] = round($profile['runtime']['cool_1'] / $profile['degree_days']['cool'], 2);
        }
        if($profile['runtime']['cool_2'] > 0) {
          $profile['runtime_per_degree_day']['cool_2'] = round($profile['runtime']['cool_2'] / $profile['degree_days']['cool'], 2);
        }
      }
    }

    // Balance point
    if($system_type_heat === 'compressor') {
      if(
        $profile['temperature']['heat_1'] !== null &&
        $profile['temperature']['heat_1']['linear_trendline'] !== null
      ) {
        $linear_trendline = $profile['temperature']['heat_1']['linear_trendline'];
        if($linear_trendline['slope'] > 0) {
          $profile['balance_point']['heat_1'] = round((-1 * $linear_trendline['intercept']) / $linear_trendline['slope'], 1);
        }
      }

      if(
        $profile['temperature']['heat_2'] !== null &&
        $profile['temperature']['heat_2']['linear_trendline'] !== null
      ) {
        $linear_trendline = $profile['temperature']['heat_2']['linear_trendline'];
        if($linear_trendline['slope'] > 0) {
          $profile['balance_point']['heat_2'] = round((-1 * $linear_trendline['intercept']) / $linear_trendline['slope'], 1);
        }
      }
    }

    if(
      $profile['temperature']['resist'] !== null &&
      $profile['temperature']['resist']['linear_trendline'] !== null
    ) {
      $linear_trendline = $profile['temperature']['resist']['linear_trendline'];
      if($linear_trendline['slope'] > 0) {
        $profile['balance_point']['resist'] = round((-1 * $linear_trendline['intercept']) / $linear_trendline['slope'], 1);
      }
    }

    // Differential
    if(isset($thermostat['settings']['differential_heat']) === true) {
      $profile['differential']['heat'] = $thermostat['settings']['differential_heat'];
    }

    if(isset($thermostat['settings']['differential_cool']) === true) {
      $profile['differential']['cool'] = $thermostat['settings']['differential_cool'];
    }

    // Setback
    if(isset($thermostat['program']['climates']) === true) {
      foreach($thermostat['program']['climates'] as $climate) {
        if($climate['climateRef'] === 'home') {
          $temperature_home_cool = $climate['coolTemp'];
          $temperature_home_heat = $climate['heatTemp'];
        } else if($climate['climateRef'] === 'away') {
          $temperature_away_cool = $climate['coolTemp'];
          $temperature_away_heat = $climate['heatTemp'];
        }
      }
    }

    if(
      $system_type_cool !== null &&
      $system_type_cool !== 'none' &&
      isset($temperature_home_cool) === true &&
      isset($temperature_away_cool) === true &&
      $temperature_away_cool >= $temperature_home_cool
    ) {
      $profile['setback']['cool'] = $temperature_away_cool - $temperature_home_cool;
    }

    if(
      $system_type_heat !== null &&
      $system_type_heat !== 'none' &&
      isset($temperature_home_heat) === true &&
      isset($temperature_away_heat) === true &&
      $temperature_home_heat >= $temperature_away_heat
    ) {
      $profile['setback']['heat'] = $temperature_home_heat - $temperature_away_heat;
    }

    // Debug
    if($debug === true) {
      fclose($output);

      $this->request->set_headers([
        'Content-Type' => 'text/csv',
        'Content-Length' => $bytes,
        'Content-Disposition' => 'attachment; filename="Debug - ' . $thermostat_id . '.csv"',
        'Pragma' => 'no-cache',
        'Expires' => '0',
      ], true);
    }

    /**
     * Store the profile. A single profile can be stored per day for
     * flexibility purposes, but this code forces a single profile to be
     * stored per week. This makes the GUI easy and intuitive.
     */
    $day_of_week = date(
      'w',
      strtotime($profile['metadata']['generated_at'])
    );

    $start_of_week = date('Y-m-d', strtotime('-' . $day_of_week . ' days'));

    $dates_this_week = [
      $start_of_week,
      date('Y-m-d', strtotime($start_of_week . ' +1 day')),
      date('Y-m-d', strtotime($start_of_week . ' +2 day')),
      date('Y-m-d', strtotime($start_of_week . ' +3 day')),
      date('Y-m-d', strtotime($start_of_week . ' +4 day')),
      date('Y-m-d', strtotime($start_of_week . ' +5 day')),
      date('Y-m-d', strtotime($start_of_week . ' +6 day'))
    ];

    $existing_profiles = $this->read([
      'thermostat_id' => $thermostat['thermostat_id'],
      'date' => $dates_this_week
    ]);

    if(count($existing_profiles) === 0) {
      $this->create([
        'user_id' => $thermostat['user_id'],
        'thermostat_id' => $thermostat['thermostat_id'],
        'date' => date(
          'Y-m-d',
          strtotime($profile['metadata']['generated_at'])
        ),
        'profile' => $profile
      ]);
    } else {
      $most_recent_profile = end($existing_profiles);
      $this->update([
        'profile_id' => $most_recent_profile['profile_id'],
        'date' => date(
          'Y-m-d',
          strtotime($profile['metadata']['generated_at'])
        ),
        'profile' => $profile
      ]);
    }

    return $profile;
  }

  /**
   * Get the properties of a linear trendline for a given set of deltas.
   *
   * @param array $deltas
   *
   * @return array [slope, intercept]
   */
  public function get_linear_trendline($deltas) {
    // Requires at least two points.
    if(count($deltas) < 2) {
      return null;
    }

    $sum_x = 0;
    $sum_y = 0;
    $sum_xy = 0;
    $sum_x_squared = 0;
    $n = 0;

    foreach($deltas as $x => $y) {
      $sum_x += $x;
      $sum_y += $y;
      $sum_xy += ($x * $y);
      $sum_x_squared += pow($x, 2);
      $n++;
    }

    $slope = (($n * $sum_xy) - ($sum_x * $sum_y)) / (($n * $sum_x_squared) - (pow($sum_x, 2)));
    $intercept = (($sum_y) - ($slope * $sum_x)) / ($n);

    return [
      'slope' => round($slope, 4),
      'intercept' => round($intercept, 4)
    ];
  }

  /**
   * Remove outliers from the deltas list by eliminating them if they fall too
   * far away from the trendline. Too far is simply more than two standard
   * deviations away from the mean spread.
   *
   * Modifies the original array.
   *
   * @param array &$deltas The deltas to remove outliers from.
   */
  public function remove_outliers(&$deltas) {
    $linear_trendline = $this->get_linear_trendline($deltas);

    $spreads = [];
    foreach($deltas as $x => $y) {
      $trendline_y = ($linear_trendline['slope'] * $x) + $linear_trendline['intercept'];
      $spreads[] += abs($y - $trendline_y);
    }

    $mean = array_mean($spreads);
    $standard_deviation = array_standard_deviation($spreads);

    $min = $mean - ($standard_deviation * 2);
    $max = $mean + ($standard_deviation * 2);

    $good_deltas = [];
    foreach($deltas as $x => $y) {
      $trendline_y = ($linear_trendline['slope'] * $x) + $linear_trendline['intercept'];
      $spread = abs($y - $trendline_y);
      if($spread >= $min && $spread <= $max) {
        $good_deltas[$x] = $y;
      }
    }
    $deltas = $good_deltas;
  }
}
