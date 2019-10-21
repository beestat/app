<?php

  require 'api/cora/setting.php';
  $setting = cora\setting::get_instance();

  // Dump you straight into the demo.
  if($setting->is_demo() === true) {
    setcookie(
      'session_key',
      'd31d3ef451fe65885928e5e1bdf4af321f702009',
      4294967295,
      '/',
      null,
      $setting->get('force_ssl'),
      true
    );
  }

  // var_dump($_COOKIE);
  // Skip this page entirely if you're logged in.
  // if(isset($_COOKIE['session_key']) === true) {
  if(preg_match('/app\.beestat\.io/', $_SERVER['HTTP_HOST']) !== 0) {
    require 'app.php';
  } else {

    // When on regular beestat.io, delete these cookies.
    setcookie(
      'session_key',
      '',
      time() - 86400,
      '/',
      '',
      true,
      true
    );

    setcookie(
      'session_user_id',
      '',
      time() - 86400,
      '/',
      '',
      true,
      true
    );

    require 'www.php';
  }
