/**
 * A group of tiles.
 */
beestat.component.tile_group = function() {
  this.tiles_ = [];
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.tile_group, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.tile_group.prototype.decorate_ = function(parent) {
  const flex = document.createElement('div');
  Object.assign(flex.style, {
    'display': 'inline-flex',
    'flex-wrap': 'wrap',
    'grid-gap': `${beestat.style.size.gutter / 2}px`
  });
  parent.appendChild(flex);

  this.tiles_.forEach(function(tile) {
    tile.render($(flex));
  });
};

/**
 * Add a tile to this group.
 *
 * @param {beestat.component.tile} tile The tile to add.
 */
beestat.component.tile_group.prototype.add_tile = function(tile) {
  this.tiles_.push(tile);
  if (this.rendered_ === true) {
    this.rerender();
  }
};

/**
 * Remove this component from the page. Disposes the tiles first.
 */
beestat.component.tile_group.prototype.dispose = function() {
  this.tiles_.forEach(function(tile) {
    tile.dispose();
  });
  beestat.component.prototype.dispose.apply(this, arguments);
};
