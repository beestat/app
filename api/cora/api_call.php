<?php

namespace cora;

/**
 * Process a single API call
 *
 * @author Jon Ziebell
 */
final class api_call {

  /**
   * The API call resource.
   *
   * @var string
   */
  private $resource;

  /**
   * The API call method.
   *
   * @var string
   */
  private $method;

  /**
   * The API call arguments.
   *
   * @var array
   */
  private $arguments;

  /**
   * The API call alias.
   *
   * @var string
   */
  private $alias;

  /**
   * The current auto-alias. If an alias is not provided, an auto-alias is
   * assigned.
   *
   * @var integer
   */
  private static $auto_alias = 0;

  /**
   * The response of this API call.
   *
   * @var mixed
   */
  private $response;

  /**
   * When this API call is cached until.
   *
   * @var string
   */
  private $cached_until;

  /**
   * Construct a new API call.
   *
   * @throws exception if the resource is not provided.
   * @throws exception if the method is not provided.
   *
   * @param array $api_call
   */
  public function __construct($api_call) {
    if(isset($api_call['resource']) === false) {
      throw new \exception('Resource is required.', 1501);
    }
    if(isset($api_call['method']) === false) {
      throw new \exception('Method is required.', 1502);
    }
    if(isset($api_call['arguments']) === false) {
      $api_call['arguments'] = '{}';
    }

    $this->resource = $api_call['resource'];
    $this->method = $api_call['method'];
    $this->arguments = $this->parse_arguments($api_call['arguments']);

    if(isset($api_call['alias']) === true) {
      $this->alias = $api_call['alias'];
    } else {
      $this->alias = $this->get_auto_alias();
    }
  }

  /**
   * Process the API call.
   *
   * @throws exception If the method does not exist.
   */
  public function process() {
    $this->restrict_private();

    $resource_instance = new $this->resource();
    if(method_exists($resource_instance, $this->method) === false) {
      throw new \exception('Method does not exist.', 1503);
    }

    // Caching! If this API call is configured for caching,
    // $cache_config = $this->setting->get('cache');
    if( // Is cacheable
      isset($this->resource::$cache) === true &&
      isset($this->resource::$cache[$this->method]) === true
    ) {
      $api_cache_instance = new api_cache();
      $api_cache = $api_cache_instance->retrieve($this);

      if($api_cache !== null) {
        // If there was a cache entry available, use that.
        $this->response = $api_cache['response_data'];
        $this->cached_until = date('Y-m-d H:i:s', strtotime($api_cache['expires_at']));
      } else {
        // Else just run the API call, then cache it.
        $this->response = call_user_func_array(
          [$resource_instance, $this->method],
          $this->arguments
        );

        $api_cache = $api_cache_instance->cache(
          $this,
          $this->response,
          $this->resource::$cache[$this->method]
        );
        $this->cached_until = date('Y-m-d H:i:s', strtotime($api_cache['expires_at']));
      }
    }
    else { // Not cacheable
      $this->response = call_user_func_array(
        [$resource_instance, $this->method],
        $this->arguments
      );
    }
  }

  /**
   * Restrict private API calls.
   *
   * @throws exception If the method does not exist in the resource's
   * public/private maps.
   * @throws exception If the resource/method is private and the session is
   * not valid.
   */
  private function restrict_private() {
    if(in_array($this->method, $this->resource::$exposed['private'])) {
      $type = 'private';
    } else if(in_array($this->method, $this->resource::$exposed['public'])) {
      $type = 'public';
    } else {
      throw new exception('Method is not mapped.', 1504);
    }

    $session = session::get_instance();

    if(
      $type === 'private' &&
      $session->is_valid() === false
    ) {
      throw new exception('Session is expired.', 1505, false);
    }
  }

  /**
   * Gets an array of arguments in the correct order for the method being
   * called.
   *
   * @param string $json The arguments JSON.
   *
   * @throws exception If the arguments in the api_call were not valid JSON.
   *
   * @return array The requested arguments.
   */
  private function parse_arguments($json) {
    $arguments = [];

    // Arguments are not strictly required. If a method requires them then you
    // will still get an error, but they are not required by the API.
    if($json !== null) {
      // All arguments are sent in the "arguments" key as JSON.
      $decoded = json_decode($json, true);

      if($decoded === null) {
        throw new exception('Arguments are not valid JSON.', 1506);
      }

      $reflection_method = new \ReflectionMethod(
        $this->resource,
        $this->method
      );
      $parameters = $reflection_method->getParameters();

      foreach($parameters as $parameter) {
        if(isset($decoded[$parameter->getName()]) === true) {
          $argument = $decoded[$parameter->getName()];
        }
        else {
          if($parameter->isOptional() === true) {
            $argument = $parameter->getDefaultValue();
          } else {
            $argument = null;
          }
        }
        $arguments[] = $argument;
      }
    }

    return $arguments;
  }

  /**
   * Get the resource.
   *
   * @return string
   */
  public function get_resource() {
    return $this->resource;
  }

  /**
   * Get the method.
   *
   * @return string
   */
  public function get_method() {
    return $this->method;
  }

  /**
   * Get the arguments.
   *
   * @return string
   */
  public function get_arguments() {
    return $this->arguments;
  }

  /**
   * Get the alias.
   *
   * @return string
   */
  public function get_alias() {
    return $this->alias;
  }

  /**
   * Get the response.
   *
   * @return mixed
   */
  public function get_response() {
    return $this->response;
  }

  /**
   * Get cached_until property.
   *
   * @return number
   */
  public function get_cached_until() {
    return $this->cached_until;
  }

  /**
   * Get the next auto-alias.
   *
   * @return number
   */
  private function get_auto_alias() {
    return api_call::$auto_alias++;
  }
}
