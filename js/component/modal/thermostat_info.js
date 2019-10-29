/**
 * Thermostat Details
 */
beestat.component.modal.thermostat_info = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.thermostat_info, beestat.component.modal);

beestat.component.modal.thermostat_info.prototype.decorate_contents_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  var ecobee_thermostat = beestat.cache.ecobee_thermostat[
    thermostat.ecobee_thermostat_id
  ];

  var container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(150px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  var fields = [
    {
      'name': 'Model',
      'value': beestat.ecobee_thermostat_models[ecobee_thermostat.model_number] || 'Unknown'
    },
    {
      'name': 'Serial Number',
      'value': ecobee_thermostat.identifier
    },
    {
      'name': 'Firmware Revision',
      'value': ecobee_thermostat.version.thermostatFirmwareVersion
    },
    {
      'name': 'Weather Station',
      'value': ecobee_thermostat.weather.weatherStation
    },
    {
      'name': 'First Connected',
      'value': moment.utc(ecobee_thermostat.runtime.firstConnected).local()
        .format('MMM Do, YYYY')
    }
  ];

  fields.forEach(function(field) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    container.appendChild(div);

    div.appendChild($.createElement('div')
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'margin-bottom': (beestat.style.size.gutter / 4)
      })
      .innerHTML(field.name));
    div.appendChild($.createElement('div').innerHTML(field.value));
  });
};

beestat.component.modal.thermostat_info.prototype.get_title_ = function() {
  return 'Thermostat Info';
};
