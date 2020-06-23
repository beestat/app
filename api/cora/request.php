<?php

namespace cora;

/**
 * Workhorse for processing an API request. This has all of the core
 * functionality.
 *
 * @author Jon Ziebell
 */
final class request {

  /**
   * The singleton.
   */
  private static $instance;

  /**
   * The timestamp when processing of the API request started.
   *
   * @var int
   */
  private $begin_timestamp;

  /**
   * The original request passed to this object, usually $_REQUEST.
   *
   * @var array
   */
  private $request;

  /**
   * A list of all of the API calls extracted from the request.
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
   * The actual response in array form.
   *
   * @var array
   */
  private $response;

  /**
   * Detailed error information for use in debugging.
   *
   * @var array
   */
  private $error_detail = [];

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
   * The headers to output in the shutdown handler.
   *
   * @var array
   */
  private $headers;

  /**
   * This is necessary because of the shutdown handler. According to the PHP
   * documentation and various bug reports, when the shutdown function
   * executes the current working directory changes back to root.
   * https://bugs.php.net/bug.php?id=36529. This is cool and all but it breaks
   * the autoloader. My solution for this is to just change the working
   * directory back to what it was when the script originally ran.
   *
   * Obviously I could hardcode this but then users would have to configure
   * the cwd when installing Cora. This handles it automatically and seems to
   * work just fine. Note that if the class that the autoloader needs is
   * already loaded, the shutdown handler won't break. So it's usually not a
   * problem but this is a good thing to fix.
   *
   * @var string
   */
  private $current_working_directory;

  /**
   * Save the request variables for use later on. If unset, they are defaulted
   * to null. Any of these values being null will throw an exception as soon
   * as you try to process the request. The reason that doesn't happen here is
   * so that I can store exactly what was sent to me for logging purposes.
   */
  private function __construct() {
    $this->begin_timestamp = microtime(true);

    // See class variable documentation for reasoning.
    $this->current_working_directory = getcwd();
  }

  /**
   * Use this function to instantiate this class instead of calling new
   * request() (which isn't allowed anyways).
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
   * errors, etc, then processed.
   *
   * @param array $request Basically just $_REQUEST or a slight mashup of it
   * for batch requests.
   */
  public function process($request) {
    $this->request = $request;

    $this->rate_limit();
    $this->force_ssl();

    $this->set_api_user();
    $this->set_api_calls();
    $this->validate_aliases();
    $this->set_default_headers();

    // Touch the session, if there is one. If the API user does not have a
    // session key set it will pull from the cookie.
    $session = session::get_instance();
    $session->touch($this->api_user['session_key']);

    // Process each request.
    foreach($this->api_calls as $api_call) {
      $api_call->process();
    }

    $this->set_cached_until_header();
  }

  /**
   * Build a list of API calls from the request. For a single request, it's
   * just the request. For batch requests, add each item in the batch
   * parameter to this array.
   *
   * @throws exception If this is a batch request and the batch data is not
   * valid JSON
   * @throws exception If this is a batch request and it exceeds the maximum
   * number of api calls allowed in one batch.
   */
  private function set_api_calls() {
    $setting = setting::get_instance();

    $this->api_calls = [];

    if(isset($this->request['batch']) === true) {
      $batch = json_decode($this->request['batch'], true);
      if($batch === null) {
        throw new exception('Batch is not valid JSON.', 1012);
      }
      $batch_limit = $setting->get('batch_limit');
      if($batch_limit !== null && count($batch) > $batch_limit) {
        throw new exception('Batch limit exceeded.', 1013);
      }
      foreach($batch as $api_call) {
        $this->api_calls[] = new api_call($api_call);
      }
    }
    else {
      $this->api_calls[] = new api_call($this->request);
    }
  }

  /**
   * Check for any issues with the aliases.
   *
   * @throws exception If any duplicate aliases are used.
   */
  private function validate_aliases() {
    $aliases = [];
    foreach($this->api_calls as $api_call) {
      $aliases[] = $api_call->get_alias();
    }

    $number_aliases = count($aliases);
    $number_unique_aliases = count(array_unique($aliases));

    // Check for duplicates.
    if($number_aliases !== $number_unique_aliases) {
      throw new exception('Duplicate alias.', 1018);
    }
  }

  /**
   * Check to see if the request from the current IP address needs to be rate
   * limited. If $requests_per_minute is null then there is no rate limiting.
   *
   * @throws exception If over the rate limit.
   */
  private function rate_limit() {
    $setting = setting::get_instance();

    $requests_per_minute = $setting->get('requests_per_minute');

    if($requests_per_minute === null) {
      return false;
    }

    $api_log_resource = new api_log();
    $requests_this_minute = $api_log_resource->get_number_requests_since(
      $_SERVER['REMOTE_ADDR'],
      (time() - 60)
    );

    // A couple quick error checks
    if($requests_this_minute > $requests_per_minute) {
      throw new exception('Rate limit reached.', 1005);
    }
  }

