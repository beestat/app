<?php

/**
 * Log stuff to an Influx database. Does all the hard work so you don't have
 * to.
 *
 * @author Jon Ziebell
 */
class logger extends cora\api {

  /**
   * Log something to InfluxDB. This will fire off the insert query as a
   * background process and allow PHP to continue without blocking.
   *
   * @param string $measurement The measurement.
   * @param array $tags Zero to many tags. These are indexed and searchable.
   * Use these for things that need where clauses outside of timestamp.
   * @param array $fields At least one field. These are not indexed.
   * @param string $timestamp The timestamp in microseconds.
   * @param string $retention_policy The retention policy to write to.
   * Defaults to "autogen" which is infinite.
   */
  public function log_influx($measurement, $tags, $fields, $timestamp, $retention_policy = null) {
    // If this is not configured, do not log.
    if(
      $this->setting->get('influx_database_host') === null ||
      $this->setting->get('influx_database_port') === null ||
      $this->setting->get('influx_database_name') === null ||
      $this->setting->get('influx_database_username') === null ||
      $this->setting->get('influx_database_password') === null
    ) {
      return;
    }

    $tag_string = $this->get_tag_string($tags);
    $field_string = $this->get_field_string($fields);

    $data_binary =
      $measurement .
      ($tag_string !== '' ? ',' : '') .
      $tag_string . ' ' .
      $field_string . ' ' .
      $timestamp;

    $url =
      $this->setting->get('influx_database_host') .
      ':' .
      $this->setting->get('influx_database_port') .
      '/write' .
      '?db=' . $this->setting->get('influx_database_name') .
      ($retention_policy !== null ? ('&rp=' . $retention_policy) : '') .
      '&precision=u';

    exec(
      'curl ' .
      '-u ' . $this->setting->get('influx_database_username') . ':' . $this->setting->get('influx_database_password') . ' ' .
      '-POST "' . $url . '" ' .
      '--silent ' . // silent; keeps logs out of stderr
      '--show-error ' . // override silent on failure
      '--max-time 10 ' .
      '--connect-timeout 5 ' .
      '--data-binary \'' . $data_binary . '\' > /dev/null &'
    );
  }

  /**
   * Convert an array into a key/value string.
   *
   * @param array $array The input array. Null values are removed.
   *
   * @return string A string like "k1=v1,k2=v2". If no non-null values are
   * present this will be an empty string.
   */
  private function get_field_string($fields) {
    $parts = [];

    foreach($fields as $key => $value) {
      if($value === null) {
        continue;
      } else if(is_bool($value) === true) {
        $value = ($value === true) ? 'true' : 'false';
      } else if(is_int($value) === true) {
        $value = $value . 'i';
      } else if(is_float($value) === true) {
        $value = $value;
      } else {
        $value = $this->escape_field_value($value);
      }

      $parts[] = $key . '=' . $value;
    }

    return implode(',', $parts);
  }

  /**
   * Convert a tag array into a key/value string. Tags are always strings in
   * Influx.
   *
   * @param array $array The input array. Null values are removed.
   *
   * @return string A string like "k1=v1,k2=v2". If no non-null values are
   * present this will be an empty string.
   */
  private function get_tag_string($tags) {
    $parts = [];

    foreach($tags as $key => $value) {
      if($value === null) {
        continue;
      } else {
        $parts[] = $this->escape_tag_key_value($key) . '=' . $this->escape_tag_key_value($value);
      }
    }

    return implode(',', $parts);
  }

  /**
   * Add slashes where necessary to prevent injection attacks. Tag values just
   * sit there unquoted (you can't quote them or the quote gets included as
   * part of the value) so we have to escape other special characters in that
   * context.
   *
   * @param string $value The value to escape.
   */
  private function escape_tag_key_value($value) {
    return str_replace([' ', ',', '='], ['\ ', '\,', '\='], $value);
  }

  /**
   * Add slashes where necessary to prevent injection attacks. Field values
   * sit inside of "", so escape any " characters. At a higher level they sit
   * inside of a ' from the cURL body. Escape these as well.
   *
   * @param string $value The value to escape.
   */
  private function escape_field_value($value) {
    return '"' . str_replace(['"', "'"], ['\"', "'\''"], $value) . '"';
  }
}
