<?php

namespace cora;

/**
 * Base API class that everything extends.
 *
 * @author Jon Ziebell
 */
abstract class api {

  /**
   * The current resource.
   *
   * @var string
   */
  protected $resource;

  /**
   * The database object.
   *
   * @var database
   */
  protected $database;

  /**
   * Session object.
   *
   * @var session
   */
  protected $session;

  /**
   * Setting object.
   *
   * @var setting
   */
  protected $setting;

  /**
   * Request object.
   *
   * @var request
   */
  protected $request;

  /**
   * Construct and set the variables. The namespace is stripped from the
   * resource variable. Anything that extends crud or API will use this
   * constructor. This means that there should be no arguments or every time
   * you want to use one of those resources you will have to find a way to
   * pass in the arguments. Using a couple singletons here makes that a lot
   * simpler.
   */
  final function __construct() {
    $this->resource = get_class($this);
    $class_parts = explode('\\', $this->resource);
    $this->table = end($class_parts);
    $this->database = database::get_instance();
    $this->request = request::get_instance();
    $this->setting = setting::get_instance();
    $this->session = session::get_instance();
  }

  /**
   * Shortcut method for doing API calls within the API. This will create an
   * instance of the resource you want and call the method you want with the
   * arguments you want.
   *
   * @param string $resource The resource to use.
   * @param string $method The method to call.
   * @param mixed $arguments The arguments to send. If not an array then
   * assumes a single argument.
   *
   * @return mixed
   */
  public function api($resource, $method, $arguments = []) {
    if(is_array($arguments) === false) {
      $arguments = [$arguments];
    }

    $resource_instance = new $resource();
    return call_user_func_array([$resource_instance, $method], $arguments);
  }

}
