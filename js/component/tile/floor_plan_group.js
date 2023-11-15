/**
 * A tile representing a floor plan group.
 *
 * @param {object} floor_plan_group
 */
beestat.component.tile.floor_plan_group = function(floor_plan_group) {
  this.floor_plan_group_ = floor_plan_group;

  beestat.component.tile.apply(this, arguments);
};
beestat.extend(beestat.component.tile.floor_plan_group, beestat.component.tile);

/**
 * Get the icon for this tile.
 *
 * @return {string} The icon.
 */
beestat.component.tile.floor_plan_group.prototype.get_icon_ = function() {
  return 'layers';
};

/**
 * Get the text for this tile.
 *
 * @return {string} The first line of text.
 */
beestat.component.tile.floor_plan_group.prototype.get_text_ = function() {
  const line_2_parts = [];
  let room_count = this.floor_plan_group_.rooms.length;
  line_2_parts.push(room_count + (room_count === 1 ? ' Room' : ' Rooms'));
  line_2_parts.push(
    beestat.area({
      'input_area_unit': 'in²',
      'area': beestat.floor_plan.get_area_group(this.floor_plan_group_),
      'round': 0,
      'units': true
    })
  );

  return [
    this.floor_plan_group_.name,
    line_2_parts.join(' • ')
  ];
};

/**
 * Get the size of this tile.
 *
 * @return {string} The size of this tile.
 */
beestat.component.tile.floor_plan_group.prototype.get_size_ = function() {
  return 'large';
};
