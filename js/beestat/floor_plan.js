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
