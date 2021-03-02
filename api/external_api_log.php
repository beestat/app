<?php

/**
 * Log for these external API calls.
 *
 * @author Jon Ziebell
 */
class external_api_log extends cora\crud {

  /**
   * Queue a create to happen at the end of the request.
   *
   * @param array $attributes The attributes to insert.
   *
   * @return int The ID of the inserted row.
   */
  public function create($attributes) {
    $attributes['user_id'] = $this->session->get_user_id();
    $this->request->queue_database_action($this->resource, 'create', $attributes);
  }

}
