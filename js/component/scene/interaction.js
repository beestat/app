/**
 * Scene methods split from scene.js.
 */


/**
 * Initialize a click.
 *
 * @param {Event} e
 */
beestat.component.scene.prototype.mousedown_handler_ = function(e) {
  // Don't propagate to things under me.
  e.stopPropagation();

  this.mousemove_handler_ = this.mousemove_handler_.bind(this);
  window.addEventListener('mousemove', this.mousemove_handler_);
  window.addEventListener('touchmove', this.mousemove_handler_);

  this.mouseup_handler_ = this.mouseup_handler_.bind(this);
  window.addEventListener('mouseup', this.mouseup_handler_);
  window.addEventListener('touchend', this.mouseup_handler_);

  this.dragged_ = false;
};


/**
 * Added after mousedown, so when the mouse moves just set dragged = true.
 */
beestat.component.scene.prototype.mousemove_handler_ = function() {
  this.dragged_ = true;
};


/**
 * Set an active mesh if it wasn't a drag.
 */
beestat.component.scene.prototype.mouseup_handler_ = function() {
  window.removeEventListener('mousemove', this.mousemove_handler_);
  window.removeEventListener('touchmove', this.mousemove_handler_);
  window.removeEventListener('mouseup', this.mouseup_handler_);
  window.removeEventListener('touchend', this.mouseup_handler_);

  if (this.dragged_ === false) {
    this.active_mesh_ = this.intersected_mesh_;
    this.dispatchEvent('change_active_room');
    this.update_();
  }
};


/**
 * Add the raycaster.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.add_raycaster_ = function() {
  const self = this;

  this.raycaster_ = new THREE.Raycaster();
  this.raycaster_.layers.set(beestat.component.scene.layer_visible);

  /**
   * Initialize a pointer representing the raycaster. Initialize it pointing
   * way off screen instead of 0,0 so nothing starts thinking the mouse is
   * over it.
   */
  this.raycaster_pointer_ = new THREE.Vector2(10000, 10000);

  this.raycaster_document_mousemove_handler_ = function(e) {
    const rect = self.renderer_.domElement.getBoundingClientRect();
    self.raycaster_pointer_.x = ( ( e.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    self.raycaster_pointer_.y = - ( ( e.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
  };
  document.addEventListener('mousemove', this.raycaster_document_mousemove_handler_);

  this.raycaster_dom_element_ = this.renderer_.domElement;
  this.raycaster_dom_mousedown_handler_ = this.mousedown_handler_.bind(this);
  this.raycaster_dom_touchstart_handler_ = this.mousedown_handler_.bind(this);
  this.raycaster_dom_element_.addEventListener('mousedown', this.raycaster_dom_mousedown_handler_);
  this.raycaster_dom_element_.addEventListener('touchstart', this.raycaster_dom_touchstart_handler_);
};


/**
 * Update the raycaster.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.scene.prototype.update_raycaster_ = function() {
  if (this.raycaster_ !== undefined) {
    if (this.room_interaction_enabled_ !== true) {
      if (this.intersected_mesh_ !== undefined) {
        document.body.style.cursor = '';
        if (
          this.intersected_mesh_.material !== undefined &&
          this.intersected_mesh_.material.emissive !== undefined
        ) {
          this.intersected_mesh_.material.emissive.setHex(0x000000);
        }
        delete this.intersected_mesh_;
      }
      return;
    }

    this.raycaster_.setFromCamera(this.raycaster_pointer_, this.camera_);
    const intersects = this.raycaster_.intersectObject(this.scene_);

    // Clear any existing intersects.
    if (this.intersected_mesh_ !== undefined) {
      document.body.style.cursor = '';
      if (
        this.intersected_mesh_.material !== undefined &&
        this.intersected_mesh_.material.emissive !== undefined
      ) {
        this.intersected_mesh_.material.emissive.setHex(0x000000);
      }
      delete this.intersected_mesh_;
    }

    // Set intersect.
    for (let i = 0; i < intersects.length; i++) {
      if (
        intersects[i].object.type === 'Mesh' &&
        intersects[i].object.material !== undefined &&
        intersects[i].object.material.emissive !== undefined &&
        intersects[i].object.userData.room !== undefined &&
        intersects[i].object.userData.is_wall !== true &&
        intersects[i].object.userData.is_opening !== true &&
        intersects[i].object.userData.is_surface !== true &&
        intersects[i].object.userData.is_roof !== true &&
        intersects[i].object.userData.is_environment !== true &&
        intersects[i].object.userData.is_celestial_object !== true
      ) {
        this.intersected_mesh_ = intersects[i].object;
        break;
      }
    }

    // Style intersect.
    if (this.intersected_mesh_ !== undefined) {
      this.intersected_mesh_.material.emissive.setHex(0xffffff);
      this.intersected_mesh_.material.emissiveIntensity = 0.1;
      document.body.style.cursor = 'pointer';
    }
  }
};

