beestat.component = function() {
  const self = this;

  this.rendered_ = false;

  // Give every component a state object to use for storing data.
  this.state_ = {};

  this.layer_ = beestat.current_layer;

  if (this.rerender_on_resize_ === true) {
    beestat.dispatcher.addEventListener('resize', function() {
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
  if (this.rendered_ === false) {
    var self = this;

    if (parent !== undefined) {
      this.component_container_ = $.createElement('div');
      Object.assign(this.component_container_[0].style, Object.assign(
        {
          'position': 'relative'
        },
        this.style_
      ));
      this.decorate_(this.component_container_);
      parent.appendChild(this.component_container_);
    } else {
      this.decorate_();
    }

    // The element should now exist on the DOM.
    window.setTimeout(function() {
      self.dispatchEvent('render');
    }, 0);

    // The render function was called.
    this.rendered_ = true;
  }

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
    this.rendered_ = false;

    var new_container = $.createElement('div')
      .style('position', 'relative');
    this.decorate_(new_container);
    this.component_container_
      .parentNode().replaceChild(new_container, this.component_container_);
    this.component_container_ = new_container;

    var self = this;
    window.setTimeout(function() {
      self.dispatchEvent('render');
    }, 0);

    this.rendered_ = true;
  }
  return this;
};

/**
 * Remove this component from the page.
 */
beestat.component.prototype.dispose = function() {
  if (this.rendered_ === true) {
    var child = this.component_container_;
    var parent = child.parentNode();
    parent.removeChild(child);
    this.rendered_ = false;
  }
};

beestat.component.prototype.decorate_ = function() {
  // Left for the subclass to implement.
};

/**
 * Add custom styling to a component container. Mostly useful for when a
 * component needs margins, etc applied depending on the context.
 *
 * @param {object} style
 *
 * @return {beestat.component} This
 */
beestat.component.prototype.style = function(style) {
  this.style_ = style;
  return this.rerender();
};
