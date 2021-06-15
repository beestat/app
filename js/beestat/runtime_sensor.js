beestat.runtime_sensor = {};

/**
 * Get a bunch of data for the current runtime_sensor rows. Includes basically
 * everything you need to make a cool chart.
 *
 * @param {number} thermostat_id The thermostat_id to get data for.
 * @param {object} range Range settings.
 *
 * @return {object} The data.
 */
beestat.runtime_sensor.get_data = function(thermostat_id, range) {
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

  // Duration objects. These are passed by reference into the metadata.
  var durations = {};

  var series_codes = [];

  // Get and sort all the sensors.
  var sensors = beestat.sensor.get_sorted();
  data.metadata.sensors = sensors;

  // Set up the series_codes.
  sensors.forEach(function(sensor) {
    if (sensor.thermostat_id === thermostat_id) {
      series_codes.push('temperature_' + sensor.sensor_id);
      series_codes.push('occupancy_' + sensor.sensor_id);
    }
  });

  series_codes.push('dummy');

  // Initialize a bunch of stuff.
  var sequential = {};
  series_codes.forEach(function(series_code) {
    sequential[series_code] = 0;

    data.series[series_code] = [];
    data.metadata.series[series_code] = {
      'active': false,
      'durations': {},
      'data': {}
    };
    if (series_code === 'dummy') {
      data.metadata.series[series_code].name = null;
    } else {
      var sensor_id = series_code.replace(/[^0-9]/g, '');
      data.metadata.series[series_code].name = beestat.cache.sensor[sensor_id].name;
    }

    durations[series_code] = {'seconds': 0};
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

  var runtime_sensors = beestat.runtime_sensor.get_runtime_sensors_by_date_();

  // Loop.
  var current_m = begin_m;
  while (current_m.isSameOrAfter(end_m) === false) {
    data.x.push(current_m.clone());

    // Without this series the chart will jump to the nearest value if there is a chunk of missing data.
    data.series.dummy.push(beestat.temperature(70));
    data.metadata.series.dummy.active = true;

    if (runtime_sensors[current_m.valueOf()] !== undefined) {
      sensors.forEach(function(sensor, j) {
        var runtime_sensor = runtime_sensors[current_m.valueOf()][sensor.sensor_id];
        if (runtime_sensor === undefined) {
          data.series['temperature_' + sensor.sensor_id].push(null);
          data.series['occupancy_' + sensor.sensor_id].push(null);
          return;
        }

        var temperature = beestat.temperature(runtime_sensor.temperature);
        data.series['temperature_' + runtime_sensor.sensor_id].push(temperature);
        data.metadata.series['temperature_' + runtime_sensor.sensor_id].active = true;
        data.metadata.series['temperature_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = temperature;

        if (runtime_sensor.occupancy === true) {
          let swimlane_properties =
            beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties(
              sensors.length,
              j
            );

          sequential['occupancy_' + runtime_sensor.sensor_id]++;
          data.series['occupancy_' + runtime_sensor.sensor_id].push(swimlane_properties.y);
          data.metadata.series['occupancy_' + runtime_sensor.sensor_id].data[current_m.valueOf()] = swimlane_properties.y;
        } else {
          if (sequential['occupancy_' + runtime_sensor.sensor_id] > 0) {
            let swimlane_properties =
              beestat.component.chart.runtime_sensor_detail_occupancy.get_swimlane_properties(
                sensors.length,
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
      sensors.forEach(function(sensor) {
        if (sensor.thermostat_id === thermostat_id) {
          data.series['temperature_' + sensor.sensor_id].push(null);
          data.series['occupancy_' + sensor.sensor_id].push(null);
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
 * @return {array} The runtime_sensor rows.
 */
beestat.runtime_sensor.get_runtime_sensors_by_date_ = function() {
  var runtime_sensors = {};
  if (beestat.cache.runtime_sensor !== undefined) {
    beestat.cache.runtime_sensor.forEach(function(runtime_sensor) {
      var timestamp = [moment(runtime_sensor.timestamp).valueOf()];
      if (runtime_sensors[timestamp] === undefined) {
        runtime_sensors[timestamp] = {};
      }
      runtime_sensors[timestamp][runtime_sensor.sensor_id] = runtime_sensor;
    });
  }
  return runtime_sensors;
};
