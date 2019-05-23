<?php

namespace cora;

/**
 * For lack of a better name, I'm calling this the json_path class. It does
 * not provide a full implementation of JSONPath and may never do so as a lot
 * of the functionality is overkill or not appropriate. This provides super
 * basic functionality only.
 *
 * @author Jon Ziebell
 */
final class json_path {

  /**
   * Given a data array and a path, return the requested data. Example paths:
   *   foo.bar
   *   foo.0.bar
   *   foo.bar.baz
   *   foo.bar.baz[] To get all baz inside bar array.
   *
   * @param mixed $data The data referenced by $json_path.
   * @param string $json_path The path.
   *
   * @return mixed The requested data.
   */
  public function evaluate($data, $json_path) {
    // Split up the path into an array.
    $key_array = explode('.', $json_path);

    return $this->extract_key($data, $key_array);
  }

  /**
   * Recursively extract keys from the data array. Basically, $data.foo.bar is
   * represented by sending $data, ['foo', 'bar']. If you end a key with
   * [] it will get every instance of that value inside the current array.
   *
   * @param mixed $data The data to traverse. You can send anything here but
   * don't expect to not get an exception if you try to traverse things like
   * non-existent indices.
   * @param array $key_array The array keys to use to traverse $data.
   *
   * @throws \Exception If any of the provided keys do not exist in the data.
   *
   * @return mixed The requested data.
   */
  private function extract_key($data, $key_array) {
    $key = array_shift($key_array);
    if($key === null) {
      return $data;
    }
    else {
      if(substr($key, -2) === '[]') {
        return array_column($data, substr($key, 0, strlen($key) - 2));
      }
      else {
        if(array_key_exists($key, $data) === false) {
          throw new \Exception('Invalid path string.', 1500);
        }
        else {
          return $this->extract_key($data[$key], $key_array);
        }
      }
    }
  }

}
