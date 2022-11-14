/**
 * Contribute video
 */
beestat.component.modal.contribute_video = function() {
  beestat.component.modal.apply(this, arguments);
};
beestat.extend(beestat.component.modal.contribute_video, beestat.component.modal);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.modal.contribute_video.prototype.decorate_contents_ = function(parent) {
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
  iframe.setAttribute('src', 'https://player.vimeo.com/video/769222247?h=3e6436bc10');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.setAttribute('allowfullscreen', 'allowfullscreen');
  container.appendChild(iframe);
};

/**
 * Get title.
 *
 * @return {string} The title.
 */
beestat.component.modal.contribute_video.prototype.get_title_ = function() {
  return 'I need your help!';
};

/**
 * Get the buttons that go on the bottom of this modal.
 *
 * @return {[beestat.component.button]} The buttons.
 */
beestat.component.modal.contribute_video.prototype.get_buttons_ = function() {
  const give_other = new beestat.component.tile()
    .set_background_color('#fff')
    .set_text_color(beestat.style.color.gray.base)
    .set_text_hover_color(beestat.style.color.green.base)
    .set_shadow(false)
    .set_size('large')
    .set_text('Other ways to give')
    .addEventListener('click', function() {
      (new beestat.layer.contribute()).render();
    });

  const pay_links = {
    'usd': {
      'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
      'live': 'https://donate.stripe.com/7sIcPp4Gt6APais144'
    },
    'cad': {
      'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
      'live': 'https://donate.stripe.com/28obLl4Gte3hfCMdR4'
    },
    'aud': {
      'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
      'live': 'https://donate.stripe.com/dR66r12ylcZd3U4aER'
    },
    'gbp': {
      'dev': 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG',
      'live': 'https://donate.stripe.com/4gwbLl3Cpe3hais3cs'
    }
  };

  const give_one_time = new beestat.component.tile()
    .set_background_color(beestat.style.color.green.base)
    .set_background_hover_color(beestat.style.color.green.light)
    .set_text_color('#fff')
    .set_icon('gift')
    .set_size('large')
    .set_text('Make a One-Time Contribution')
    .addEventListener('click', function() {
      window.open(
        pay_links[beestat.setting('units.currency')][window.environment] +
        '?prefilled_email=' + beestat.user.get().email_address +
        '&client_reference_id=' + beestat.user.get().user_id
      );
    });

  return [
    give_other,
    give_one_time
  ];
};
