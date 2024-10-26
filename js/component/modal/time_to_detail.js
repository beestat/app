/**
 * Current time_to_detail.
 */
beestat.component.modal.time_to_detail = function() {
  var self = this;

  beestat.dispatcher.addEventListener(
    'cache.thermostat',
    function() {
      self.rerender();
    }
  );

  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.time_to_detail, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.time_to_detail.prototype.decorate_contents_ = function(parent) {
  new beestat.component.chart.time_to_detail(
    beestat.time_to_detail.get_data(beestat.setting('thermostat_id'))
  ).render(parent);
};

/**
 * Get the title of the chart.
 *
 * @return {string}
 */
beestat.component.modal.time_to_detail.prototype.get_title_ = function() {
  const thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  const operating_mode = beestat.thermostat.get_operating_mode(
    thermostat.thermostat_id
  );

  // Convert "heat_1" etc to "heat"
  const simplified_operating_mode = operating_mode.replace(/[_\d]|auxiliary/g, '');

  return 'Time to ' + simplified_operating_mode;
};
