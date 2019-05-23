/**
 * Cool score card.
 */
beestat.component.card.score.heat = function() {
  this.type_ = 'heat';
  beestat.component.card.score.apply(this, arguments);
};
beestat.extend(beestat.component.card.score.heat, beestat.component.card.score);

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.score.heat.prototype.get_title_ = function() {
  return 'Heat Score';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The title of the card.
 */
// beestat.component.card.score.heat.prototype.get_subtitle_ = function() {
  // return '#hype';
// };
