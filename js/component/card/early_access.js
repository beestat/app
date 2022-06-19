/**
 * Early access
 */
beestat.component.card.early_access = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.early_access, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.early_access.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.green.base);
  parent.appendChild($.createElement('p').innerText('Welcome to the early access release for Air Quality in beestat! Please let me know if you have any feedback or issues.'));
};
