<?php

/**
 * High level functionality for interacting with the Mailchimp API.
 *
 * @author Jon Ziebell
 */
class mailchimp extends external_api {

  protected static $log_influx = true;
  protected static $log_mysql = 'all';

  protected static $cache = false;
  protected static $cache_for = null;

  /**
   * Send an API call off to MailChimp
   *
   * @param string $method HTTP Method.
   * @param string $endpoint API Endpoint.
   * @param array $data API request data.
   *
   * @throws Exception If MailChimp did not return valid JSON.
   *
   * @return array The MailChimp response.
   */
  private function mailchimp_api($method, $endpoint, $data) {
    $curl_response = $this->curl([
      'url' => 'https://us18.api.mailchimp.com/3.0/' . $endpoint,
      'post_fields' => json_encode($data, JSON_FORCE_OBJECT),
      'method' => $method,
      'header' => [
        'Authorization: Basic ' . base64_encode(':' . $this->setting->get('mailchimp_api_key')),
        'Content-Type: application/x-www-form-urlencoded'
      ]
    ]);

    $response = json_decode($curl_response, true);

    if ($response === null) {
      throw new Exception('Invalid JSON');
    }

    return $response;
  }

  /**
   * Subscribe an email address to the mailing list. This will only mark you
   * as "pending" so you have to click a link in the email to actually
   * subscribe.
   *
   * @param string $email_address The email address to subscribe.
   *
   * @throws Exception If subscribing to the mailing list fails for some
   * reason. For example, if already subscribed.
   *
   * @return array The MailChimp response.
   */
  public function subscribe($email_address) {
    $method = 'POST';

    $endpoint =
      'lists/' .
      $this->setting->get('mailchimp_list_id') .
      '/members/'
    ;

    $data = [
      'email_address' => $email_address,
      'status' => 'pending'
    ];

    $response = $this->mailchimp_api($method, $endpoint, $data);

    if(isset($response['id']) === false) {
      throw new Exception('Could not subscribe to mailing list.');
    }

    return $response;
  }
}
