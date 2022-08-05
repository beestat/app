/**
 * Runtime summary card. Compare to the ecobee weather impact chart.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.runtime_thermostat_summary = function(thermostat_id) {
  var self = this;

  this.thermostat_id_ = thermostat_id;

  /*
   * Initialize a variable to store when the card was first loaded to guess how
   * long the sync will take to complete.
   */
  this.sync_begin_m_ = moment();
  this.sync_begin_progress_ = beestat.thermostat.get_sync_progress(thermostat_id);

  /*
   * When a setting is changed clear all of the data. Then rerender which will
   * trigger the loading state. Also do this when the cache changes.
   *
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'setting.runtime_thermostat_summary_time_count',
      'setting.runtime_thermostat_summary_time_period',
      'setting.runtime_thermostat_summary_group_by',
      'setting.runtime_thermostat_summary_gap_fill',
      'setting.runtime_thermostat_summary_smart_scale',
      'cache.runtime_thermostat_summary'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.runtime_thermostat_summary, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.runtime_thermostat_summary.prototype.decorate_contents_ = function(parent) {
  var container = $.createElement('div').style({
    'position': 'relative'
  });
  parent.appendChild(container);

  var chart_container = $.createElement('div');
  container.appendChild(chart_container);

  var data = this.get_data_();
  this.chart_ = new beestat.component.chart.runtime_thermostat_summary(data);
  this.chart_.render(chart_container);

  var sync_progress = beestat.thermostat.get_sync_progress(this.thermostat_id_);

  if (sync_progress === null) {
    chart_container.style('filter', 'blur(3px)');
    var no_data = $.createElement('div');
    no_data.style({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'width': '100%',
      'height': '100%',
      'display': 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'text-align': 'center'
    });
    no_data.innerText('No data to display');
    container.appendChild(no_data);
  } else if (sync_progress < 100) {
    var time_taken = moment.duration(moment().diff(this.sync_begin_m_));
    var percent_taken = sync_progress - this.sync_begin_progress_;
    var percent_per_second = percent_taken / time_taken.asSeconds();

    var time_remain = (100 - sync_progress) / percent_per_second;

    var string_remain;
    if (time_remain === Infinity) {
      string_remain = 'A few minutes';
    } else {
      if (time_remain > 59) {
        string_remain = Math.round(time_remain / 60) + 'm ';
      } else {
        string_remain = Math.round(time_remain) + 's';
      }
    }

    this.show_loading_('Syncing (' + sync_progress + '%)<br/>' + string_remain + ' remaining');
    window.setTimeout(function() {
      var api = new beestat.api();
      api.add_call(
        'runtime_thermostat_summary',
        'read_id',
        {},
        'runtime_thermostat_summary'
      );

      api.add_call(
        'thermostat',
        'read_id',
        {
          'attributes': {
            'inactive': 0
          }
        },
        'thermostat'
      );

      api.set_callback(function(response) {
        beestat.cache.set('thermostat', response.thermostat);
        beestat.cache.set('runtime_thermostat_summary', response.runtime_thermostat_summary);
      });

      api.send();
    }, 10000);
  }
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_data_ = function() {
  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {
        'title': this.get_title_(),
        'subtitle': this.get_subtitle_()
      }
    }
  };

  [
    'sum_compressor_cool_1',
    'sum_compressor_cool_2',
    'sum_compressor_heat_1',
    'sum_compressor_heat_2',
    'sum_auxiliary_heat_1',
    'sum_auxiliary_heat_2',
    'sum_fan',
    'sum_humidifier',
    'sum_dehumidifier',
    'sum_ventilator',
    'sum_economizer',
    'avg_outdoor_temperature',
    'avg_outdoor_humidity',
    'min_outdoor_temperature',
    'max_outdoor_temperature',
    'extreme_outdoor_temperature',
    'avg_indoor_temperature',
    'avg_indoor_humidity'
  ].forEach(function(series_code) {
    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false
    };
  });

  var buckets = this.get_buckets_();

  if (buckets === null) {
    return data;
  }

  var begin_m;
  if (beestat.setting('runtime_thermostat_summary_time_period') === 'all') {
    begin_m = moment(beestat.cache.thermostat[this.thermostat_id_].sync_begin);
  } else {
    var time_periods = [
      'day',
      'week',
      'month',
      'year'
    ];

    /**
     * See #145. This makes the date range more intuitive when the group by
     * duration is less than the time period you select.
     */
    var subtract;
    if (
      time_periods.indexOf(beestat.setting('runtime_thermostat_summary_group_by')) <
      time_periods.indexOf(beestat.setting('runtime_thermostat_summary_time_period'))
    ) {
      subtract = 0;
    } else {
      subtract = 1;
    }

    begin_m = moment()
      .subtract(
        (beestat.setting('runtime_thermostat_summary_time_count') - subtract),
        beestat.setting('runtime_thermostat_summary_time_period')
      )
      .startOf(
        beestat.setting('runtime_thermostat_summary_group_by') === 'week'
          ? 'isoweek'
          : beestat.setting('runtime_thermostat_summary_group_by')
      );
  }

  // Make sure the current month, etc gets included (see #159).
  var end_m = moment()
    .endOf(
      beestat.setting('runtime_thermostat_summary_group_by') === 'week'
        ? 'isoweek'
        : beestat.setting('runtime_thermostat_summary_group_by')
    );

  var current_m = begin_m;
  while (current_m.isSameOrAfter(end_m) === false) {
    var next_m = current_m
      .clone()
      .add(1, beestat.setting('runtime_thermostat_summary_group_by'));

    var bucket_key = this.get_bucket_key_(
      current_m,
      beestat.setting('runtime_thermostat_summary_group_by')
    );

    var bucket = buckets[bucket_key];

    if (bucket !== undefined) {
      data.x.push(current_m.clone());

      for (var key in data.series) {
        if (key === 'extreme_outdoor_temperature') {
          // Outdoor temperature extremes
          if (
            bucket !== undefined &&
            bucket.min_outdoor_temperature !== null &&
            bucket.max_outdoor_temperature !== null
          ) {
            data.series.extreme_outdoor_temperature.push([
              current_m.clone(),
              bucket.min_outdoor_temperature,
              bucket.max_outdoor_temperature
            ]);
            data.metadata.series[key].active = true;
          } else {
            data.series.extreme_outdoor_temperature.push(null);
          }
        } else {
          var value = (bucket !== undefined) ? bucket[key] : null;

          /*
           * If Gap Fill is on, and it's a gap fillable value, and it's not the
           * last bucket, gap fill it.
           */
          if (
            beestat.setting('runtime_thermostat_summary_gap_fill') === true &&
            key.substring(0, 3) === 'sum' &&
            next_m.isSameOrAfter(end_m) === false
          ) {
            value = this.gap_fill_(
              value,
              bucket.count,
              beestat.setting('runtime_thermostat_summary_group_by'),
              bucket_key
            );
          }

          data.series[key].push(value);

          var this_active = key.includes('temperature') ? true : (value > 0);
          data.metadata.series[key].active = data.metadata.series[key].active || this_active;
        }
      }
    }

    current_m.add(1, beestat.setting('runtime_thermostat_summary_group_by'));
  }

  return data;
};

