<?php

/**
 * Patreon hits this file after authorizing. Patreon (or maybe oauth) does not
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

$setting = cora\setting::get_instance();

header('Location: ' . $setting->get('beestat_root_uri') . 'api/index.php?resource=patreon&method=initialize&arguments=' . json_encode($arguments) . '&api_key=' . $setting->get('patreon_api_key_local'));

die();
