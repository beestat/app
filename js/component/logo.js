/**
 * Beestat two-color text logo.
 */
beestat.component.logo = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.logo, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.logo.prototype.decorate_ = function(parent) {
  var logo = $.createElement('div');
  logo.style({
    'font-weight': beestat.style.font_weight.light,
    'font-size': '40px',
    'font-family': 'Montserrat'
  });

  var bee = $.createElement('span');
  bee.innerHTML('bee');
  bee.style('color', beestat.style.color.yellow.light);

  var stat = $.createElement('span');
  stat.innerHTML('stat');
  stat.style('color', beestat.style.color.green.light);

  logo.appendChild(bee);
  logo.appendChild(stat);

  parent.appendChild(logo);
};
