/**
 * Card
 */
beestat.component.card = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.card, beestat.component);

beestat.component.card.prototype.box_shadow_ = true;

/**
 * [get_class_name_recursive_ description]
 *
 * @param {[type]} parent [description]
 * @param {[type]} opt_prefix [description]
 *
 * @return {[type]} [description]
 */
beestat.component.card.prototype.get_class_name_recursive_ = function(parent, opt_prefix) {
  for (var i in parent) {
    if (
      (parent[i]) &&
      (parent[i].prototype) &&
      (this instanceof parent[i])
    ) {
      var name = opt_prefix ? rocket.clone(opt_prefix) : [];
      name.push(i);
      if (parent[i] === this.constructor) {
        return name;
      }
      name = this.get_class_name_recursive_(parent[i], name);
      if (name) {
        return name;
      }
    }
  }
};

beestat.component.card.prototype.decorate_ = function(parent) {
  this.hide_loading_();

  this.parent_ = parent;

  /*
   * Unfortunate but necessary to get the card to fill the height of the flex
   * container. Everything leading up to the card has to be 100% height.
   */
  parent.style('height', '100%');

  this.contents_ = $.createElement('div')
    .style({
      'padding': beestat.style.size.gutter,
      'height': '100%',
      'background': beestat.style.color.bluegray.base,
      'border-radius': beestat.style.size.border_radius
    });

  if (this.box_shadow_ === true) {
    this.contents_.style('box-shadow', '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)');
  }

  parent.appendChild(this.contents_);
  this.decorate_back_(this.contents_);

  var top_right = $.createElement('div').style('float', 'right');
  this.contents_.appendChild(top_right);
  this.decorate_top_right_(top_right);

  this.decorate_title_(this.contents_);
  this.decorate_subtitle_(this.contents_);
  this.decorate_contents_(this.contents_);
};

/**
 * Decorate the title of the card.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.prototype.decorate_title_ = function(parent) {
  var title = this.get_title_();
  var margin_bottom = (this.get_subtitle_() !== null)
    ? (beestat.style.size.gutter / 4)
    : (beestat.style.size.gutter);
  if (title !== null) {
    parent.appendChild($.createElement('div')
      .innerText(title)
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'font-size': beestat.style.font_size.large,
        'margin-bottom': margin_bottom,
        'line-height': '24px',
        'white-space': 'nowrap',
        'overflow': 'hidden',
        'text-overflow': 'ellipsis'
      }));
  }
};

/**
 * Decorate the subtitle of the card.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.prototype.decorate_subtitle_ = function(parent) {
  var subtitle = this.get_subtitle_();
  if (subtitle !== null) {
    parent.appendChild($.createElement('div')
      .innerHTML(subtitle)
      .style({
        'font-weight': beestat.style.font_weight.light,
        'margin-bottom': (beestat.style.size.gutter / 4)
      }));
  }
};

/**
 * Decorate the contents of the card.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.prototype.decorate_contents_ = function(parent) {};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.prototype.decorate_top_right_ = function(parent) {};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.prototype.get_title_ = function() {
  return null;
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.prototype.get_subtitle_ = function() {
  return null;
};

/**
 * Go back. Does the internal stuff then dispatches a back event that can be
 * listened for.
 */
beestat.component.card.prototype.back_ = function() {
  this.hide_back_();
  this.dispatchEvent('back');
};

/**
 * Decorate the back button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.prototype.decorate_back_ = function(parent) {
  var self = this;

  var back_button = $.createElement('div')
    .style({
      'float': 'left',
      'transition': 'width 200ms ease',
      'width': '0',
      'overflow': 'hidden',
      'margin-top': '-2px'
    });
  parent.appendChild(back_button);

  var icon = (new beestat.component.icon('arrow_left'))
    .set_hover_color('#fff')
    .addEventListener('click', function() {
      self.back_();
    });
  icon.render(back_button);

  this.back_button_ = back_button;
};

/**
 * Show the back button.
 */
beestat.component.card.prototype.show_back_ = function() {
  this.back_button_.style({'width': (24 + (beestat.style.size.gutter / 2))});
};

/**
 * Hide the back button.
 */
beestat.component.card.prototype.hide_back_ = function() {
  this.back_button_.style({'width': '0'});
};

beestat.component.card.prototype.show_loading_ = function(text) {
  if (this.loading_mask_ === undefined) {
    this.contents_.style('filter', 'blur(3px)');

    this.loading_mask_ = $.createElement('div');
    this.loading_mask_.style({
      'position': 'absolute',
      'top': 0,
      'left': 0,
      'width': '100%',
      'height': '100%',
      'background': 'rgba(0, 0, 0, 0.4)',
      'display': 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      'text-align': 'center'
    });
    this.parent_.appendChild(this.loading_mask_);

    this.loading_component_ = new beestat.component.loading(text);
    this.loading_component_.render(this.loading_mask_);
  } else {
    this.loading_component_.set_text(text);
  }
};

beestat.component.card.prototype.hide_loading_ = function() {
  if (this.loading_mask_ !== undefined) {
    this.parent_.removeChild(this.loading_mask_);
    this.contents_.style('filter', '');
    delete this.loading_mask_;
    delete this.loading_component_;
  }
};
