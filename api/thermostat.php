<?php

/**
 * Any type of thermostat.
 *
 * @author Jon Ziebell
 */
class thermostat extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'sync',
      'dismiss_alert',
      'restore_alert',
      'set_reported_system_types',
      'generate_profile',
      'generate_profiles',
      'get_metrics'
    ],
    'public' => []
  ];

  public static $cache = [
    'sync' => 180, // 3 Minutes
    'generate_profile' => 604800, // 7 Days
    'get_metrics' => 604800 // 7 Days
  ];

  /**
   * Updates a thermostat normally, plus does the generated columns.
   *
   * @param array $attributes
   *
   * @return array
   */
  public function update($attributes) {
    return parent::update(array_merge($attributes, $this->get_generated_columns($attributes)));
  }

  /**
   * Get all of the generated columns.
   *
   * @param array $attributes The thermostat.
   *
   * @return array The generated columns only.
   */
  private function get_generated_columns($attributes) {
    $generated_columns = [];

    if(isset($attributes['system_type']) === true) {
      foreach(['heat', 'heat_auxiliary', 'auxiliary_heat', 'cool'] as $mode) {
        if($attributes['system_type']['reported'][$mode]['equipment'] !== null) {
          $generated_columns['system_type_' . $mode] = $attributes['system_type']['reported'][$mode]['equipment'];
        } else {
          $generated_columns['system_type_' . $mode] = $attributes['system_type']['detected'][$mode]['equipment'];
        }
        if($attributes['system_type']['reported'][$mode]['stages'] !== null) {
          $generated_columns['system_type_' . $mode . '_stages'] = $attributes['system_type']['reported'][$mode]['stages'];
        } else {
          $generated_columns['system_type_' . $mode . '_stages'] = $attributes['system_type']['detected'][$mode]['stages'];
        }
      }
    }

    if(isset($attributes['property']) === true) {
      foreach(['age', 'square_feet', 'stories', 'structure_type'] as $characteristic) {
        $generated_columns['property_' . $characteristic] = $attributes['property'][$characteristic];
      }
    }

    if(isset($attributes['address_id']) === true) {
      $address = $this->api('address', 'get', $attributes['address_id']);
      if(
        isset($address['normalized']['metadata']) === true &&
        $address['normalized']['metadata'] !== null &&
        isset($address['normalized']['metadata']['latitude']) === true &&
        $address['normalized']['metadata']['latitude'] !== null &&
        isset($address['normalized']['metadata']['longitude']) === true &&
        $address['normalized']['metadata']['longitude'] !== null
      ) {
        $generated_columns['address_latitude'] = $address['normalized']['metadata']['latitude'];
        $generated_columns['address_longitude'] = $address['normalized']['metadata']['longitude'];
      } else {
        $generated_columns['address_latitude'] = null;
        $generated_columns['address_longitude'] = null;
      }
    }

    return $generated_columns;
  }

  /**
   * Update the reported system type of this thermostat.
   *
   * @param int $thermostat_id
   * @param array $system_types
   *
   * @return array The updated thermostat.
   */
  public function set_reported_system_types($thermostat_id, $system_types) {
    // Redundant, but makes sure you have access to edit the thermostat you
    // submitted.
    $thermostat = $this->get($thermostat_id);

    foreach($system_types as $system_type => $value) {
      if(in_array($system_type, ['heat', 'heat_auxiliary', 'auxiliary_heat', 'cool']) === true) {
        $thermostat['system_type']['reported'][$system_type]['equipment'] = $value;
      }
    }

    return $this->update($thermostat);
  }

  /**
   * Normal read, but filter out generated columns. These columns exist only
   * for indexing and searching purposes.
   *
   * @param array $attributes
   * @param array $columns
   *
   * @return array
   */
  public function read($attributes = [], $columns = []) {
    $thermostats = parent::read($attributes, $columns);

    foreach($thermostats as &$thermostat) {
      unset($thermostat['system_type_heat']);
      unset($thermostat['system_type_heat_stages']);
      unset($thermostat['system_type_heat_auxiliary']);
      unset($thermostat['system_type_heat_auxiliary_stages']);
      unset($thermostat['system_type_cool']);
      unset($thermostat['system_type_cool_stages']);
      unset($thermostat['property_age']);
      unset($thermostat['property_square_feet']);
      unset($thermostat['property_stories']);
      unset($thermostat['property_structure_type']);
      unset($thermostat['address_latitude']);
      unset($thermostat['address_longitude']);
    }

    return $thermostats;
  }

  /**
   * Sync all thermostats for the current user. If we fail to get a lock, fail
   * silently (catch the exception) and just return false.
   *
   * @return boolean true if the sync ran, false if not.
   */
  public function sync() {
    // Skip this for the demo
    if($this->setting->is_demo() === true) {
      return true;
    }

    try {
      $lock_name = 'thermostat->sync(' . $this->session->get_user_id() . ')';
      $this->database->get_lock($lock_name);

      $this->api('ecobee_thermostat', 'sync');

      $this->api(
        'user',
        'update_sync_status',
        ['key' => 'thermostat']
      );

      $this->database->release_lock($lock_name);

      return true;
    } catch(cora\exception $e) {
      return false;
    }
  }

  /**
   * Dismiss an alert.
   *
   * @param int $thermostat_id
   * @param string $guid
   */
  public function dismiss_alert($thermostat_id, $guid) {
    $thermostat = $this->get($thermostat_id);
    foreach($thermostat['alerts'] as &$alert) {
      if($alert['guid'] === $guid) {
        $alert['dismissed'] = true;
        break;
      }
    }
    $this->update(
      [
        'thermostat_id' => $thermostat_id,
        'alerts' => $thermostat['alerts']
      ]
    );
  }

  /**
   * Restore a dismissed alert.
   *
   * @param int $thermostat_id
   * @param string $guid
   */
  public function restore_alert($thermostat_id, $guid) {
    $thermostat = $this->get($thermostat_id);
    foreach($thermostat['alerts'] as &$alert) {
      if($alert['guid'] === $guid) {
        $alert['dismissed'] = false;
        break;
      }
    }
    $this->update(
      [
        'thermostat_id' => $thermostat_id,
        'alerts' => $thermostat['alerts']
      ]
    );
  }

  /**
   * Generate profiles for all thermostats. This pretty much only exists for
   * the cron job.
   */
  public function generate_profiles() {
    $thermostats = $this->read([
      'inactive' => 0
    ]);
    foreach($thermostats as $thermostat) {
      $this->generate_profile(
        $thermostat['thermostat_id']
      );
    }

    $this->api(
      'user',
      'update_sync_status',
      ['key' => 'thermostat.generate_profiles']
    );
  }

  /**
   * Generate a new profile for this thermostat.
   *
   * @param int $thermostat_id
   */
  public function generate_profile($thermostat_id) {
    $this->update([
      'thermostat_id' => $thermostat_id,
      'profile' => $this->api('profile', 'generate', $thermostat_id)
    ]);
  }

  /**
   * Compare this thermostat to all other matching ones.
   *
   * @param array $thermosat_id The base thermostat_id.
   * @param array $attributes Optional attributes:
   * property_structure_type
   * property_age
   * property_square_feet
   * property_stories
   *
   * @return array
   */
  public function get_metrics($thermostat_id, $attributes) {
    $thermostat = $this->get($thermostat_id);
    $generated_columns = $this->get_generated_columns($thermostat);

    if(
      $generated_columns['system_type_heat'] === null ||
      $generated_columns['system_type_heat_stages'] === null ||
      $generated_columns['system_type_cool'] === null ||
      $generated_columns['system_type_cool_stages'] === null
    ) {
      throw new cora\exception('System type is not defined.', 10700);
    }

    $where = [];

    $keys_generated_columns = [
      'system_type_heat',
      'system_type_heat_stages',
      'system_type_cool',
      'system_type_cool_stages'
    ];
    foreach($keys_generated_columns as $key) {
      $where[] = $this->database->column_equals_value_where(
        $key,
        $generated_columns[$key]
      );
    }

    $keys_required_in_query = [
      'property_age',
      'property_square_feet',
      'property_stories'
    ];
    foreach($keys_required_in_query as $key) {
      if(isset($attributes[$key]) === true) {
        $where[] = $this->database->column_equals_value_where(
          $key,
          $attributes[$key]
        );
      } else {
        // Fill these in for query performance.
        $where[] = $this->database->column_equals_value_where(
          $key,
          ['operator' => '>', 'value' => 0]
        );
      }
    }

    $keys_optional_in_query = [
      'property_structure_type',
    ];
    foreach($keys_optional_in_query as $key) {
      if(isset($attributes[$key]) === true) {
        $where[] = $this->database->column_equals_value_where(
          $key,
          $attributes[$key]
        );
      }
    }

    /**
     * Normally radius implies a circle. In this case it's a square as this
     * helps with some optimization.
     */
    if(isset($attributes['radius']) === true) {
      if(
        is_array($attributes['radius']) === false ||
        $attributes['radius']['operator'] !== '<'
      ) {
        throw new \Exception('Radius must be defined as less than a value.', 10702);
      }

      $radius = (int) $attributes['radius']['value'];
      if(
        isset($generated_columns['address_latitude']) === false ||
        isset($generated_columns['address_longitude']) === false
      ) {
        // Require a valid address (latitude/longitude) when using radius.
        throw new cora\exception('Cannot compare by radius if address is invalid.', 10701);
      } else {
          // Latitude is 69mi / °
          $degrees_latitude_delta = $radius / 69 / 2;
          $minimum_latitude = $generated_columns['address_latitude'] - $degrees_latitude_delta;
          $maximum_latitude = $generated_columns['address_latitude'] + $degrees_latitude_delta;
          if ($minimum_latitude < -90) {
            $overflow = abs($minimum_latitude + 90);
            $between_a = [-90, $maximum_latitude];
            sort($between_a);
            $between_b = [90, (90 - $overflow)];
            sort($between_b);
            $where[] = '(`address_latitude` between ' . $between_a[0] . ' and ' . $between_a[1] . ' or `address_latitude` between ' . $between_b[0] . ' and ' . $between_b[1] . ')';
          }
          else if ($maximum_latitude > 90) {
            $overflow = abs($maximum_latitude - 90);
            $between_a = [90, $minimum_latitude];
            sort($between_a);
            $between_b = [-90, (-90 + $overflow)];
            sort($between_b);
            $where[] = '(`address_latitude` between ' . $between_a[0] . ' and ' . $between_a[1] . ' or `address_latitude` between ' . $between_b[0] . ' and ' . $between_b[1] . ')';
          }
          else {
            $between_a = [$minimum_latitude, $maximum_latitude];
            sort($between_a);
            $where[] = '`address_latitude` between ' . $between_a[0] . ' and ' . $between_a[1];
          }

          // Longitude is 69mi / ° at the equator and then shrinks towards the poles.
          $degrees_longitude_delta = $radius / 69 / 2;
          $minimum_longitude = $generated_columns['address_longitude'] - $degrees_longitude_delta;
          $maximum_longitude = $generated_columns['address_longitude'] + $degrees_longitude_delta;
          if ($minimum_longitude < -180) {
            $overflow = abs($minimum_longitude + 180);
            $between_a = [-180, $maximum_longitude];
            sort($between_a);
            $between_b = [180, (180 - $overflow)];
            sort($between_b);
            $where[] = '(`address_longitude` between ' . $between_a[0] . ' and ' . $between_a[1] . ' or `address_longitude` between ' . $between_b[0] . ' and ' . $between_b[1] . ')';
          }
          else if ($maximum_longitude > 180) {
            $overflow = abs($maximum_longitude - 180);
            $between_a = [180, $minimum_longitude];
            sort($between_a);
            $between_b = [-180, (-180 + $overflow)];
            sort($between_b);
            $where[] = '(`address_longitude` between ' . $between_a[0] . ' and ' . $between_a[1] . ' or `address_longitude` between ' . $between_b[0] . ' and ' . $between_b[1] . ')';
          }
          else {
            $between_a = [$minimum_longitude, $maximum_longitude];
            sort($between_a);
            $where[] = '`address_longitude` between ' . $between_a[0] . ' and ' . $between_a[1];
          }
      }
    } else {
      // Fill these in for query performance.
      $where[] = '`address_longitude` between -180 and 180';
      $where[] = '`address_latitude` between -90 and 90';
    }

    // Should match their position in the thermostat profile exactly.
    $metric_codes = [
      'property' => [
        'age',
        'square_feet'
      ],
      'runtime_per_degree_day' => [
        'heat_1',
        'heat_2',
        'cool_1',
        'cool_2'
      ],
      'setpoint' => [
        'heat',
        'cool'
      ],
      'setback' => [
        'heat',
        'cool'
      ],
      'balance_point' => [
        'heat_1',
        'heat_2',
        'resist'
      ]
    ];

    // Set all of the metric intervals. If Celsius add a bit of precision.
    $intervals = [];

    $intervals['property'] = [
      'age' => 1,
      'square_feet' => 500
    ];

    $intervals['runtime_per_degree_day'] = [
      'heat_1' => 1,
      'heat_2' => 1,
      'cool_1' => 1,
      'cool_2' => 1
    ];

    $intervals['setpoint'] = [
        'heat' => 0.5,
        'cool' => 0.5
    ];

    if($thermostat['temperature_unit'] === '°F') {
      $intervals['setback'] = [
        'heat' => 1,
        'cool' => 1
      ];

      $intervals['balance_point'] = [
        'heat_1' => 1,
        'heat_2' => 1,
        'resist' => 1
      ];
    } else {
      $intervals['setback'] = [
        'heat' => 0.5,
        'cool' => 0.5
      ];

      $intervals['balance_point'] = [
        'heat_1' => 0.5,
        'heat_2' => 0.5,
        'resist' => 0.5
      ];
    }

    $get_metric_template = function() {
      return [
        'values' => [],
        'histogram' => [],
        'standard_deviation' => null,
        'median' => null,
        'precision' => null
      ];
    };

    $metrics = [];
    foreach($metric_codes as $parent_metric_name => $parent_metric) {
      $metrics[$parent_metric_name] = [];
      foreach($parent_metric as $child_metric_name) {
        $metrics[$parent_metric_name][$child_metric_name] = $get_metric_template();
        $metrics[$parent_metric_name][$child_metric_name]['interval'] = $intervals[$parent_metric_name][$child_metric_name];
      }
    }

    $memory_limit = 16; // mb
    $memory_per_thermostat = 0.0054; // mb

    $limit_start = 0;
    $limit_count = round($memory_limit / $memory_per_thermostat);

    /**
     * Selecting lots of rows can eventually run PHP out of memory, so chunk
     * this up into several queries to avoid that.
     */
    do {
      $result = $this->database->query('
        select
          thermostat_id,
          profile
        from
          thermostat
        where ' .
          implode(' and ', $where) . '
        limit ' . $limit_start . ',' . $limit_count . '
      ');

      // Get all the scores from the other thermostats
      while($other_thermostat = $result->fetch_assoc()) {
        $other_thermostat['profile'] = json_decode($other_thermostat['profile'], true);
        // Only use profiles with at least a year of data
        // Only use profiles generated in the past year
        if(
          $other_thermostat['profile']['metadata']['duration'] >= 365 &&
          strtotime($other_thermostat['profile']['metadata']['generated_at']) > strtotime('-1 year') &&
          $other_thermostat['thermostat_id'] !== $thermostat_id
        ) {
          foreach($metric_codes as $parent_metric_name => $parent_metric) {
            foreach($parent_metric as $child_metric_name) {
              if(
                isset($thermostat['profile'][$parent_metric_name]) === true &&
                isset($thermostat['profile'][$parent_metric_name][$child_metric_name]) === true &&
                $thermostat['profile'][$parent_metric_name][$child_metric_name] !== null &&
                isset($other_thermostat['profile'][$parent_metric_name]) === true &&
                isset($other_thermostat['profile'][$parent_metric_name][$child_metric_name]) === true &&
                $other_thermostat['profile'][$parent_metric_name][$child_metric_name] !== null
              ) {
                $interval = $intervals[$parent_metric_name][$child_metric_name];
                $data = round($other_thermostat['profile'][$parent_metric_name][$child_metric_name] / $interval) * $interval;

                $precision = strlen(substr(strrchr($interval, "."), 1));
                $data = number_format($data, $precision, '.', '');

                $metrics[$parent_metric_name][$child_metric_name]['values'][] = $data;
              }
            }
          }
        }
      }

      $limit_start += $limit_count;
    } while ($result->num_rows === $limit_count);

    // Cleanup. Set the standard deviation, median, and remove the temporary
    // values and any metrics that have no data.
    foreach($metric_codes as $parent_metric_name => $parent_metric) {
      foreach($parent_metric as $child_metric_name) {
        $data = $this->remove_outliers($metrics[$parent_metric_name][$child_metric_name]['values']);
        if(count($data['values']) > 0) {
          $metrics[$parent_metric_name][$child_metric_name]['histogram'] = $data['histogram'];
          $metrics[$parent_metric_name][$child_metric_name]['standard_deviation'] = array_standard_deviation($data['values']);
          $metrics[$parent_metric_name][$child_metric_name]['median'] = floatval(array_median($data['values']));
          unset($metrics[$parent_metric_name][$child_metric_name]['values']);
        } else {
          $metrics[$parent_metric_name][$child_metric_name] = null;
        }
      }
    }

    return $metrics;
  }

  /**
   * Remove outliers more than 2 standard deviations away from the mean. This
   * is an effective way to keep the scales meaningul for normal data.
   *
   * @param array $array Input array
   *
   * @return array Input array minus outliers.
   */
  private function remove_outliers($array) {
    $mean = array_mean($array);
    $standard_deviation = array_standard_deviation($array);

    $min = $mean - ($standard_deviation * 2);
    $max = $mean + ($standard_deviation * 2);

    $values = [];
    $histogram = [];
    foreach($array as $value) {
      if($value >= $min && $value <= $max) {
        $values[] = $value;

        $value_string = strval($value);
        if(isset($histogram[$value_string]) === false) {
          $histogram[$value_string] = 0;
        }
        $histogram[$value_string]++;
      }
    }

    return [
      'values' => $values,
      'histogram' => $histogram
    ];
  }
}
