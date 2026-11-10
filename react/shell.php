<?php

/**
 * Head markup that boots the React app, or null when it has not been built.
 * The root index.php writes this into the page for people who chose the new
 * version; the React app mounts itself into the body.
 *
 * @param cora\setting $setting
 *
 * @return string|null
 */
function beestat_react_head($setting) {
  $manifest_path = __DIR__ . '/dist/.vite/manifest.json';
  if (file_exists($manifest_path) === false) {
    return null;
  }
  $manifest = json_decode(file_get_contents($manifest_path), true);
  $entry = $manifest['index.html'] ?? null;
  if ($entry === null) {
    return null;
  }

  $config = [
    'apiBase' => '/api/',
    'apiKey' => $setting->get('beestat_api_key_local'),
    'environment' => $setting->get('environment'),
    'isDemo' => $setting->is_demo(),
    'commit' => $setting->get('commit')
  ];

  $html = '<base href="/">';
  $html .= '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">';
  $html .= '<meta name="theme-color" content="#263238">';
  foreach (($entry['css'] ?? []) as $stylesheet) {
    $html .= '<link rel="stylesheet" href="/react/dist/' . htmlspecialchars($stylesheet) . '">';
  }
  $html .= '<script>'
    . 'window.__BEESTAT_REACT_HOST__ = true;'
    . 'window.beestat_api_key_local = ' . json_encode($config['apiKey'], JSON_HEX_TAG) . ';'
    . 'window.environment = ' . json_encode($config['environment'], JSON_HEX_TAG) . ';'
    . 'window.is_demo = ' . ($config['isDemo'] ? 'true' : 'false') . ';'
    . 'window.commit = ' . json_encode($config['commit'], JSON_HEX_TAG) . ';'
    . 'window.__BEESTAT_CONFIG__ = ' . json_encode($config, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ';'
    . '</script>';
  $html .= '<script type="module" src="/react/dist/' . htmlspecialchars($entry['file']) . '"></script>';

  return $html;
}