/**
 * Just calls a couple of helper functions to get the buckets.
 *
 * @return {object} The buckets.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_buckets_ = function() {
  if (beestat.cache.runtime_thermostat_summary.length === 0) {
    return null;
  }

  return this.get_buckets_combined_(this.get_buckets_group_());
};

/**
 * Combine all the runtime_thermostat_summary rows into one row per
 * day/week/month/year. Each bucket key has an array of values, not a sum,
 * average, etc.
 *
 * @return {object} The buckets.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_buckets_group_ = function() {
  var buckets = {};

  for (var runtime_thermostat_summary_id in beestat.cache.runtime_thermostat_summary) {
    var runtime_thermostat_summary = beestat.cache.runtime_thermostat_summary[
      runtime_thermostat_summary_id
    ];
    if (runtime_thermostat_summary.thermostat_id === this.thermostat_id_) {
      var bucket_key = this.get_bucket_key_(
        moment.utc(runtime_thermostat_summary.date),
        beestat.setting('runtime_thermostat_summary_group_by')
      );

      if (buckets[bucket_key] === undefined) {
        buckets[bucket_key] = {
          'count': [],
          'sum_compressor_cool_1': [],
          'sum_compressor_cool_2': [],
          'sum_compressor_heat_1': [],
          'sum_compressor_heat_2': [],
          'sum_auxiliary_heat_1': [],
          'sum_auxiliary_heat_2': [],
          'sum_fan': [],
          'sum_humidifier': [],
          'sum_dehumidifier': [],
          'sum_ventilator': [],
          'sum_economizer': [],
          'avg_outdoor_temperature': [],
          'avg_outdoor_humidity': [],
          'min_outdoor_temperature': [],
          'max_outdoor_temperature': [],
          'avg_indoor_temperature': [],
          'avg_indoor_humidity': []
        };
      }

      for (var key in buckets[bucket_key]) {
        buckets[bucket_key][key].push(runtime_thermostat_summary[key]);
      }
    }
  }

  return buckets;
};

/**
 * Get the key for a bucket from a date and a grouping.
 *
 * @param {moment} date_m
 * @param {string} group_by day|week|month|year
 *
 * @return {string} The bucket key.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_bucket_key_ = function(date_m, group_by) {
  var bucket_key;

  switch (group_by) {
  case 'day':
    bucket_key = date_m.format('YYYY-DDDD');
    break;
  case 'week':
    bucket_key = date_m.format('YYYY-WW');
    break;
  case 'month':
    bucket_key = date_m.format('YYYY-MM');
    break;
  case 'year':
    bucket_key = date_m.format('YYYY');
    break;
  }

  return bucket_key;
};

/**
 * Combine the individual array values in each bucket key by getting the sum,
 * average, min, max, etc.
 *
 * @param {object} buckets The buckets.
 *
 * @return {object} The combined buckets.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_buckets_combined_ = function(buckets) {
  for (var bucket_key in buckets) {
    var bucket = buckets[bucket_key];

    bucket.count = bucket.count.reduce(function(accumulator, current_value) {
      return accumulator + current_value;
    }, 0);

    for (var key in buckets[bucket_key]) {
      switch (key.substring(0, 3)) {
      case 'avg':
        var sum = bucket[key].reduce(function(accumulator, current_value) {
          return accumulator + current_value;
        }, 0);

        bucket[key] = sum / bucket[key].length;

        if (key.substring(key.length - 11) === 'temperature') {
          bucket[key] = beestat.temperature(bucket[key]);
        }

        bucket[key] = Math.round(bucket[key]);
        break;
      case 'min':
        bucket[key] = Math.min.apply(null, bucket[key]);
        if (key.substring(key.length - 11) === 'temperature') {
          bucket[key] = beestat.temperature(bucket[key]);
        }
        break;
      case 'max':
        bucket[key] = Math.max.apply(null, bucket[key]);
        if (key.substring(key.length - 11) === 'temperature') {
          bucket[key] = beestat.temperature(bucket[key]);
        }
        break;
      case 'sum':
        bucket[key] = bucket[key].reduce(function(accumulator, current_value) {
          return accumulator + current_value;
        }, 0);

        /*
         * This is a really good spot for Gap Fill to happen but it doesn't work
         * here because there's no order to the buckets so I can't ignore the
         * last bucket.
         */

        // Convert seconds to hours.
        bucket[key] /= 3600;
        break;
      }
    }
  }

  return buckets;
};

