/**
 * Modal
 */
beestat.component.modal = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.modal, beestat.component);

beestat.component.modal.prototype.rerender_on_breakpoint_ = false;

beestat.component.modal.prototype.decorate_ = function() {
  var self = this;

  var mask = $.createElement('div')
    .style({
      'position': 'fixed',
      'top': '0',
      'left': '0',
      'width': '100%',
      'height': '100%',
      'vertical-align': 'middle',
      'transition': 'background 200ms ease'
    });
  $('body').appendChild(mask);

  var modal = $.createElement('div');
  beestat.style.set(
    modal,
    {
      'max-width': '700px',
      'padding': beestat.style.size.gutter,
      'position': 'absolute',
      'top': '100px',
      'left': '50%',
      'transform': 'translateX(-50%)',
      'width': '100%',
      'transition': 'transform 200ms ease'
    },
    {
      '(max-width: 900px)': {
        'top': '0px'
      }
    }
  );

  modal.style('transform', 'translateX(-50%) scale(0)');

  mask.appendChild(modal);

  this.modal_content_ = $.createElement('div');
  beestat.style.set(
    this.modal_content_,
    {
      'background': '#fff',
      'padding': beestat.style.size.gutter,
      'color': beestat.style.color.bluegray.dark,
      'max-height': 'calc(100vh - ' + (200 + (beestat.style.size.gutter * 2)) + 'px)',
      'overflow': 'auto',
      'border-radius': beestat.style.size.border_radius,
      'min-height': '200px'
    },
    {
      '(max-width: 900px)': {
        'max-height': 'calc(100vh - ' + (beestat.style.size.gutter * 2) + 'px)',
      }
    }
  );

  modal.appendChild(this.modal_content_);

  this.mask_ = mask;
  this.modal_ = modal;

  /*
   * Blur the body
   * Fade in the mask
   * Overpop the modal
   */
  setTimeout(function() {
    $('body').firstElementChild()
      .style('filter', 'blur(3px)');
    mask.style('background', 'rgba(0, 0, 0, 0.5)');
    modal.style('transform', 'translateX(-50%) scale(1.05)');
  }, 0);

  // Pop the modal back to normal size
  setTimeout(function() {
    modal.style('transform', 'translateX(-50%) scale(1)');
  }, 200);

  // Escape to close
  $(window).addEventListener('keydown.modal', function(e) {
    if (e.which === 27) {
      self.dispose();
    }
  });

  // Click the mask to close
  $(window).addEventListener('click.modal', function(e) {
    if (e.target === mask[0]) {
      self.dispose();
    }
  });

  this.decorate_header_(this.modal_content_);
  this.decorate_contents_(this.modal_content_);
  this.decorate_buttons_(this.modal_content_);
};

/**
 * Close the currently open modal.
 */
/*
 * beestat.component.modal.close = function() {
 *   beestat.component.modal.open_modal.style('transform', 'translateX(-50%) scale(0)');
 *   beestat.component.modal.open_mask.style('background', 'rgba(0, 0, 0, 0)');
 *   $('body').firstElementChild().style('filter', '');
 */

/*
 *   setTimeout(function() {
 *     beestat.component.modal.open_modal.parentNode().removeChild(
 *       beestat.component.modal.open_modal
 *     );
 *     beestat.component.modal.open_mask.parentNode().removeChild(
 *       beestat.component.modal.open_mask
 *     );
 */

/*
 *     delete beestat.component.modal.open_mask;
 *     delete beestat.component.modal.open_modal;
 *   }, 200);
 */

/*
 *   $(window).removeEventListener('keydown.modal');
 *   $(window).removeEventListener('click.modal');
 * };
 */

/**
 * Close the currently open modal.
 */
beestat.component.modal.prototype.dispose = function() {
  var self = this;

  this.modal_.style('transform', 'translateX(-50%) scale(0)');
  this.mask_.style('background', 'rgba(0, 0, 0, 0)');
  $('body').firstElementChild()
    .style('filter', '');

  setTimeout(function() {
    self.modal_.parentNode().removeChild(self.modal_);
    self.mask_.parentNode().removeChild(self.mask_);

    delete self.mask_;
    delete self.modal_;
  }, 200);

  $(window).removeEventListener('keydown.modal');
  $(window).removeEventListener('click.modal');

  this.rendered_ = false;
};

/**
 * Overridden rerender function which just brazenly deletes content and writes
 * it again. RIP event listeners. Had to do this since modal rendering does
 * all the fancy animation and that is not desirable when rerendering.
 */
beestat.component.modal.prototype.rerender = function() {
  if (this.rendered_ === true) {
    this.modal_content_.innerHTML('');
    this.decorate_header_(this.modal_content_);
    this.decorate_contents_(this.modal_content_);
    this.decorate_buttons_(this.modal_content_);
  }
};

/**
 * Decorate the header bar with the title and close icon.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.prototype.decorate_header_ = function(parent) {
  var row = $.createElement('div')
    .style({
      'display': 'flex',
      'align-items': 'center'
    });
  parent.appendChild(row);

  var column_title = $.createElement('div')
    .style({
      'flex': '1'
    });
  row.appendChild(column_title);
  this.decorate_title_(column_title);

  var column_close = $.createElement('div')
    .style({
      'flex': '0 0 50px',
      'text-align': 'right'
    });
  row.appendChild(column_close);
  this.decorate_close_(column_close);
};

/**
 * Decorate the title of the modal.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.prototype.decorate_title_ = function(parent) {
  var title = this.get_title_();
  if (title !== undefined) {
    parent.appendChild($.createElement('div')
      .innerHTML(title)
      .style({
        'font-weight': beestat.style.font_weight.bold,
        'font-size': beestat.style.font_size.extra_large,
        'white-space': 'nowrap',
        'overflow': 'hidden',
        'text-overflow': 'ellipsis'
      }));
  }
};

/**
 * Decorate the close button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.prototype.decorate_close_ = function(parent) {
  var self = this;

  var close = new beestat.component.button()
    .set_type('pill')
    .set_icon('close')
    .set_text_color(beestat.style.color.gray.dark)
    .set_background_hover_color(beestat.style.color.gray.light)
    .addEventListener('click', function() {
      self.dispose();
    });
  close.render(parent);
};

/**
 * Decorate the contents of the modal.
 */
beestat.component.modal.prototype.decorate_contents_ = function() {
  // Stub
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.prototype.get_buttons_ = function() {
  return [];
};

/**
 * Decorate the buttons on the bottom right of the modal.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.prototype.decorate_buttons_ = function(parent) {
  var buttons = this.get_buttons_();
  if (buttons.length > 0) {
    var container = $.createElement('div')
      .style({
        'margin-top': beestat.style.size.gutter,
        'text-align': 'right'
      });
    parent.appendChild(container);

    var button_group = new beestat.component.button_group();
    buttons.forEach(function(button) {
      button_group.add_button(button);
    });
    button_group.render(container);
  }
};

/**
 * Get the title of the modal.
 */
beestat.component.modal.prototype.get_title_ = function() {
  // Stub
};
