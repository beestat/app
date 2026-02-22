/**
 * Floor plan surface.
 */
beestat.component.floor_plan_entity.surface = function() {
  beestat.component.floor_plan_entity.room.apply(this, arguments);
};
beestat.extend(beestat.component.floor_plan_entity.surface, beestat.component.floor_plan_entity.room);

/**
 * Draw the polygon.
 *
 * @param {SVGGElement} parent
 */
beestat.component.floor_plan_entity.surface.prototype.decorate_polygon_ = function(parent) {
  const self = this;

  this.polygon_ = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  parent.appendChild(this.polygon_);

  this.polygon_.style.strokeWidth = '2';
  const surface_fill = this.surface_.color || '#9a9a96';

  if (this.active_ === true) {
    this.set_draggable_(true);

    this.polygon_.style.cursor = 'pointer';
    this.polygon_.style.fillOpacity = '0.65';
    this.polygon_.style.fill = surface_fill;
    this.polygon_.style.stroke = '#ffffff';
    this.polygon_.style.filter = 'brightness(1.2)';
  } else if (this.enabled_ === true) {
    this.polygon_.style.cursor = 'pointer';
    this.polygon_.style.fillOpacity = '0.5';
    this.polygon_.style.fill = surface_fill;
    this.polygon_.style.stroke = beestat.style.color.gray.base;
    this.polygon_.style.filter = 'none';
  } else {
    this.polygon_.style.cursor = 'default';
    this.polygon_.style.fillOpacity = '0.2';
    this.polygon_.style.fill = beestat.style.color.gray.base;
    this.polygon_.style.stroke = beestat.style.color.gray.dark;
    this.polygon_.style.filter = 'none';
  }

  // Activate on click.
  if (this.enabled_ === true) {
    this.polygon_.addEventListener('click', function(e) {
      e.stopPropagation();
      self.set_active(true);
    });
  }

  this.update_polygon_();
};

/**
 * Set the surface.
 *
 * @param {object} surface
 *
 * @return {beestat.component.floor_plan_entity.surface} This.
 */
beestat.component.floor_plan_entity.surface.prototype.set_surface = function(surface) {
  this.surface_ = surface;
  this.room_ = surface;
  this.x_ = surface.x;
  this.y_ = surface.y;

  if (this.surface_.surface_id === undefined) {
    this.surface_.surface_id = window.crypto.randomUUID();
  }

  if (this.surface_.color === undefined) {
    this.surface_.color = '#9a9a96';
  }
  if (this.surface_.height === undefined) {
    this.surface_.height = 0;
  }

  return this;
};

/**
 * Get the surface.
 *
 * @return {object}
 */
beestat.component.floor_plan_entity.surface.prototype.get_surface = function() {
  return this.surface_;
};

/**
 * Make this surface active or not.
 *
 * @param {boolean} active
 *
 * @return {beestat.component.floor_plan_entity.surface} This.
 */
beestat.component.floor_plan_entity.surface.prototype.set_active = function(active) {
  if (active === true && this.enabled_ !== true) {
    return this;
  }

  if (this.state_.active_point_entity !== undefined) {
    this.state_.active_point_entity.set_active(false);
    this.floor_plan_.update_toolbar();
  }
  if (this.state_.active_wall_entity !== undefined) {
    this.state_.active_wall_entity.set_active(false);
    this.floor_plan_.update_toolbar();
  }
  if (this.state_.active_tree_entity !== undefined) {
    this.state_.active_tree_entity.set_active(false);
    this.floor_plan_.update_toolbar();
  }
  if (this.state_.active_opening_entity !== undefined) {
    this.state_.active_opening_entity.set_active(false);
    this.floor_plan_.update_toolbar();
  }

  if (active !== this.active_) {
    this.active_ = active;

    if (this.active_ === true) {
      if (
        this.state_.active_surface_entity !== undefined &&
        this.state_.active_surface_entity.get_surface() !== this.surface_
      ) {
        this.state_.active_surface_entity.set_active(false);
      }

      if (this.state_.active_room_entity !== undefined) {
        this.state_.active_room_entity.set_active(false);
      }

      this.state_.active_surface_entity = this;

      this.dispatchEvent('activate');
      this.update_snap_points_();

      this.bring_to_front_();
    } else {
      delete this.state_.active_surface_entity;

      if (this.state_.active_wall_entity !== undefined) {
        this.state_.active_wall_entity.set_active(false);
      }

      if (this.state_.active_point_entity !== undefined) {
        this.state_.active_point_entity.set_active(false);
      }

      this.dispatchEvent('inactivate');
    }

    if (this.rendered_ === true) {
      this.rerender();
    }
  }

  return this;
};

/**
 * Pre-generate a list of snappable x/y values.
 */
beestat.component.floor_plan_entity.surface.prototype.update_snap_points_ = function() {
  const group_below = this.floor_plan_.get_group_below(this.group_);
  const groups = [this.group_];
  if (group_below !== undefined) {
    groups.push(group_below);
  }
  const snap_points = this.collect_snap_points_({
    'groups': groups,
    'shape_specs': [
      {
        'collection': 'rooms',
        'point_mode': 'relative'
      },
      {
        'collection': 'surfaces',
        'point_mode': 'relative'
      },
      {
        'collection': 'openings',
        'point_mode': 'absolute'
      }
    ]
  });
  this.snap_x_ = snap_points.snap_x;
  this.snap_y_ = snap_points.snap_y;
};
