/**
 * Logo
 *
 * @param {number} height The height of the logo
 */
beestat.component.logo = function(height) {
  this.height_ = height || 48;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.logo, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.logo.prototype.decorate_ = function(parent) {
  const logo = $.createElement('img')
    .setAttribute('src', 'img/logo.png')
    .style({
      'height': this.height_ + 'px'
    });
  parent.appendChild(logo);
};
