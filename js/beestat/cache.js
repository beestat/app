beestat.cache = {
  'data': {}
};

beestat.cache.set = function(key, value) {
  if (key.substring(0, 5) === 'data.') {
    beestat.cache.data[key.substring(5)] = value;
  } else {
    beestat.cache[key] = value;
  }
  beestat.dispatcher.dispatchEvent('cache.' + key);
};

beestat.cache.delete = function(key) {
  if (key.substring(0, 5) === 'data.') {
    delete beestat.cache.data[key.substring(5)];
  } else {
    delete beestat.cache[key];
  }
  beestat.dispatcher.dispatchEvent('cache.' + key);
};
