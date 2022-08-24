beestat.floor_plan = {};

/**
 * Get the area of an entire floor plan.
 *
 * @param {number} floor_plan_id
 *
 * @return {number} The area of the floor plan in sqft.
 */
beestat.floor_plan.get_area = function(floor_plan_id) {
  const floor_plan = beestat.cache.floor_plan[floor_plan_id];
  let area = 0;

  floor_plan.data.groups.forEach(function(group) {
    area += beestat.floor_plan.get_area_group(group, false);
  });

  return Math.round(area);
};

/**
 * Get the area of a single floor plan group.
 *
 * @param {object} group The group.
 * @param {boolean} round Whether or not to round the result.
 *
 * @return {number} Area of the group in sqft.
 */
beestat.floor_plan.get_area_group = function(group, round = true) {
  let area = 0;

  group.rooms.forEach(function(room) {
    area += beestat.floor_plan.get_area_room(room, false);
  });

  if (round === true) {
    return Math.round(area);
  }

  return area;
};

/**
 * Get the area of a single floor plan room.
 *
 * @param {object} room The room.
 * @param {boolean} round Whether or not to round the result.
 *
 * @return {number} Area of the room in sqft.
 */
beestat.floor_plan.get_area_room = function(room, round = true) {
  let area = Math.abs(ClipperLib.Clipper.Area(room.points) / 144);

  if (round === true) {
    return Math.round(area);
  }

  return area;
};

/**
 * Get the bounding box for an entire floor plan.
 *
 * @param {number} floor_plan_id
 *
 * @return {object}
 */
beestat.floor_plan.get_bounding_box = function(floor_plan_id) {
  const floor_plan = beestat.cache.floor_plan[floor_plan_id];

  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  floor_plan.data.groups.forEach(function(group) {
    const bounding_box = beestat.floor_plan.get_bounding_box_group(group);

    min_x = Math.min(bounding_box.left, min_x);
    max_x = Math.max(bounding_box.right, max_x);
    min_y = Math.min(bounding_box.top, min_y);
    max_y = Math.max(bounding_box.bottom, max_y);
  });

  return {
    'width': max_x - min_x,
    'height': max_y - min_y,
    'left': min_x,
    'top': min_y,
    'right': max_x,
    'bottom': max_y,
    'x': min_x,
    'y': min_y
  };
};

/**
 * Get the bounding box for one group of a floor plan.
 *
 * @param {object} group
 *
 * @return {object}
 */
beestat.floor_plan.get_bounding_box_group = function(group) {
  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  group.rooms.forEach(function(room) {
    const bounding_box = beestat.floor_plan.get_bounding_box_room(room);

    min_x = Math.min(bounding_box.left, min_x);
    max_x = Math.max(bounding_box.right, max_x);
    min_y = Math.min(bounding_box.top, min_y);
    max_y = Math.max(bounding_box.bottom, max_y);
  });

  return {
    'width': max_x - min_x,
    'height': max_y - min_y,
    'left': min_x,
    'top': min_y,
    'right': max_x,
    'bottom': max_y,
    'x': min_x,
    'y': min_y
  };
};

/**
 * Get the bounding box for one room of a floor plan.
 *
 * @param {object} room
 *
 * @return {object}
 */
beestat.floor_plan.get_bounding_box_room = function(room) {
  let min_x = Infinity;
  let max_x = -Infinity;
  let min_y = Infinity;
  let max_y = -Infinity;

  room.points.forEach(function(point) {
    min_x = Math.min(room.x + point.x, min_x);
    max_x = Math.max(room.x + point.x, max_x);
    min_y = Math.min(room.y + point.y, min_y);
    max_y = Math.max(room.y + point.y, max_y);
  });

  return {
    'width': max_x - min_x,
    'height': max_y - min_y,
    'left': min_x,
    'top': min_y,
    'right': max_x,
    'bottom': max_y,
    'x': min_x,
    'y': min_y
  };
};

/**
 * Get an object of all the sensor_ids included in the current floor plan. Key
 * is sensor_id, value is true.
 *
 * @param {number} floor_plan_id
 *
 * @return {object}
 */
beestat.floor_plan.get_sensor_ids_map = function(floor_plan_id) {
  const floor_plan = beestat.cache.floor_plan[floor_plan_id];
  const sensor_ids_map = {};
  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      if (room.sensor_id !== undefined) {
        sensor_ids_map[room.sensor_id] = true;
      }
    });
  });

  return sensor_ids_map;
};
