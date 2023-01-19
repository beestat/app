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
      'demo.beestat.io',
      $setting->get('force_ssl'),
      true
    );

    // Just so I can make some simpler assumptions in app.php since the
    // superglobal is not updated when calling setcookie().
    $_COOKIE['session_key'] = 'd31d3ef451fe65885928e5e1bdf4af321f702009';
  }

  require_once 'api/cora/setting.php';
  $setting = cora\setting::get_instance();

  // If you're not logged in, just take you directly to the ecobee login page.
  if(isset($_COOKIE['session_key']) === false) {
    header('Location: http://' . $_SERVER['HTTP_HOST'] . '/api/?resource=ecobee&method=authorize&arguments={}&api_key=' . $setting->get('beestat_api_key_local'));
    die();
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
    <!-- Icon for pinning on iOS -->
    <link rel="apple-touch-icon" href="/favicon_apple.png">
    <?php

      echo '<link rel="manifest" href="/manifest.json?' . $setting->get('commit') . '">';
      echo '<link href="../css/dashboard.css?' . $setting->get('commit') . '" rel="stylesheet">';

      require 'js/js.php';
    ?>
  </head>
  <body></body>
</html>
