<?php

namespace cora;

/**
 * Workhorse for processing an API request. This has all of the core
 * functionality.
 *
 * @author Jon Ziebell
 */
final class cora {

  /**
   * The singleton.
   */
  private static $instance;

  /**
   * The timestamp when processing of the API request started.
   *
   * @var int
   */
  private $start_timestamp;

  /**
   * The timestamp (microseconds) when processing of the API request started.
   *
   * @var int
   */
  private $start_timestamp_microtime;

  /**
   * The original request passed to this object, usually $_REQUEST. Stored
   * right away so logging and error functions have access to it.
   *
   * @var array
   */
  private $request;

  /**
   * A list of all of the API calls extracted from the request. This is stored
   * so that logging and error functions have access to it.
   *
   * @var array
   */
  private $api_calls;

  /**
   * The current API user.
   *
   * @var array
   */
  private $api_user;

  /**
   * An array of the API responses. For single API calls, count() == 1, for
   * batch calls there will be one row per call.
   *
   * @var array
   */
  private $response_data = [];

  /**
   * The actual response in array form. It is stored here so the shutdown
   * handler has access to it.
   *
   * @var array
   */
  private $response;

  /**
   * This is necessary because of the shutdown handler. According to the PHP
   * documentation and various bug reports, when the shutdown function
   * executes the current working directory changes back to root.
   * https://bugs.php.net/bug.php?id=36529. This is cool and all but it breaks
   * the autoloader. My solution for this is to just change the working
   * directory back to what it was when the script originally ran.
   *
   * Obviuosly I could hardcode this but then users would have to configure
   * the cwd when installing Cora. This handles it automatically and seems to
   * work just fine. Note that if the class that the autoloader needs is
   * already loaded, the shutdown handler won't break. So it's usually not a
   * problem but this is a good thing to fix.
   *
   * @var string
   */
  private $current_working_directory;

  /**
   * A list of the response times for each API call. This does not reflect the
   * response time for the entire request, nor does it include the time it
   * took for overhead like rate limit checking.
   *
   * @var array
   */
  private $response_times = [];

  /**
   * A list of the query counts for each API call. This does not reflect the
   * query count for the entire request, nor does it include the queries for
   * overhead like rate limit checking.
   *
   * @var array
   */
  private $response_query_counts = [];

  /**
   * A list of the query times for each API call. This does not reflect the
   * query time for the entire request, nor does it include the times for
   * overhead like rate limit checking.
   *
   * @var array
   */
  private $response_query_times = [];

  /**
   * Whether or not each API call was returned from the cache.
   *
   * @var array
   */
  private $from_cache = [];

  /**
   * How long the API call is cached for. Used when setting the
   * beestat-cached-until header.
   *
   * @var array
   */
  private $cached_until = [];

  /**
   * This stores the currently executing API call. If that API call were to
   * fail, I need to know which one I was running in order to propery log the
   * error.
   *
   * @var array
   */
  private $current_api_call = null;

  /**
   * Database object.
   *
   * @var database
   */
  private $database;

  /**
   * Setting object.
   *
   * @var setting
   */
  private $setting;

  /**
   * The headers to output in the shutdown handler.
   *
   * @var array
   */
  private $headers;

  /**
   * Whether or not this is a custom response. If true, none of the Cora data
   * like 'success' and 'data' is returned; only the actual data from the
   * single API call is returned.
   *
   * @var bool
   */
  // private $custom_response;

  /**
   * Extra information for errors. For example, the database class puts
   * additional information into this variable if the query fails. The
   * error_message remains the same but has this additional data to help the
   * developer (if debug is enabled).
   *
   * @var mixed
   */
  private $error_extra_info = null;

  /**
   * Save the request variables for use later on. If unset, they are defaulted
   * to null. Any of these values being null will throw an exception as soon
   * as you try to process the request. The reason that doesn't happen here is
   * so that I can store exactly what was sent to me for logging purposes.
   */
  private function __construct() {
    $this->start_timestamp = microtime(true);
    $this->start_timestamp_microtime = $this->microtime();

    // See class variable documentation for reasoning.
    $this->current_working_directory = getcwd();
  }

