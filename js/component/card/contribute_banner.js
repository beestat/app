/**
 * Contribute banner for video announcement.
 */
beestat.component.card.contribute_banner = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.contribute_banner, beestat.component.card);

beestat.component.card.contribute_banner.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.purple.base);

  const container = document.createElement('div');
  Object.assign(container.style, {
    'display': 'flex',
    'align-items': 'center',
    'grid-gap': `${beestat.style.size.gutter}px`
  });

  const left = document.createElement('div');
  Object.assign(left.style, {
    'font-size': beestat.style.font_size.large
  });
  left.innerText = 'Important message from the creator of beestat!';
  container.appendChild(left);

  parent.appendChild(container);

  const center = document.createElement('div');
  Object.assign(center.style, {
    'text-align': 'right',
    'flex-grow': 1,
    'flex-shrink': 0
  });

  const tile_group = new beestat.component.tile_group();

  const watch_tile = new beestat.component.tile()
    .set_icon('play')
    .set_text('Watch Now')
    .set_background_color(beestat.style.color.red.dark)
    .set_background_hover_color(beestat.style.color.red.light);
  watch_tile.addEventListener('click', function() {
    (new beestat.component.modal.contribute_video()).render();
  });
  tile_group.add_tile(watch_tile);

  tile_group.render($(center));

  container.appendChild(center);
};
