beestat.layer = function() {
  this.loaders_ = [];
};

/**
 * The URL of each layer. The new React app is served at these same paths
 * (react/src/utils/appUrl.ts), so switching versions keeps you on the page.
 */
beestat.layer.paths = {
  'detail': '/detail',
  'analyze': '/analyze',
  'visualize': '/visualize',
  'compare': '/compare',
  'air_quality': '/air-quality',
  'settings': '/settings',
  'contribute': '/contribute',
  'glenwood_enroll': '/glenwood',
  'glenwood_report': '/glenwood-report'
};

/**
 * Until the server rewrites clean paths, /index.php/analyze reaches the same
 * page; keep that prefix on generated URLs.
 *
 * @return {string} The path prefix.
 */
beestat.layer.get_path_prefix_ = function() {
  return /^\/index\.php(\/|$)/.test(window.location.pathname) === true ? '/index.php' : '';
};

/**
 * Get the layer for the current URL: the path first, then the older ?layer=
 * query string.
 *
 * @return {string|undefined} The layer name, if the URL names one.
 */
beestat.layer.from_location = function() {
  const from_path = beestat.layer.from_path_();
  if (from_path !== undefined) {
    return from_path;
  }
  const requested = new URLSearchParams(window.location.search).get('layer');
  if (beestat.layer.paths[requested] !== undefined) {
    return requested;
  }
  return undefined;
};

/**
 * Get the layer named by the URL path alone.
 *
 * @return {string|undefined} The layer name, if the path names one.
 */
beestat.layer.from_path_ = function() {
  const path = window.location.pathname
    .replace(/^\/index\.php(?=\/|$)/, '')
    .replace(/\/+$/, '');
  for (let name in beestat.layer.paths) {
    if (beestat.layer.paths[name] === path) {
      return name;
    }
  }
  return undefined;
};

/**
 * Point the address bar at this layer. The first render replaces the entry
 * (e.g. ?layer=analyze becomes /analyze); later navigation adds history.
 */
beestat.layer.prototype.update_location_ = function() {
  if (window.__BEESTAT_REACT_HOST__ === true || window.history.pushState === undefined) {
    return;
  }

  let name;
  for (let key in beestat.layer.paths) {
    if (this.constructor === beestat.layer[key]) {
      name = key;
    }
  }

  // Layers without a URL (loading, no thermostats) and paths that already
  // point here (including / for Detail) are left alone. ?layer= links are
  // rewritten to the path.
  const current = beestat.layer.from_path_();
  const has_layer_query = new URLSearchParams(window.location.search).has('layer');
  if (
    name === undefined ||
    (current === name && has_layer_query === false) ||
    (current === undefined && name === 'detail' && has_layer_query === false)
  ) {
    beestat.layer.location_initialized_ = true;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  params.delete('layer');
  const query = params.toString();
  const url = beestat.layer.get_path_prefix_() + beestat.layer.paths[name] + (query === '' ? '' : '?' + query);

  if (beestat.layer.location_initialized_ === true) {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
  beestat.layer.location_initialized_ = true;
};

// Back and forward render the layer for the restored URL.
if (window.__BEESTAT_REACT_HOST__ !== true) {
  window.addEventListener('popstate', function() {
    if (
      beestat.current_layer === undefined ||
      beestat.cache.thermostat === undefined ||
      Object.keys(beestat.cache.thermostat).length === 0
    ) {
      return;
    }
    const name = beestat.layer.from_location() || 'detail';
    if (beestat.current_layer.constructor !== beestat.layer[name]) {
      (new beestat.layer[name]()).render();
    }
  });
}

/**
 * Render this layer onto the body. First put everything in a container, then
 * clear the body, then append the new container. This prevents the child
 * layers from having to worry about multiple redraws since they aren't doing
 * anything directly on the body.
 */
beestat.layer.prototype.render = function() {
  rocket.EventTarget.removeAllEventListeners();

  beestat.current_layer = this;
  this.update_location_();

  var body = $(document.body);

  var container = $.createElement('div');
  this.decorate_(container);

  this.run_loaders_();

  body.innerHTML('');
  body.appendChild(container);

  beestat.ecobee.notify_if_down();
};

beestat.layer.prototype.decorate_ = function(parent) {
  // Left for the sublcass to implement.
};

/**
 * Register a loader. Components do this. If the same function reference is
 * passed by multiple components, the duplicates will be removed. The loader
 * was added so that I could have multiple cards on the same layer that need
 * the same data. Each card adds a loader and when the layer loads it runs
 * these functions. This way a layer can get the data one time instead of each
 * component firing off a duplicate API call.
 *
 * @param {Function} loader A function to call when all of the components have
 * been added to the layer.
 */
beestat.layer.prototype.register_loader = function(loader) {
  if (this.loaders_.indexOf(loader) === -1) {
    this.loaders_.push(loader);
  }
};

/**
 * Execute all of the loaders. This is run once the decorate function has
 * completed and thus all of the components in the layer have had a chance to
 * add their loaders.
 */
beestat.layer.prototype.run_loaders_ = function() {
  this.loaders_.forEach(function(loader) {
    loader();
  });
};
