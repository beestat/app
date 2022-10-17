<?php

/**
 * Stripe Event
 *
 * @author Jon Ziebell
 */
class stripe_event extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id'
    ],
    'public' => []
  ];

}
