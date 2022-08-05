<?php

/**
 * Floor plan.
 *
 * @author Jon Ziebell
 */
class floor_plan extends cora\crud {

  public static $exposed = [
    'private' => [
      'read_id',
      'update',
      'create',
      'delete'
    ],
    'public' => []
  ];

}
