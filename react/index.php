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
    <script src="/js/lib/rocket/rocket.js"></script>
    <script src="/js/lib/moment/moment.js"></script>
    <script src="/js/lib/threejs/threejs.js"></script>
    <script src="/js/lib/three-csg-ts/three-csg-ts.global.js"></script>
    <script src="/js/lib/suncalc/suncalc.js"></script>
    <script src="/js/lib/clipper/clipper.js"></script>
    <script src="/js/lib/polylabel/polylabel.js"></script>
    <script type="module" src="/js/lib/straight-skeleton/wrapper.js?<?= htmlspecialchars($setting->get('commit')) ?>"></script>
    <script src="/js/beestat.js"></script>
    <script src="/js/beestat/extend.js"></script>
    <script src="/js/beestat/debounce.js"></script>
    <script src="/js/beestat/dispatcher.js"></script>
    <script src="/js/beestat/cache.js"></script>
    <script src="/js/beestat/clone.js"></script>
    <script src="/js/beestat/style.js"></script>
    <script src="/js/beestat/weather.js"></script>
    <script src="/js/beestat/api.js"></script>
    <script src="/js/beestat/platform.js"></script>
    <script src="/js/beestat/user.js"></script>
    <script src="/js/beestat/setting.js"></script>
    <script src="/js/beestat/temperature.js"></script>
    <script src="/js/beestat/distance.js"></script>
    <script src="/js/beestat/area.js"></script>
    <script src="/js/beestat/address.js"></script>
    <script src="/js/beestat/floor_plan.js"></script>
    <script src="/js/component.js"></script>
    <script src="/js/component/card.js"></script>
    <script src="/js/component/loading.js"></script>
    <script src="/js/component/icon.js"></script>
    <script src="/js/component/menu.js"></script>
    <script src="/js/component/menu_item.js"></script>
    <script src="/js/component/input.js"></script>
    <script src="/js/component/input/text.js"></script>
    <script src="/js/component/input/checkbox.js"></script>
    <script src="/js/component/input/radio.js"></script>
    <script src="/js/component/input/select.js"></script>
    <script src="/js/component/input/range.js"></script>
    <script src="/js/component/tile_group.js"></script>
    <script src="/js/component/tile.js"></script>
    <script src="/js/component/tile/floor_plan.js"></script>
    <script src="/js/component/tile/floor_plan_group.js"></script>
    <script src="/js/component/title.js"></script>
    <script src="/js/component/floor_plan_entity.js"></script>
    <script src="/js/component/floor_plan_entity/room.js"></script>
    <script src="/js/component/floor_plan_entity/surface.js"></script>
    <script src="/js/component/floor_plan_entity/opening.js"></script>
    <script src="/js/component/floor_plan_entity/tree.js"></script>
    <script src="/js/component/floor_plan_entity/light.js"></script>
    <script src="/js/component/floor_plan_entity/point.js"></script>
    <script src="/js/component/floor_plan_entity/wall.js"></script>
    <script src="/js/component/floor_plan.js"></script>
    <script src="/js/component/floor_plan_layers_sidebar.js"></script>
    <script src="/js/component/compass.js"></script>
    <script src="/js/component/radio_group.js"></script>
    <script src="/js/component/modal.js"></script>
    <script src="/js/component/modal/create_floor_plan.js"></script>
    <script src="/js/component/modal/update_floor_plan.js"></script>
    <script src="/js/component/modal/delete_floor_plan.js"></script>
    <script src="/js/component/modal/change_floor_plan.js"></script>
    <script src="/js/component/modal/floor_plan_elevation_help.js"></script>
    <script src="/js/component/card/floor_plan_editor.js"></script>
    <script src="/js/component/scene.js"></script>
    <script src="/js/component/scene/interaction.js"></script>
    <script src="/js/component/scene/texture.js"></script>
    <script src="/js/component/scene/light.js"></script>
    <script src="/js/component/scene/weather.js"></script>
    <script src="/js/component/scene/floor_plan.js"></script>
    <script src="/js/component/scene/opening.js"></script>
    <script src="/js/component/scene/layout.js"></script>
    <script src="/js/component/scene/roof.js"></script>
    <script src="/js/component/scene/tree.js"></script>
    <script src="/js/component/scene/environment.js"></script>
    <script src="/js/component/card/three_d.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/react/dist/<?= htmlspecialchars($entry['file']) ?>"></script>
  </body>
</html>
