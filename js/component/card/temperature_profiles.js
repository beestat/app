/**
 * Temperature Profiles.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.temperature_profiles = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    ['cache.thermostat'],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.temperature_profiles, beestat.component.card);

/**
 * Decorate card.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.temperature_profiles.prototype.decorate_contents_ = function(parent) {
  var data = this.get_data_();

  var chart_container = $.createElement('div');
  parent.appendChild(chart_container);

  if (Object.keys(data.series).length === 0) {
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
    no_data.innerHTML('No data to display.<br/><strong><a target="_blank" href="https://www.notion.so/beestat/Temperature-Profiles-9c0fba6793dd4bc68f798c1516f0ea25#a5e176aba4c847acb9e2b773f7aba73b">Why?</a></strong>');
    parent.appendChild(no_data);
  }

  this.chart_ = new beestat.component.chart.temperature_profiles(data);
  this.chart_.render(chart_container);
};

/**
 * Get all of the series data.
 *
 * @return {object} The series data.
 */
beestat.component.card.temperature_profiles.prototype.get_data_ = function() {
  var thermostat = beestat.cache.thermostat[this.thermostat_id_];
  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {
        'title': this.get_title_(),
        'subtitle': this.get_subtitle_(),
        'outdoor_temperature': beestat.temperature({
          'temperature': thermostat.weather.temperature,
          'round': 0
        })
      }
    }
  };

  if (
    thermostat.profile === null
  ) {
    this.show_loading_('Fetching');
    new beestat.api()
      .add_call(
        'thermostat',
        'generate_profile',
        {
          'thermostat_id': this.thermostat_id_
        }
      )
      .add_call(
        'thermostat',
        'read_id',
        {
          'attributes': {
            'inactive': 0
          }
        },
        'thermostat'
      )
      .set_callback(function(response) {
        beestat.cache.set('thermostat', response.thermostat);
      })
      .send();
  } else {
    const profile_extremes = this.get_profile_extremes_(5);

    var y_min = Infinity;
    var y_max = -Infinity;
    for (var type in thermostat.profile.temperature) {
      // Cloned because I mutate this data for temperature conversions.
      var profile = beestat.clone(
        thermostat.profile.temperature[type]
      );

      if (profile !== null) {
        // Convert the data to Celsius if necessary
        var deltas_converted = {};
        for (var key in profile.deltas) {
          deltas_converted[beestat.temperature({'temperature': key})] =
            beestat.temperature({
              'temperature': (profile.deltas[key]),
              'delta': true,
              'round': 3
            });
        }

        profile.deltas = deltas_converted;
        var linear_trendline = this.get_linear_trendline_(profile.deltas);

        var min_max_keys = Object.keys(profile.deltas);

        if (type.includes('heat') === true) {
          min_max_keys.push(beestat.temperature(profile_extremes.heat.min));
          min_max_keys.push(beestat.temperature(profile_extremes.heat.max));
        } else if (type.includes('cool') === true) {
          min_max_keys.push(beestat.temperature(profile_extremes.cool.min));
          min_max_keys.push(beestat.temperature(profile_extremes.cool.max));
        } else if (type.includes('resist') === true) {
          min_max_keys.push(beestat.temperature(profile_extremes.resist.min));
          min_max_keys.push(beestat.temperature(profile_extremes.heat.min));
          min_max_keys.push(beestat.temperature(profile_extremes.resist.max));
          min_max_keys.push(beestat.temperature(profile_extremes.cool.max));
        }
        // Filter out nulls
        min_max_keys = min_max_keys.filter(Boolean);

        // This specific trendline x range.
        var this_x_min = Math.min.apply(null, min_max_keys);
        var this_x_max = Math.max.apply(null, min_max_keys);

        data.series['trendline_' + type] = [];
        data.series['raw_' + type] = [];

        /**
         * Data is stored internally as °F with 1 value per degree. That data
         * gets converted to °C which then requires additional precision
         * (increment).
         *
         * The additional precision introduces floating point error, so
         * convert the x value to a fixed string.
         *
         * The string then needs converted to a number for highcharts, so
         * later on use parseFloat to get back to that.
         *
         * Stupid Celsius.
         */
        var increment;
        var fixed;
        if (beestat.setting('units.temperature') === '°F') {
          increment = 1;
          fixed = 0;
        } else {
          increment = 0.1;
          fixed = 1;
        }
        for (var x = this_x_min; x <= this_x_max; x += increment) {
          var x_fixed = x.toFixed(fixed);
          var y = (linear_trendline.slope * x_fixed) +
            linear_trendline.intercept;

          data.series['trendline_' + type].push([
            parseFloat(x_fixed),
            y
          ]);
          if (profile.deltas[x_fixed] !== undefined) {
            data.series['raw_' + type].push([
              parseFloat(x_fixed),
              profile.deltas[x_fixed]
            ]);

            y_min = Math.min(y_min, profile.deltas[x_fixed]);
            y_max = Math.max(y_max, profile.deltas[x_fixed]);
          }

          data.metadata.chart.y_min = y_min;
          data.metadata.chart.y_max = y_max;
        }
      }
    }
  }

  return data;
};

