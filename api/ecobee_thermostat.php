<?php

/**
 * An ecobee thermostat. This has many properties which are all synced from the
 * ecobee API.
 *
 * @author Jon Ziebell
 */
class ecobee_thermostat extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id'
    ],
    'public' => []
  ];

  /**
   * Sync thermostats.
   */
  public function sync() {
    // Get the thermostat list from ecobee with sensors. Keep this identical to
    // ecobee_sensor->sync() to leverage caching.
    $response = $this->api(
      'ecobee',
      'ecobee_api',
      [
        'method' => 'GET',
        'endpoint' => 'thermostat',
        'arguments' => [
          'body' => json_encode([
            'selection' => [
              'selectionType' => 'registered',
              'selectionMatch' => '',
              'includeRuntime' => true,
              'includeExtendedRuntime' => true,
              'includeElectricity' => true,
              'includeSettings' => true,
              'includeLocation' => true,
              'includeProgram' => true,
              'includeEvents' => true,
              'includeDevice' => true,
              'includeTechnician' => true,
              'includeUtility' => true,
              'includeManagement' => true,
              'includeAlerts' => true,
              'includeWeather' => true,
              'includeHouseDetails' => true,
              'includeOemCfg' => true,
              'includeEquipmentStatus' => true,
              'includeNotificationSettings' => true,
              'includeVersion' => true,
              'includePrivacy' => true,
              'includeAudio' => true,
              'includeSensors' => true

              /**
               * 'includeReminders' => true
               *
               * While documented, this is not available for general API use
               * unless you are a technician user.
               *
               * The reminders and the includeReminders flag are something extra
               * for ecobee Technicians. It allows them to set and receive
               * reminders with more detail than the usual alert reminder type.
               * These reminders are only available to Technician users, which
               * is why you aren't seeing any new information when you set that
               * flag to true. Thanks for pointing out the lack of documentation
               * regarding this. We'll get this updated as soon as possible.
               *
               *
               * https://getsatisfaction.com/api/topics/what-does-includereminders-do-when-calling-get-thermostat?rfm=1
               */

              /**
               * 'includeSecuritySettings' => true
               *
               * While documented, this is not made available for general API
               * use unless you are a utility. If you try to include this an
               * "Authentication failed" error will be returned.
               *
               * Special accounts such as Utilities are permitted an alternate
               * method of authorization using implicit authorization. This
               * method permits the Utility application to authorize against
               * their own specific account without the requirement of a PIN.
               * This method is limited to special contractual obligations and
               * is not available for 3rd party applications who are not
               * Utilities.
               *
               * https://www.ecobee.com/home/developer/api/documentation/v1/objects/SecuritySettings.shtml
               * https://www.ecobee.com/home/developer/api/documentation/v1/auth/auth-intro.shtml
               *
               */
            ]
          ])
        ]
      ]
    );

    // Loop over the returned thermostats and create/update them as necessary.
    $thermostat_ids_to_keep = [];
    $email_addresses = [];
    foreach($response['thermostatList'] as $api_thermostat) {
      $ecobee_thermostat = $this->get(
        [
          'identifier' => $api_thermostat['identifier']
        ]
      );

      if ($ecobee_thermostat !== null) {
        // Thermostat exists.
        $thermostat = $this->api(
          'thermostat',
          'get',
          [
            'attributes' => [
              'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id']
            ]
          ]
        );
      }
      else {
        // Thermostat does not exist.
        $ecobee_thermostat = $this->create([
          'identifier' => $api_thermostat['identifier']
        ]);
        $thermostat = $this->api(
          'thermostat',
          'create',
          [
            'attributes' => [
              'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id'],
              'alerts' => []
            ]
          ]
        );
      }

      $thermostat_ids_to_keep[] = $thermostat['thermostat_id'];

      $ecobee_thermostat = $this->update(
        [
          'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id'],
          'name' => $api_thermostat['name'],
          'identifier' => $api_thermostat['identifier'],
          'utc_time' => $api_thermostat['utcTime'],
          'model_number' => $api_thermostat['modelNumber'],
          'runtime' => $api_thermostat['runtime'],
          'extended_runtime' => $api_thermostat['extendedRuntime'],
          'electricity' => $api_thermostat['electricity'],
          'settings' => $api_thermostat['settings'],
          'location' => $api_thermostat['location'],
          'program' => $api_thermostat['program'],
          'events' => $api_thermostat['events'],
          'device' => $api_thermostat['devices'],
          'technician' => $api_thermostat['technician'],
          'utility' => $api_thermostat['utility'],
          'management' => $api_thermostat['management'],
          'alerts' => $api_thermostat['alerts'],
          'weather' => $api_thermostat['weather'],
          'house_details' => $api_thermostat['houseDetails'],
          'oem_cfg' => $api_thermostat['oemCfg'],
          'equipment_status' => trim($api_thermostat['equipmentStatus']) !== '' ? explode(',', $api_thermostat['equipmentStatus']) : [],
          'notification_settings' => $api_thermostat['notificationSettings'],
          'privacy' => $api_thermostat['privacy'],
          'version' => $api_thermostat['version'],
          'remote_sensors' => $api_thermostat['remoteSensors'],
          'audio' => $api_thermostat['audio'],
          'inactive' => 0
        ]
      );

      foreach($api_thermostat['notificationSettings']['emailAddresses'] as $email_address) {
        if(preg_match('/.+@.+\..+/', $email_address) === 1) {
          $email_addresses[] = trim(strtolower($email_address));
        }
      }

      // Grab a bunch of attributes from the ecobee_thermostat and attach them
      // to the thermostat.
      $attributes = [];
      $attributes['name'] = $api_thermostat['name'];
      $attributes['inactive'] = 0;

      // There are some instances where ecobee gives invalid temperature values.
      if(
        ($api_thermostat['runtime']['actualTemperature'] / 10) > 999.9 ||
        ($api_thermostat['runtime']['actualTemperature'] / 10) < -999.9
      ) {
        $attributes['temperature'] = null;
      } else {
        $attributes['temperature'] = ($api_thermostat['runtime']['actualTemperature'] / 10);
      }

      $attributes['temperature_unit'] = $api_thermostat['settings']['useCelsius'] === true ? '°C' : '°F';

      // There are some instances where ecobee gives invalid humidity values.
      if(
        $api_thermostat['runtime']['actualHumidity'] > 100 ||
        $api_thermostat['runtime']['actualHumidity'] < 0
      ) {
        $attributes['humidity'] = null;
      } else {
        $attributes['humidity'] = $api_thermostat['runtime']['actualHumidity'];
      }

      $attributes['first_connected'] = $api_thermostat['runtime']['firstConnected'];

      $address = $this->get_address($thermostat, $ecobee_thermostat);
      $attributes['address_id'] = $address['address_id'];

      $attributes['property'] = $this->get_property($thermostat, $ecobee_thermostat);
      $attributes['filters'] = $this->get_filters($thermostat, $ecobee_thermostat);
      $attributes['weather'] = $this->get_weather($thermostat, $ecobee_thermostat);
      $attributes['settings'] = $this->get_settings($thermostat, $ecobee_thermostat);
      $attributes['time_zone'] = $this->get_time_zone($thermostat, $ecobee_thermostat);
      $attributes['program'] = $this->get_program($thermostat, $ecobee_thermostat);

      $detected_system_type2 = $this->get_detected_system_type2($thermostat, $ecobee_thermostat);
      if($thermostat['system_type2'] === null) {
        $attributes['system_type2'] = [
          'reported' => [
            'heat' => [
              'equipment' => null,
              'stages' => null
            ],
            'heat_auxiliary' => [
              'equipment' => null,
              'stages' => null
            ],
            'cool' => [
              'equipment' => null,
              'stages' => null
            ]
          ],
          'detected' => $detected_system_type2
        ];
      } else {
        $attributes['system_type2'] = [
          'reported' => $thermostat['system_type2']['reported'],
          'detected' => $detected_system_type2
        ];
      }

      $attributes['running_equipment'] = $this->get_running_equipment(
        $thermostat,
        $ecobee_thermostat,
        $attributes['system_type2']
      );

      $attributes['alerts'] = $this->get_alerts(
        $thermostat,
        $ecobee_thermostat,
        $attributes['system_type2']
      );

      $this->api(
        'thermostat',
        'update',
        [
          'attributes' => array_merge(
            ['thermostat_id' => $thermostat['thermostat_id']],
            $attributes
          )
        ]
      );
    }

    // Update the email_address on the user.
    if(count($email_addresses) > 0) {
      $email_address_counts = array_count_values($email_addresses);
      arsort($email_address_counts);
      $email_address = array_keys(array_slice($email_address_counts, 0, 1, true))[0];
      $this->api('user', 'update', [
        'attributes' => [
          'user_id' => $this->session->get_user_id(),
          'email_address' => $email_address
        ]
      ]);
    }

    // Inactivate any ecobee_thermostats that were no longer returned.
    $thermostats = $this->api('thermostat', 'read');
    $ecobee_thermostat_ids_to_return = [];
    foreach($thermostats as $thermostat) {
      if(in_array($thermostat['thermostat_id'], $thermostat_ids_to_keep) === false) {
        $this->update(
          [
            'ecobee_thermostat_id' => $thermostat['ecobee_thermostat_id'],
            'inactive' => 1
          ]
        );

        $this->api(
          'thermostat',
          'update',
          [
            'attributes' => [
              'thermostat_id' => $thermostat['thermostat_id'],
              'inactive' => 1
            ],
          ]
        );
      } else {
        $ecobee_thermostat_ids_to_return[] = $thermostat['ecobee_thermostat_id'];
      }
    }

    return $this->read_id(['ecobee_thermostat_id' => $ecobee_thermostat_ids_to_return]);
  }

  /**
   * Get the address for the given thermostat.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_address($thermostat, $ecobee_thermostat) {
    $address = [];

    if(isset($ecobee_thermostat['location']['streetAddress']) === true) {
      $address['line_1'] = $ecobee_thermostat['location']['streetAddress'];
    }
    if(isset($ecobee_thermostat['location']['city']) === true) {
      $address['locality'] = $ecobee_thermostat['location']['city'];
    }
    if(isset($ecobee_thermostat['location']['provinceState']) === true) {
      $address['administrative_area'] = $ecobee_thermostat['location']['provinceState'];
    }
    if(isset($ecobee_thermostat['location']['postalCode']) === true) {
      $address['postal_code'] = $ecobee_thermostat['location']['postalCode'];
    }

    if(
      isset($ecobee_thermostat['location']['country']) === true &&
      trim($ecobee_thermostat['location']['country']) !== ''
    ) {
      if(preg_match('/(^USA?$)|(united.?states)/i', $ecobee_thermostat['location']['country']) === 1) {
        $country = 'USA';
      }
      else {
        $country = $ecobee_thermostat['location']['country'];
      }
    }
    else {
      // If all else fails, assume USA.
      $country = 'USA';
    }

    return $this->api(
      'address',
      'search',
      [
        'address' => $address,
        'country' => $country
      ]
    );
  }

  /**
   * Get details about the thermostat's property.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_property($thermostat, $ecobee_thermostat) {
    $property = [];

    /**
     * Example values from ecobee: "0", "apartment", "Apartment", "Condo",
     * "condominium", "detached", "Detached", "I don't know", "loft", "Multi
     * Plex", "multiPlex", "other", "Other", "rowHouse", "Semi-Detached",
     * "semiDetached", "townhouse", "Townhouse"
     */
    $property['structure_type'] = null;
    if(isset($ecobee_thermostat['house_details']['style']) === true) {
      $structure_type = $ecobee_thermostat['house_details']['style'];
      if(preg_match('/^detached$/i', $structure_type) === 1) {
        $property['structure_type'] = 'detached';
      }
      else if(preg_match('/apartment/i', $structure_type) === 1) {
        $property['structure_type'] = 'apartment';
      }
      else if(preg_match('/^condo/i', $structure_type) === 1) {
        $property['structure_type'] = 'condominium';
      }
      else if(preg_match('/^loft/i', $structure_type) === 1) {
        $property['structure_type'] = 'loft';
      }
      else if(preg_match('/multi[^a-z]?plex/i', $structure_type) === 1) {
        $property['structure_type'] = 'multiplex';
      }
      else if(preg_match('/(town|row)(house|home)/i', $structure_type) === 1) {
        $property['structure_type'] = 'townhouse';
      }
      else if(preg_match('/semi[^a-z]?detached/i', $structure_type) === 1) {
        $property['structure_type'] = 'semi-detached';
      }
    }

    /**
     * Example values from ecobee: "0", "1", "2", "3", "4", "5", "8", "9", "10"
     */
    $property['stories'] = null;
    if(isset($ecobee_thermostat['house_details']['numberOfFloors']) === true) {
      $stories = $ecobee_thermostat['house_details']['numberOfFloors'];
      if(ctype_digit((string) $stories) === true && $stories > 0) {
        $property['stories'] = (int) $stories;
      }
    }

    /**
     * Example values from ecobee: "0", "5", "500", "501", "750", "1000",
     * "1001", "1050", "1200", "1296", "1400", "1500", "1501", "1600", "1750",
     * "1800", "1908", "2000", "2400", "2450", "2500", "2600", "2750", "2800",
     * "2920", "3000", "3200", "3437", "3500", "3600", "4000", "4500", "5000",
     * "5500", "5600", "6000", "6500", "6800", "7000", "7500", "7800", "8000",
     * "9000", "9500", "10000"
     */
    $property['square_feet'] = null;
    if(isset($ecobee_thermostat['house_details']['size']) === true) {
      $square_feet = $ecobee_thermostat['house_details']['size'];
      if(ctype_digit((string) $square_feet) === true && $square_feet > 0) {
        $property['square_feet'] = round($square_feet / 500) * 500;
      }
    }

    /**
     * Example values from ecobee: "0", "1", "2", "3", "5", "6", "7", "8",
     * "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
     * "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32",
     * "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44",
     * "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56",
     * "57", "58", "59", "60", "61", "62", "63", "64", "65", "66", "67", "68",
     * "69", "70", "71", "72", "73", "75", "76", "77", "78", "79", "80", "81",
     * "82", "83", "86", "87", "88", "89", "90", "91", "92", "93", "95", "96",
     * "97", "98", "99", "100", "101", "102", "103", "104", "105", "106",
     * "107", "108", "109", "111", "112", "116", "117", "118", "119", "120",
     * "121", "122", "123", "124"
     */
    $property['age'] = null;
    if(isset($ecobee_thermostat['house_details']['age']) === true) {
      $age = $ecobee_thermostat['house_details']['age'];
      if(ctype_digit((string) $age) === true) {
        $property['age'] = (int) $age;
      }
    }

    return $property;
  }

  /**
   * Get details about the different filters and things.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_filters($thermostat, $ecobee_thermostat) {
    $filters = [];

    $supported_types = [
      'furnaceFilter' => [
        'key' => 'furnace',
        'sum_column' => 'sum_fan'
      ],
      'humidifierFilter' => [
        'key' => 'humidifier',
        'sum_column' => 'sum_humidifier'
      ],
      'dehumidifierFilter' => [
        'key' => 'dehumidifier',
        'sum_column' => 'sum_dehumidifier'
      ],
      'ventilator' => [
        'key' => 'ventilator',
        'sum_column' => 'sum_ventilator'
      ],
      'uvLamp' => [
        'key' => 'uv_lamp',
        'sum_column' => 'sum_fan'
      ]
    ];

    $sums = [];
    $min_timestamp = INF;
    if(isset($ecobee_thermostat['notification_settings']['equipment']) === true) {
      foreach($ecobee_thermostat['notification_settings']['equipment'] as $notification) {
        if($notification['enabled'] === true && isset($supported_types[$notification['type']]) === true) {
          $key = $supported_types[$notification['type']]['key'];
          $sum_column = $supported_types[$notification['type']]['sum_column'];

          $filters[$key] = [
            'last_changed' => $notification['filterLastChanged'],
            'life' => $notification['filterLife'],
            'life_units' => $notification['filterLifeUnits']
          ];

          $sums[] = 'sum(case when `date` > "' . $notification['filterLastChanged'] . '" then `' . $sum_column . '` else 0 end) `' . $key . '`';
          $min_timestamp = min($min_timestamp, strtotime($notification['filterLastChanged']));
        }
      }
    }

    if(count($filters) > 0) {
      $query = '
        select
          ' . implode(',', $sums) . '
        from
          runtime_thermostat_summary
        where
              `user_id` = "' . $this->session->get_user_id() . '"
          and `thermostat_id` = "' . $thermostat['thermostat_id'] . '"
          and `date` >= "' . date('Y-m-d', $min_timestamp) . '"
      ';

      $result = $this->database->query($query);
      $row = $result->fetch_assoc();
      foreach($row as $key => $value) {
        $filters[$key]['runtime'] = (int) $value;
      }
    }

    return $filters;
  }

  /**
   * Get whatever the alerts should be set to.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   * @param array $system_type
   *
   * @return array
   */
  private function get_alerts($thermostat, $ecobee_thermostat, $system_type) {
    // Get a list of all ecobee thermostat alerts
    $new_alerts = [];
    foreach($ecobee_thermostat['alerts'] as $ecobee_thermostat_alert) {
      $alert = [];
      $alert['timestamp'] = date(
        'Y-m-d H:i:s',
        strtotime($ecobee_thermostat_alert['date'] . ' ' . $ecobee_thermostat_alert['time'])
      );
      $alert['text'] = $ecobee_thermostat_alert['text'];
      $alert['code'] = $ecobee_thermostat_alert['alertNumber'];
      $alert['details'] = 'N/A';
      $alert['source'] = 'thermostat';
      $alert['dismissed'] = false;
      $alert['guid'] = $this->get_alert_guid($alert);

      $new_alerts[$alert['guid']] = $alert;
    }

    // Has heat or cool
    if($system_type['reported']['heat'] !== null) {
      $system_type_heat = $system_type['reported']['heat']['equipment'];
    } else {
      $system_type_heat = $system_type['detected']['heat']['equipment'];
    }
    if($system_type['reported']['heat_auxiliary'] !== null) {
      $system_type_heat_auxiliary = $system_type['reported']['heat_auxiliary']['equipment'];
    } else {
      $system_type_heat_auxiliary = $system_type['detected']['heat_auxiliary']['equipment'];
    }
    $has_heat = (
      $system_type_heat !== 'none' ||
      $system_type_heat_auxiliary !== 'none'
    );

    if($system_type['reported']['cool'] !== null) {
      $system_type_cool = $system_type['reported']['cool']['equipment'];
    } else {
      $system_type_cool = $system_type['detected']['cool']['equipment'];
    }
    $has_cool = ($system_type_cool !== 'none');

    // Cool Differential Temperature
    if(
      $has_cool === true &&
      $ecobee_thermostat['settings']['stage1CoolingDifferentialTemp'] / 10 === 0.5
    ) {
      $alert = [
        'timestamp' => date('Y-m-d H:i:s'),
        'text' => 'Cool Differential Temperature is set to 0.5°F; we recommend at least 1.0°F',
        'details' => 'Low values for this setting will generally not cause any harm, but they do contribute to short cycling and decreased efficiency.',
        'code' => 100000,
        'source' => 'beestat',
        'dismissed' => false
      ];
      $alert['guid'] = $this->get_alert_guid($alert);

      $new_alerts[$alert['guid']] = $alert;
    }

    // Heat Differential Temperature
    if(
      $has_heat === true &&
      $ecobee_thermostat['settings']['stage1HeatingDifferentialTemp'] / 10 === 0.5
    ) {
      $alert = [
        'timestamp' => date('Y-m-d H:i:s'),
        'text' => 'Heat Differential Temperature is set to 0.5°F; we recommend at least 1.0°F',
        'details' => 'Low values for this setting will generally not cause any harm, but they do contribute to short cycling and decreased efficiency.',
        'code' => 100001,
        'source' => 'beestat',
        'dismissed' => false
      ];
      $alert['guid'] = $this->get_alert_guid($alert);

      $new_alerts[$alert['guid']] = $alert;
    }

    // Get the guids for easy comparison
    $new_guids = array_column($new_alerts, 'guid');
    $existing_guids = array_column($thermostat['alerts'], 'guid');

    $guids_to_add = array_diff($new_guids, $existing_guids);
    $guids_to_remove = array_diff($existing_guids, $new_guids);

    // Remove any removed alerts
    $final_alerts = $thermostat['alerts'];
    foreach($final_alerts as $key => $thermostat_alert) {
      if(in_array($thermostat_alert['guid'], $guids_to_remove) === true) {
        unset($final_alerts[$key]);
      }
    }

    // Add any new alerts
    foreach($guids_to_add as $guid) {
      $final_alerts[] = $new_alerts[$guid];
    }

    return array_values($final_alerts);
  }

  /**
   * Get the GUID for an alert. Basically if the text and the source are the
   * same then it's considered the same alert. Timestamp could be included for
   * ecobee alerts but since beestat alerts are constantly re-generated the
   * timestamp always changes.
   *
   * @param array $alert
   *
   * @return string
   */
  private function get_alert_guid($alert) {
    return sha1($alert['text'] . $alert['source']);
  }

  /**
   * Try and detect the type of HVAC system.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array System type for each of heat, cool, and aux.
   */
  private function get_detected_system_type2($thermostat, $ecobee_thermostat) {
    $detected_system_type = [];

    $settings = $ecobee_thermostat['settings'];
    $devices = $ecobee_thermostat['device'];

    // Get a list of all outputs. These get their type set when they get
    // connected to a wire so it's a pretty reliable way to see what's hooked
    // up.
    $outputs = [];
    foreach($devices as $device) {
      foreach($device['outputs'] as $output) {
        if($output['type'] !== 'none') {
          $outputs[] = $output['type'];
        }
      }
    }

    // Heat
    $detected_system_type['heat'] = [
      'equipment' => null,
      'stages' => null
    ];
    if($settings['heatPumpGroundWater'] === true) {
      $detected_system_type['heat']['equipment'] = 'geothermal';
    } else if($settings['hasHeatPump'] === true) {
      $detected_system_type['heat']['equipment'] = 'compressor';
    } else if($settings['hasBoiler'] === true) {
      $detected_system_type['heat']['equipment'] = 'boiler';
    } else if(in_array('heat1', $outputs) === true) {
      // This is the fastest way I was able to determine this. The further north
      // you are the less likely you are to use electric heat.
      if($thermostat['address_id'] !== null) {
        $address = $this->api('address', 'get', $thermostat['address_id']);
        if(
          isset($address['normalized']['metadata']['latitude']) === true &&
          $address['normalized']['metadata']['latitude'] > 30
        ) {
          $detected_system_type['heat']['equipment'] = 'gas';
        } else {
          $detected_system_type['heat']['equipment'] = 'electric';
        }
      } else {
        $detected_system_type['heat']['equipment'] = 'electric';
      }
    } else {
      $detected_system_type['heat']['equipment'] = 'none';
    }


    // Rudimentary aux heat guess. It's pretty good overall but not as good as
    // heat/cool.
    $detected_system_type['heat_auxiliary'] = [
      'equipment' => null,
      'stages' => null
    ];
    if(
      $detected_system_type['heat']['equipment'] === 'gas' ||
      $detected_system_type['heat']['equipment'] === 'boiler' ||
      $detected_system_type['heat']['equipment'] === 'oil' ||
      $detected_system_type['heat']['equipment'] === 'electric'
    ) {
      $detected_system_type['heat_auxiliary']['equipment'] = 'none';
    } else if($detected_system_type['heat']['equipment'] === 'compressor') {
      $detected_system_type['heat_auxiliary']['equipment'] = 'electric';
    }

    // Cool
    $detected_system_type['cool'] = [
      'equipment' => null,
      'stages' => null
    ];
    if($settings['heatPumpGroundWater'] === true) {
      $detected_system_type['cool']['equipment'] = 'geothermal';
    } else if(in_array('compressor1', $outputs) === true) {
      $detected_system_type['cool']['equipment'] = 'compressor';
    } else {
      $detected_system_type['cool']['equipment'] = 'none';
    }

    /**
     * Stages. For whatever reason, heat stages seem wrong. They appear to
     * match the number of "furnace" stages on the ecobee. Attempt to fix this
     * by assuming that if heat and cool are both a compressor then pick the
     * max of these two for both.
     */
    if(
      $detected_system_type['heat']['equipment'] === 'compressor' &&
      $detected_system_type['cool']['equipment'] === 'compressor'
    ) {
      $stages = max(
        $ecobee_thermostat['settings']['coolStages'],
        $ecobee_thermostat['settings']['heatStages']
      );
      $detected_system_type['heat']['stages'] = $stages;
      $detected_system_type['cool']['stages'] = $stages;
    } else {
      $detected_system_type['heat']['stages'] = $ecobee_thermostat['settings']['heatStages'];
      $detected_system_type['cool']['stages'] = $ecobee_thermostat['settings']['coolStages'];
    }

    return $detected_system_type;
  }

  /**
   * Get the current weather status.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_weather($thermostat, $ecobee_thermostat) {
    $weather = [
      'dew_point' => null,
      'barometric_pressure' => null,
      'humidity_relative' => null,
      'temperature_high' => null,
      'temperature_low' => null,
      'temperature' => null,
      'wind_bearing' => null,
      'wind_speed' => null,
      'condition' => null
    ];

    if(
      isset($ecobee_thermostat['weather']['forecasts']) === true &&
      isset($ecobee_thermostat['weather']['forecasts'][0]) === true
    ) {
      $ecobee_weather = $ecobee_thermostat['weather']['forecasts'][0];

      if(isset($ecobee_weather['dewpoint']) === true) {
        $weather['dew_point'] = ($ecobee_weather['dewpoint'] / 10);
      }

      // Returned in MB (divide by 33.864 to get inHg)
      if(isset($ecobee_weather['pressure']) === true) {
        $weather['barometric_pressure'] = $ecobee_weather['pressure'];
      }

      if(isset($ecobee_weather['relativeHumidity']) === true) {
        $weather['humidity_relative'] = $ecobee_weather['relativeHumidity'];
      }

      if(isset($ecobee_weather['tempHigh']) === true) {
        $weather['temperature_high'] = ($ecobee_weather['tempHigh'] / 10);
      }

      if(isset($ecobee_weather['tempLow']) === true) {
        $weather['temperature_low'] = ($ecobee_weather['tempLow'] / 10);
      }

      if(isset($ecobee_weather['temperature']) === true) {
        $weather['temperature'] = ($ecobee_weather['temperature'] / 10);
      }

      if(isset($ecobee_weather['windBearing']) === true) {
        $weather['wind_bearing'] = $ecobee_weather['windBearing'];
      }

      // mph
      if(isset($ecobee_weather['windSpeed']) === true) {
        $weather['wind_speed'] = $ecobee_weather['windSpeed'];
      }

      if(isset($ecobee_weather['weatherSymbol']) === true) {
        switch($ecobee_weather['weatherSymbol']) {
          case 0:
            $weather['condition'] = 'sunny';
          break;
          case 1:
            $weather['condition'] = 'few_clouds';
          break;
          case 2:
            $weather['condition'] = 'partly_cloudy';
          break;
          case 3:
            $weather['condition'] = 'mostly_cloudy';
          break;
          case 4:
            $weather['condition'] = 'overcast';
          break;
          case 5:
            $weather['condition'] = 'drizzle';
          break;
          case 6:
            $weather['condition'] = 'rain';
          break;
          case 7:
            $weather['condition'] = 'freezing_rain';
          break;
          case 8:
            $weather['condition'] = 'showers';
          break;
          case 9:
            $weather['condition'] = 'hail';
          break;
          case 10:
            $weather['condition'] = 'snow';
          break;
          case 11:
            $weather['condition'] = 'flurries';
          break;
          case 12:
            $weather['condition'] = 'freezing_snow';
          break;
          case 13:
            $weather['condition'] = 'blizzard';
          break;
          case 14:
            $weather['condition'] = 'pellets';
          break;
          case 15:
            $weather['condition'] = 'thunderstorm';
          break;
          case 16:
            $weather['condition'] = 'windy';
          break;
          case 17:
            $weather['condition'] = 'tornado';
          break;
          case 18:
            $weather['condition'] = 'fog';
          break;
          case 19:
            $weather['condition'] = 'haze';
          break;
          case 20:
            $weather['condition'] = 'smoke';
          break;
          case 21:
            $weather['condition'] = 'dust';
          break;
        }
      }
    }

    return $weather;
  }

  /**
   * Get certain settings.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_settings($thermostat, $ecobee_thermostat) {
    $settings = [];

    if(isset($ecobee_thermostat['settings']['stage1CoolingDifferentialTemp']) === true) {
      $settings['differential_cool'] = ($ecobee_thermostat['settings']['stage1CoolingDifferentialTemp'] / 10);
    }

    if(isset($ecobee_thermostat['settings']['stage1HeatingDifferentialTemp']) === true) {
      $settings['differential_heat'] = ($ecobee_thermostat['settings']['stage1HeatingDifferentialTemp'] / 10);
    }

    return $settings;
  }

  /**
   * Get program. This is just a clone of the ecobee_thermostat program with a
   * slight modification to the temperature values. First, divide by 10 since
   * this data is returned directly by the API. Second, round. This is weird
   * to do, but as an example one of my comfort settings said "74" in the
   * ecobee GUI but "73.5" in the API. After changing it in the GUI the
   * fractional amount was removed. I assume this is an old ecobee bug but it
   * affects like 10% of thermostats in my database.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return array
   */
  private function get_program($thermostat, $ecobee_thermostat) {
    $program = $ecobee_thermostat['program'];
    if(isset($program['climates']) === true) {
      foreach($program['climates'] as &$climate) {
        $climate['coolTemp'] = round($climate['coolTemp'] / 10);
        $climate['heatTemp'] = round($climate['heatTemp'] / 10);
      }
    }

    return $program;
  }

  /**
   * Get the currently running equipment. Just looks at the ecobee list and
   * translates it a bit.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   * @param array $system_type
   *
   * @return array
   */
  private function get_running_equipment($thermostat, $ecobee_thermostat, $system_type) {
    $running_equipment = [];

    foreach($ecobee_thermostat['equipment_status'] as $equipment) {
      switch($equipment) {
        case 'heatPump':
          $running_equipment[] = 'heat_1';
        break;
        case 'heatPump2':
          $running_equipment[] = 'heat_2';
        break;
        case 'heatPump3':
          $running_equipment[] = 'heat_3';
        break;
        case 'compCool1':
          $running_equipment[] = 'cool_1';
        break;
        case 'compCool2':
          $running_equipment[] = 'cool_2';
        break;
        case 'auxHeat1':
          if ($system_type['detected']['heat']['equipment'] === 'compressor') {
            $running_equipment[] = 'heat_auxiliary_1';
          } else {
            $running_equipment[] = 'heat_1';
          }
        break;
        case 'auxHeat2':
          if ($system_type['detected']['heat']['equipment'] === 'compressor') {
            $running_equipment[] = 'heat_auxiliary_2';
          } else {
            $running_equipment[] = 'heat_2';
          }
        break;
        case 'auxHeat3':
          if ($system_type['detected']['heat']['equipment'] === 'compressor') {
            $running_equipment[] = 'heat_auxiliary_3';
          } else {
            $running_equipment[] = 'heat_3';
          }
        break;
        case 'fan':
          $running_equipment[] = 'fan';
        break;
        case 'humidifier':
          $running_equipment[] = 'humidifier';
        break;
        case 'dehumidifier':
          $running_equipment[] = 'dehumidifier';
        break;
        case 'ventilator':
          $running_equipment[] = 'ventilator';
        break;
        case 'economizer':
          $running_equipment[] = 'economizer';
        break;
        case 'compHotWater':
          $running_equipment[] = 'heat_1';
        break;
        case 'auxHotWater':
          $running_equipment[] = 'heat_auxiliary_1';
        break;
        default:
          throw new \Exception('Unknown equipment running.', 10800);
        break;
      }
    }

    return $running_equipment;
  }

  /**
   * Get the current time zone. It's usually set. If not set use the offset
   * minutes to find it. Worst case default to the most common time zone.
   *
   * @param array $thermostat
   * @param array $ecobee_thermostat
   *
   * @return The time zone.
   */
  private function get_time_zone($thermostat, $ecobee_thermostat) {
    $time_zone = $ecobee_thermostat['location']['timeZone'];

    if (in_array($time_zone, timezone_identifiers_list(DateTimeZone::ALL_WITH_BC)) === true) {
      return $time_zone;
    } else if ($ecobee_thermostat['location']['timeZoneOffsetMinutes'] !== '') {
      $offset_seconds = $ecobee_thermostat['location']['timeZoneOffsetMinutes'] * 60;
      $time_zone = timezone_name_from_abbr('', $offset_seconds, 1);
      // Workaround for bug #44780
      if ($time_zone === false) {
        $time_zone = timezone_name_from_abbr('', $offset_seconds, 0);
      }
      return $time_zone;
    } else {
      return 'America/New_York';
    }
  }

}
