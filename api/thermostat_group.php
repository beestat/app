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
      'get_scores',
      'update_system_types'
    ],
    'public' => []
  ];

  public static $cache = [
    'generate_temperature_profile' => 604800, // 7 Days
    'generate_temperature_profiles' => 604800, // 7 Days
    'get_scores' => 604800 // 7 Days
  ];

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

    // Get all matching thermostat groups.
    $other_thermostat_groups = $this->database->read(
      'thermostat_group',
      $attributes
    );

    // Get all the scores from the other thermostat groups
    $scores = [];
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

    sort($scores);

    return $scores;
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
