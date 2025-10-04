/**
 * Glenwood Report Card - Date Range Runner
 */
beestat.component.card.glenwood_report = function() {
  beestat.component.card.apply(this, arguments);
  // Store download_begin and download_end date in the instance
  this.download_begin = '';
  this.download_end = '';
  this.error_message = '';
};
beestat.extend(beestat.component.card.glenwood_report, beestat.component.card);

beestat.component.card.glenwood_report.prototype.decorate_contents_ = function(parent) {
  var self = this;

  // Download Begin Date input
  var download_begin_input = new beestat.component.input.text()
    .set_label('Begin Date')
    .set_width(110)
    .set_maxlength(10)
    .set_icon('calendar')
    .set_value(self.download_begin);
  download_begin_input.addEventListener('input', function() {
    self.download_begin = download_begin_input.get_value() || '';
  });

  // Download End Date input
  var download_end_input = new beestat.component.input.text()
    .set_label('End Date')
    .set_width(110)
    .set_maxlength(10)
    .set_icon('calendar')
    .set_value(self.download_end);
  download_end_input.addEventListener('input', function() {
    self.download_end = download_end_input.get_value() || '';
  });

  // Inputs container
  var input_container = $.createElement('div')
    .style({
      'display': 'flex',
      'gap': beestat.style.size.gutter + 'px',
      'margin-bottom': beestat.style.size.gutter + 'px'
    });
  download_begin_input.render(input_container);
  download_end_input.render(input_container);
  parent.appendChild(input_container);

  // Button container (bottom right)
  var button_container = $.createElement('div')
    .style({
      'display': 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-end'
    });

  var run_tile = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_text('Run')
    .render($(button_container));

  run_tile.addEventListener('click', function() {
    // Use class properties for validation directly
    if (!self.download_begin || !self.download_end) {
      self.error_message = 'Both begin and end dates are required.';
      self.rerender();
      return;
    }
    var download_begin_valid = moment(self.download_begin, 'M/D/YYYY', true).isValid();
    var download_end_valid = moment(self.download_end, 'M/D/YYYY', true).isValid();
    if (!download_begin_valid || !download_end_valid) {
      self.error_message = 'Both dates must be valid.';
      self.rerender();
      return;
    }

    // Cap range to one year (inclusive)
    var download_begin_moment = moment(self.download_begin, 'M/D/YYYY');
    var download_end_moment = moment(self.download_end, 'M/D/YYYY');
    var diff = Math.abs(download_end_moment.diff(download_begin_moment, 'days'));
    if (diff > 366) {
      self.error_message = 'Maximum range is one year.';
      self.rerender();
      return;
    }
    self.error_message = '';
    self.download_begin = download_begin_moment.format('M/D/YYYY');
    self.download_end = download_end_moment.format('M/D/YYYY');
    self.rerender();

    // Download Glenwood report via API
    var download_arguments = {
      'download_begin': download_begin_moment.format('YYYY-MM-DD'),
      'download_end': download_end_moment.format('YYYY-MM-DD')
    };
    window.location.href = '/api/?resource=runtime&method=download_glenwood_report&arguments=' +
      encodeURIComponent(JSON.stringify(download_arguments)) +
      '&api_key=' + window.beestat_api_key_local;
  });

  button_container.appendChild(
    $.createElement('div')
      .style({
        'color': beestat.style.color.red.base,
        'margin-top': beestat.style.size.gutter / 2 + 'px',
        'text-align': 'right',
        'min-height': '18px'
      })
      .innerText(self.error_message || '')
  );

  parent.appendChild(button_container);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.glenwood_report.prototype.get_title_ = function() {
  return 'Run Report';
};