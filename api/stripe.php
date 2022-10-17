<?php

/**
 * High level functionality for interacting with the Stripe API.
 *
 * @author Jon Ziebell
 */
class stripe extends external_api {

  public static $exposed = [
    'private' => [],
    'public' => []
  ];

  protected static $log_mysql = 'all';

  protected static $cache = false;
  protected static $cache_for = null;

  /**
   * Send an API call off to Stripe
   *
   * @param string $method HTTP Method.
   * @param string $endpoint API Endpoint.
   * @param array $data API request data.
   *
   * @throws Exception If Stripe did not return valid JSON.
   *
   * @return array The Stripe response.
   */
  public function stripe_api($method, $endpoint, $data) {
    $curl_response = $this->curl([
      'url' => $this->setting->get('stripe_base_url') . $endpoint,
      'post_fields' => http_build_query($data),
      'method' => $method,
      'header' => [
        'Authorization: Basic ' . base64_encode($this->setting->get('stripe_secret_key') . ':'),
        'Content-Type: application/x-www-form-urlencoded'
      ]
    ]);

    $response = json_decode($curl_response, true);

    if ($response === null) {
      throw new cora\exception('Invalid JSON', 10900);
    }

    return $response;
  }
}
