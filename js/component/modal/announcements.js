/**
 * Announcements
 */
beestat.component.modal.announcements = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.announcements, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.announcements.prototype.decorate_contents_ = function(parent) {
  var announcements = $.values(beestat.cache.announcement).reverse();

  if (announcements.length === 0) {
    parent.appendChild($.createElement('p').innerText('No recent announcements! :)'));
  } else {
    announcements.forEach(function(announcement) {
      parent.appendChild($.createElement('div').style({
        'border-bottom': '1px solid #eee',
        'margin-left': (beestat.style.size.gutter * -1) + 'px',
        'margin-right': (beestat.style.size.gutter * -1) + 'px',
        'margin-top': (beestat.style.size.gutter) + 'px',
        'margin-bottom': (beestat.style.size.gutter) + 'px'
      }));

      var icon = new beestat.component.icon(announcement.icon)
        .set_text(announcement.title +
          ' • ' +
          moment.utc(announcement.created_at).fromNow());

      icon.render(parent);

      beestat.dispatcher.dispatchEvent('view_announcements');

      parent.appendChild($.createElement('p').innerHTML(announcement.text));
    });

    beestat.setting(
      'last_read_announcement_id',
      announcements[0].announcement_id
    );
  }
};

/**
 * Get the title.
 *
 * @return {string} The title.
 */
beestat.component.modal.announcements.prototype.get_title_ = function() {
  return 'Announcements';
};
