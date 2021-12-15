<?php

require_once 'api/cora/setting.php';
$setting = cora\setting::get_instance();

// Make the environment accessible to JavaScript.
echo '<script>window.environment = \'' . $setting->get('environment') . '\';</script>';
echo '<script>window.is_demo = ' . ($setting->is_demo() === true ? 'true' : 'false') . ';</script>';

if($setting->get('environment') === 'dev' || $setting->get('environment') === 'dev_live') {
  // External libraries
  echo '<script src="/js/lib/sentry/sentry.js"></script>' . PHP_EOL;
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
  echo '<script src="/js/beestat/comparisons.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/highcharts.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/thermostat.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/user.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/ecobee.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/runtime_thermostat.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/runtime_sensor.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/sensor.js"></script>' . PHP_EOL;
  echo '<script src="/js/beestat/requestor.js"></script>' . PHP_EOL;

  // Layer
  echo '<script src="/js/layer.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/load.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/detail.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/compare.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/analyze.js"></script>' . PHP_EOL;
  echo '<script src="/js/layer/settings.js"></script>' . PHP_EOL;

  // Component
  echo '<script src="/js/component.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/alert.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/down_notification.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/runtime_thermostat_summary.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/alerts.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/comparison_settings.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/early_access.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/demo.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/footer.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/my_home.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/patreon.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/runtime_thermostat_detail.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/runtime_sensor_detail.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/sensors.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/system.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/temperature_profiles.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/metrics.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/card/settings.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_thermostat_summary.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/temperature_profiles.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_thermostat_detail_temperature.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_thermostat_detail_equipment.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_sensor_detail_temperature.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/chart/runtime_sensor_detail_occupancy.js"></script>' . PHP_EOL;
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
  echo '<script src="/js/component/modal/download_data.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/error.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/filter_info.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/enjoy_beestat.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/runtime_thermostat_detail_custom.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/runtime_sensor_detail_custom.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/thermostat_info.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/weather.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/patreon_status.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/modal/newsletter.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/input.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/input/text.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/input/checkbox.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/button.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/button_group.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/title.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setpoint.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setpoint/heat.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setpoint/cool.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setback.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setback/heat.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/setback/cool.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/runtime_per_degree_day.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/runtime_per_degree_day/heat_1.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/runtime_per_degree_day/heat_2.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/runtime_per_degree_day/cool_1.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/runtime_per_degree_day/cool_2.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/balance_point.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/balance_point/heat_1.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/balance_point/heat_2.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/balance_point/resist.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/property.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/property/age.js"></script>' . PHP_EOL;
  echo '<script src="/js/component/metric/property/square_feet.js"></script>' . PHP_EOL;
}
else {
  echo '<script src="/js/beestat.js?' . $setting->get('commit') . '"></script>' . PHP_EOL;
}

