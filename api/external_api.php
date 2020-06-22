<?php

/**
 * All external APIs (ecobee, SmartyStreets, Patreon, Mailgun) extend this
 * class. This provides a generic cURL function with a couple basic arguments,
 * and also logging.
 *
 * @author Jon Ziebell
 */
class external_api extends cora\api {

  /**
   * Whether or not to log the API call to MySQL. This will log the entire
   * request and response in full detail. Valid values are "error", "all", and
   * false.
   */
  protected static $log_mysql = 'error';

  /**
   * Whether or not to include the request and response in non-errored logs.
   */
  protected static $log_mysql_verbose = true;

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

    if($this::$log_mysql !== false) {
      curl_setopt($curl_handle, CURLINFO_HEADER_OUT, true);
    }

    // Check the cache
    if ($this::$cache === true) {
      $cache_key = $this->generate_cache_key($arguments);
      $cache_entry = $this->get_cache_entry($cache_key);
    } else {
      $cache_entry = null;
    }

    if($cache_entry === null) {
      $curl_response = curl_exec($curl_handle);

      $this->curl_info = curl_getinfo($curl_handle);

      if(
        $curl_response === false ||
        curl_errno($curl_handle) !== 0
      ) {
        // Error logging
        if($this::$log_mysql === 'all' || $this::$log_mysql === 'error') {
          $this->log_mysql($curl_response, true);
        }

        throw new cora\exception(
          'Could not connect to external API.',
          10600,
          false,
          [
            'resource' => $this->resource,
            'curl_error' => curl_error($curl_handle)
          ]
        );
      }

      // General (success) logging
      if($this::$log_mysql === 'all') {
        $this->log_mysql($curl_response);
      }

      if(
        $this::$cache === true &&
        $this::should_cache($arguments, $curl_response, $this->curl_info) === true
      ) {
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
   * Log to MySQL with the complete details.
   *
   * @param array $curl_response The response of the cURL request.
   * @param boolean $force_verbose Whether or not to force verbose logging.
   */
  protected function log_mysql($curl_response, $force_verbose = false) {
    $attributes = [
      'api_user_id' => $this->request->get_api_user()['api_user_id'],
      'request_timestamp' => date('Y-m-d H:i:s', $this->request_timestamp)
    ];

    if($this::$log_mysql_verbose === true || $force_verbose === true) {
      $attributes['request'] = $this->curl_info;
      $attributes['response'] = $curl_response;
    }

    $this->api(
      ($this->resource . '_api_log'),
      'create',
      ['attributes' => $attributes]
    );
  }
}
