/**
 * Notification at the top of the new compare page to help users along with
 * the change.
 */
beestat.component.card.compare_notification = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.compare_notification, beestat.component.card);

beestat.component.card.compare_notification.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.blue.light);

  parent.appendChild($.createElement('p').innerText('The comparisons you\'ve become accustomed to have evolved into a new feature: Metrics! Please be patient over the next few weeks as they are refined.'));

  new beestat.component.button()
    .set_icon('information')
    .set_text('Learn more and discuss this change')
    .set_background_color(beestat.style.color.blue.dark)
    .set_background_hover_color(beestat.style.color.blue.base)
    .addEventListener('click', function() {
      window.open('https://community.beestat.io/t/metrics-are-replacing-scores/347');
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.compare_notification.prototype.get_title_ = function() {
  return 'Things have changed...';
};
