<?php
  require '../api/cora/setting.php';
  $setting = cora\setting::get_instance();

  if(isset($_COOKIE['session_key']) === false) {
    header('Location: https://' . $_SERVER['HTTP_HOST'] . '/api/?resource=ecobee&method=authorize&arguments=%7B%7D&api_key=' . $setting->get('beestat_api_key_local'));
    die();
  }

  $manifest_path = __DIR__ . '/dist/.vite/manifest.json';
  if(file_exists($manifest_path) === false) {
    http_response_code(503);
    die('React build not found. Run npm run build in dev/react.');
  }
  $manifest = json_decode(file_get_contents($manifest_path), true);
  $entry = $manifest['index.html'];
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <base href="/">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#263238">
    <link rel="icon" href="/favicon.png">
    <link rel="apple-touch-icon" href="/favicon_apple.png">
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="/css/dashboard.css?<?= htmlspecialchars($setting->get('commit')) ?>">
    <?php foreach(($entry['css'] ?? []) as $stylesheet): ?>
      <link rel="stylesheet" href="/react/dist/<?= htmlspecialchars($stylesheet) ?>">
    <?php endforeach; ?>
    <title>beestat</title>
    <script>
      window.__BEESTAT_REACT_HOST__ = true;
      window.beestat_api_key_local = <?= json_encode($setting->get('beestat_api_key_local')) ?>;
      window.environment = <?= json_encode($setting->get('environment')) ?>;
      window.is_demo = <?= $setting->is_demo() ? 'true' : 'false' ?>;
      window.commit = <?= json_encode($setting->get('commit')) ?>;
      window.__BEESTAT_CONFIG__ = <?= json_encode([
        'apiBase' => '/api/',
        'apiKey' => $setting->get('beestat_api_key_local'),
        'environment' => $setting->get('environment'),
        'isDemo' => $setting->is_demo(),
        'commit' => $setting->get('commit')
      ], JSON_UNESCAPED_SLASHES) ?>;
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/react/dist/<?= htmlspecialchars($entry['file']) ?>"></script>
  </body>
</html>
