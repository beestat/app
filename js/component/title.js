/**
 * Simple bolded title text with a margin.
 *
 * @param {string} title The title.
 */
beestat.component.title = function(title) {
  this.title_ = title;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.title, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.title.prototype.decorate_ = function(parent) {
  var title = $.createElement('div')
    .style({
      'font-size': beestat.style.font_size.normal,
      'font-weight': beestat.style.font_weight.bold,
      'margin-bottom': (beestat.style.size.gutter / 2)
    })
    .innerText(this.title_);
  parent.appendChild(title);
};
