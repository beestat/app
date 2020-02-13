<?php

/**
 * All external APIs (ecobee, SmartyStreets, Patreon, MailChimp) extend this
 * class. This provides a generic cURL function with a couple basic arguments,
 * and also logging.
 *
 * @author Jon Ziebell
 */
class external_api extends cora\api {

  /**
   * Whether or not to log the API call to Influx. This will only log the
   * event and basic timing information; no detail.
   */
  protected static $log_influx = true;

  /**
   * Whether or not to log the API call to MySQL. This will log the entire
   * request and response in full detail. Valid values are "error", "all", and
   * false.
   */
  protected static $log_mysql = 'error';

  /**
   * Default retention policy when inserting data. Autogen is the default
   * infinite one; also available is 30d.
   */
  protected static $influx_retention_policy = 'autogen';

  /**
   * Whether or not to cache API calls. This will store a hash of the request
   * and the response in the database and check there before performing the
   * API call again.
   */
  protected static $cache = false;

  /**
   * How long to cache the API call for. Set to null for infinite, otherwise
   * define in seconds.
   */
  protected static $cache_for = null;

  /**
   * Fire off a cURL request to an external API.
   *
   * @param array $arguments
   * url (string) The URL to send the request to
   * method (string) Set to POST to POST, else it will GET
   * header (array) Any headers you want to set
   * post_fields Fields to send
   *
   * @return string Result on success, false on failure.
   */
  protected function curl($arguments) {
    $user = $this->api('user', 'get', $this->session->get_user_id());
    if ($user['debug'] === true) {
      $this::$log_mysql = 'all';
    }

    $this->request_timestamp = time();
    $this->request_timestamp_microtime = $this->microtime();

    $curl_handle = curl_init();
    curl_setopt($curl_handle, CURLOPT_URL, $arguments['url']);
    curl_setopt($curl_handle, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($curl_handle, CURLOPT_TIMEOUT, 60);
    curl_setopt($curl_handle, CURLOPT_RETURNTRANSFER, true);

    if(isset($arguments['method']) === true && $arguments['method'] === 'POST') {
      curl_setopt($curl_handle, CURLOPT_POST, true);
    }

    if(isset($arguments['header']) === true) {
      curl_setopt($curl_handle, CURLOPT_HTTPHEADER, $arguments['header']);
    }

    if(isset($arguments['post_fields']) === true) {
      curl_setopt($curl_handle, CURLOPT_POSTFIELDS, $arguments['post_fields']);
    }

    if($this::$log_influx !== false || $this::$log_mysql !== false) {
      curl_setopt($curl_handle, CURLINFO_HEADER_OUT, true);
    }

    $should_cache = (
      $this::$cache === true &&
      $this::should_cache($arguments) === true
    );

    // Check the cache
    if ($should_cache === true) {
      $cache_key = $this->generate_cache_key($arguments);
      $cache_entry = $this->get_cache_entry($cache_key);
    } else {
      $cache_entry = null;
    }

    if($cache_entry === null) {
      $curl_response = curl_exec($curl_handle);
      $this->curl_info = curl_getinfo($curl_handle);

      if($curl_response === false || curl_errno($curl_handle) !== 0) {
        $this->cora->set_error_extra_info([
          'curl_error' => curl_error($curl_handle)
        ]);

        // Error logging
        if($this::$log_influx === true) {
          $this->log_influx(
            $this->resource . '_api_log',
            true
          );
        }
        if($this::$log_mysql === 'all' || $this::$log_mysql === 'error') {
          $this->log_mysql($curl_response);
        }

        throw new cora\exception('Could not connect to ' . $this->resource . '.', 10600, false);
      }

      // General (success) logging
      if($this::$log_influx === true) {
        $this->log_influx(
          $this->resource . '_api_log',
          false
        );
      }
      if($this::$log_mysql === 'all') {
        $this->log_mysql($curl_response);
      }

      if($should_cache === true) {
        $this->create_update_cache_entry($cache_key, $curl_response);
      }

      curl_close($curl_handle);
    }
    else {
      $curl_response = $cache_entry['response'];
    }

    return $curl_response;
  }

  /**
   * Create an entry in the cache table. If one exists, update it.
   *
   * @param string $key
   * @param string $response
   *
   * @return array The created or updated entry.
   */
  private function create_update_cache_entry($key, $response) {
    $cache_entry = $this->api(
      ($this->resource . '_api_cache'),
      'get',
      [
        'attributes' => ['key' => $key]
      ]
    );

    if($cache_entry === null) {
      return $this->api(
        ($this->resource . '_api_cache'),
        'create',
        [
          'attributes' => [
            'key' => $key,
            'created_at' => date('Y-m-d H:i:s'),
            'response' => $response
          ]
        ]
      );
    }
    else {
      $attributes = [
        'created_at' => date('Y-m-d H:i:s'),
        'response' => $response
      ];
      $attributes[$this->resource . '_api_cache_id'] = $cache_entry[$this->resource . '_api_cache_id'];

      return $this->api(
        ($this->resource . '_api_cache'),
        'update',
        [
          'attributes' => $attributes
        ]
      );
    }
  }

  /**
   * Get an entry in the cache table.
   *
   * @param string $key
   *
   * @return array The found cache entry, or null if none found.
   */
  private function get_cache_entry($key) {
    $attributes = [
      'key' => $key
    ];

    if($this::$cache_for !== null) {
      $attributes['created_at'] = [
        'operator' => '>',
        'value' => date('Y-m-d H:i:s', strtotime('- ' . $this::$cache_for . ' seconds'))
      ];
    }

    return $this->api(
      ($this->resource . '_api_cache'),
      'get',
      [
        'attributes' => $attributes
      ]
    );
  }

  /**
   * Log to InfluxDB/Grafana.
   *
   * @param array $measurement Which measurement to log as.
   * @param boolean $exception Whether or not this was an exception (failure
   * to connect, etc).
   */
  private function log_influx($measurement, $exception) {
    $this->api(
      'logger',
      'log_influx',
      [
        'measurement' => $measurement,
        'tags' => [
          'user_id' => $this->session->get_user_id(),
          'api_user_id' => $this->cora->get_api_user()['api_user_id'],
          'exception' => $exception === true ? '1' : '0'
        ],
        'fields' => [
          'http_code' => (int) $this->curl_info['http_code'],
          'connect_time' => round($this->curl_info['connect_time'], 4)
        ],
        'timestamp' => $this->request_timestamp_microtime,
        'retention_policy' => $this::$influx_retention_policy
      ]
    );
  }

  /**
   * Log to MySQL with the complete details.
   *
   * @param array $curl_response The response of the cURL request.
   */
  protected function log_mysql($curl_response) {
    $this->api(
      ($this->resource . '_api_log'),
      'create',
      [
        'attributes' => [
          'api_user_id' => $this->cora->get_api_user()['api_user_id'],
          'request_timestamp' => date('Y-m-d H:i:s', $this->request_timestamp),
          'request' => $this->curl_info,
          'response' => $curl_response,
        ]
      ]
    );
  }

  /**
   * Get microtime for influx.
   *
   * @link https://github.com/influxdata/influxdb-php
   *
   * @return string
   */
  private function microtime() {
    list($usec, $sec) = explode(' ', microtime());
    return sprintf('%d%06d', $sec, $usec * 1000000);
  }
}
