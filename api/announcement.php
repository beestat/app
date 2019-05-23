<?php

/**
 * An address is a discrete object that is normalized and verified using a
 * third party service. In order to prevent duplication and extra API calls
 * (which cost money), they are stored separately instead of simply as columns
 * on a different table.
 *
 * @author Jon Ziebell
 */
class announcement extends cora\crud {

  public static $exposed = [
    'private' => [],
    'public' => [
      'read_id'
    ]
  ];

  public static $converged = [
    'title' => [
      'type' => 'string'
    ],
    'text' => [
      'type' => 'string'
    ],
    'icon' => [
      'type' => 'string'
    ]
  ];

  public static $user_locked = false;

}
