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

  // If you're not logged in, just take you directly to the ecobee login page.
  if(isset($_COOKIE['session_key']) === false) {
    $arguments = [];
    if (isset($_SERVER['REQUEST_URI']) && stripos($_SERVER['REQUEST_URI'], '/glenwood') !== false) {
      $arguments['redirect'] = 'glenwood';
    }
    header('Location: https://' . $_SERVER['HTTP_HOST'] . '/api/?resource=ecobee&method=authorize&arguments=' . urlencode(json_encode($arguments)) . '&api_key=' . $setting->get('beestat_api_key_local'));
    die();
  }

  /*
   * Both the classic app and the new React app are served from this page at the
   * same URLs (/detail, /analyze, ...). The choice between them lives in the
   * browser (localStorage "beestat.ui", seeded from the user's "ui.version"
   * setting), so the page carries both apps' head markup and writes only the
   * chosen one while the head is still being parsed. Classic users get exactly
   * the same synchronous script tags as before; nothing extra is downloaded.
   */
  ob_start();
  require 'js/js.php';
  $classic_head = '<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">'
    . '<meta name="theme-color" content="#222222">'
    . ob_get_clean();

  require 'react/shell.php';
  $react_head = beestat_react_head($setting);

  $write_flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES;

?>

<!doctype html>
<html>
  <head>
    <title>beestat</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!-- Icon for pinning on iOS -->
    <link rel="apple-touch-icon" href="/favicon_apple.png">
    <link rel="icon" href="/favicon.png">
    <?php
      if($setting->is_demo() === false) {
        echo '<!-- On iOS, place a banner to download the app -->';
        echo '<meta name="apple-itunes-app" content="app-id=6469190206">';
      }
    ?>
    <?php
      echo '<link rel="manifest" href="/manifest.json?' . $setting->get('commit') . '">';
      echo '<link href="/css/dashboard.css?' . $setting->get('commit') . '" rel="stylesheet">';
    ?>
    <script>
      (function() {
        var stored = null;
        try {
          stored = window.localStorage.getItem('beestat.ui');
        } catch (e) {}

        // ?ui=new or ?ui=classic picks a version on this device (links, QA).
        var params = new URLSearchParams(window.location.search);
        var requested = params.get('ui');
        if (requested === 'new' || requested === 'classic') {
          stored = requested;
          try {
            window.localStorage.setItem('beestat.ui', requested);
          } catch (e) {}
          params.delete('ui');
          var query = params.toString();
          window.history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
        }

        var react_available = <?php echo $react_head === null ? 'false' : 'true'; ?>;
        var active = (stored === 'new' && react_available === true) ? 'new' : 'classic';
        window.__BEESTAT_UI__ = {
          'active': active,
          'stored': (stored === 'new' || stored === 'classic') ? stored : null,
          'react_available': react_available
        };

        document.write(active === 'new'
          ? <?php echo json_encode((string) $react_head, $write_flags); ?>
          : <?php echo json_encode($classic_head, $write_flags); ?>);
      })();
    </script>
  </head>
  <body></body>
</html>
