/**
 * Error modal.
 */
beestat.component.modal.error = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.error, beestat.component.modal);

beestat.component.modal.error.prototype.decorate_contents_ = function(parent) {
  parent.appendChild($.createElement('p').innerHTML(this.message_));

  if (this.detail_ !== undefined) {
    parent.appendChild($.createElement('p').innerHTML('Sorry about that! This error has been logged and will be investigated and appropriately punished. Please reach out to contact@beestat.io if it persists.'));
    parent.appendChild($.createElement('p')
      .style({
        'padding': beestat.style.size.gutter / 2,
        'background': beestat.style.color.bluegray.dark,
        'color': beestat.style.color.gray.light,
        'font-family': 'Courier New, Monospace',
        'max-height': '200px',
        'overflow-y': 'auto',
        'font-size': beestat.style.font_size.normal,
        'white-space': 'pre'
      })
      .innerHTML(this.detail_));
  }
};

beestat.component.modal.error.prototype.set_message = function(message) {
  this.message_ = message;
};

beestat.component.modal.error.prototype.set_detail = function(detail) {
  this.detail_ = detail;
};

beestat.component.modal.error.prototype.get_title_ = function() {
  var titles = [
    'Looks like you broke it again.',
    'Yep, it\'s broken.',
    'Something went wrong.',
    'You have died of dysentery.',
    'What a happy accident.',
    'Witty title for an error.',
    'Greedo shot first!',
    'We can\'t all be winners.',
    'Don\'t panic!',
    'Hello. It\'s me.',
    '¯\\_(ツ)_/¯'
  ];

  return titles[Math.floor(Math.random() * titles.length)];
};