/**
 * Try to account for missing data based on how much is missing from the series.
 *
 * @param {number} value The sum to gap fill.
 * @param {number} count The number of values in the sum.
 * @param {string} group_by How the data is grouped.
 * @param {string} bucket_key Which group this is in.
 *
 * @return {number} The gap filled sum.
 */
beestat.component.card.runtime_thermostat_summary.prototype.gap_fill_ = function(value, count, group_by, bucket_key) {
  var adjustment_factor;
  var year;
  var month;
  switch (group_by) {
  case 'year':
    year = bucket_key;
    var is_leap_year = moment(year, 'YYYY').isLeapYear();
    var days_in_year = is_leap_year === true ? 366 : 365;
    adjustment_factor = days_in_year * 288;
    break;
  case 'month':
    year = bucket_key.substring(0, 4);
    month = bucket_key.substring(5, 7);
    var days_in_month = moment(year + '-' + month, 'YYYY-MM').daysInMonth();
    adjustment_factor = days_in_month * 288;
    break;
  case 'week':
    adjustment_factor = 2016;
    break;
  case 'day':
    adjustment_factor = 288;
    break;
  }

  return value * adjustment_factor / count;
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_title_ = function() {
  return 'Thermostat Summary';
};

/**
 * Decorate the menu
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.runtime_thermostat_summary.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  if (beestat.thermostat.get_sync_progress(this.thermostat_id_) !== null) {
    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Past 3 Months')
      .set_icon('calendar_range')
      .set_callback(function() {
        if (
          beestat.setting('runtime_thermostat_summary_time_count') !== 3 ||
          beestat.setting('runtime_thermostat_summary_time_period') !== 'month' ||
          beestat.setting('runtime_thermostat_summary_group_by') !== 'day'
        ) {
          beestat.setting({
            'runtime_thermostat_summary_time_count': 3,
            'runtime_thermostat_summary_time_period': 'month',
            'runtime_thermostat_summary_group_by': 'day'
          });
        }
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Past 12 Months')
      .set_icon('calendar_range')
      .set_callback(function() {
        if (
          beestat.setting('runtime_thermostat_summary_time_count') !== 12 ||
          beestat.setting('runtime_thermostat_summary_time_period') !== 'month' ||
          beestat.setting('runtime_thermostat_summary_group_by') !== 'week'
        ) {
          beestat.setting({
            'runtime_thermostat_summary_time_count': 12,
            'runtime_thermostat_summary_time_period': 'month',
            'runtime_thermostat_summary_group_by': 'week'
          });
        }
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('All Time')
      .set_icon('calendar_range')
      .set_callback(function() {
        if (
          beestat.setting('runtime_thermostat_summary_time_count') !== 0 ||
          beestat.setting('runtime_thermostat_summary_time_period') !== 'all' ||
          beestat.setting('runtime_thermostat_summary_group_by') !== 'month'
        ) {
          beestat.setting({
            'runtime_thermostat_summary_time_count': 0,
            'runtime_thermostat_summary_time_period': 'all',
            'runtime_thermostat_summary_group_by': 'month'
          });
        }
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Custom')
      .set_icon('calendar_edit')
      .set_callback(function() {
        (new beestat.component.modal.runtime_thermostat_summary_custom()).render();
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Download Chart')
      .set_icon('download')
      .set_callback(function() {
        self.chart_.export();
      }));

    menu.add_menu_item(new beestat.component.menu_item()
      .set_text('Reset Zoom')
      .set_icon('magnify_close')
      .set_callback(function() {
        self.chart_.reset_zoom();
      }));
  }

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/3225b739ebbc42d68a18260565fda4f1');
    }));
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.runtime_thermostat_summary.prototype.get_subtitle_ = function() {
  var s = (beestat.setting('runtime_thermostat_summary_time_count') > 1) ? 's' : '';

  var string = '';

  if (beestat.setting('runtime_thermostat_summary_time_period') === 'all') {
    string = 'All time';
  } else {
    string = 'Past ' +
      beestat.setting('runtime_thermostat_summary_time_count') +
      ' ' +
      beestat.setting('runtime_thermostat_summary_time_period') +
      s;
  }

  string += ', ' +
    ' grouped by ' +
    beestat.setting('runtime_thermostat_summary_group_by');

  const gap_fill_string =
    beestat.setting('runtime_thermostat_summary_gap_fill') === true ? 'On' : 'Off';

  const smart_scale_string =
    beestat.setting('runtime_thermostat_summary_smart_scale') === true ? 'On' : 'Off';

  string += ' (Gap Fill: ' + gap_fill_string + ', Smart Scale: ' + smart_scale_string + ')';

  return string;
};
