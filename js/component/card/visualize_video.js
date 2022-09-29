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
  const container = document.createElement('div');
  /**
   * The 16:9 aspect ratio corresponds to a height that is 56.25% of the width.
   * https://www.ankursheel.com/blog/full-width-you-tube-video-embed
   */
  Object.assign(container.style, {
    'position': 'relative',
    'padding-bottom': '56.25%',
    'height': '0'
  });
  parent.appendChild(container);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    'position': 'absolute',
    'top': '0',
    'left': '0',
    'width': '100%',
    'height': '100%'
  });
  iframe.setAttribute('src', 'https://player.vimeo.com/video/751478276?h=584bebb57b');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', 'allowfullscreen');
  container.appendChild(iframe);
};