/**
 * Get a linear trendline from a set of data.
 *
 * IMPORTANT: This exists in the profile already but it's wrong to use it
 * directly as it's not right for Celsius.
 *
 * @param {Object} data The data; at least two points required.
 *
 * @return {Object} The slope and intercept of the trendline.
 */
beestat.component.card.temperature_profiles.prototype.get_linear_trendline_ = function(data) {
  // Requires at least two points.
  if (Object.keys(data).length < 2) {
    return null;
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x_squared = 0;
  var n = 0;

  for (var x in data) {
    x = parseFloat(x);
    var y = parseFloat(data[x]);

    sum_x += x;
    sum_y += y;
    sum_xy += (x * y);
    sum_x_squared += Math.pow(x, 2);
    n++;
  }

  var slope = ((n * sum_xy) - (sum_x * sum_y)) /
    ((n * sum_x_squared) - (Math.pow(sum_x, 2)));
  var intercept = ((sum_y) - (slope * sum_x)) / (n);

  return {
    'slope': slope,
    'intercept': intercept
  };
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.temperature_profiles.prototype.get_title_ = function() {
  return 'Temperature Profiles';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.temperature_profiles.prototype.get_subtitle_ = function() {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  // If the profile has not yet been generated.
  if (thermostat.profile === null) {
    return null;
  }

  const generated_at_m = moment(
    thermostat.profile.metadata.generated_at
  );

  let duration_text = '';

  // How much data was used to generate this.
  const duration_weeks = Math.round(thermostat.profile.metadata.duration / 7);
  duration_text += ' from the past';
  if (duration_weeks === 0) {
    duration_text += ' few days';
  } else if (duration_weeks === 1) {
    duration_text += ' week';
  } else if (duration_weeks >= 52) {
    duration_text += ' year';
  } else {
    duration_text += duration_weeks + ' weeks';
  }
  duration_text += ' of data';

  return 'Generated ' + generated_at_m.format('MMM Do @ h a') + duration_text + ' (updated weekly).';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.temperature_profiles.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Download Chart')
    .set_icon('download')
    .set_callback(function() {
      self.chart_.export();
    }));

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/9c0fba6793dd4bc68f798c1516f0ea25');
    }));
};

/**
 * Get the profile extremes for heat, cool, and resist.
 *
 * @param {number} padding How much extra to pad the extremes by.
 *
 * @return {object}
 */
beestat.component.card.temperature_profiles.prototype.get_profile_extremes_ = function(padding) {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  const extremes = {
    'heat': {
      'min': Infinity,
      'max': -Infinity
    },
    'cool': {
      'min': Infinity,
      'max': -Infinity
    },
    'resist': {
      'min': Infinity,
      'max': -Infinity
    }
  };

  for (let type in thermostat.profile.temperature) {
    const profile = thermostat.profile.temperature[type];

    if (profile !== null) {
      let parent_type;
      if (type.includes('cool')) {
        parent_type = 'cool';
      } else if (type.includes('heat')) {
        parent_type = 'heat';
      } else if (type.includes('resist')) {
        parent_type = 'resist';
      }

      extremes[parent_type].min = Math.min(
        extremes[parent_type].min,
        Math.min.apply(null, Object.keys(profile.deltas)) - padding
      );
      extremes[parent_type].max = Math.max(
        extremes[parent_type].max,
        Math.max.apply(null, Object.keys(profile.deltas)) + padding
      );

      // Extend to weather
      if (
        thermostat.weather !== null &&
        thermostat.weather.temperature !== null
      ) {
        if (
          parent_type === 'resist' ||
          parent_type === 'heat'
        ) {
          extremes[parent_type].min = Math.min(
            extremes[parent_type].min,
            thermostat.weather.temperature - padding
          );
        }
        if (
          parent_type === 'resist' ||
          parent_type === 'cool'
        ) {
          extremes[parent_type].max = Math.max(
            extremes[parent_type].max,
            thermostat.weather.temperature + padding
          );
        }
      }
    }
  }

  // Convert +/-Infinity to null
  for (let parent_type in extremes) {
    if (extremes[parent_type].min === Infinity) {
      extremes[parent_type].min = null;
    }
    if (extremes[parent_type].max === -Infinity) {
      extremes[parent_type].max = null;
    }
  }

  return extremes;
};
