<?php

/**
 * A group of thermostats. Thermostats are grouped by address. A thermostat
 * group has any number of thermostats and a single combined temperature
 * profile.
 *
 * @author Jon Ziebell
 */
class thermostat_group extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'generate_temperature_profiles',
      'generate_temperature_profile',
      'generate_profiles',
      'generate_profile',
      'get_scores',
      'get_metrics',
      'update_system_types'
    ],
    'public' => []
  ];

  public static $cache = [
    'generate_temperature_profile' => 604800, // 7 Days
    'generate_temperature_profiles' => 604800, // 7 Days
    'generate_profile' => 604800, // 7 Days
    'generate_profiles' => 604800, // 7 Days
    'get_scores' => 604800, // 7 Days
    // 'get_metrics' => 604800 // 7 Days
  ];

  /**
   * Generate the group temperature profile.
   *
   * @param int $thermostat_group_id
   *
   * @return array
   */
  public function generate_profile($thermostat_group_id) {
    // Get all thermostats in this group.
    $thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'thermostat_group_id' => $thermostat_group_id,
          'inactive' => 0
        ]
      ]
    );

    // Generate a temperature profile for each thermostat in this group.
    $profiles = [];
    foreach($thermostats as $thermostat) {
      $profile = $this->api('profile', 'generate', $thermostat['thermostat_id']);

      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'profile' => $profile
          ]
        ]
      );

      $profiles[] = $profile;
    }

    // Get all of the individual deltas for averaging.
    $group_profile = [
      'setpoint' => [
        'heat' => null,
        'cool' => null
      ],
      'degree_days' => [
        'heat' => null,
        'cool' => null
      ],
      'runtime' => [
        'heat_1' => 0,
        'heat_2' => 0,
        'auxiliary_heat_1' => 0,
        'auxiliary_heat_2' => 0,
        'cool_1' => 0,
        'cool_2' => 0
      ],
      'metadata' => [
        'generated_at' => date('c'),
        'duration' => null,
        'setpoint' => [
          'heat' => [
            'samples' => null
          ],
          'cool' => [
            'samples' => null
          ]
        ],
        'temperature' => []
      ]
    ];

    if (count($profiles) === 0) {
      $this->update(
        [
          'thermostat_group_id' => $thermostat_group_id,
          'profile' => $group_profile
        ]
      );

      return $group_profile;
    }

    $metadata_duration = [];

    // Setpoint heat min/max/average.
    $metadata_setpoint_heat_samples = [];
    $setpoint_heat = [];

    // Setpoint cool min/max/average.
    $metadata_setpoint_cool_samples = [];
    $setpoint_cool = [];

    // Temperature profiles.
    $temperature = [];
    $metadata_temperature = [];

    foreach($profiles as $profile) {
      // Group profile duration is the minimum of all individual profile
      // durations.
      if($profile['metadata']['duration'] !== null) {
        $metadata_duration[] = $profile['metadata']['duration'];
      }

      if($profile['setpoint']['heat'] !== null) {
        $setpoint_heat[] = [
          'value' => $profile['setpoint']['heat'],
          'samples' => $profile['metadata']['setpoint']['heat']['samples']
        ];
        $metadata_setpoint_heat_samples[] = $profile['metadata']['setpoint']['heat']['samples'];
      }

      if($profile['setpoint']['cool'] !== null) {
        $setpoint_cool[] = [
          'value' => $profile['setpoint']['cool'],
          'samples' => $profile['metadata']['setpoint']['cool']['samples']
        ];
        $metadata_setpoint_cool_samples[] = $profile['metadata']['setpoint']['cool']['samples'];
      }

      // Temperature profiles.
      foreach($profile['temperature'] as $type => $data) {
        if($data !== null) {
          foreach($data['deltas'] as $outdoor_temperature => $delta) {
            $temperature[$type]['deltas'][$outdoor_temperature][] = [
              'value' => $delta,
              'samples' => $profile['metadata']['temperature'][$type]['deltas'][$outdoor_temperature]['samples']
            ];
            $metadata_temperature[$type]['deltas'][$outdoor_temperature]['samples'][] =
              $profile['metadata']['temperature'][$type]['deltas'][$outdoor_temperature]['samples'];
          }
        }
      }

      // Degree days.
      if($profile['degree_days']['heat'] !== null) {
        $group_profile['degree_days']['heat'] += $profile['degree_days']['heat'];
      }
      if($profile['degree_days']['cool'] !== null) {
        $group_profile['degree_days']['cool'] += $profile['degree_days']['cool'];
      }

      // Runtime
      $group_profile['runtime']['heat_1'] += $profile['runtime']['heat_1'];
      $group_profile['runtime']['heat_2'] += $profile['runtime']['heat_2'];
      $group_profile['runtime']['auxiliary_heat_1'] += $profile['runtime']['auxiliary_heat_1'];
      $group_profile['runtime']['auxiliary_heat_2'] += $profile['runtime']['auxiliary_heat_2'];
      $group_profile['runtime']['cool_1'] += $profile['runtime']['cool_1'];
      $group_profile['runtime']['cool_2'] += $profile['runtime']['cool_2'];
    }

    // echo '<pre>';
    // print_r($profiles);
    // die();

    $group_profile['metadata']['duration'] = min($metadata_duration);

    // Setpoint heat min/max/average.
    $group_profile['metadata']['setpoint']['heat']['samples'] = array_sum($metadata_setpoint_heat_samples);
    if($group_profile['metadata']['setpoint']['heat']['samples'] > 0) {
      $group_profile['setpoint']['heat'] = 0;
      foreach($setpoint_heat as $data) {
        $group_profile['setpoint']['heat'] +=
          ($data['value'] * $data['samples'] / $group_profile['metadata']['setpoint']['heat']['samples']);
      }
    }

    // Setpoint cool min/max/average.
    $group_profile['metadata']['setpoint']['cool']['samples'] = array_sum($metadata_setpoint_cool_samples);
    if($group_profile['metadata']['setpoint']['cool']['samples'] > 0) {
      $group_profile['setpoint']['cool'] = 0;
      foreach($setpoint_cool as $data) {
        $group_profile['setpoint']['cool'] +=
          ($data['value'] * $data['samples'] / $group_profile['metadata']['setpoint']['cool']['samples']);
      }
    }

    // echo '<pre>';
    // print_r($temperature);
    // die();

    // Temperature profiles.
    foreach($temperature as $type => $data) {
      foreach($data['deltas'] as $outdoor_temperature => $delta) {
        $group_profile['metadata']['temperature'][$type]['deltas'][$outdoor_temperature]['samples'] =
          array_sum($metadata_temperature[$type]['deltas'][$outdoor_temperature]['samples']);
        if($group_profile['metadata']['temperature'][$type]['deltas'][$outdoor_temperature]['samples'] > 0) {
          $group_profile['temperature'][$type]['deltas'][$outdoor_temperature] = 0;
          foreach($temperature[$type]['deltas'][$outdoor_temperature] as $data) {
            $group_profile['temperature'][$type]['deltas'][$outdoor_temperature] +=
              ($data['value'] * $data['samples'] / $group_profile['metadata']['temperature'][$type]['deltas'][$outdoor_temperature]['samples']);
          }
        }
      }
      ksort($group_profile['temperature'][$type]['deltas']);

      $group_profile['temperature'][$type]['linear_trendline'] = $this->api(
        'profile',
        'get_linear_trendline',
        ['data' => $group_profile['temperature'][$type]['deltas']]
      );

    }

    // echo '<pre>';
    // print_r($group_profile);
    // die();

    $this->update(
      [
        'thermostat_group_id' => $thermostat_group_id,
        'profile' => $group_profile
      ]
    );

    // Force these to actually return, but set them to null if there's no data.
    foreach(['heat', 'cool', 'resist'] as $type) {
      if(isset($group_profile['temperature'][$type]) === false) {
        $group_profile['temperature'][$type] = null;
      }
    }

    return $group_profile;
  }

  /**
   * Generate temperature profiles for all thermostat_groups. This pretty much
   * only exists for the cron job.
   */
  public function generate_profiles() {
    // Get all thermostat_groups.
    $thermostat_groups = $this->read();
    foreach($thermostat_groups as $thermostat_group) {
      $this->generate_profile(
        $thermostat_group['thermostat_group_id'],
        null,
        null
      );
    }

    $this->api(
      'user',
      'update_sync_status',
      ['key' => 'thermostat_group.generate_profiles']
    );
  }

  /**
   * Generate the group temperature profile.
   *
   * @param int $thermostat_group_id
   * @param string $begin When to begin the temperature profile at.
   * @param string $end When to end the temperature profile at.
   *
   * @return array
   */
  public function generate_temperature_profile($thermostat_group_id, $begin, $end) {
    if($begin === null && $end === null) {
      $save = true;
    } else {
      $save = false;
    }

    // Get all thermostats in this group.
    $thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'thermostat_group_id' => $thermostat_group_id,
          'inactive' => 0
        ]
      ]
    );

    // Generate a temperature profile for each thermostat in this group.
    $temperature_profiles = [];
    foreach($thermostats as $thermostat) {
      $temperature_profiles[] = $this->api(
        'temperature_profile',
        'generate',
        [
          'thermostat_id' => $thermostat['thermostat_id'],
          'begin' => $begin,
          'end' => $end
        ]
      );
    }

    // Get all of the individual deltas for averaging.
    $group_temperature_profile = [];
    foreach($temperature_profiles as $temperature_profile) {
      foreach($temperature_profile as $type => $data) {
        if($data !== null) {
          foreach($data['deltas'] as $outdoor_temperature => $delta) {
            $group_temperature_profile[$type]['deltas'][$outdoor_temperature][] = $delta;
          }

          if(isset($data['cycles_per_hour']) === true) {
            $group_temperature_profile[$type]['cycles_per_hour'][] = $data['cycles_per_hour'];
          }

          // if(isset($data['generated_at']) === true) {
          //   $group_temperature_profile[$type]['generated_at'][] = $data['generated_at'];
          // }
        }
      }
    }

    // Calculate the average deltas, then get the trendline and score.
    foreach($group_temperature_profile as $type => $data) {
      foreach($data['deltas'] as $outdoor_temperature => $delta) {
        $group_temperature_profile[$type]['deltas'][$outdoor_temperature] =
          array_sum($group_temperature_profile[$type]['deltas'][$outdoor_temperature]) /
          count($group_temperature_profile[$type]['deltas'][$outdoor_temperature]);
      }
      ksort($group_temperature_profile[$type]['deltas']);

      if(isset($data['cycles_per_hour']) === true) {
        $group_temperature_profile[$type]['cycles_per_hour'] =
          array_sum($data['cycles_per_hour']) / count($data['cycles_per_hour']);
      } else {
        $group_temperature_profile[$type]['cycles_per_hour'] = null;
      }

      $group_temperature_profile[$type]['linear_trendline'] = $this->api(
        'temperature_profile',
        'get_linear_trendline',
        ['data' => $group_temperature_profile[$type]['deltas']]
      );

      $group_temperature_profile[$type]['score'] = $this->api(
        'temperature_profile',
        'get_score',
        [
          'type' => $type,
          'temperature_profile' => $group_temperature_profile[$type]
        ]
      );

      $group_temperature_profile[$type]['metadata'] = [
        'generated_at' => date('Y-m-d H:i:s')
      ];
    }

    // Only actually save this profile to the thermostat if it was run with the
    // default settings (aka the last year). Anything else is not valid to save.
    if($save === true) {
      $this->update(
        [
          'thermostat_group_id' => $thermostat_group_id,
          'temperature_profile' => $group_temperature_profile
        ]
      );
    }

    // Force these to actually return, but set them to null if there's no data.
    foreach(['heat', 'cool', 'resist'] as $type) {
      if(isset($group_temperature_profile[$type]) === false) {
        $group_temperature_profile[$type] = null;
      }
    }

    return $group_temperature_profile;
  }

  /**
   * Generate temperature profiles for all thermostat_groups. This pretty much
   * only exists for the cron job.
   */
  public function generate_temperature_profiles() {
    // Get all thermostat_groups.
    $thermostat_groups = $this->read();
    foreach($thermostat_groups as $thermostat_group) {
      $this->generate_temperature_profile(
        $thermostat_group['thermostat_group_id'],
        null,
        null
      );
    }

    $this->api(
      'user',
      'update_sync_status',
      ['key' => 'thermostat_group.generate_temperature_profiles']
    );
  }

  /**
   * Compare this thermostat_group to all other matching ones.
   *
   * @param string $type resist|heat|cool
   * @param array $attributes The attributes to compare to.
   *
   * @return array
   */
  public function get_scores($type, $attributes) {
    // All or none are required.
    if(
      (
        isset($attributes['address_latitude']) === true ||
        isset($attributes['address_longitude']) === true ||
        isset($attributes['address_radius']) === true
      ) &&
      (
        isset($attributes['address_latitude']) === false ||
        isset($attributes['address_longitude']) === false ||
        isset($attributes['address_radius']) === false
      )
    ) {
      throw new Exception('If one of address_latitude, address_longitude, or address_radius are set, then all are required.');
    }

    // Pull these values out so they don't get queried; this comparison is done
    // in PHP.
    if(isset($attributes['address_radius']) === true) {
      $address_latitude = $attributes['address_latitude'];
      $address_longitude = $attributes['address_longitude'];
      $address_radius = $attributes['address_radius'];

      unset($attributes['address_latitude']);
      unset($attributes['address_longitude']);
      unset($attributes['address_radius']);
    }

    $scores = [];
    $limit_start = 0;
    $limit_count = 1000;

    /**
     * Selecting lots of rows can eventually run PHP out of memory, so chunk
     * this up into several queries to avoid that.
     */
    do {
      // Get all matching thermostat groups.
      $other_thermostat_groups = $this->database->read(
        'thermostat_group',
        $attributes,
        [], // columns
        [], // order_by
        [$limit_start, $limit_count] // limit
      );

      // Get all the scores from the other thermostat groups
      foreach($other_thermostat_groups as $other_thermostat_group) {
        if(
          isset($other_thermostat_group['temperature_profile'][$type]) === true &&
          isset($other_thermostat_group['temperature_profile'][$type]['score']) === true &&
          $other_thermostat_group['temperature_profile'][$type]['score'] !== null &&
          isset($other_thermostat_group['temperature_profile'][$type]['metadata']) === true &&
          isset($other_thermostat_group['temperature_profile'][$type]['metadata']['generated_at']) === true &&
          strtotime($other_thermostat_group['temperature_profile'][$type]['metadata']['generated_at']) > strtotime('-1 month')
        ) {
          // Skip thermostat_groups that are too far away.
          if(
            isset($address_radius) === true &&
            $this->haversine_great_circle_distance(
              $address_latitude,
              $address_longitude,
              $other_thermostat_group['address_latitude'],
              $other_thermostat_group['address_longitude']
            ) > $address_radius
          ) {
            continue;
          }

          // Ignore profiles with too few datapoints. Ideally this would be time-
          // based...so don't use a profile if it hasn't experienced a full year
          // or heating/cooling system, but that isn't stored presently. A good
          // approximation is to make sure there is a solid set of data driving
          // the profile.
          $required_delta_count = (($type === 'resist') ? 40 : 20);
          if(count($other_thermostat_group['temperature_profile'][$type]['deltas']) < $required_delta_count) {
            continue;
          }

          // Round the scores so they can be better displayed on a histogram or
          // bell curve.
          // TODO: Might be able to get rid of this? I don't think new scores are calculated at this level of detail anymore...
          // $scores[] = round(
          //   $other_thermostat_group['temperature_profile'][$type]['score'],
          //   1
          // );
          $scores[] = $other_thermostat_group['temperature_profile'][$type]['score'];
        }
      }

      $limit_start += $limit_count;
    } while (count($other_thermostat_groups) === $limit_count);

    sort($scores);

    return $scores;
  }

  /**
   * Compare this thermostat_group to all other matching ones.
   *
   * @param array $attributes The attributes to compare to.
   *
   * @return array
   */
  public function get_metrics($type, $attributes) {
    // All or none are required.
    if(
      (
        isset($attributes['address_latitude']) === true ||
        isset($attributes['address_longitude']) === true ||
        isset($attributes['address_radius']) === true
      ) &&
      (
        isset($attributes['address_latitude']) === false ||
        isset($attributes['address_longitude']) === false ||
        isset($attributes['address_radius']) === false
      )
    ) {
      throw new Exception('If one of address_latitude, address_longitude, or address_radius are set, then all are required.');
    }

    // Pull these values out so they don't get queried; this comparison is done
    // in PHP.
    if(isset($attributes['address_radius']) === true) {
      $address_latitude = $attributes['address_latitude'];
      $address_longitude = $attributes['address_longitude'];
      $address_radius = $attributes['address_radius'];

      unset($attributes['address_latitude']);
      unset($attributes['address_longitude']);
      unset($attributes['address_radius']);
    }

    $metric_codes = [
      'setpoint_heat',
      'setpoint_cool',
      'runtime_per_heating_degree_day'
    ];

    $metrics = [];
    foreach($metric_codes as $metric_code) {
      $metrics[$metric_code] = [
        'values' => [],
        'histogram' => [],
        'standard_deviation' => null,
        'median' => null
      ];
    }

    $limit_start = 0;
    $limit_count = 1000;

    /**
     * Selecting lots of rows can eventually run PHP out of memory, so chunk
     * this up into several queries to avoid that.
     */
    do {
      // Get all matching thermostat groups.
      $other_thermostat_groups = $this->database->read(
        'thermostat_group',
        $attributes,
        [], // columns
        [], // order_by
        [$limit_start, $limit_count] // limit
      );

      // Get all the scores from the other thermostat groups
      foreach($other_thermostat_groups as $other_thermostat_group) {
        // Only use profiles with at least a year of data
        // Only use profiles generated in the past year
        //
        if(
          $other_thermostat_group['profile']['metadata']['duration'] >= 365 &&
          strtotime($other_thermostat_group['profile']['metadata']['generated_at']) > strtotime('-1 year')
        ) {
          // Skip thermostat_groups that are too far away.
          if(
            isset($address_radius) === true &&
            $this->haversine_great_circle_distance(
              $address_latitude,
              $address_longitude,
              $other_thermostat_group['address_latitude'],
              $other_thermostat_group['address_longitude']
            ) > $address_radius
          ) {
            continue;
          }

          // setpoint_heat
          if($other_thermostat_group['profile']['setpoint']['heat'] !== null) {
            $setpoint_heat = round($other_thermostat_group['profile']['setpoint']['heat']);
            if(isset($metrics['setpoint_heat']['histogram'][$setpoint_heat]) === false) {
              $metrics['setpoint_heat']['histogram'][$setpoint_heat] = 0;
            }
            $metrics['setpoint_heat']['histogram'][$setpoint_heat]++;
            $metrics['setpoint_heat']['values'][] = $setpoint_heat;
          }

          // setpoint_cool
          if($other_thermostat_group['profile']['setpoint']['cool'] !== null) {
            $setpoint_cool = round($other_thermostat_group['profile']['setpoint']['cool']);
            if(isset($metrics['setpoint_cool']['histogram'][$setpoint_cool]) === false) {
              $metrics['setpoint_cool']['histogram'][$setpoint_cool] = 0;
            }
            $metrics['setpoint_cool']['histogram'][$setpoint_cool]++;
            $metrics['setpoint_cool']['values'][] = $setpoint_cool;
          }

          // runtime_per_heating_degree_day
          if(
            isset($other_thermostat_group['profile']) === true &&
            isset($other_thermostat_group['profile']['runtime']) == true &&
            $other_thermostat_group['profile']['runtime']['heat_1'] !== null &&
            isset($other_thermostat_group['profile']['degree_days']) === true &&
            $other_thermostat_group['profile']['degree_days']['heat'] !== null
          ) {
            $runtime_per_heating_degree_day = round(
              $other_thermostat_group['profile']['runtime']['heat_1'] / $other_thermostat_group['profile']['degree_days']['heat'],
              1
            );
            if(isset($metrics['runtime_per_heating_degree_day']['histogram'][(string)$runtime_per_heating_degree_day]) === false) {
              $metrics['runtime_per_heating_degree_day']['histogram'][(string)$runtime_per_heating_degree_day] = 0;
            }
            $metrics['runtime_per_heating_degree_day']['histogram'][(string)$runtime_per_heating_degree_day]++;
            $metrics['runtime_per_heating_degree_day']['values'][] = $runtime_per_heating_degree_day;
          }
        }
      }

      $limit_start += $limit_count;
    } while (count($other_thermostat_groups) === $limit_count);

    // setpoint_heat
    $metrics['setpoint_heat']['standard_deviation'] = round($this->standard_deviation(
      $metrics['setpoint_heat']['values']
    ), 2);
    $metrics['setpoint_heat']['median'] = array_median($metrics['setpoint_heat']['values']);
    unset($metrics['setpoint_heat']['values']);

    // setpoint_cool
    $metrics['setpoint_cool']['standard_deviation'] = round($this->standard_deviation(
      $metrics['setpoint_cool']['values']
    ), 2);
    $metrics['setpoint_cool']['median'] = array_median($metrics['setpoint_cool']['values']);
    unset($metrics['setpoint_cool']['values']);

    // runtime_per_heating_degree_day
    $metrics['runtime_per_heating_degree_day']['standard_deviation'] = round($this->standard_deviation(
      $metrics['runtime_per_heating_degree_day']['values']
    ), 2);
    $metrics['runtime_per_heating_degree_day']['median'] = array_median($metrics['runtime_per_heating_degree_day']['values']);
    unset($metrics['runtime_per_heating_degree_day']['values']);

    return $metrics;
  }

  private function standard_deviation($array) {
    $count = count($array);

    $mean = array_mean($array);

    $variance = 0;
    foreach($array as $i) {
      $variance += pow(($i - $mean), 2);
    }

    return sqrt($variance / $count);
  }

  /**
   * Calculates the great-circle distance between two points, with the
   * Haversine formula.
   *
   * @param float $latitude_from Latitude of start point in [deg decimal]
   * @param float $longitude_from Longitude of start point in [deg decimal]
   * @param float $latitude_to Latitude of target point in [deg decimal]
   * @param float $longitude_to Longitude of target point in [deg decimal]
   * @param float $earth_radius Mean earth radius in [mi]
   *
   * @link https://stackoverflow.com/a/10054282
   *
   * @return float Distance between points in [mi] (same as earth_radius)
   */
  private function haversine_great_circle_distance($latitude_from, $longitude_from, $latitude_to, $longitude_to, $earth_radius = 3959) {
    $latitude_from_radians = deg2rad($latitude_from);
    $longitude_from_radians = deg2rad($longitude_from);
    $latitude_to_radians = deg2rad($latitude_to);
    $longitude_to_radians = deg2rad($longitude_to);

    $latitude_delta = $latitude_to_radians - $latitude_from_radians;
    $longitude_delta = $longitude_to_radians - $longitude_from_radians;

    $angle = 2 * asin(sqrt(pow(sin($latitude_delta / 2), 2) +
      cos($latitude_from_radians) * cos($latitude_to_radians) * pow(sin($longitude_delta / 2), 2)));

    return $angle * $earth_radius;
  }

  /**
   * Look at all the properties of individual thermostats in this group and
   * apply them to the thermostat_group. This resolves issues where values are
   * set on one thermostat but null on another.
   *
   * @param int $thermostat_group_id
   *
   * @return array The updated thermostat_group.
   */
  public function sync_attributes($thermostat_group_id) {
    $attributes = [
      'system_type_heat',
      'system_type_heat_auxiliary',
      'system_type_cool',
      'property_age',
      'property_square_feet',
      'property_stories',
      'property_structure_type',
      'weather'
    ];

    $thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'thermostat_group_id' => $thermostat_group_id,
          'inactive' => 0
        ]
      ]
    );

    $final_attributes = [];
    foreach($attributes as $attribute) {
      $final_attributes[$attribute] = null;
      foreach($thermostats as $thermostat) {
        switch($attribute) {
          case 'property_age':
          case 'property_square_feet':
          case 'property_stories':
            // Use max found age, square_feet, stories
            $key = str_replace('property_', '', $attribute);
            if($thermostat['property'][$key] !== null) {
              $final_attributes[$attribute] = max($final_attributes[$attribute], $thermostat['property'][$key]);
            }
          break;
          case 'property_structure_type':
            // Use the first non-null structure_type
            if(
              $thermostat['property']['structure_type'] !== null &&
              $final_attributes[$attribute] === null
            ) {
              $final_attributes[$attribute] = $thermostat['property']['structure_type'];
            }
          break;
          case 'system_type_heat':
          case 'system_type_heat_auxiliary':
          case 'system_type_cool':
            $type = str_replace('system_type_', '', $attribute);
            // Always prefer reported, otherwise fall back to detected.
            if($thermostat['system_type']['reported'][$type] !== null) {
              $system_type = $thermostat['system_type']['reported'][$type];
              $reported = true;
            } else {
              $system_type = $thermostat['system_type']['detected'][$type];
              $reported = false;
            }

            if($reported === true) {
              // User-reported values always take precedence
              $final_attributes[$attribute] = $system_type;
            } else if(
              $final_attributes[$attribute] === null ||
              (
                $final_attributes[$attribute] === 'none' &&
                $system_type !== null
              )
            ) {
              // None beats null
              $final_attributes[$attribute] = $system_type;
            }
          break;
          default:
            // Stuff that doesn't really matter (weather); just pick the last
            // one.
            $final_attributes[$attribute] = $thermostat[$attribute];
          break;
        }
      }
    }

    $final_attributes['thermostat_group_id'] = $thermostat_group_id;
    return $this->update($final_attributes);
  }

  /**
   * Update all of the thermostats in this group to a specified system type,
   * then sync that forwards into the thermostat_group.
   *
   * @param int $thermostat_group_id
   * @param array $system_types
   *
   * @return array The updated thermostat_group.
   */
  public function update_system_types($thermostat_group_id, $system_types) {
    $thermostats = $this->api(
      'thermostat',
      'read',
      [
        'attributes' => [
          'thermostat_group_id' => $thermostat_group_id
        ]
      ]
    );

    foreach($thermostats as $thermostat) {
      $current_system_types = $thermostat['system_type'];
      foreach($system_types as $system_type => $value) {
        $current_system_types['reported'][$system_type] = $value;
      }

      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => [
            'thermostat_id' => $thermostat['thermostat_id'],
            'system_type' => $current_system_types
          ]
        ]
      );
    }

    return $this->sync_attributes($thermostat_group_id);
  }
}
