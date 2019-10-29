<?php

/**
 * Cache for these external API calls.
 *
 * @author Jon Ziebell
 */
class external_api_cache extends cora\crud {

  public static $user_locked = false;

  public function delete($id) {
    throw new Exception('This method is not allowed.');
  }
}
