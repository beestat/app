<?php

namespace cora;

/**
 * The API cache can be used to cache API calls for rapid response.
 *
 * @author Jon Ziebell
 */
class api_cache extends crud {

  public static $converged = [];

  public static $user_locked = true;

  /**
   * Insert an item into the current resource with the provided attributes.
   * Setting of the primary key column is not allowed and will be overwritten
   * if you try.
   *
   * @param array $attributes An array of attributes to set for this item
   *
   * @return mixed The id of the inserted row.
   */
  public function create($attributes) {
    unset($attributes['created_at']);
    return parent::create($attributes);
  }

  /**
   * Create an entry in the api_cache table. Generates a unique key based off
   * of the resource, method, arguments, and session user_id if set.
   *
   * @param $api_call The API call to cache.
   * @param $response_data Response to cache.
   * @param $duration Duration in seconds to cache for.
   *
   * @return array The inserted row.
   */
  public function cache($api_call, $response_data, $duration) {
    $key = $this->generate_key($api_call);
    $cache_hits = $this->read(['key' => $key]);

    if(count($cache_hits) === 0) {
      $attributes = [];
      $attributes['key'] = $key;
      $attributes['expires_at'] = date('Y-m-d H:i:s', time() + $duration);
      $attributes['json_response_data'] = $response_data;
      $attributes['request_resource'] = $api_call['resource'];
      $attributes['request_method'] = $api_call['method'];

      if(isset($api_call['arguments']) === true) {
        $attributes['request_arguments'] = $api_call['arguments'];
      }
      else {
        $attributes['request_arguments'] = null;
      }

      return $this->create($attributes);
    }
    else {
      $cache_hit = $cache_hits[0];

      $attributes = [];
      $attributes['expires_at'] = date('Y-m-d H:i:s', time() + $duration);
      $attributes['json_response_data'] = $response_data;
      $attributes['api_cache_id'] = $cache_hit['api_cache_id'];

      return $this->update($attributes);
    }
  }

  /**
   * Retrieve a cache entry with a matching key that is not expired.
   *
   * @param $api_call The API call to retrieve.
   *
   * @return mixed The api_cache row if found, else null.
   */
  public function retrieve($api_call) {
    $cache_hits = $this->read([
      'key' => $this->generate_key($api_call)
    ]);

    foreach($cache_hits as $cache_hit) {
      if(time() < strtotime($cache_hit['expires_at'])) {
        return $cache_hit;
      }
    }
    return null;
  }

  /**
   * Generate a cache key.
   *
   * @param $api_call The API call to generate the key for.
   *
   * @return string The cache key.
   */
  private function generate_key($api_call) {
    return sha1(
      'resource=' . $api_call['resource'] .
      'method=' . $api_call['method'] .
      'arguments=' . (
        isset($api_call['arguments']) === true ?
          json_encode($api_call['arguments']) : ''
      ) .
      'user_id=' . (
        $this->session->get_user_id() !== null ?
          $this->session->get_user_id() : ''
      )
    );
  }

}
