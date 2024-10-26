beestat.time_to_detail = {};

/**
 * Get a bunch of data for the current time_to_detail rows. Includes
 * basically everything you need to make a cool chart.
 *
 * @param {number} thermostat_id The thermostat_id to get data for.
 *
 * @return {object} The data.
 */
beestat.time_to_detail.get_data = function(thermostat_id) {
  const thermostat = beestat.cache.thermostat[thermostat_id];
  const operating_mode = beestat.thermostat.get_operating_mode(
    thermostat.thermostat_id
  );
  const linear_trendline = thermostat.profile.temperature[operating_mode].linear_trendline;

  // Convert "heat_1" etc to "heat"
  const simplified_operating_mode = operating_mode.replace(/[_\d]|auxiliary/g, '');

  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {
        'setpoint_reached_m': null
      }
    }
  };

  // Initialize a bunch of stuff.
  [
    'outdoor_temperature',
    'indoor_temperature',
    'indoor_cool_1_delta',
    'indoor_cool_2_delta',
    'indoor_heat_1_delta',
    'indoor_heat_2_delta',
    'indoor_auxiliary_heat_1_delta',
    'indoor_auxiliary_heat_2_delta',
    'setpoint_heat',
    'setpoint_cool'
  ].forEach(function(series_code) {
    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false,
      'data': {}
    };

    if (beestat.series[series_code] !== undefined) {
      data.metadata.series[series_code].name = beestat.series[series_code].name;
    } else {
      data.metadata.series[series_code].name = null;
    }
  });

  // Initialize a bunch of stuff.
  data.metadata.series.outdoor_temperature.active = true;
  data.metadata.series.indoor_temperature.active = true;
  // [
  //   'outdoor_temperature',
  //   'indoor_temperature'
  // ].forEach(function(series_code) {
  //   data.metadata.series[series_code].active = true;
  // });

  begin_m = moment();
  end_m = moment().add(12, 'hour');

  // Loop.
  let current_m = begin_m.clone();
  let current_indoor_temperature = thermostat.temperature;
  let current_outdoor_temperature;
  // let current_indoor_cool_1_delta;
  let current_setpoint_heat;
  let current_setpoint_cool;
  while (
    current_m.isSameOrAfter(end_m) === false
  ) {
    data.x.push(current_m.clone());

    current_outdoor_temperature = beestat.time_to_detail.predict_outdoor_temperature(
      thermostat_id,
      // thermostat.weather.temperature,
      // begin_m,
      current_m
    );
    current_indoor_temperature = beestat.time_to_detail.predict_indoor_temperature(
      thermostat_id,
      current_indoor_temperature,
      current_outdoor_temperature,
      current_m.clone().subtract(1, 'minute'),
      current_m
    );
    // current_indoor_temperature = prediction.indoor_temperature;
    // current_degrees_per_hour = prediction.degrees_per_hour;

    data.series.outdoor_temperature.push(current_outdoor_temperature);
    data.metadata.series.outdoor_temperature.data[current_m.valueOf()] = current_outdoor_temperature;

    data.series.indoor_temperature.push(current_indoor_temperature);
    data.metadata.series.indoor_temperature.data[current_m.valueOf()] = current_indoor_temperature;

    const setpoint = beestat.time_to_detail.get_setpoint(thermostat_id, current_m);
    [
      'cool',
      'heat',
    ].forEach(function(this_operating_mode) {
      if(this_operating_mode === simplified_operating_mode) {
        data.metadata.series[`setpoint_${this_operating_mode}`].active = true;
        data.series[`setpoint_${this_operating_mode}`].push(setpoint[this_operating_mode]);
        data.metadata.series[`setpoint_${this_operating_mode}`].data[current_m.valueOf()] = setpoint[this_operating_mode];
      }
    });

    [
      'cool_1',
      'cool_2',
      'heat_1',
      'heat_2',
      'auxiliary_heat_1',
      'auxiliary_heat_2'
    ].forEach(function(operating_mode) {
      if(
        operating_mode.includes(simplified_operating_mode) === true &&
        thermostat.profile.temperature[operating_mode] !== null
      ) {
        const linear_trendline = thermostat.profile.temperature[operating_mode].linear_trendline;
        const degrees_per_hour = (linear_trendline.slope * current_outdoor_temperature) + linear_trendline.intercept;

        data.metadata.series[`indoor_${operating_mode}_delta`].active = true;
        data.series[`indoor_${operating_mode}_delta`].push(degrees_per_hour);
        data.metadata.series[`indoor_${operating_mode}_delta`].data[current_m.valueOf()] = degrees_per_hour;
      }
    });

    if (
      current_indoor_temperature <= setpoint[simplified_operating_mode] &&
      data.metadata.chart.setpoint_reached_m === null
    ) {
      data.metadata.chart.setpoint_reached_m = current_m.clone();

      // Redefine the end to go 25% further than we have already.
      end_m = begin_m.clone().add((current_m.diff(begin_m, 'minutes') * 1.25), 'minutes');
    }

    current_m.add(1, 'minute');
  }

  return data;
};

