/**
 * Help for the aggregate runtime card.
 */
beestat.component.modal.help_runtime_thermostat_summary = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.help_runtime_thermostat_summary, beestat.component.modal);

beestat.component.modal.help_runtime_thermostat_summary.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML('View HVAC usage trends over large periods of time. This can help you identify problems or visualize effeciency gains from new equipment, insulation, etc. Compare to the Home IQ Weather Impact chart.'));
  parent.appendChild($.createElement('p').innerHTML('If you have Gap Fill enabled (on by default), this data may not match the ecobee website exactly. Ecobee displays total runtime as stored, while beestat will intelligently fill in missing data to produce a more accurate result.'));

  var table = $.createElement('table');
  table.style('color', beestat.style.color.blue.base);
  parent.appendChild(table);

  var tr;
  var td;

  tr = $.createElement('tr');
  table.appendChild(tr);

  td = $.createElement('td');
  td.setAttribute('valign', 'top');
  tr.appendChild(td);

  (new beestat.component.icon('information')
    .set_color(beestat.style.color.blue.base)
  ).render(td);

  td = $.createElement('td');
  td.setAttribute('valign', 'top');
  tr.appendChild(td);
  td.innerHTML('Ecobee typically purges data after about a year. Beestat stores all historical data even though ecobee does not.');
};

beestat.component.modal.help_runtime_thermostat_summary.prototype.get_title_ = function() {
  return 'Runtime Summary - Help';
};
