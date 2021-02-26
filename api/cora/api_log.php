<?php

namespace cora;

/**
 * Stores a log of API requests and responses. Intended usage is to process
 * the request to the end (exception or not) and then log it.
 *
 * @author Jon Ziebell
 */
final class api_log extends crud {

  /**
   * Insert an item into the api_log resource. Force the IP to the request IP
   * and disallow overriding the timestamp.
   *
   * @param array $attributes The attributes to insert.
   *
   * @return int The ID of the inserted row.
   */
  public function create($attributes) {
    $this->request->queue_create($this->resource, $attributes);
  }

  /**
   * Get the number of requests since a given timestamp for a given IP
   * address. Handy for rate limiting.
   *
   * @param string $ip_address The IP to look at.
   * @param int $timestamp The timestamp to check from.
   *
   * @return int The number of requests on or after $timestamp.
   */
  public function get_number_requests_since($ip_address, $timestamp) {
    $ip_address_escaped = $this->database->escape(ip2long($ip_address));
    $timestamp_escaped = $this->database->escape(
      date('Y-m-d H:i:s', $timestamp)
    );

    $query = '
      select
        count(*) `number_requests_since`
      from
        `api_log`
      where
            `ip_address` = ' . $ip_address_escaped . '
        and `timestamp` >= ' . $timestamp_escaped . '
    ';

    $result = $this->database->query($query);
    $row = $result->fetch_assoc();

    return $row['number_requests_since'];
  }

}
