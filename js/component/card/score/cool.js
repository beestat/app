/**
 * Cool score card.
 */
beestat.component.card.score.cool = function() {
  this.type_ = 'cool';
  beestat.component.card.score.apply(this, arguments);
};
beestat.extend(beestat.component.card.score.cool, beestat.component.card.score);

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.score.cool.prototype.get_title_ = function() {
  return 'Cool Score';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The title of the card.
 */
// beestat.component.card.score.cool.prototype.get_subtitle_ = function() {
  // return '#hype';
// };
