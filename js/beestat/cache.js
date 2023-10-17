beestat.cache = {
  'data': {}
};

/**
 * Overwrite a cache key with new data. Dispatches an event when done.
 *
 * @param {string} key The cache key to update.
 * @param {object} value The data to be placed in that key.
 * @param {boolean} dispatch Whether or not to dispatch the event. Default
 * true.
 */
beestat.cache.set = function(key, value, dispatch) {
  if (key.substring(0, 5) === 'data.') {
    beestat.cache.data[key.substring(5)] = value;
  } else {
    beestat.cache[key] = value;
  }

  if (dispatch !== false) {
    beestat.dispatcher.dispatchEvent('cache.' + key);
  }
};

/**
 * Delete data from the cache. Dispatches an event when done.
 *
 * @param {string} key The cache key to delete.
 * @param {boolean} dispatch Whether or not to dispatch the event. Default
 * true.
 */
beestat.cache.delete = function(key, dispatch) {
  if (key.substring(0, 5) === 'data.') {
    delete beestat.cache.data[key.substring(5)];
  } else {
    delete beestat.cache[key];
  }

  if (dispatch !== false) {
    beestat.dispatcher.dispatchEvent('cache.' + key);
  }
};
