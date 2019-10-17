<?php

/**
 * Text normalized out of the runtime table to reduce the amount of stored data.
 *
 * @author Jon Ziebell
 */
class runtime_thermostat_text extends cora\crud {

  public static $user_locked = false;

  public static $query_cache = [];

  /**
   * Gets the row from the runtime_text table. If it does not exist, create it
   * and then return the row. Every time a query is run the results are
   * statically cached on this object. This is an optimization to reduce
   * database queries as the values requested are repetitive.
   *
   * @param string $value The text to look for.
   *
   * @return mixed The row in the runtime_text table. If $value is null/empty
   * string/all spaces null is returned.
   */
  public function get_create($value) {
    if ($value === null || trim($value) === '') {
      return null;
    }

    // Look in the cache first to avoid the query.
    if (isset(self::$query_cache[$value]) === true) {
      return self::$query_cache[$value];
    }

    $runtime_text = $this->get([
      'value' => $value
    ]);

    if ($runtime_text === null) {
      $runtime_text = $this->create([
        'value' => $value
      ]);
    }

    // Cache the result.
    self::$query_cache[$value] = $runtime_text;

    return $runtime_text;
  }

}
