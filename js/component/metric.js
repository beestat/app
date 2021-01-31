/**
 * Generic customizable metric.
 */
beestat.component.metric = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.metric, beestat.component);

/**
 * Whether or not this is a temperature value. If so, do the appropriate
 * conversion on display.
 *
 * @type {boolean}
 */
beestat.component.metric.prototype.is_temperature_ = false;

/**
 * Whether or not this temperature value is a delta instead of an absolute
 * value. If so, do the appropriate conversion on display.
 *
 * @type {boolean}
 */
beestat.component.metric.prototype.is_temperature_delta_ = false;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.metric.prototype.decorate_ = function(parent) {
  const self = this;
  const metric = this.get_metric_();

  // Construct the table
  var table = $.createElement('table').style('width', '100%');
  table.setAttribute({
    'cellpadding': '0',
    'cellspacing': '0'
  });
  parent.appendChild(table);

  var tr = $.createElement('tr');
  table.appendChild(tr);
  var td_icon = $.createElement('td')
    .style({
      'width': '36px',
      'text-align': 'center',
      'background': this.get_color_()
    });
  tr.appendChild(td_icon);

  var td_title = $.createElement('td')
    .style({
      'width': '100px',
      'background': this.get_color_(),
      'color': '#fff'
    });
  tr.appendChild(td_title);

  var td_chart = $.createElement('td')
    .style({
      'text-align': 'right'
    });
  tr.appendChild(td_chart);

  // Fill in the content.
  (new beestat.component.icon(this.get_icon_()))
    .set_color('#fff')
    .render(td_icon);

  td_title.appendChild($.createElement('div').innerText(this.get_title_() + ' '));

  td_title.appendChild(
    $.createElement('div')
      .innerText(this.get_histogram_sum_().toLocaleString() + ' others')
  );

  var chart_container = $.createElement('div').style({
    'position': 'relative',
    'height': '60px',
    'user-select': 'none'
  });
  td_chart.appendChild(chart_container);

  var formatter = this.get_formatter_();

  const chart_height = 60;
  const chart_padding = 20;
  const chart = $.createElement('div').style({
    'height': chart_height + 'px',
    'padding-top': chart_padding + 'px',
    'position': 'relative'
  });
  chart_container.appendChild(chart);

  var histogram = this.get_histogram_();
  var histogram_mode = this.get_histogram_mode_();
  var column_width = (100 / histogram.length);

  let my_column_index;
  let my_column_height;
  let sum_less = 0;
  let sum_more = 0;
  histogram.forEach(function(data, i) {
    const height = (data.count / histogram_mode * 100);
    const column = $.createElement('div').style({
      'display': 'inline-block',
      'width': column_width + '%',
      'height': height + '%'
    });

    const value = self.get_value_();
    if (
      value >= data.value &&
      value < data.value + metric.interval
    ) {
      column.style({
        'background': '#516169',
        'position': 'relative',

        // Makes it visible even if it's 0px high.
        'border-bottom': '2px solid #516169'
      });
      my_column_index = i;
      my_column_height = height;
    } else {
      if (my_column_index === undefined) {
        sum_less += data.count;
      } else {
        sum_more += data.count;
      }
      column.style({
        'background': beestat.style.color.bluegray.light,
        'border-bottom': '2px solid ' + beestat.style.color.bluegray.light
      });
    }

    chart.appendChild(column);
  });

  const label_height = 16;
  const label_bottom = Math.max(20, ((chart_height - chart_padding) * my_column_height / 100));
  var label = $.createElement('div')
    .innerText(formatter(this.get_value_(), this.get_precision_()))
    .style({
      'position': 'absolute',
      'bottom': label_bottom + 'px',
      'left': Math.min(85, ((my_column_index * column_width) + (column_width / 2))) + '%',
      'width': '60px',
      'height': label_height + 'px',
      'line-height': label_height + 'px',
      'margin-left': '-30px',
      'text-align': 'center',
      'font-weight': beestat.style.font_weight.bold,
      'text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.5)'
    });
  chart.appendChild(label);

  // Min & Max
  chart.appendChild(
    $.createElement('div')
      .style({
        'position': 'absolute',
        'left': '4px',
        'bottom': '2px',
        'color': 'rgba(255, 255, 255, 0.5)',
        'font-size': '11px'
      })
      .innerText(formatter(this.get_min_(), this.get_precision_()))
  );
  chart.appendChild(
    $.createElement('div')
      .style({
        'position': 'absolute',
        'right': '4px',
        'bottom': '2px',
        'color': 'rgba(255, 255, 255, 0.5)',
        'font-size': '11px'
      })
      .innerText(formatter(this.get_max_(), this.get_precision_()))
  );

  // Greater or less than % label
  const percentage_label = $.createElement('div');

  let percentage;
  let symbol;
  if (sum_less >= sum_more) {
    symbol = '>';
    percentage = sum_less / this.get_histogram_sum_();
  } else {
    symbol = '<';
    percentage = sum_more / this.get_histogram_sum_();
  }

  percentage_label.innerText(
    symbol + ' ' + (percentage * 100).toFixed(0) + '% homes'
  );
  td_title.appendChild(percentage_label);
};

/**
 * Get the largest histogram count.
 *
 * @return {number} The largest histogram count.
 */
beestat.component.metric.prototype.get_histogram_mode_ = function() {
  let mode = -Infinity;
  this.get_histogram_().forEach(function(data) {
    mode = Math.max(mode, data.count);
  });
  return mode;
};

