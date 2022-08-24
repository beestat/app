/**
 * Change floor plan
 */
beestat.component.modal.change_floor_plan = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.change_floor_plan, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.change_floor_plan.prototype.decorate_contents_ = function(parent) {
  const self = this;

  const p = document.createElement('p');
  p.innerText = 'You have multiple floor plans; which one would you like to view?';
  parent.appendChild(p);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
  grid.style.columnGap = beestat.style.size.gutter + 'px';
  grid.style.rowGap = beestat.style.size.gutter + 'px';
  parent.appendChild(grid);

  var sorted_floor_plans = $.values(beestat.cache.floor_plan)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  let div;
  sorted_floor_plans.forEach(function(floor_plan) {
    div = document.createElement('div');
    grid.appendChild(div);

    const tile = new beestat.component.tile.floor_plan(floor_plan.floor_plan_id)
      .set_text_color('#fff')
      .set_display('block');

    if (floor_plan.floor_plan_id === beestat.setting('visualize.floor_plan_id')) {
      tile.set_background_color(beestat.style.color.lightblue.base);
    } else {
      tile
        .set_background_color(beestat.style.color.bluegray.base)
        .set_background_hover_color(beestat.style.color.lightblue.base)
        .addEventListener('click', function() {
          beestat.setting('visualize.floor_plan_id', floor_plan.floor_plan_id);
          self.dispose();
        });
    }

    tile.render($(div));
  });
};

/**
 * Get title.
 *
 * @return {string} Title.
 */
beestat.component.modal.change_floor_plan.prototype.get_title_ = function() {
  return 'Change Floor Plan';
};

