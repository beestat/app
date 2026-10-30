import Highcharts from 'highcharts';

// Global chart options shared by every page that draws a chart. Legacy beestat does
// not load Highcharts' accessibility module either; disabling the option silences
// the console warning Highcharts prints when the module is absent.
Highcharts.setOptions({ accessibility: { enabled: false } });
