/**
 * Metrics card.
 */
beestat.component.card.metrics = function(thermostat_group_id) {
  this.thermostat_group_id_ = thermostat_group_id;

  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var data_change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    'cache.data.metrics',
    data_change_function
  );

  beestat.component.card.apply(this, arguments);

  // this.layer_.register_loader(beestat.comparisons.get_comparison_metricss);
};
beestat.extend(beestat.component.card.metrics, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.metrics.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var metrics = [
    'setpoint_heat',
    'setpoint_cool',
    // 'runtime_per_heating_degree_day'
  ];

  // Decorate the metrics
  var metric_container = $.createElement('div')
    .style({
      'display': 'grid',
      // 'grid-template-columns': 'repeat(auto-fit, minmax(160px, 1fr))',
      'grid-template-columns': '1fr 1fr 1fr',
      'margin': '0 0 ' + beestat.style.size.gutter + 'px -' + beestat.style.size.gutter + 'px'
    });
  parent.appendChild(metric_container);

  metrics.forEach(function(metric) {
    var div = $.createElement('div')
      .style({
        'padding': beestat.style.size.gutter + 'px 0 0 ' + beestat.style.size.gutter + 'px'
      });
    metric_container.appendChild(div);

    (new beestat.component.metric[metric](self.thermostat_group_id_)).render(div);
  });




};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.metrics.prototype.get_title_ = function() {
  return 'Metrics';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
/*beestat.component.card.my_home.prototype.decorate_top_right_ = function(parent) {

};*/
