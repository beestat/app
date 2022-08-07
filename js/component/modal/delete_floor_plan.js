/**
 * Delete a floor plan.
 *
 * @param {number} floor_plan_id
 */
beestat.component.modal.delete_floor_plan = function(floor_plan_id) {
  this.floor_plan_id_ = floor_plan_id;

  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.delete_floor_plan, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.delete_floor_plan.prototype.decorate_contents_ = function(parent) {
  parent.appendChild(
    $.createElement('p').innerHTML(
      'Are you sure you want to delete this floor plan?'
    )
  );

  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  floor_plan.data.groups.forEach(function(group) {
    parent.appendChild(
      $.createElement('div')
        .innerHTML(
          group.name + ': ' + group.rooms.length + ' room' + (group.rooms.length === 1 ? '' : 's')
        )
    );
  });
};

/**
 * Get title.
 *
 * @return {string} The title.
 */
beestat.component.modal.delete_floor_plan.prototype.get_title_ = function() {
  return 'Delete Floor Plan';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.delete_floor_plan.prototype.get_buttons_ = function() {
  const self = this;

  const cancel_button = new beestat.component.tile()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.red.base)
    .set_text('Cancel')
    .addEventListener('click', function() {
      self.dispose();
    });

  const delete_button = new beestat.component.tile()
    .set_background_color(beestat.style.color.red.base)
    .set_background_hover_color(beestat.style.color.red.light)
    .set_text_color('#fff')
    .set_text('Delete Floor Plan')
    .addEventListener('click', function() {
      self.dispose();
      new beestat.api()
        .add_call(
          'floor_plan',
          'delete',
          {
            'id': self.floor_plan_id_
          },
          'delete_floor_plan'
        )
        .add_call(
          'floor_plan',
          'read_id',
          {},
          'floor_plan'
        )
        .set_callback(function(response) {
          console.log('deleted fp');
          console.log(response);
          if (Object.keys(response.floor_plan).length > 0) {
            beestat.setting('floor_plan_id', Object.values(response.floor_plan)[0].floor_plan_id);
          } else {
            beestat.setting('floor_plan_id', null);
          }
          beestat.cache.set('floor_plan', response.floor_plan);
        })
        .send();
    });

  return [
    cancel_button,
    delete_button
  ];
};
