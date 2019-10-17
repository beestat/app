/**
 * Performs a deep clone of a simple object.
 *
 * @param {Object} object The object to clone.
 *
 * @return {Object} The cloned object.
 */
beestat.clone = function(object) {
  return JSON.parse(JSON.stringify(object));
};
