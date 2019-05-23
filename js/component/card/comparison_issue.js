/**
 * Possible issue with your comparison.
 */
beestat.component.card.comparison_issue = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.comparison_issue, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.comparison_issue.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.red.dark);
  parent.appendChild($.createElement('p').innerText('Notice how one or more of the lines below slopes down or is very flat? The expectation is that these slope upwards. This may affect the accuracy of your scores.'));
  parent.appendChild($.createElement('p').innerText('I\'ll be investigating these situations and improving the algorithm as much as possible to provide as accurate results as I can. Thank you!'));
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.comparison_issue.prototype.get_title_ = function() {
  return 'Possible issue with your temperature profiles!';
};

