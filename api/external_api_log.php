<?php

/**
 * Log for these external API calls.
 *
 * @author Jon Ziebell
 */
class external_api_log extends cora\crud {

  /**
   * Insert an item into the log table using the transactionless database
   * connection.
   *
   * @param array $attributes The attributes to insert.
   *
   * @return int The ID of the inserted row.
   */
  public function create($attributes) {
    $attributes['user_id'] = $this->session->get_user_id();

    // Insert using the transactionless connection.
    $database = cora\database::get_transactionless_instance();
    return $database->create($this->resource, $attributes, 'id');
  }

}
