/**
 * Change floor plan
 */
beestat.component.modal.change_floor_plan = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.change_floor_plan, beestat.component.modal);

beestat.component.modal.change_floor_plan.prototype.decorate_contents_ = function(parent) {
  var self = this;

  var container = $.createElement('div')
    .style({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
      'margin': '0 0 16px -16px'
    });
  parent.appendChild(container);

  var sorted_floor_plans = $.values(beestat.cache.floor_plan)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  sorted_floor_plans.forEach(function(floor_plan) {
    var div = $.createElement('div')
      .style({
        'padding': '16px 0 0 16px'
      });
    container.appendChild(div);

    self.decorate_floor_plan_(div, floor_plan.floor_plan_id);
  });
};

/**
 * Decorate the floor plan.
 *
 * @param {rocket.Elements} parent
 * @param {number} floor_plan_id
 */
beestat.component.modal.change_floor_plan.prototype.decorate_floor_plan_ = function(parent, floor_plan_id) {
  const self = this;

  var floor_plan = beestat.cache.floor_plan[floor_plan_id];

  var container_height = 60;
  var gutter = beestat.style.size.gutter / 2;
  var floor_plan_height = container_height - (gutter * 2);

  var container = $.createElement('div')
    .style({
      'height': container_height,
      'border-radius': container_height,
      'padding-right': (beestat.style.size.gutter / 2),
      'transition': 'background 200ms ease',
      'user-select': 'none'
    });

  if (floor_plan_id == beestat.cache.floor_plan[beestat.setting('floor_plan_id')].floor_plan_id) {
    container.style({
      'background': '#4b6584',
      'color': '#fff'
    });
  } else {
    container.style({
      'cursor': 'pointer'
    });

    container
      .addEventListener('mouseover', function() {
        container.style('background', beestat.style.color.gray.base);
      })
      .addEventListener('mouseout', function() {
        container.style('background', '');
      })
      .addEventListener('click', function() {
        container.removeEventListener();
        self.dispose();
        beestat.setting('floor_plan_id', floor_plan_id);
      });
  }

  parent.appendChild(container);

  var left = $.createElement('div')
    .style({
      'background': beestat.style.color.bluegray.dark,
      'font-weight': beestat.style.font_weight.light,
      'border-radius': '50%',
      'width': floor_plan_height,
      'height': floor_plan_height,
      'line-height': floor_plan_height,
      'color': '#fff',
      'font-size': '20px',
      'text-align': 'center',
      'float': 'left',
      'margin': gutter
    })
    .innerHTML('');
  container.appendChild(left);

  var right = $.createElement('div')
    .style({
      'line-height': container_height,
      'font-weight': beestat.style.font_weight.bold,
      'white-space': 'nowrap',
      'overflow': 'hidden',
      'text-overflow': 'ellipsis'
    })
    .innerHTML(floor_plan.name);
  container.appendChild(right);
};

/**
 * Get title.
 *
 * @return {string} Title.
 */
beestat.component.modal.change_floor_plan.prototype.get_title_ = function() {
  return 'Change Floor Plan';
};
