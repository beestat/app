beestat.component = function() {
  var self = this;

  this.rendered_ = false;

  // Give every component a state object to use for storing data.
  this.state_ = {};

  // this.render_count_ = 0;

  this.layer_ = beestat.current_layer;

  if (this.rerender_on_breakpoint_ === true) {
    beestat.dispatcher.addEventListener('breakpoint', function() {
      self.rerender();
    });
  }
};
beestat.extend(beestat.component, rocket.EventTarget);

/**
 * First put everything in a container, then append the new container. This
 * prevents the child from having to worry about multiple redraws since they
 * aren't doing anything directly on the body.
 *
 * @param {rocket.Elements} parent
 *
 * @return {beestat.component} This
 */
beestat.component.prototype.render = function(parent) {
  var self = this;

  if (parent !== undefined) {
    this.component_container_ = $.createElement('div')
      .style('position', 'relative');
    this.decorate_(this.component_container_);
    parent.appendChild(this.component_container_);
  } else {
    this.decorate_();
  }

  // The element should now exist on the DOM.
  setTimeout(function() {
    self.dispatchEvent('render');
  }, 0);

  // The render function was called.
  this.rendered_ = true;
  // this.render_count_++;

  return this;
};

/**
 * First put everything in a container, then append the new container. This
 * prevents the child from having to worry about multiple redraws since they
 * aren't doing anything directly on the body.
 *
 * @return {beestat.component} This
 */
beestat.component.prototype.rerender = function() {
  if (this.rendered_ === true) {
    var new_container = $.createElement('div')
      .style('position', 'relative');
    this.decorate_(new_container);
    this.component_container_
      .parentNode().replaceChild(new_container, this.component_container_);
    this.component_container_ = new_container;

    var self = this;
    setTimeout(function() {
      self.dispatchEvent('render');
    }, 0);

    // this.render_count_++;

    return this;
  }
};

/**
 * Remove this component from the page.
 */
beestat.component.prototype.dispose = function() {
  var child = this.component_container_.parentNode();
  var parent = child.parentNode();
  parent.removeChild(child);
  this.rendered_ = false;
};

beestat.component.prototype.decorate_ = function() {
  // Left for the subclass to implement.
};
