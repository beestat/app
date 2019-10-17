/**
 * Loading thing.
 *
 * @param {string} text Optional text to display with the loading thing.
 */
beestat.component.loading = function(text) {
  this.text_ = text;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.loading, beestat.component);

beestat.component.loading.prototype.rerender_on_breakpoint_ = false;

beestat.component.loading.prototype.decorate_ = function(parent) {
  if (this.text_ !== undefined) {
    this.text_block_ = $.createElement('div')
      .style({
        'margin-bottom': beestat.style.size.gutter,
        'color': beestat.style.color.yellow.base,
        'font-weight': beestat.style.font_weight.bold
      })
      .innerHTML(this.text_);

    parent.appendChild(this.text_block_);
  }

  var loading_wrapper = $.createElement('div').addClass('loading_wrapper');
  parent.appendChild(loading_wrapper);

  loading_wrapper.appendChild($.createElement('div').addClass('loading_1'));
  loading_wrapper.appendChild($.createElement('div').addClass('loading_2'));
};

/**
 * Set the text of the loading container. If you call this after it's rendered
 * it will change the existing text. It will not add text to a loader that was
 * rendered without text, though.
 *
 * @param {string} text
 */
beestat.component.loading.prototype.set_text = function(text) {
  this.text_ = text;
  this.text_block_.innerHTML(this.text_);
};
