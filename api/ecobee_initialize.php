<?php

/**
 * Ecobee hits this file after authorizing. Ecobee (or maybe oauth) does not
 * support URL parameters in the redirect_uri, so redirecting here and then
 * redirecting again to the API. ¯\_(ツ)_/¯
 *
 * @author Jon Ziebell
 */

require 'cora/setting.php';

$arguments = [];

if(isset($_GET['code']) === true) {
  $arguments['code'] = $_GET['code'];
}
if(isset($_GET['state']) === true) {
  $arguments['state'] = $_GET['state'];
}
if(isset($_GET['error']) === true) {
  $arguments['error'] = $_GET['error'];
}
if(isset($_GET['error_description']) === true) {
  $arguments['error_description'] = $_GET['error_description'];
}

$setting = cora\setting::get_instance();

header('Location: ' . $setting->get('beestat_root_uri') . 'api/?resource=ecobee&method=initialize&arguments=' . json_encode($arguments) . '&api_key=' . $setting->get('ecobee_api_key_local'));

die();
