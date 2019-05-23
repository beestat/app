/**
 * Resist score card.
 */
beestat.component.card.score.resist = function() {
  this.type_ = 'resist';
  beestat.component.card.score.apply(this, arguments);
};
beestat.extend(beestat.component.card.score.resist, beestat.component.card.score);

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.score.resist.prototype.get_title_ = function() {
  return 'Resist Score';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The title of the card.
 */
/*
 * beestat.component.card.score.resist.prototype.get_subtitle_ = function() {
 * return '#hype';
 * };
 */
