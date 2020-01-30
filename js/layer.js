beestat.layer = function() {
  this.loaders_ = [];
};

/**
 * Render this layer onto the body. First put everything in a container, then
 * clear the body, then append the new container. This prevents the child
 * layers from having to worry about multiple redraws since they aren't doing
 * anything directly on the body.
 */
beestat.layer.prototype.render = function() {
  rocket.EventTarget.removeAllEventListeners();

  beestat.current_layer = this;

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
