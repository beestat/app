<?php

require_once 'api/cora/setting.php';
$setting = cora\setting::get_instance();

// Make the environment accessible to JavaScript.
echo '<script>window.environment = \'' . $setting->get('environment') . '\';</script>';
echo '<script>window.is_demo = ' . ($setting->is_demo() === true ? 'true' : 'false') . ';</script>';

if($setting->get('environment') === 'dev' || $setting->get('environment') === 'dev_live') {
  // External libraries
  echo '<script src="/js/lib/rocket/rocket.js"></script>' . PHP_EOL;
  echo '<script src="/js/lib/moment/moment.js"></script>' . PHP_EOL;
  echo '<script src="/js/lib/highcharts/highcharts.js"></script>' . PHP_EOL;

  // Beestat
  echo '<script src="/js/beestat.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/extend.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/debounce.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/dispatcher.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/cache.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/clone.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/style.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/api.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/error.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/temperature.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/time.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/setting.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/poll.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/google_analytics.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/home_comparisons.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/highcharts.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/get_sync_progress.js"></script>' . PHP_EOL;

  // Layer
  echo '<script src="/js/layer.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/load.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/dashboard.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/home_comparisons.js"></script>' . PHP_EOL;

  // Component
  echo '<script src="/js/component.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/alert.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/runtime_thermostat_summary.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/alerts.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/comparison_settings.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/comparison_issue.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/demo.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/footer.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/my_home.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/patreon.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/recent_activity.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/score.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/score/cool.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/score/heat.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/score/resist.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/sensors.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/system.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/temperature_profiles.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart2.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_thermostat_summary.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/temperature_profiles.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/header.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/icon.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/layout.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/loading.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/logo.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/menu.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/menu_item.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/runtime_thermostat_summary_custom.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/announcements.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/change_system_type.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/change_thermostat.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/error.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/filter_info.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_runtime_thermostat_summary.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_alerts.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_home_efficiency.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_my_home.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_recent_activity.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_sensors.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_system.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_comparison_settings.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_temperature_profiles.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/patreon_hide.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/thermostat_info.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/help_score.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/weather.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/input.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/input/text.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/button.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/button_group.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/title.js"></script>' . PHP_EOL;
}
else {
  echo '<script src="/js/beestat.js?' . $setting->get('commit') . '"></script>' . PHP_EOL;
}

