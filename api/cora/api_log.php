<?php

namespace cora;

/**
 * Stores a log of API requests and responses. Intended usage is to process
 * the request to the end (exception or not) and then log it.
 *
 * @author Jon Ziebell
 */
class api_log extends crud {

  public static $converged = [];

  public static $user_locked = true;

	/**
	 * Insert an item into the api_log resource. Force the IP to the request IP
	 * and disallow overriding the timestamp.
	 *
	 * @param array $attributes The attributes to insert.
	 *
	 * @return int The ID of the inserted row.
	 */
	public function create($attributes) {
		$attributes['request_ip'] = ip2long($_SERVER['REMOTE_ADDR']);
		unset($attributes['request_timestamp']);
		return parent::create($attributes);
	}

	/**
	 * Get the number of requests since a given timestamp for a given IP
	 * address. Handy for rate limiting.
	 *
	 * @param string $request_ip The IP to look at.
	 * @param int $timestamp The timestamp to check from.
	 *
	 * @return int The number of requests on or after $timestamp.
	 */
	public function get_number_requests_since($request_ip, $timestamp) {
		$request_ip_escaped = $this->database->escape(ip2long($request_ip));
		$timestamp_escaped = $this->database->escape($timestamp);
		$query = '
			select
				count(*) as number_requests_since
			from
				api_log
			where
				    request_ip = ' . $request_ip_escaped . '
				and request_timestamp >= from_unixtime(' . $timestamp_escaped . ')
		';

		// Getting the number of requests since a certain date is considered
		// overhead since it's only used for rate limiting. See "Important" note in
		// documentation.
		$result = $this->database->query($query);
		$row = $result->fetch_assoc();

		return $row['number_requests_since'];
	}

}
