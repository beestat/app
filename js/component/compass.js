/**
 * Interactive compass component for setting floor plan rotation.
 * Allows users to visually set which direction is "North" for their home.
 *
 * @param {number} floor_plan_id The floor plan ID
 */
beestat.component.compass = function(floor_plan_id) {
  this.floor_plan_id_ = floor_plan_id;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.compass, beestat.component);

/**
 * Render the compass.
 *
 * @param {HTMLElement} parent
 *
 * @return {beestat.component.compass} This
 */
beestat.component.compass.prototype.render = function(parent) {
  const self = this;

  // Container for the compass
  this.container_ = document.createElement('div');
  Object.assign(this.container_.style, {
    'position': 'absolute',
    'bottom': `${beestat.style.size.gutter}px`,
    'right': `${beestat.style.size.gutter}px`,
    'width': '80px',
    'height': '80px',
    'user-select': 'none',
    'cursor': 'grab',
    'z-index': '10'
  });
  this.container_.title = 'Drag to set which direction is North for sun/moon positioning';

  // Create SVG
  this.svg_ = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  this.svg_.setAttribute('width', '80');
  this.svg_.setAttribute('height', '80');
  this.svg_.setAttribute('viewBox', '0 0 80 80');
  this.container_.appendChild(this.svg_);

  // Background circle
  const bg_circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg_circle.setAttribute('cx', '40');
  bg_circle.setAttribute('cy', '40');
  bg_circle.setAttribute('r', '38');
  bg_circle.setAttribute('fill', beestat.style.color.bluegray.base);
  bg_circle.setAttribute('stroke', '#fff');
  bg_circle.setAttribute('stroke-width', '2');
  bg_circle.setAttribute('opacity', '0.9');
  this.svg_.appendChild(bg_circle);

  // Create rotating group for compass rose
  this.compass_group_ = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  this.compass_group_.setAttribute('transform', 'translate(40, 40)');
  this.svg_.appendChild(this.compass_group_);

  // Cardinal direction markers
  const directions = [
    {label: 'N', angle: 0, color: beestat.style.color.red.base, size: 14},
    {label: 'E', angle: 90, color: '#fff', size: 10},
    {label: 'S', angle: 180, color: '#fff', size: 10},
    {label: 'W', angle: 270, color: '#fff', size: 10}
  ];

  directions.forEach(function(dir) {
    const angle_rad = (dir.angle - 90) * Math.PI / 180; // -90 to start at top
    const radius = 28;
    const x = radius * Math.cos(angle_rad);
    const y = radius * Math.sin(angle_rad);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', dir.color);
    text.setAttribute('font-size', dir.size);
    text.setAttribute('font-weight', dir.label === 'N' ? 'bold' : 'normal');
    text.setAttribute('pointer-events', 'none');
    text.textContent = dir.label;
    self.compass_group_.appendChild(text);
  });

  // North arrow indicator
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arrow.setAttribute('d', 'M 0,-22 L 4,-10 L 0,-12 L -4,-10 Z');
  arrow.setAttribute('fill', beestat.style.color.red.base);
  arrow.setAttribute('stroke', '#fff');
  arrow.setAttribute('stroke-width', '1');
  arrow.setAttribute('pointer-events', 'none');
  this.compass_group_.appendChild(arrow);

  // Center dot
  const center_dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  center_dot.setAttribute('cx', '0');
  center_dot.setAttribute('cy', '0');
  center_dot.setAttribute('r', '3');
  center_dot.setAttribute('fill', '#fff');
  center_dot.setAttribute('pointer-events', 'none');
  this.compass_group_.appendChild(center_dot);

  // Set initial rotation
  this.update_rotation_(this.get_rotation_());

  // Make it draggable
  this.set_draggable_();

  parent.appendChild(this.container_);
  this.rendered_ = true;

  return this;
};

/**
 * Get the current rotation value from the floor plan data.
 *
 * @return {number} Rotation in degrees (0-359)
 */
beestat.component.compass.prototype.get_rotation_ = function() {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  return floor_plan.data.appearance?.rotation || 0;
};

/**
 * Set the rotation value in the floor plan data.
 *
 * @param {number} degrees Rotation in degrees (0-359)
 */
beestat.component.compass.prototype.set_rotation_ = function(degrees) {
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  if (floor_plan.data.appearance === undefined) {
    floor_plan.data.appearance = {};
  }

  // Normalize to 0-359 and store as integer
  const normalized = Math.round(((degrees % 360) + 360) % 360);
  floor_plan.data.appearance.rotation = normalized;

  this.update_rotation_(normalized);

  // Dispatch event so other components know rotation changed
  this.dispatchEvent('rotation_change', normalized);
};

/**
 * Update the visual rotation of the compass.
 *
 * @param {number} degrees Rotation in degrees
 */
beestat.component.compass.prototype.update_rotation_ = function(degrees) {
  if (this.compass_group_) {
    this.compass_group_.setAttribute(
      'transform',
      `translate(40, 40) rotate(${degrees})`
    );
  }
};

/**
 * Make the compass draggable to change rotation.
 */
beestat.component.compass.prototype.set_draggable_ = function() {
  const self = this;
  let is_dragging = false;

  const get_angle = function(e) {
    const rect = self.svg_.getBoundingClientRect();
    const center_x = rect.left + rect.width / 2;
    const center_y = rect.top + rect.height / 2;

    const client_x = e.clientX || (e.touches && e.touches[0].clientX);
    const client_y = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = client_x - center_x;
    const dy = client_y - center_y;

    // Calculate angle in degrees (0° = North/up, clockwise)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (angle < 0) {
      angle += 360;
    }

    return angle;
  };

  const handle_start = function(e) {
    is_dragging = true;
    self.container_.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handle_move = function(e) {
    if (!is_dragging) {
      return;
    }

    const angle = get_angle(e);
    self.set_rotation_(angle);
    e.preventDefault();
  };

  const handle_end = function(e) {
    if (is_dragging) {
      is_dragging = false;
      self.container_.style.cursor = 'grab';
      e.preventDefault();
    }
  };

  // Store handlers for cleanup
  this.handlers_ = {
    'mouse_start': handle_start,
    'mouse_move': handle_move,
    'mouse_end': handle_end,
    'touch_start': handle_start,
    'touch_move': handle_move,
    'touch_end': handle_end
  };

  // Mouse events
  this.container_.addEventListener('mousedown', this.handlers_.mouse_start);
  window.addEventListener('mousemove', this.handlers_.mouse_move);
  window.addEventListener('mouseup', this.handlers_.mouse_end);

  // Touch events
  this.container_.addEventListener('touchstart', this.handlers_.touch_start);
  window.addEventListener('touchmove', this.handlers_.touch_move);
  window.addEventListener('touchend', this.handlers_.touch_end);
};

/**
 * Dispose of the compass.
 */
beestat.component.compass.prototype.dispose = function() {
  // Remove event listeners
  if (this.handlers_) {
    if (this.container_) {
      this.container_.removeEventListener('mousedown', this.handlers_.mouse_start);
      this.container_.removeEventListener('touchstart', this.handlers_.touch_start);
    }
    window.removeEventListener('mousemove', this.handlers_.mouse_move);
    window.removeEventListener('mouseup', this.handlers_.mouse_end);
    window.removeEventListener('touchmove', this.handlers_.touch_move);
    window.removeEventListener('touchend', this.handlers_.touch_end);
  }

  // Remove from DOM
  if (this.container_ && this.container_.parentNode) {
    this.container_.parentNode.removeChild(this.container_);
  }

  // Mark as not rendered
  this.rendered_ = false;
};
