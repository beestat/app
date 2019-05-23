<?php

/**
 * Log for these external API calls.
 *
 * @author Jon Ziebell
 */
class external_api_log extends cora\crud {

  public static $converged = [
    'request' => [
      'type' => 'json'
    ],
    'response' => [
      'type' => 'string'
    ]
  ];

  public static $user_locked = true;

  public function read($attributes = [], $columns = []) {
    throw new Exception('This method is not allowed.');
  }

  public function update($attributes) {
    throw new Exception('This method is not allowed.');
  }
}
