/**
 * A tile representing a floor plan.
 *
 * @param {integer} floor_plan_id
 *
 */
beestat.component.tile.floor_plan = function(floor_plan_id) {
  this.floor_plan_id_ = floor_plan_id;

  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.tile.floor_plan, beestat.component.tile);

/**
 * Get the icon for this tile.
 *
 * @return {string} The icon.
 */
beestat.component.tile.floor_plan.prototype.get_icon_ = function() {
  return 'floor_plan';
};

/**
 * Get the text for this tile.
 *
 * @return {string} The first line of text.
 */
beestat.component.tile.floor_plan.prototype.get_text_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  const line_2_parts = [];
  let floor_count = floor_plan.data.groups.length;
  line_2_parts.push(floor_count + (floor_count === 1 ? ' Floor' : ' Floors'));
  line_2_parts.push(
    beestat.area({
      'area': beestat.floor_plan.get_area(this.floor_plan_id_),
      'round': 0,
      'units': true
    })
  );

  return [
    floor_plan.name,
    line_2_parts.join(' • ')
  ];
};

/**
 * Get the size of this tile.
 *
 * @return {string} The size of this tile.
 */
beestat.component.tile.floor_plan.prototype.get_size_ = function() {
  return 'large';
};
