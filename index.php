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
    header('Location: dashboard/');
    die();
  } else {
    // Skip this page entirely if you're logged in.
    if(isset($_COOKIE['session_key']) === true) {
      header('Location: dashboard/');
      die();
    }
  }
?>
<!doctype html>
<html>
  <head>
    <title>beestat</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
    <!-- Chrome, Firefox OS and Opera -->
    <meta name="theme-color" content="#222222">
    <link rel="manifest" href="/manifest.json">

    <link href="css/index.css" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-10019370-7"></script>
  </head>
  <body>
    <div class="_index">
      <main>
        <div class="waveform"></div>
        <div class="header">
          <div class="beestat">
            <span class="bee">bee</span><span class="stat">stat</span>
          </div>
          <div class="log_in">
            Log In
          </div>
        </div>
        <div class="connect">
          <div class="connect_text">
            Connect your thermostat
          </div>
          <div class="connect_platforms">
            <a href="api/?resource=ecobee&method=authorize&arguments={}&api_key=ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2" class="ecobee"></a>
          </div>
        </div>
        <div class="demo">
          <a href="https://demo.beestat.io" target="_blank">Try a Demo</a>
        </div>
      </main>
      <footer>
        <div class="footer_text">
          Beestat is a free tool intended to help you view and analyze your home HVAC usage and efficiency.<br/>
        </div>
        <div class="footer_links">
          <a href="mailto:contact@beestat.io">Contact</a> •
          <a href="privacy/">Privacy</a> •
          <a href="http://eepurl.com/dum59r" target="_blank">Mailing List</a> •
          <a href="https://github.com/beestat/app/issues" target="_blank">Report Issue</a>
        </div>
      </footer>
    </div>
  </body>
</html>
