/**
 * Base class for a high level element that exists on the SVG document.
 *
 * @param {object} floor_plan The SVG component this belongs to.
 * @param {object} state Shared state.
 */
beestat.component.floor_plan_entity = function(floor_plan, state) {
  this.floor_plan_ = floor_plan;

  this.x_ = 0;
  this.y_ = 0;

  this.g_ = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  beestat.component.apply(this, arguments);

  /**
   * Override this component's state with a state common to all floor plan
   * entities.
   */
  this.state_ = state;
};
beestat.extend(beestat.component.floor_plan_entity, beestat.component);

/**
 * Render
 *
 * @param {SVGGElement} parent
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.prototype.render = function(parent) {
  if (this.rendered_ === false) {
    const self = this;

    this.decorate_(this.g_);
    parent.appendChild(this.g_);

    this.apply_transform_();

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
 * Rerender
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.prototype.rerender = function() {
  if (this.rendered_ === true) {
    this.rendered_ = false;

    var old_g = this.g_;
    this.g_ = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    this.decorate_(this.g_);
    old_g.parentNode.replaceChild(this.g_, old_g);

    this.apply_transform_();

    var self = this;
    window.setTimeout(function() {
      self.dispatchEvent('render');
    }, 0);

    this.rendered_ = true;
  }

  return this;
};

/**
 * Bring the current element to the front.
 */
beestat.component.floor_plan_entity.prototype.bring_to_front_ = function() {
  if (this.rendered_ === true) {
    this.g_.parentNode.appendChild(this.g_);
  }
};

/**
 * Make this draggable or not.
 *
 * @param {boolean} draggable Whether or not this is draggable.
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.prototype.set_draggable_ = function(draggable) {
  if (draggable === true) {
    this.g_.addEventListener('mousedown', this.mousedown_handler_.bind(this));
  }

  this.draggable_ = draggable;

  return this;
};

/**
 * Set the x and y positions of this entity.
 *
 * @param {number} x The x position of this entity.
 * @param {number} y The y position of this entity.
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.prototype.set_xy = function(x, y) {
  if (x !== null) {
    this.x_ = Math.round(x);
  }

  if (y !== null) {
    this.y_ = Math.round(y);
  }

  this.apply_transform_();
  return this;
};

/**
 * Apply all of the relevant transformations to the SVG document.
 *
 * @return {beestat.component.floor_plan_entity} This.
 */
beestat.component.floor_plan_entity.prototype.apply_transform_ = function() {
  const x = this.x_ || 0;
  const y = this.y_ || 0;

  if (x !== 0 || y !== 0) {
    this.g_.setAttribute(
      'transform',
      'translate(' + (this.x_ || 0) + ',' + (this.y_ || 0) + ')'
    );
  } else {
    this.g_.removeAttribute('transform');
  }

  return this;
};
/**
 * Drag start handler
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.mousedown_handler_ = function(e) {
  // Don't propagate to things under me.
  e.stopPropagation();

  this.mousemove_handler_ = this.mousemove_handler_.bind(this);
  window.addEventListener('mousemove', this.mousemove_handler_);

  this.mouseup_handler_ = this.mouseup_handler_.bind(this);
  window.addEventListener('mouseup', this.mouseup_handler_);

  this.drag_start_mouse_ = {
    'x': e.clientX,
    'y': e.clientY
  };

  this.dragged_ = false;

  this.after_mousedown_handler_(e);
};

/**
 * After mousedown.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.after_mousedown_handler_ = function(e) {
  // Stub
};

/**
 * This handler gets added after mousedown, so it can be assumed that we want
 * to drag at this point.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.mousemove_handler_ = function(e) {
  if (this.dragged_ === false) {
    this.dispatchEvent('drag_start');
    this.dragged_ = true;
  }

  this.after_mousemove_handler_(e);
};

/**
 * After mousemove.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.after_mousemove_handler_ = function(e) {
  // Stub
};

/**
 * Drag stop handler
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.mouseup_handler_ = function(e) {
  window.removeEventListener('mousemove', this.mousemove_handler_);
  window.removeEventListener('mouseup', this.mouseup_handler_);

  delete this.drag_start_entity_;
  delete this.drag_start_mouse_;

  // If the mouse was actually moved at all then fire the drag stop event.
  if (this.dragged_ === true) {
    this.dispatchEvent('drag_stop');
  }

  this.after_mouseup_handler_(e);
};

/**
 * After mouseup.
 *
 * @param {Event} e
 */
beestat.component.floor_plan_entity.prototype.after_mouseup_handler_ = function(e) {
  // Stub
};

/**
 * Get X
 *
 * @return {number} x
 */
beestat.component.floor_plan_entity.prototype.get_x = function() {
  return this.x_;
};

/**
 * Get Y
 *
 * @return {number} y
 */
beestat.component.floor_plan_entity.prototype.get_y = function() {
  return this.y_;
};
