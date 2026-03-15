/**
 * Visualize video.
 */
beestat.component.card.visualize_video = function() {
  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.visualize_video, beestat.component.card);

/**
 * Decorate.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.visualize_video.prototype.decorate_ = function(parent) {
  const videos = [
    'https://player.vimeo.com/video/751478276',
    'https://player.vimeo.com/video/1173706545'
  ];

  const videos_container = document.createElement('div');
  Object.assign(videos_container.style, {
    'display': 'flex',
    'flex-wrap': 'wrap',
    'gap': '12px'
  });
  parent.appendChild(videos_container);

  videos.forEach(function(video_src) {
    const container = document.createElement('div');
    Object.assign(container.style, {
      'position': 'relative',
      'flex': '1 1 calc(50% - 6px)',
      'min-width': '320px',
      'aspect-ratio': '16 / 9'
    });
    videos_container.appendChild(container);

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      'width': '100%',
      'height': '100%',
      'border': '0',
      'display': 'block'
    });
    iframe.setAttribute('src', video_src);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');
    container.appendChild(iframe);
  });
};
