/**
 * Help for the alerts card.
 */
beestat.component.modal.help_alerts = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_alerts, beestat.component.modal);

beestat.component.modal.help_alerts.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('Shows alerts currently displayed on your thermostat and also custom beestat alerts. You may dismiss alerts at any time from beestat and it will not affect the alerts on your ecobee. Custom alerts include:'));
  var ul = $.createElement('ul');
  parent.appendChild(ul);
  ul.appendChild($.createElement('li').innerHTML('Cool differential too low'));
  ul.appendChild($.createElement('li').innerHTML('Heat differential too low'));
};

beestat.component.modal.help_alerts.prototype.get_title_ = function() {
  return 'Alerts - Help';
};
