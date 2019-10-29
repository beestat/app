<?php

die('Beestat is down until around 10pm Eastern for some minor database maintenance.');

/**
 * Entry point for the API. This sets up cora, the error/exception handlers,
 * and then sends the request off for processing. All requests should start
 * here.
 *
 * @author Jon Ziebell
 */

// Compress output.
ob_start('ob_gzhandler');

// Set a reasonable time limit.
set_time_limit(5);

// Turn on all error reporting but disable displaying errors.
error_reporting(-1);
ini_set('display_errors', '0');

date_default_timezone_set('UTC');

// Autoload classes as necessary so there are no includes/requires. Note that
// calling spl_autoload_register() with no arguments is actually faster than
// this. The only reason I'm defining this function is because the default
// autoloader lowercases everything which tends to break other libraries.
spl_autoload_register(function($class) {
  include str_replace('\\', '/', $class) . '.php';
});

// Construct cora and set up error handlers.
$cora = cora\cora::get_instance();
set_error_handler([$cora, 'error_handler']);
set_exception_handler([$cora, 'exception_handler']);

// The shutdown handler will output the response.
register_shutdown_function([$cora, 'shutdown_handler']);

// Useful function
function array_median($array) {
  $count = count($array);
  $middle = floor($count / 2);
  sort($array, SORT_NUMERIC);
  $median = $array[$middle]; // assume an odd # of items
  // Handle the even case by averaging the middle 2 items
  if ($count % 2 == 0) {
    $median = ($median + $array[$middle - 1]) / 2;
  }
  return $median;
}

// Go!
$cora->process_request($_REQUEST);