/**
 * Predict outdoor temperature using a simple sine wave.
 *
 * @param {number} thermostat_id The thermostat_id
 * @param {moment} current_m Timestamp to predict for
 *
 * @return {number} Predicted outdoor temperature
 */
beestat.time_to_detail.predict_outdoor_temperature = function(thermostat_id, current_m) {
  const thermostat = beestat.cache.thermostat[thermostat_id];

  const t = (current_m.hours() * 60) + current_m.minutes();

  // Period and frequency constants; one day (in minutes)
  const period = 1440;
  const frequency = (2 * Math.PI) / period;

  // Determine the phase shift based on the warmest time of the day.
  const desired_t_max = beestat.time_to_detail.get_extreme_high_time(thermostat_id, current_m);
  const default_t_max = period / 4;
  const phase_shift = desired_t_max - default_t_max;

  // Determine the amplitude and y_offset based on the predicted high and low
  // temps.
  // TODO: the low could actually be wrong if the predicted low isn't actually the low of the entire 24h day
  const temperature_high = thermostat.weather.temperature_high;
  const temperature_low = thermostat.weather.temperature_low;
  const amplitude = (temperature_high - temperature_low) / 2;
  const y_offset = (temperature_high + temperature_low) / 2;

  return amplitude * Math.sin(frequency * (t - phase_shift)) + y_offset;
}

beestat.time_to_detail.get_extreme_high_time = function(thermostat_id, current_m) {
  const count = 30;
  const thermostat = beestat.cache.thermostat[thermostat_id];

  const day_of_year = current_m.dayOfYear(); // 1-indexed
  let extreme_high_times = [];

  // Function to get extreme high time for a given day of year
  const get_extreme_high_time_for_day = function(day_of_year) {
    return thermostat.profile.extreme_times.high[
      ((day_of_year - 1) + 365) % 365
    ];
  };

  // Check from -14 to +7 days
  for (let i = (-count); i <= (count / 2); i++) {
    const target_day_of_year = day_of_year + i;
    const extreme_time = get_extreme_high_time_for_day(target_day_of_year);
    if (extreme_time !== undefined) {
      extreme_high_times.push(extreme_time);
    }
  }

  // Take the last 15 values, or fewer if not enough
  extreme_high_times = extreme_high_times.slice(-count);


  // Convert to minutes
  const extreme_high_minutes = extreme_high_times.map(function(extreme_high_time) {
    const extreme_high_time_m = moment(extreme_high_time, 'HH:mm');
    return extreme_high_time_m.hours() * 60 + extreme_high_time_m.minutes();
  });

  // TODO: Remove outliers here if desired

  const average_extreme_high_minutes = extreme_high_minutes.reduce(
    function(sum, value) {
      return (sum + value);
    },
    0
  ) / extreme_high_times.length;

  return average_extreme_high_minutes;
};


beestat.time_to_detail.predict_indoor_temperature = function(thermostat_id, begin_indoor_temperature, outdoor_temperature, begin_m, current_m) {
  const thermostat = beestat.cache.thermostat[thermostat_id];
  // const operating_mode = beestat.thermostat.get_operating_mode(
  //   thermostat.thermostat_id
  // );
  const operating_mode = 'cool_1';
  const linear_trendline = thermostat.profile.temperature[operating_mode].linear_trendline;
  const degrees_per_hour = (linear_trendline.slope * outdoor_temperature) + linear_trendline.intercept;
  const degrees_per_minute = degrees_per_hour / 60;

  // const prediction = {
  //   'indoor_temperature': begin_indoor_temperature + (degrees_per_minute * current_m.diff(begin_m, 'minutes'))
  // };
  // prediction[`indoor_${operating_mode}_delta`] = degrees_per_hour;

  return begin_indoor_temperature + (degrees_per_minute * current_m.diff(begin_m, 'minutes'));
}

beestat.time_to_detail.get_setpoint = function(thermostat_id, current_m) {
  const thermostat = beestat.cache.thermostat[thermostat_id];

  const climates_by_climate_ref = [];
  thermostat.program.climates.forEach(function(climate) {
    climates_by_climate_ref[climate.climateRef] = climate;
  })

  const ecobee_day = current_m.day();
  const ecobee_half_hour = Math.floor((current_m.hour() * 60 + current_m.minute()) / 30);
  const schedule = thermostat.program.schedule[ecobee_day][ecobee_half_hour];

  return {
    'heat': climates_by_climate_ref[schedule].heatTemp,
    'cool': climates_by_climate_ref[schedule].coolTemp
  };
}
