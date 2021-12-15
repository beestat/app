/**
 * Detect if the device is touch enabled.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
 * @return {boolean} Whether or not the device is touch enabled.
 */
beestat.touch = function() {
  return true;
  if (beestat.touch_ !== undefined) {
    return beestat.touch_;
  }

  let touch = false;
  if ('maxTouchPoints' in navigator) {
    touch = navigator.maxTouchPoints > 0;
  } else if ('msMaxTouchPoints' in navigator) {
    touch = navigator.msMaxTouchPoints > 0;
  } else {
    var mq = window.matchMedia && matchMedia('(pointer:coarse)');
    if (mq && mq.media === '(pointer:coarse)') {
      touch = Boolean(mq.matches);
    } else if ('orientation' in window) {
      // Deprecated, but good fallback
      touch = true;
    } else {
      // Only as a last resort, fall back to user agent sniffing
      var UA = navigator.userAgent;
      touch = (
        (/\b(BlackBerry|webOS|iPhone|IEMobile)\b/i).test(UA) ||
        (/\b(Android|Windows Phone|iPad|iPod)\b/i).test(UA)
      );
    }
  }

  // Cache result
  beestat.touch_ = touch;
  return beestat.touch_;
};