  /**
   * Force secure connections.
   *
   * @throws exception if not secure.
   */
  private function force_ssl() {
    $setting = setting::get_instance();

    if($setting->get('force_ssl') === true && empty($_SERVER['HTTPS']) === true) {
      throw new exception('Request must be sent over HTTPS.', 1006);
    }
  }

  /**
   * Set the current API user based on the request API key.
   *
   * @throws exception if the API key is not set.
   * @throws exception if the API key is not valid.
   */
  private function set_api_user() {
    // Make sure the API key that was sent is present and valid.
    if(isset($this->request['api_key']) === false) {
      throw new exception('API Key is required.', 1000);
    }

    $api_user_resource = new api_user();
    $api_users = $api_user_resource->read(['api_key' => $this->request['api_key']]);
    if(count($api_users) !== 1) {
      throw new exception('API key is invalid.', 1003);
    } else {
      $this->api_user = $api_users[0];
    }
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
   * Log the request and response to the database. The logged response is
   * truncated to 16kb for sanity.
   */
  private function log() {
    $database = database::get_instance();
    $session = session::get_instance();
    $setting = setting::get_instance();
    $api_log_resource = new api_log();

    // If exception.
    if(isset($this->response['data']['error_code']) === true) {
      $api_log_resource->create([
        'user_id'      => $session->get_user_id(),
        'api_user_id'  => $this->api_user['api_user_id'],
        'ip_address'   => ip2long($_SERVER['REMOTE_ADDR']),
        'timestamp'    => date('Y-m-d H:i:s', $this->begin_timestamp),
        'request'      => $this->request,
        'response'     => $this->response,
        'error_code'   => $this->response['data']['error_code'],
        'error_detail' => $this->error_detail,
        'total_time'   => $this->total_time,
        'query_count'  => $database->get_query_count(),
        'query_time'   => $database->get_query_time(),
      ]);
    }
    else {
      $user_resource = new \user();
      $user = $user_resource->get($session->get_user_id());

      $api_log_resource->create([
        'user_id' => $session->get_user_id(),
        'api_user_id' => $this->api_user['api_user_id'],
        'ip_address' => ip2long($_SERVER['REMOTE_ADDR']),
        'timestamp' => date('Y-m-d H:i:s', $this->begin_timestamp),
        'request' => $this->request,
        'response' => ($user['debug'] === true) ? $this->response : null,
        'total_time' => $this->total_time,
        'query_count' => $database->get_query_count(),
        'query_time' => $database->get_query_time(),
      ]);
    }
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
   * @throws exception If this is a batch request and a custom response was
   * requested.
   * @throws exception If this is a batch request and the content type was
   * altered from application/json
   * @throws exception If this is not a batch request and the content type was
   * altered from application/json without a custom response.
   */
  public function set_headers($headers, $custom_response = false) {
    if(isset($this->request['batch']) === true) {
      if($custom_response === true) {
        throw new exception('Batch API requests can not use a custom response.', 1015);
      }
      if($this->content_type_is_json($headers) === false) {
        throw new exception('Batch API requests must return JSON.', 1014);
      }
    }
    else {
      // Not a batch request
      if($custom_response === false && $this->content_type_is_json($headers) === false) {
        throw new exception('Non-custom responses must return JSON.', 1016);
      }
    }
    $this->headers = $headers;
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
    $beestat_cached_until = [];
    foreach($this->api_calls as $api_call) {
      $cached_until = $api_call->get_cached_until();
      if($cached_until !== null) {
        $beestat_cached_until[$api_call->get_alias()] = $api_call->get_cached_until();
      }
    }

    if(count($beestat_cached_until) > 0) {
      if(isset($this->request['batch']) === true) {
        $this->headers['beestat-cached-until'] = json_encode($beestat_cached_until);
      } else {
        $this->headers['beestat-cached-until'] = reset($beestat_cached_until);
      }
    }
  }

  /**
   * Override of the default PHP error handler. Sets the error response then
   * dies and lets the shutdown handler take over.
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
      true
    );

    $this->error_detail['file'] = $error_file;
    $this->error_detail['line'] = $error_line;
    $this->error_detail['trace'] = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
    try {
      $database = database::get_instance();
      $this->error_detail['queries'] = $database->get_queries();
    } catch(Exception $e) {}

    die(); // Do not continue execution; shutdown handler will now run.
  }

  /**
   * Override of the default PHP exception handler. Sets the error response
   * then dies and lets the shutdown handler take over.
   *
   * @param Exception $e The exception.
   */
  public function exception_handler($e) {
    $this->set_error_response(
      $e->getMessage(),
      $e->getCode(),
      (method_exists($e, 'getReportable') === true ? $e->getReportable() : true)
    );

    $this->error_detail['file'] = $e->getFile();
    $this->error_detail['line'] = $e->getLine();
    $this->error_detail['trace'] = $e->getTrace();
    $this->error_detail['extra'] = (method_exists($e, 'getExtraInfo') === true ? $e->getExtraInfo() : null);
    try {
      $database = database::get_instance();
      $this->error_detail['queries'] = $database->get_queries();
    } catch(Exception $e) {}

    die(); // Do not continue execution; shutdown handler will now run.
  }

  /**
   * Handle all exceptions by generating a JSON response with the error
   * details. If debugging is enabled, a bunch of other information is sent
   * back to help out.
   *
   * There are a few places that call this function to set an error response,
   * so this can't just be done in the exception handler alone. If an error
   * occurs, rollback the current transaction.
   *
   * @param string $error_message The error message.
   * @param mixed $error_code The supplied error code.
   * @param array $reportable Whether or not the error is reportable.
   */
  public function set_error_response($error_message, $error_code, $reportable) {
    $setting = setting::get_instance();
    $session = session::get_instance();

    // I guess if this fails then things are really bad, but let's at least
    // protect against additional exceptions if the database connection or
    // similar fails.
    try {
      $database = database::get_instance();
      $database->rollback_transaction();
    } catch(\Exception $e) {}

    $this->response = [
      'success' => false,
      'data' => [
        'error_message' => $error_message,
        'error_code' => $error_code
      ]
    ];

    // Send data to Sentry for error logging.
    // https://docs.sentry.io/development/sdk-dev/event-payloads/
    $api_user_id = $this->api_user['api_user_id'];
    if (
      $reportable === true &&
      $setting->get('sentry_key') !== null &&
      $setting->get('sentry_project_id') !== null &&
      $api_user_id === 1
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
          'error_file' => $this->error_detail['file'],
          'error_line' => $this->error_detail['line'],
          'error_trace' => $this->error_detail['trace'],
          'error_extra' => $this->error_detail['extra']
        ],
        'exception' => [
          'type' => 'Exception',
          'value' => $error_message,
          'handled' => false
        ],
        'user' => [
          'id' => $session->get_user_id(),
          'ip_address' => $_SERVER['REMOTE_ADDR']
        ]
      ];

      exec(
        'curl ' .
        '-H "Content-Type: application/json" ' .
        '-H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=' . $setting->get('sentry_key') . '" ' .
        '--silent ' . // silent; keeps logs out of stderr
        '--show-error ' . // override silent on failure
        '--max-time 10 ' .
        '--connect-timeout 5 ' .
        '--data \'' . json_encode($data) . '\' ' .
        '"https://sentry.io/api/' . $setting->get('sentry_project_id') . '/store/" > /dev/null &'
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
      $this->total_time = (microtime(true) - $this->begin_timestamp);

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
          true
        );

        $this->error_detail['file'] = $error['file'];
        $this->error_detail['line'] = $error['line'];
        $this->error_detail['trace'] = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        try {
          $database = database::get_instance();
          $this->error_detail['queries'] = $database->get_queries();
        } catch(Exception $e) {}
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
        die(json_encode($this->response));
      }
      else {
        // If we got here, no errors have occurred.

        // For non-custom responses, build the response, log it, and output it.
        $this->response = ['success' => true];

        if(isset($this->request['batch']) === true) {
          $this->response['data'] = [];
          foreach($this->api_calls as $api_call) {
            $this->response['data'][$api_call->get_alias()] = $api_call->get_response();
          }
        }
        else {
          $this->response['data'] = $this->api_calls[0]->get_response();
        }

        // Log all of the API calls that were made.
        $this->log();

        // Output the response
        $this->output_headers();
        die(json_encode($this->response));
      }
    }
    catch(\Exception $e) {
      $this->set_error_response(
        $e->getMessage(),
        $e->getCode(),
        (method_exists($e, 'getReportable') === true ? $e->getReportable() : true)
      );

      $this->error_detail['file'] = $e->getFile();
      $this->error_detail['line'] = $e->getLine();
      $this->error_detail['trace'] = $e->getTrace();
      $this->error_detail['extra'] = (method_exists($e, 'getExtraInfo') === true ? $e->getExtraInfo() : null);
      try {
        $database = database::get_instance();
        $this->error_detail['queries'] = $database->get_queries();
      } catch(Exception $e) {}

      $this->set_default_headers();
      $this->output_headers();
      die(json_encode($this->response));
    }
  }

}
