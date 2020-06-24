<?php

/**
 * High level functionality for interacting with the Mailgun API.
 *
 * @author Jon Ziebell
 */
class mailgun extends external_api {

  protected static $log_mysql = 'all';

  protected static $cache = false;
  protected static $cache_for = null;

  public static $exposed = [
    'private' => [],
    'public' => [
      'subscribe',
      'unsubscribe'
    ]
  ];

  /**
   * Send an API call off to mailgun
   *
   * @param string $method HTTP Method.
   * @param string $endpoint API Endpoint.
   * @param array $data API request data.
   *
   * @throws Exception If mailgun did not return valid JSON.
   *
   * @return array The mailgun response.
   */
  private function mailgun_api($method, $endpoint, $data) {
    $curl_response = $this->curl([
      'url' => $this->setting->get('mailgun_base_url') . $endpoint,
      'post_fields' => $data,
      'method' => $method,
      'header' => [
        'Authorization: Basic ' . base64_encode('api:' . $this->setting->get('mailgun_api_key')),
        'Content-Type: multipart/form-data'
      ]
    ]);

    $response = json_decode($curl_response, true);

    if ($response === null) {
      throw new cora\exception('Invalid JSON', 10600);
    }

    return $response;
  }

  /**
   * Subscribe to the mailing list.
   *
   * @param string $email_address The email address to subscribe.
   *
   * @throws exception If the subscribe failed.
   *
   * @return array Subscriber info.
   */
  public function subscribe($email_address) {
    $method = 'POST';

    $email_address = trim(strtolower($email_address));
    $endpoint = 'lists/' . $this->setting->get('mailgun_newsletter') . '/members';

    $data = [
      'address' => $email_address,
      'subscribed' => 'yes',
      'upsert' => 'yes'
    ];

    $response = $this->mailgun_api($method, $endpoint, $data);

    if (
      isset($response['member']) &&
      isset($response['member']['subscribed']) &&
      $response['member']['subscribed'] === true
    ) {
      return $response['member'];
    } else {
      throw new cora\exception('Failed to subscribe.', 10601);
    }
  }

  /**
   * Unsubscribe from the mailing list.
   *
   * @param string $email_address The email address to unsubscribe.
   *
   * @throws exception If the unsubscribe failed.
   *
   * @return array Subscriber info.
   */
  public function unsubscribe($email_address) {
    $method = 'POST';

    $email_address = trim(strtolower($email_address));
    $endpoint = 'lists/' . $this->setting->get('mailgun_newsletter') . '/members';

    $data = [
      'address' => $email_address,
      'subscribed' => 'no',
      'upsert' => 'yes'
    ];

    $response = $this->mailgun_api($method, $endpoint, $data);

    if (
      isset($response['member']) &&
      isset($response['member']['subscribed']) &&
      $response['member']['subscribed'] === false
    ) {
      return $response['member'];
    } else {
      throw new cora\exception('Failed to unsubscribe.', 10602);
    }
  }
}