  /**
   * Use this function to instantiate this class instead of calling new cora()
   * (which isn't allowed anyways). This is necessary so that the API class
   * can have access to Cora.
   *
   * @return cora A new cora object or the already created one.
   */
  public static function get_instance() {
    if(isset(self::$instance) === false) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  /**
   * Execute the request. It is run through the rate limiter, checked for
   * errors, then processed. Requests sent after the rate limit is reached are
   * not logged.
   *
   * @param array $request Basically just $_REQUEST or a slight mashup of it
   * for batch requests.
   *
   * @throws \Exception If the rate limit threshhold is reached.
   * @throws \Exception If SSL is required but not used.
   * @throws \Exception If the API key is not provided.
   * @throws \Exception If the API key is invalid.
   * @throws \Exception If the session is expired.
   * @throws \Exception If a resource is not provided.
   * @throws \Exception If a method is not provided.
   * @throws \Exception If the requested method does not exist.
   */
  public function process_request($request) {
    // This is necessary in order for the shutdown handler/log function to have
    // access to this data, but it's not used anywhere else.
    $this->request = $request;

    // Setting class for getting settings. Anything that extends cora\api gets
    // this automatically.
    $this->setting = setting::get_instance();

    // Used to have this in the constructor, but the database uses this class
    // which causes a dependency loop in the constructors.
    $this->database = database::get_instance();

    // A couple quick error checks
    if($this->is_over_rate_limit() === true) {
      throw new \Exception('Rate limit reached.', 1005);
    }
    if($this->setting->get('force_ssl') === true && empty($_SERVER['HTTPS']) === true) {
      throw new \Exception('Request must be sent over HTTPS.', 1006);
    }

    // Make sure the API key that was sent is present and valid.
    if(isset($request['api_key']) === false) {
      throw new \Exception('API Key is required.', 1000);
    }

    $api_user_resource = new api_user();
    $api_users = $api_user_resource->read(['api_key' => $request['api_key']]);
    if(count($api_users) !== 1) {
      throw new \Exception('Invalid API key.', 1003);
    } else {
      $this->api_user = $api_users[0];
    }

    // Build a list of API calls.
    $this->build_api_call_list($request);

    // Check the API request for errors.
    $this->check_api_request_for_errors();

    // Set the default headers as a catch-all. Most API calls won't touch these,
    // but it is possible for them to override headers as desired.
    $this->set_default_headers();

    // Get this every time. It's only used for session API calls. Non-session
    // API calls don't bother with this.
    $session = session::get_instance();
    $session_is_valid = $session->touch($this->api_user['session_key']);

    // Make sure the updated session timestamp doesn't get rolled back on
    // exception.
    $this->database->commit_transaction();

    // Process each request.
    foreach($this->api_calls as $api_call) {
      // Store the currently running API call for tracking if an error occurs.
      $this->current_api_call = $api_call;

      // These are required before we can move on with any more processing or
      // error checking.
      if(isset($api_call['resource']) === false) {
        throw new \Exception('Resource is required.', 1001);
      }
      if(isset($api_call['method']) === false) {
        throw new \Exception('Method is required.', 1002);
      }

      // Sets $call_type to 'public' or 'private'
      $call_type = $this->get_api_call_type($api_call);

      // If the request requires a session, make sure it's valid.
      if($call_type === 'private') {
        if($session_is_valid === false) {
          throw new exception('Session is expired.', 1004, false);
        }
      }

      // If the resource doesn't exist, spl_autoload_register() will throw a
      // fatal error. The shutdown handler will "catch" it. It is not possible
      // to catch exceptions directly from the autoloader using try/catch.
      $resource_instance = new $api_call['resource']();

      // If the method doesn't exist
      if(method_exists($resource_instance, $api_call['method']) === false) {
        throw new \Exception('Method does not exist.', 1009);
      }

      $arguments = $this->get_arguments($api_call);

      // Process the request and save some statistics.
      $start_time = microtime(true);
      $start_query_count = $this->database->get_query_count();
      $start_query_time = $this->database->get_query_time();

      if(isset($api_call['alias']) === true) {
        $index = $api_call['alias'];
      }
      else {
        $index = count($this->response_data);
      }

      // Caching! If this API call is configured for caching,
      // $cache_config = $this->setting->get('cache');
      if( // Is cacheable
        isset($api_call['resource']::$cache) === true &&
        isset($api_call['resource']::$cache[$api_call['method']]) === true
      ) {
        $api_cache_instance = new api_cache();
        $api_cache = $api_cache_instance->retrieve($api_call);

        if($api_cache !== null) {
          // If there was a cache entry available, use that.
          $this->response_data[$index] = $api_cache['response_data'];
          $this->from_cache[$index] = true;
          $this->cached_until[$index] = date('c', strtotime($api_cache['expires_at']));
        } else {
          // Else just run the API call, then cache it.
          $this->response_data[$index] = call_user_func_array(
            [$resource_instance, $api_call['method']],
            $arguments
          );
          $this->from_cache[$index] = false;

          $api_cache = $api_cache_instance->cache(
            $api_call,
            $this->response_data[$index],
            $api_call['resource']::$cache[$api_call['method']]
          );
          $this->cached_until[$index] = date('c', strtotime($api_cache['expires_at']));
        }
      }
      else { // Not cacheable
        $this->response_data[$index] = call_user_func_array(
          [$resource_instance, $api_call['method']],
          $arguments
        );
        $this->from_cache[$index] = false;
      }

      $this->response_times[$index] = (microtime(true) - $start_time);
      $this->response_query_counts[$index] = $this->database->get_query_count() - $start_query_count;
      $this->response_query_times[$index] = $this->database->get_query_time() - $start_query_time;
    }

    $this->set_cached_until_header();
  }

  /**
   * Build a list of API calls from the request. For a single request, it's
   * just the request. For batch requests, add each item in the batch
   * parameter to this array.
   *
   * @param array $request The original request.
   *
   * @throws \Exception If this is a batch request and the batch data is not
   * valid JSON
   * @throws \Exception If this is a batch request and it exceeds the maximum
   * number of api calls allowed in one batch.
   */
  private function build_api_call_list($request) {
    $this->api_calls = [];
    if(isset($request['batch']) === true) {
      $batch = json_decode($request['batch'], true);
      if($batch === null) {
        throw new \Exception('Batch is not valid JSON.', 1012);
      }
      $batch_limit = $this->setting->get('batch_limit');
      if($batch_limit !== null && count($batch) > $batch_limit) {
        throw new \Exception('Batch limit exceeded.', 1013);
      }
      foreach($batch as $api_call) {
        // Put this on each API call for logging.
        $api_call['api_key'] = $request['api_key'];
        $this->api_calls[] = $api_call;
      }
    }
    else {
      $this->api_calls[] = $request;
    }
  }

  /**
   * Check the API request for various errors.
   *
   * @throws \Exception If something other than ALL or NO aliases are set.
   * @throws \Exception If Any duplicate aliases are used.
   */
  private function check_api_request_for_errors() {
    $aliases = [];
    foreach($this->api_calls as $api_call) {
      if(isset($api_call['alias']) === true) {
        $aliases[] = $api_call['alias'];
      }
    }

    // Check to make sure either all or none are set.
    $number_aliases = count($aliases);
    if(count($this->api_calls) !== $number_aliases && $number_aliases !== 0) {
      throw new \Exception('All API calls must have an alias if at least one is set.', 1017);
    }

    // Check for duplicates.
    $number_unique_aliases = count(array_unique($aliases));
    if($number_aliases !== $number_unique_aliases) {
      throw new \Exception('Duplicate alias on API call.', 1018);
    }
  }

  /**
   * Returns 'session' or 'non_session' depending on where the API method is
   * located at. Session methods require a valid session in order to execute.
   *
   * @param array $api_call The API call to get the type for.
   *
   * @throws \Exception If the method was not found in the map.
   *
   * @return string The type.
   */
  private function get_api_call_type($api_call) {
    if(in_array($api_call['method'], $api_call['resource']::$exposed['private'])) {
      return 'private';
    }
    else if(in_array($api_call['method'], $api_call['resource']::$exposed['public'])) {
      return 'public';
    }
    else {
      throw new \Exception('Requested method is not mapped.', 1008);
    }
  }

  /**
   * Check to see if the request from the current IP address needs to be rate
   * limited. If $requests_per_minute is null then there is no rate limiting.
   *
   * @return bool If this request puts us over the rate threshold.
   */
  private function is_over_rate_limit() {
    $requests_per_minute = $this->setting->get('requests_per_minute');

    if($requests_per_minute === null) {
      return false;
    }

    $api_log_resource = new api_log();
    $requests_this_minute = $api_log_resource->get_number_requests_since(
      $_SERVER['REMOTE_ADDR'],
      time() - 60
    );

    return ($requests_this_minute > $requests_per_minute);
  }

  /**
   * Fetches a list of arguments when passed an array of keys. Since the
   * arguments are passed from JS to PHP in JSON, I don't need to cast any of
   * the values as the data types are preserved. Since the argument order from
   * the client doesn't matter, this makes sure that the arguments are placed
   * in the correct order for calling the function.
   *
   * @param array $api_call The API call.
   *
   * @throws \Exception If the arguments in the api_call were not valid JSON.
   *
   * @return array The requested arguments.
   */
  private function get_arguments($api_call) {
    $arguments = [];

    // Arguments are not strictly required. If a method requires them then you
    // will still get an error, but they are not required by the API.
    if(isset($api_call['arguments']) === true) {
      // All arguments are sent in the "arguments" key as JSON.
      $api_call_arguments = json_decode($api_call['arguments'], true);

      if($api_call_arguments === null) {
        throw new \Exception('Arguments are not valid JSON.', 1011);
      }

      $reflection_method = new \ReflectionMethod(
        $api_call['resource'],
        $api_call['method']
      );
      $parameters = $reflection_method->getParameters();

      foreach($parameters as $parameter) {
        if(isset($api_call_arguments[$parameter->getName()]) === true) {
          $argument = $api_call_arguments[$parameter->getName()];

          // If this is a batch request, look for JSONPath arguments.
          if(isset($this->request['batch']) === true) {
            $argument = $this->evaluate_json_path_argument($argument);
          }
        }
        else {
          $argument = null;
        }
        $arguments[] = $argument;
      }
    }
    return $arguments;
  }

  /**
   * Recursively check all values in an argument. If any of them are JSON
   * path, evaluate them.
   *
   * @param mixed $argument The argument to check.
   *
   * @return mixed The argument with the evaluated path.
   */
  private function evaluate_json_path_argument($argument) {
    if(is_array($argument) === true) {
      foreach($argument as $key => $value) {
        $argument[$key] = $this->evaluate_json_path_argument($value);
      }
    }
    else if(preg_match('/^{=(.*)}$/', $argument, $matches) === 1) {
      $json_path_resource = new json_path();
      $json_path = $matches[1];
      $argument = $json_path_resource->evaluate($this->response_data, $json_path);
    }
    return $argument;
  }

  /**
   * Sets error_extra_info.
   *
   * @param mixed $error_extra_info Whatever you want the extra info to be.
   */
  public function set_error_extra_info($error_extra_info) {
    $this->error_extra_info = $error_extra_info;
  }

  /**
   * Get error_extra_info.
   *
   * @return mixed
   */
  public function get_error_extra_info() {
    return $this->error_extra_info;
  }

  /**
   * Get the current API user.
   *
   * @return array
   */
  public function get_api_user() {
    return $this->api_user;
  }

  /**
   * Sets the headers that should be used for this API call. This is useful
   * for doing things like returning files from the API where the content-type
   * is no longer application/json. This replaces all headers; headers are not
   * outputted to the browser until all API calls have completed, so the last
   * call to this function will win.
   *
   * @param array $headers The headers to output.
   * @param bool $custom_response Whether or not to wrap the response with the
   * Cora data or just output the API call's return value.
   *
   * @throws \Exception If this is a batch request and a custom response was
   * requested.
   * @throws \Exception If this is a batch request and the content type was
   * altered from application/json
   * @throws \Exception If this is not a batch request and the content type
   * was altered from application/json without a custom response.
   */
  public function set_headers($headers, $custom_response = false) {
    if(isset($this->request['batch']) === true) {
      if($custom_response === true) {
        throw new \Exception('Batch API requests can not use a custom response.', 1015);
      }
      if($this->content_type_is_json($headers) === false) {
        throw new \Exception('Batch API requests must return JSON.', 1014);
      }
    }
    else {
      // Not a batch request
      if($custom_response === false && $this->content_type_is_json($headers) === false) {
        throw new \Exception('Non-custom responses must return JSON.', 1016);
      }
    }
    $this->headers = $headers;
    $this->custom_response = $custom_response;
  }

  /**
   * Return whether or not the current output headers indicate that the
   * content type is JSON. This is mostly just used to make sure that batch
   * API calls output JSON.
   *
   * @param array $headers The headers to look at.
   *
   * @return bool Whether or not the output has a content type of
   * application/json
   */
  private function content_type_is_json($headers) {
    return isset($headers['Content-type']) === true
      && stristr($headers['Content-type'], 'application/json') !== false;
  }

  /**
   * Override of the default PHP error handler. Grabs the error info and sends
   * it to the exception handler which returns a JSON response.
   *
   * @param int $error_code The error number from PHP.
   * @param string $error_message The error message.
   * @param string $error_file The file the error happend in.
   * @param int $error_line The line of the file the error happened on.
   *
   * @return string The JSON response with the error details.
   */
  public function error_handler($error_code, $error_message, $error_file, $error_line) {
    $this->set_error_response(
      $error_message,
      $error_code,
      $error_file,
      $error_line,
      debug_backtrace(false),
      true
    );
    die(); // Do not continue execution; shutdown handler will now run.
  }

  /**
   * Override of the default PHP exception handler. All unhandled exceptions
   * go here.
   *
   * @param Exception $e The exception.
   */
  public function exception_handler($e) {
    $this->set_error_response(
      $e->getMessage(),
      $e->getCode(),
      $e->getFile(),
      $e->getLine(),
      $e->getTrace(),
      (method_exists($e, 'getReportable') === true ? $e->getReportable() : true)
    );
    die(); // Do not continue execution; shutdown handler will now run.
  }

  /**
   * Handle all exceptions by generating a JSON response with the error
   * details. If debugging is enabled, a bunch of other information is sent
   * back to help out.
   *
   * @param string $error_message The error message.
   * @param mixed $error_code The supplied error code.
   * @param string $error_file The file the error happened in.
   * @param int $error_line The line of the file the error happened on.
   * @param array $error_trace The stack trace for the error.
   */
  public function set_error_response($error_message, $error_code, $error_file, $error_line, $error_trace, $reportable) {
    // There are a few places that call this function to set an error response,
    // so this can't just be done in the exception handler alone. If an error
    // occurs, rollback the current transaction. Also only attempt to roll back
    // the transaction if the database was successfully created/connected to.
    if($this->database !== null) {
      $this->database->rollback_transaction();
    }

    $this->response = [
      'success' => false,
      'data' => [
        'error_message' => $error_message,
        'error_code' => $error_code,
        'error_file' => $error_file,
        'error_line' => $error_line,
        'error_trace' => $error_trace,
        'error_extra_info' => $this->error_extra_info
      ]
    ];

    $session = session::get_instance();
    $user_id = $session->get_user_id();

    if(isset($this->request['api_key']) === true) {
      $api_user_resource = new api_user();
      $api_users = $api_user_resource->read(['api_key' => $this->request['api_key']]);
      $api_user_id = $api_users[0]['api_user_id'];
    }
    else {
      $api_user_id = null;
    }

    // Send data to Sentry for error logging.
    // https://docs.sentry.io/development/sdk-dev/event-payloads/
    if (
      $reportable === true &&
      $this->setting->get('sentry_key') !== null &&
      $this->setting->get('sentry_project_id') !== null
    ) {
      $data = [
        'event_id' => str_replace('-', '', exec('uuidgen -r')),
        'timestamp' => date('c'),
        'logger' => 'cora',
        'platform' => 'php',
        'level' => 'error',
        'tags' => [
          'error_code' => $error_code,
          'api_user_id' => $api_user_id
        ],
        'extra' => [
          'error_file' => $error_file,
          'error_line' => $error_line,
          'error_trace' => $error_trace
        ],
        'exception' => [
          'type' => 'Exception',
          'value' => $error_message,
          'handled' => false
        ],
        'user' => [
          'id' => $user_id,
          'ip_address' => $_SERVER['REMOTE_ADDR']
        ]
      ];

      exec(
        'curl ' .
        '-H "Content-Type: application/json" ' .
        '-H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=' . $this->setting->get('sentry_key') . '" ' .
        '--silent ' . // silent; keeps logs out of stderr
        '--show-error ' . // override silent on failure
        '--max-time 10 ' .
        '--connect-timeout 5 ' .
        '--data \'' . json_encode($data) . '\' ' .
        '"https://sentry.io/api/' . $this->setting->get('sentry_project_id') . '/store/" > /dev/null &'
      );
    }
  }

  /**
   * Executes when the script finishes. If there was an error that somehow
   * didn't get caught, then this will find it with error_get_last and return
   * appropriately. Note that error_get_last() will only get something when an
   * error wasn't caught by my error/exception handlers. The default PHP error
   * handler fills this in. Doesn't do anything if an exception was thrown due
   * to the rate limit.
   *
   * @throws \Exception If a this was a batch request but one of the api calls
   * changed the content-type to anything but the default.
   */
  public function shutdown_handler() {
    // Since the shutdown handler is rather verbose in what it has to check for
    // and do, it's possible it will fail or detect an error that needs to be
    // handled. For example, someone could return binary data from an API call
    // which will fail a json_encode, or someone could change the headers in a
    // batch API call, which isn't allowed. I can't throw an exception since I'm
    // already in the shutdown handler...it will be caught but it won't execute
    // a new shutdown handler and no output will be sent to the client. I just
    // have to handle all problems manually.
    try {
      // Fix the current working directory. See documentation on this class
      // variable for details.
      chdir($this->current_working_directory);

      // If I didn't catch an error/exception with my handlers, look here...this
      // will catch fatal errors that I can't.
      $error = error_get_last();
      if($error !== null) {
        $this->set_error_response(
          $error['message'],
          $error['type'],
          $error['file'],
          $error['line'],
          debug_backtrace(false),
          true
        );
      }

      // If the response has already been set by one of the error handlers, end
      // execution here and just log & output the response.
      if(isset($this->response) === true) {
        // Don't log anything for rate limit breaches.
        if($this->response['data']['error_code'] !== 1005) {
          $this->log();
        }

        // Override whatever headers might have already been set.
        $this->set_default_headers();
        $this->output_headers();
        die($this->get_json_response());
      }
      else {
        // If we got here, no errors have occurred.

        // For non-custom responses, build the response, log it, and output it.
        $this->response = ['success' => true];

        if(isset($this->request['batch']) === true) {
          $this->response['data'] = $this->response_data;
        }
        else {
          // $this->response['data'] = $this->response_data[0];
          $this->response['data'] = reset($this->response_data);
        }

        // Log all of the API calls that were made.
        $this->log();

        // Output the response
        $this->output_headers();
        die($this->get_json_response());
      }
    }
    catch(\Exception $e) {
      $this->set_error_response(
        $e->getMessage(),
        $e->getCode(),
        $e->getFile(),
        $e->getLine(),
        $e->getTrace(),
        (method_exists($e, 'getReportable') === true ? $e->getReportable() : true)
      );
      $this->set_default_headers();
      $this->output_headers();
      die($this->get_json_response());
    }
  }

  /**
   * Gets the json_encoded response. This is called from the shutdown handler
   * and removes debug information if debugging is disabled and then
   * json_encodes the data.
   *
   * @return string The JSON encoded response.
   */
  private function get_json_response() {
    $response = $this->response;
    if($this->setting->get('debug') === false && $response['success'] === false) {
      unset($response['data']['error_file']);
      unset($response['data']['error_line']);
      unset($response['data']['error_trace']);
      unset($response['data']['error_extra_info']);
    }
    return json_encode($response);
  }

  /**
   * Output whatever the headers are currently set to.
   */
  private function output_headers() {
    foreach($this->headers as $key => $value) {
      header($key . ': ' . $value);
    }
  }

  /**
   * Resets the headers to default. Have to do this in case one of the API
   * calls changes them and there was an error to handle.
   */
  private function set_default_headers() {
    $this->headers['Content-type'] = 'application/json; charset=UTF-8';
  }

  /**
   * Set the beestat-cached-until header.
   */
  private function set_cached_until_header() {
    if(isset($this->request['batch']) === true) { // Batch
      $beestat_cached_until = [];
      foreach($this->cached_until as $index => $cached_until) {
        $beestat_cached_until[$index] = $cached_until;
      }
      if(count($beestat_cached_until) > 0) {
        $this->headers['beestat-cached-until'] = json_encode($beestat_cached_until);
      }
    } else { // Single
      if(count($this->cached_until) === 1) {
        $this->headers['beestat-cached-until'] = reset($this->cached_until);
      }
    }
  }

  /**
   * Returns true for all loggable content types. Mostly JSON, XML, and other
   * text-based types.
   *
   * @return bool Whether or not the output has a content type that can be
   * logged.
   */
  private function content_type_is_loggable() {
    if(isset($this->headers['Content-type']) === false) {
      return false;
    }
    else {
      $loggable_content_types = [
        'application/json',
        'application/xml',
        'application/javascript',
        'text/html',
        'text/xml',
        'text/plain',
        'text/css'
      ];
      foreach($loggable_content_types as $loggable_content_type) {
        if(stristr($this->headers['Content-type'], $loggable_content_type) !== false) {
          return true;
        }
      }
    }
  }

  /**
   * Log the request and response to the database. The logged response is
   * truncated to 16kb for sanity.
   */
  private function log() {
    $api_log_resource = new api_log();
    $session = session::get_instance();

    $user_id = $session->get_user_id();

    // If exception. This is lenghty because I have to check to make sure
    // everything was set or else use null.
    if(isset($this->response['data']['error_code']) === true) {
      if(isset($this->request['api_key']) === true) {
        $api_user_resource = new api_user();
        $api_users = $api_user_resource->read(['api_key' => $this->request['api_key']]);
        $request_api_user_id = $api_users[0]['api_user_id'];
      }
      else {
        $request_api_user_id = null;
      }

      $request_resource = null;
      $request_method = null;
      $request_arguments = null;
      if($this->current_api_call !== null) {
        if(isset($this->current_api_call['resource']) === true) {
          $request_resource = $this->current_api_call['resource'];
        }
        if(isset($this->current_api_call['method']) === true) {
          $request_method = $this->current_api_call['method'];
        }
        if(isset($this->current_api_call['arguments']) === true) {
          $request_arguments = $this->current_api_call['arguments'];
        }
      }
      $response_error_code = $this->response['data']['error_code'];
      $response_time = null;
      $response_query_count = null;
      $response_query_time = null;
      $response_data = substr(json_encode($this->response['data']), 0, 16384);
      $from_cache = null;

      $api_log_resource->create(
        [
          'user_id'              => $user_id,
          'request_api_user_id'  => $request_api_user_id,
          'request_resource'     => $request_resource,
          'request_method'       => $request_method,
          'request_arguments'    => preg_replace('/"(password)":".*"/', '"$1":"[removed]"', $request_arguments),
          'response_error_code'  => $response_error_code,
          'response_data'        => preg_replace('/"(password)":".*"/', '"$1":"[removed]"', $response_data),
          'response_time'        => $response_time,
          'response_query_count' => $response_query_count,
          'response_query_time'  => $response_query_time,
          'from_cache'           => $from_cache
        ]
      );

      $this->log_influx(
        [
          'user_id'              => $user_id,
          'request_api_user_id'  => $request_api_user_id,
          'request_resource'     => $request_resource,
          'request_method'       => $request_method,
          'request_timestamp'    => $this->start_timestamp_microtime,
          'response_error_code'  => $response_error_code,
          'response_time'        => $response_time,
          'response_query_count' => $response_query_count,
          'response_query_time'  => $response_query_time,
          'from_cache'           => $from_cache
        ]
      );

    }
    else {
      $response_error_code = null;
      $count_api_calls = count($this->api_calls);
      for($i = 0; $i < $count_api_calls; $i++) {
        $api_call = $this->api_calls[$i];

        $api_user_resource = new api_user();
        $api_users = $api_user_resource->read(['api_key' => $api_call['api_key']]);
        $request_api_user_id = $api_users[0]['api_user_id'];

        $request_resource = $api_call['resource'];
        $request_method = $api_call['method'];
        if(isset($api_call['arguments']) === true) {
          $request_arguments = $api_call['arguments'];
        }
        else {
          $request_arguments = null;
        }

        if(isset($api_call['alias']) === true) {
          $index = $api_call['alias'];
        }
        else {
          $index = $i;
        }

        $response_time = $this->response_times[$index];
        $response_query_count = $this->response_query_counts[$index];
        $response_query_time = $this->response_query_times[$index];

        $from_cache = $this->from_cache[$index];

        $api_log_resource->create(
          [
            'user_id'              => $user_id,
            'request_api_user_id'  => $request_api_user_id,
            'request_resource'     => $request_resource,
            'request_method'       => $request_method,
            'request_arguments'    => preg_replace('/"(password)":".*"/', '"$1":"[removed]"', $request_arguments),
            'response_error_code'  => $response_error_code,
            'response_data'        => null, // Can't store this; uses too much disk.
            'response_time'        => $response_time,
            'response_query_count' => $response_query_count,
            'response_query_time'  => $response_query_time,
            'from_cache'           => $from_cache
          ]
        );

        $this->log_influx(
          [
            'user_id'              => $user_id,
            'request_api_user_id'  => $request_api_user_id,
            'request_resource'     => $request_resource,
            'request_method'       => $request_method,
            'request_timestamp'    => $this->start_timestamp_microtime,
            'response_error_code'  => $response_error_code,
            'response_time'        => $response_time,
            'response_query_count' => $response_query_count,
            'response_query_time'  => $response_query_time,
            'from_cache'           => $from_cache,
          ]
        );
      }
    }
  }

  /**
   * Log to InfluxDB/Grafana.
   *
   * @param array $data
   */
  private function log_influx($data) {
    $logger_resource = new \logger();
    $logger_resource->log_influx(
      'api_log',
      [
        'request_api_user_id' => (string) $data['request_api_user_id'],
        'exception' => $data['response_error_code'] === null ? '0' : '1',
        'from_cache' => $data['from_cache'] === false ? '0' : '1'
      ],
      [
        'user_id' => (int) $data['user_id'],
        'request_resource' => (string) $data['request_resource'],
        'request_method' => (string) $data['request_method'],
        'response_time' => round($data['response_time'], 4),
        'response_query_count' => (int) $data['response_query_count'],
        'response_error_code' => $data['response_error_code'] === null ? null : (int) $data['response_error_code'],
        'response_query_time' => round($data['response_query_time'], 4)
      ],
      $data['request_timestamp']
    );
  }

  /**
   * Get microtime for influx.
   *
   * @link https://github.com/influxdata/influxdb-php
   *
   * @return string
   */
  private function microtime() {
    list($usec, $sec) = explode(' ', microtime());
    return sprintf('%d%06d', $sec, $usec * 1000000);
  }


}