/**
 * Get the sum of the histogram counts.
 *
 * @return {number} The sum of the histogram counts.
 */
beestat.component.metric.prototype.get_histogram_sum_ = function() {
  let sum = 0;
  this.get_histogram_().forEach(function(data) {
    sum += data.count;
  });
  return sum;
};

/**
 * Get the unit string to append to the end of the value.
 *
 * @return {mixed} The unit string.
 */
beestat.component.metric.prototype.get_units_ = function() {
  return '';
};

/**
 * Get the a formatter function that applies a transformation to the value.
 *
 * @return {mixed} A function that formats the string.
 */
beestat.component.metric.prototype.get_formatter_ = function() {
  var self = this;

  return function(value) {
    let return_value = value;
    if (self.is_temperature_ === true) {
      return_value = beestat.temperature({
        'temperature': value,
        'delta': self.is_temperature_delta_
      });
    }
    return return_value.toFixed(self.get_precision_()) + self.get_units_();
  };
};

/**
 * Get the minimum value of this metric (within two standard deviations). Then
 * make it go to the min of that and the actual value.
 *
 * @return {mixed} The minimum value of this metric.
 */
beestat.component.metric.prototype.get_min_ = function() {
  const metric = this.get_metric_();
  const cutoff_min = this.get_cutoff_min_();

  // Median minus 2 * standard deviation
  let min = (metric.median - (metric.standard_deviation * 2));

  // If lower than the cutoff, place at the cutoff
  if (cutoff_min !== null) {
    min = Math.max(min, cutoff_min);
  }

  // Unless the thermostat value is lower than the cutoff, then go there
  min = Math.min(min, this.get_value_());

  // Round down to the nearest interval
  min = this.round_(min, 'floor');

  return min;
};

/**
 * Get the maximum value of this metric (within two standard deviations). Then
 * make it go to the max of that and the actual value.
 *
 * @return {mixed} The maximum value of this metric.
 */
beestat.component.metric.prototype.get_max_ = function() {
  const metric = this.get_metric_();
  const cutoff_max = this.get_cutoff_max_();

  // Median plus 2 * standard deviation
  let max = (metric.median + (metric.standard_deviation * 2));

  // If higher than the cutoff, place at the cutoff
  if (cutoff_max !== null) {
    max = Math.min(max, cutoff_max);
  }

  // Unless the thermostat value is higher than the cutoff, then go there
  max = Math.max(max, this.get_value_());

  // Round up to the nearest interval
  max = this.round_(max, 'ceil');

  return max;
};

/**
 * Get max cutoff. This is used to set the chart min to max(median - 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.prototype.get_cutoff_min_ = function() {
  return null;
};

/**
 * Get max cutoff. This is used to set the chart max to min(median + 2 *
 * stddev, max cutoff).
 *
 * @return {object} The cutoff value.
 */
beestat.component.metric.prototype.get_cutoff_max_ = function() {
  return null;
};

/**
 * Get the value of this metric.
 *
 * @return {mixed} The value of this metric.
 */
beestat.component.metric.prototype.get_value_ = function() {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  if (this.child_metric_name_ !== undefined) {
    return this.round_(
      thermostat.profile[this.parent_metric_name_][this.child_metric_name_]
    );
  }

  return this.round_(thermostat.profile[this.parent_metric_name_]);
};

/**
 * Get the actual metric object as returned from thermostat->get_metrics().
 *
 * @return {array} THe metric object.
 */
beestat.component.metric.prototype.get_metric_ = function() {
  if (this.child_metric_name_ !== undefined) {
    return beestat.cache.data.metrics[this.parent_metric_name_][this.child_metric_name_];
  }

  return beestat.cache.data.metrics[this.parent_metric_name_];
};

/**
 * Take the histogram returned from the API, fill in missing values, and
 * remove anything outside the min and max.
 *
 * @return {array} Histogram data.
 */
beestat.component.metric.prototype.get_histogram_ = function() {
  const metric = this.get_metric_();

  const min = this.get_min_();
  const max = this.get_max_();

  const my_value = this.get_value_();

  var histogram = [];
  for (let value = min; value <= max; value += metric.interval) {
    let count = metric.histogram[value.toFixed(this.get_precision_())] || 0;

    // The API call does not include me in the histogram; add it here.
    if (value.toFixed(this.get_precision_()) === my_value.toFixed(this.get_precision_())) {
      count++;
    }

    histogram.push({
      'value': value,
      'count': count
    });
  }

  return histogram;
};

/**
 * Based on the interval, get the precision.
 *
 * @return {number} The precision.
 */
beestat.component.metric.prototype.get_precision_ = function() {
  const metric = this.get_metric_();
  if (Math.floor(metric.interval) === metric.interval) {
    return 0;
  }
  return metric.interval.toString().split('.')[1].length || 0;
};

/**
 * Round a number to the precision that this metric supports. Useful, for
 * example, because the profile is sometimes a higher precision than the
 * metric uses for display purposes.
 *
 * @param {number} value The value to round.
 * @param {string} mode The math function to use when rounding. Default round,
 * can also choose floor or ceil.
 *
 * @return {number} The rounded value.
 */
beestat.component.metric.prototype.round_ = function(value, mode) {
  const metric = this.get_metric_();
  const math_function = (mode === undefined) ? 'round' : mode;
  return Math[math_function](value / metric.interval) * metric.interval;
};
