<?php

/**
 * A Stripe payment_link.
 *
 * @author Jon Ziebell
 */
class stripe_payment_link extends cora\crud {

  public static $exposed = [
    'private' => [],
    'public' => [
      'open'
    ]
  ];

  public static $user_locked = false;

  /**
   * Get a stripe_payment_link for the specified attributes. If none exists,
   * create.
   *
   * @param array $attributes
   *
   * @return array
   */
  public function get($attributes) {
    $stripe_payment_link = parent::get([
      'amount' => $attributes['amount'],
      'currency' => $attributes['currency'],
      'interval' => $attributes['interval']
    ]);

    if($stripe_payment_link === null) {
      $price = $this->api(
        'stripe',
        'stripe_api',
        [
          'method' => 'POST',
          'endpoint' => 'prices',
          'data' => [
            'product' => $this->setting->get('stripe_product_id'),
            'unit_amount' => $attributes['amount'],
            'currency' => $attributes['currency'],
            'recurring[interval]' => $attributes['interval']
          ]
        ]
      );

      $payment_link = $this->api(
        'stripe',
        'stripe_api',
        [
          'method' => 'POST',
          'endpoint' => 'payment_links',
          'data' => [
            'line_items[0][price]' => $price['id'],
            'line_items[0][quantity]' => '1'
          ]
        ]
      );

      return $this->create([
        'amount' => $attributes['amount'],
        'currency' => $attributes['currency'],
        'interval' => $attributes['interval'],
        'url' => $payment_link['url']
      ]);
    } else {
      return $stripe_payment_link;
    }
  }

  /**
   * Open a Stripe link. This exists because in JS it would be a popup to run
   * an API call to get the link, then do window.open after. This lets you
   * just do a window.open directly to this endpoint.
   *
   * @param array $attributes
   */
  public function open($attributes) {
    $stripe_payment_link = $this->get($attributes);

    $url = $stripe_payment_link['url'] .
      '?prefilled_email=' . $attributes['prefilled_email'] .
      '&client_reference_id=' . $attributes['client_reference_id'];

    header('Location: ' . $url);
    die();
  }

}
