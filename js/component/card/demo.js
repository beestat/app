/**
 * Make sure people know they're in the demo.
 */
beestat.component.card.demo = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.demo, beestat.component.card);

beestat.component.card.demo.prototype.decorate_contents_ = function(parent) {
  parent.style('background', beestat.style.color.lightblue.base);

  parent.appendChild($.createElement('p').innerText('This is a demo of beestat; it works exactly like the real thing. Changes you make will not be saved.'));
};
