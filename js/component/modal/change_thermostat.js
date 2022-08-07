/**
 * Change thermostat
 */
beestat.component.modal.change_thermostat = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.change_thermostat, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.change_thermostat.prototype.decorate_contents_ = function(parent) {
  const p = document.createElement('p');
  p.innerText = 'You have multiple thermostats; which one would you like to view?';
  parent.appendChild(p);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
  grid.style.columnGap = beestat.style.size.gutter + 'px';
  grid.style.rowGap = beestat.style.size.gutter + 'px';
  parent.appendChild(grid);

  var sorted_thermostats = $.values(beestat.cache.thermostat)
    .sort(function(a, b) {
      return a.name > b.name;
    });

  let div;
  sorted_thermostats.forEach(function(thermostat) {
    div = document.createElement('div');
    grid.appendChild(div);

    const tile = new beestat.component.tile.thermostat(thermostat.thermostat_id)
      .set_text_color('#fff')
      .set_display('block');

    if (thermostat.thermostat_id === beestat.setting('thermostat_id')) {
      tile.set_background_color(beestat.style.color.lightblue.base);
    } else {
      tile
        .set_background_color(beestat.style.color.bluegray.base)
        .set_background_hover_color(beestat.style.color.lightblue.base)
        .addEventListener('click', function() {
          beestat.setting('thermostat_id', thermostat.thermostat_id, function() {
            window.location.reload();
          });
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
beestat.component.modal.change_thermostat.prototype.get_title_ = function() {
  return 'Change Thermostat';
};
