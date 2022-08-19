beestat.runtime_sensor = {};

/**
 * Get a bunch of data for the current runtime_sensor rows. Includes basically
 * everything you need to make a cool chart.
 *
 * @param {number} sensor_ids The sensor_ids to get data for.
 * @param {object} range Range settings.
 * @param {string} key The key to pull the data from inside
 * beestat.cache.data. This exists because runtime_sensor data exists in
 * multiple spots.
 *
 * @return {object} The data.
 */
beestat.runtime_sensor.get_data = function(sensor_ids, range, key) {
  var data = {
    'x': [],
    'series': {},
    'metadata': {
      'series': {},
      'chart': {
        'sensors': null
      }
    }
  };

  var colors = [
    beestat.style.color.blue.base,
    beestat.style.color.red.base,
    beestat.style.color.yellow.base,
    beestat.style.color.green.base,
    beestat.style.color.orange.base,
    beestat.style.color.bluegreen.base,
    beestat.style.color.purple.base,
    beestat.style.color.lightblue.base,
    beestat.style.color.blue.light,
    beestat.style.color.red.light,
    beestat.style.color.yellow.light,
    beestat.style.color.green.light,
    beestat.style.color.orange.light,
    beestat.style.color.bluegreen.light,
    beestat.style.color.purple.light,
    beestat.style.color.lightblue.light,
    beestat.style.color.blue.dark,
    beestat.style.color.red.dark,
    beestat.style.color.yellow.dark,
    beestat.style.color.green.dark,
    beestat.style.color.orange.dark,
    beestat.style.color.bluegreen.dark,
    beestat.style.color.purple.dark,
    beestat.style.color.lightblue.dark
  ];

  var series_codes = [];

  // Get and sort all the sensors.
  data.metadata.sensors = [];

  // Set up the series_codes.
  const sensor_series_colors = {};
  sensor_ids.forEach(function(sensor_id, i) {
    const sensor = beestat.cache.sensor[sensor_id];

    series_codes.push('temperature_' + sensor.sensor_id);
    series_codes.push('occupancy_' + sensor.sensor_id);

    sensor_series_colors[sensor.sensor_id] = colors[i];

    if (sensor.type === 'thermostat') {
      series_codes.push('air_quality_' + sensor.sensor_id);
      series_codes.push('voc_concentration_' + sensor.sensor_id);
      series_codes.push('co2_concentration_' + sensor.sensor_id);
    }

    data.metadata.sensors.push(sensor);
  });

  series_codes.push('dummy');

  // Initialize a bunch of stuff.
  var sequential = {};
  series_codes.forEach(function(series_code) {
    sequential[series_code] = 0;

    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false,
      'data': {}
    };
    if (series_code === 'dummy') {
      data.metadata.series[series_code].name = null;
    } else if (series_code.includes('air_quality_') === true) {
      data.metadata.series[series_code].name = 'AQ';
    } else if (series_code.includes('voc_concentration_') === true) {
      data.metadata.series[series_code].name = 'TVOC';
    } else if (series_code.includes('co2_concentration_') === true) {
      data.metadata.series[series_code].name = 'CO2';
    } else {
      var sensor_id = series_code.replace(/[^0-9]/g, '');
      data.metadata.series[series_code].name = beestat.cache.sensor[sensor_id].name;
      data.metadata.series[series_code].color = sensor_series_colors[sensor_id];
    }
  });

  var begin_m;
  var end_m;
  if (range.type === 'dynamic') {
    begin_m = moment().subtract(
      range.dynamic,
      'day'
    );
    end_m = moment();
  } else {
    begin_m = moment(
      range.static_begin + ' 00:00:00'
    );
    end_m = moment(
      range.static_end + ' 23:59:59'
    );
  }

  begin_m
    .minute(Math.ceil(begin_m.minute() / 5) * 5)
    .second(0)
    .millisecond(0);

  var runtime_sensors = beestat.runtime_sensor.get_runtime_sensors_by_date_(key);

  // Loop.
  var current_m = begin_m;
  while (current_m.isSameOrAfter(end_m) === false) {
    data.x.push(current_m.clone());

    // Without this series the chart will jump to the nearest value if there is a chunk of missing data.
    data.series.dummy.push(beestat.temperature(70));
    data.metadata.series.dummy.active = true;

    if (runtime_sensors[current_m.valueOf()] !== undefined) {
      data.metadata.sensors.forEach(function(sensor, j) {
        var runtime_sensor = runtime_sensors[current_m.valueOf()][sensor.sensor_id];
        if (runtime_sensor === undefined) {
          data.series['temperature_' + sensor.sensor_id].push(null);
          data.series['occupancy_' + sensor.sensor_id].push(null);

          if (sensor.type === 'thermostat') {
            data.series['air_quality_' + sensor.sensor_id].push(null);
            data.series['voc_concentration_' + sensor.sensor_id].push(null);
            data.series['co2_concentration_' + sensor.sensor_id].push(null);
          }
          return;
        }

        var temperature = beestat.temperature(runtime_sensor.temperature);
        data.series['temperature_' + runtime_sensor.sensor_id].push(temperature);
        data.metadata.series['temperature_' + runtime_sensor.sensor_id].active = true;
        data.metadata.series['temperature_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = temperature;

        if (sensor.type === 'thermostat') {
          data.series['air_quality_' + runtime_sensor.sensor_id].push(runtime_sensor.air_quality);
          data.metadata.series['air_quality_' + runtime_sensor.sensor_id].active = true;
          data.metadata.series['air_quality_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = runtime_sensor.air_quality;

          data.series['voc_concentration_' + runtime_sensor.sensor_id].push(runtime_sensor.voc_concentration);
          data.metadata.series['voc_concentration_' + runtime_sensor.sensor_id].active = true;
          data.metadata.series['voc_concentration_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = runtime_sensor.voc_concentration;

          data.series['co2_concentration_' + runtime_sensor.sensor_id].push(runtime_sensor.co2_concentration);
          data.metadata.series['co2_concentration_' + runtime_sensor.sensor_id].active = true;
          data.metadata.series['co2_concentration_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = runtime_sensor.co2_concentration;
        }

        if (runtime_sensor.occupancy === true) {
          let swimlane_properties =
            beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties(
              data.metadata.sensors.length,
              j
            );

          sequential['occupancy_' + runtime_sensor.sensor_id]++;
          data.series['occupancy_' + runtime_sensor.sensor_id].push(swimlane_properties.y);
          data.metadata.series['occupancy_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = swimlane_properties.y;
        } else {
          if (sequential['occupancy_' + runtime_sensor.sensor_id] > 0) {
            let swimlane_properties =
              beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties(
                data.metadata.sensors.length,
                j
              );

            data.series['occupancy_' + runtime_sensor.sensor_id].push(swimlane_properties.y);
            data.metadata.series['occupancy_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = swimlane_properties.y;
          } else {
            data.series['occupancy_' + runtime_sensor.sensor_id].push(null);
          }
          sequential['occupancy_' + runtime_sensor.sensor_id] = 0;
        }
      });
    } else {
      data.metadata.sensors.forEach(function(sensor) {
        data.series['temperature_' + sensor.sensor_id].push(null);
        data.series['occupancy_' + sensor.sensor_id].push(null);

        if (sensor.type === 'thermostat') {
          data.series['air_quality_' + sensor.sensor_id].push(null);
          data.series['voc_concentration_' + sensor.sensor_id].push(null);
          data.series['co2_concentration_' + sensor.sensor_id].push(null);
        }
      });
    }

    current_m.add(5, 'minute');
  }

  return data;
};

/**
 * Get all the runtime_sensor rows indexed by date.
 *
 * @param {string} key The key to pull the data from inside
 * beestat.cache.data. This exists because runtime_sensor data exists in
 * multiple spots.
 *
 * @return {array} The runtime_sensor rows.
 */
beestat.runtime_sensor.get_runtime_sensors_by_date_ = function(key) {
  var runtime_sensors = {};
  if (beestat.cache.data[key] !== undefined) {
    beestat.cache.data[key].forEach(function(runtime_sensor) {
      var timestamp = [moment(runtime_sensor.timestamp).valueOf()];
      if (runtime_sensors[timestamp] === undefined) {
        runtime_sensors[timestamp] = {};
      }
      runtime_sensors[timestamp][runtime_sensor.sensor_id] = runtime_sensor;
    });
  }
  return runtime_sensors;
};
