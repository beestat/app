<?php

/**
 * An ecobee sensor. This just has a few simple properties like name,
 * temperature, humidity, etc.
 *
 * @author Jon Ziebell
 */
class ecobee_sensor extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id'
    ],
    'public' => []
  ];

  /**
   * Normal read_id, but filter out unsupported sensor types.
   *
   * @param array $attributes
   * @param array $columns
   *
   * @return array
   */
  public function read_id($attributes = [], $columns = []) {
    $ecobee_sensors = parent::read_id($attributes, $columns);

    $return = [];
    foreach($ecobee_sensors as $ecobee_sensor) {
      if (
        in_array(
          $ecobee_sensor['type'],
          ['ecobee3_remote_sensor', 'thermostat']
        ) === true
      ) {
        $return[$ecobee_sensor['ecobee_sensor_id']] = $ecobee_sensor;
      } else if (
        in_array(
          $ecobee_sensor['type'],
          ['monitor_sensor', 'control_sensor']
        ) === true
      ) {
        foreach($ecobee_sensor['capability'] as $capability) {
          if($capability['type'] === 'temperature') {
            $return[$ecobee_sensor['ecobee_sensor_id']] = $ecobee_sensor;
          }
        }
      }
    }

    return $return;
  }

  /**
   * Sync sensors.
   */
  public function sync() {
    // Get the thermostat list from ecobee with sensors. Keep this identical to
    // ecobee_thermostat->sync() to leverage caching.
    $include = [
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
       * While documented, this is not available for general API use unless
       * you are a technician user.
       *
       * The reminders and the includeReminders flag are something extra for
       * ecobee Technicians. It allows them to set and receive reminders with
       * more detail than the usual alert reminder type. These reminders are
       * only available to Technician users, which is why you aren't seeing
       * any new information when you set that flag to true. Thanks for
       * pointing out the lack of documentation regarding this. We'll get this
       * updated as soon as possible.
       *
       *
       * https://getsatisfaction.com/api/topics/what-does-includereminders-do-when-calling-get-thermostat?rfm=1
       */

      /**
       * 'includeSecuritySettings' => true
       *
       * While documented, this is not made available for general API use
       * unless you are a utility. If you try to include this an
       * "Authentication failed" error will be returned.
       *
       * Special accounts such as Utilities are permitted an alternate method
       * of authorization using implicit authorization. This method permits
       * the Utility application to authorize against their own specific
       * account without the requirement of a PIN. This method is limited to
       * special contractual obligations and is not available for 3rd party
       * applications who are not Utilities.
       *
       *
       * https://www.ecobee.com/home/developer/api/documentation/v1/objects/SecuritySettings.shtml
       * https://www.ecobee.com/home/developer/api/documentation/v1/auth/auth-intro.shtml
       */
    ];

    try {
      $response = $this->api(
        'ecobee',
        'ecobee_api',
        [
          'method' => 'GET',
          'endpoint' => 'thermostat',
          'arguments' => [
            'body' => json_encode([
              'selection' => array_merge(
                [
                  'selectionType' => 'registered',
                  'selectionMatch' => ''
                ],
                $include
              )
            ])
          ]
        ]
      );
      if(count($response['thermostatList']) === 0) {
        throw new cora\exception('No thermostats found.', 10511, false, null, false);
      }
    } catch(cora\exception $e) {
      // If no thermostats found (ie. not the owner of any homes that contain a thermostat)
      if($e->getCode() === 10511) {
        $homes = $this->api(
          'ecobee',
          'ecobee_api',
          [
            'method' => 'GET',
            'endpoint' => 'https://home.hm-prod.ecobee.com/homes',
            'arguments' => [
            ]
          ]
        );

        $home_ids = array_column($homes['homes'], 'homeID');

        $serial_numbers = [];
        foreach($home_ids as $home_id) {
          $devices = $this->api(
            'ecobee',
            'ecobee_api',
            [
              'method' => 'GET',
              'endpoint' => 'https://home.hm-prod.ecobee.com/home/' . $home_id . '/devices',
              'arguments' => [
              ]
            ]
          );

          /**
           * This is a select distinct from ecobee_thermostat. Ideally it
           * would be possible to send *all* serial numbers from the devices
           * call to the GET->thermostat API call, but that throws an error if
           * you include a serial number for something that's not a
           * thermostat. So I have to keep this array to identify valid serial
           * numbers.
           */
          $model_numbers = [
            'athenaSmart',
            'apolloSmart',
            'idtSmart',
            'nikeSmart',
            'siSmart',
            'corSmart',
            'vulcanSmart',
            'aresSmart',
            'artemisSmart'
          ];

          foreach($devices['devices'] as $device) {
            if(in_array($device['modelNumber'], $model_numbers) === true) {
              $serial_numbers[] = $device['serialNumber'];
            }
          }
        }

        $response = $this->api(
          'ecobee',
          'ecobee_api',
          [
            'method' => 'GET',
            'endpoint' => 'thermostat',
            'arguments' => [
              'body' => json_encode([
                'selection' => array_merge(
                  [
                    'selectionType' => 'thermostats',
                    'selectionMatch' => implode(',', $serial_numbers),
                  ],
                  $include
                )
              ])
            ]
          ]
        );
      } else {
        throw $e;
      }
    }

    // Loop over the returned sensors and create/update them as necessary.
    $sensor_ids_to_keep = [];
    foreach($response['thermostatList'] as $thermostat_api) {
      $ecobee_thermostat = $this->api(
        'ecobee_thermostat',
        'get',
        [
          'attributes' => [
            'identifier' => $thermostat_api['identifier']
          ]
        ]
      );

      $thermostat = $this->api(
        'thermostat',
        'get',
        [
          'attributes' => [
            'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id']
          ]
        ]
      );

      foreach($thermostat_api['remoteSensors'] as $api_sensor) {
        $ecobee_sensor = $this->get(
          [
            'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id'],
            'identifier' => $api_sensor['id']
          ]
        );

        if ($ecobee_sensor !== null) {
          // Sensor exists.
          $sensor = $this->api(
            'sensor',
            'get',
            [
              'attributes' => [
                'ecobee_sensor_id' => $ecobee_sensor['ecobee_sensor_id']
              ]
            ]
          );
        }
        else {
          // Sensor does not exist.
          $ecobee_sensor = $this->create([
            'ecobee_thermostat_id' => $ecobee_thermostat['ecobee_thermostat_id'],
            'identifier' => $api_sensor['id']
          ]);
          $sensor = $this->api(
            'sensor',
            'create',
            [
              'attributes' => [
                'ecobee_sensor_id' => $ecobee_sensor['ecobee_sensor_id'],
                'thermostat_id' => $thermostat['thermostat_id']
              ]
            ]
          );
        }

        $sensor_ids_to_keep[] = $sensor['sensor_id'];

        $this->update(
          [
            'ecobee_sensor_id' => $ecobee_sensor['ecobee_sensor_id'],
            'name' => $api_sensor['name'],
            'type' => $api_sensor['type'],
            'code' => (isset($api_sensor['code']) === true ? $api_sensor['code'] : null),
            'in_use' => ($api_sensor['inUse'] === true ? 1 : 0),
            'capability' => $api_sensor['capability'],
            'inactive' => 0
          ]
        );

        $attributes = [];
        $attributes['name'] = $api_sensor['name'];
        $attributes['type'] = $api_sensor['type'];
        $attributes['in_use'] = $api_sensor['inUse'];
        $attributes['identifier'] = $api_sensor['id'];
        $attributes['capability'] = $api_sensor['capability'];
        $attributes['inactive'] = 0;

        $attributes['temperature'] = null;
        $attributes['humidity'] = null;
        $attributes['occupancy'] = null;
        foreach($api_sensor['capability'] as $capability) {
          switch($capability['type']) {
            case 'temperature':
              if(
                is_numeric($capability['value']) === true &&
                ($capability['value'] / 10) <= 200 &&
                ($capability['value'] / 10) >= -200
              ) {
                $attributes['temperature'] = $capability['value'] / 10;
              } else {
                $attributes['temperature'] = null;
              }
            break;
            case 'humidity':
              if(
                is_numeric($capability['value']) === true &&
                $capability['value'] <= 100 &&
                $capability['value'] >= 0
              ) {
                $attributes['humidity'] = $capability['value'] / 10;
              } else {
                $attributes['humidity'] = null;
              }
            break;
            case 'occupancy':
              $attributes['occupancy'] = $capability['value'] === "true";
            break;
          }

          // Update the sensor.
          $this->api(
            'sensor',
            'update',
            [
              'attributes' => array_merge(
                ['sensor_id' => $sensor['sensor_id']],
                $attributes
              )
            ]
          );
        }
      }
    }

    // Inactivate any sensors that were no longer returned.
    $sensors = $this->api('sensor', 'read');
    $ecobee_sensor_ids_to_return = [];
    foreach($sensors as $sensor) {
      if(in_array($sensor['sensor_id'], $sensor_ids_to_keep) === false) {
        $this->update(
          [
            'ecobee_sensor_id' => $sensor['ecobee_sensor_id'],
            'inactive' => 1
          ]
        );

        $this->api(
          'sensor',
          'update',
          [
            'attributes' => [
              'sensor_id' => $sensor['sensor_id'],
              'inactive' => 1
            ]
          ]
        );
      } else {
        $ecobee_sensor_ids_to_return[] = $sensor['ecobee_sensor_id'];
      }
    }

    return $this->read_id(['ecobee_sensor_id' => $ecobee_sensor_ids_to_return]);
  }

}
