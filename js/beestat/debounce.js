/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered.
 *
 * @param {Function} func The function to call.
 * @param {number} wait The function will be called after it stops being
 * called for N milliseconds.
 * @param {boolean} immediate Trigger the function on the leading edge,
 * instead of the trailing.
 *
 * @link https://davidwalsh.name/javascript-debounce-function
 *
 * @return {Function} The debounced function.
 */
beestat.debounce = function(func, wait, immediate) {
  var timeout;
  return function() {
    var self = this;
    var args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(self, args);
      }
    };
    var callNow = immediate && !timeout;
    window.clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    if (callNow) {
      func.apply(self, args);
    }
  };
};
