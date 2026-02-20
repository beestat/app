/**
 * Scene methods split from scene.js.
 */


/**
 * Add a room. Room coordinates are absolute.
 *
 * @param {THREE.Group} layer The layer the room belongs to.
 * @param {object} group The group the room belongs to.
 * @param {object} room The room to add.
 */
beestat.component.scene.prototype.add_room_ = function(layer, group, room) {
  const self = this;

  const color = beestat.style.color.gray.dark;

  var clipper_offset = new ClipperLib.ClipperOffset();

  clipper_offset.AddPath(
    room.points,
    ClipperLib.JoinType.jtSquare,
    ClipperLib.EndType.etClosedPolygon
  );
  var clipper_hole = new ClipperLib.Path();
  clipper_offset.Execute(clipper_hole, -beestat.component.scene.room_wall_inset);

  // Just the floor plan
  const extrude_height = beestat.component.scene.room_floor_thickness;

  // Create a shape using the points of the room.
  const shape = new THREE.Shape();
  const first_point = clipper_hole[0].shift();
  shape.moveTo(first_point.x, first_point.y);
  clipper_hole[0].forEach(function(point) {
    shape.lineTo(point.x, point.y);
  });

  // Extrude the shape and create the mesh.
  const extrude_settings = {
    'depth': extrude_height,
    'bevelEnabled': false
  };

  const geometry = new THREE.ExtrudeGeometry(
    shape,
    extrude_settings
  );

  const material = new THREE.MeshStandardMaterial({
    'color': color,
    'roughness': 0.6,
    'metalness': 0.0
  });
  if (
    room.sensor_id === undefined ||
    beestat.cache.sensor[room.sensor_id] === undefined
  ) {
    const loader = new THREE.TextureLoader();
    loader.load(
      'img/visualize/stripe.png',
      function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(0.005, 0.005);
        material.map = texture;
        material.needsUpdate = true;
      }
    );
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -extrude_height - (room.elevation || group.elevation);

  // Enable shadow receiving for depth perception
  mesh.receiveShadow = true;

  // Translate the mesh to the room x/y position.
  mesh.translateX(room.x);
  mesh.translateY(room.y);

  // Store a reference to the mesh representing each room.
  if (this.meshes_ === undefined) {
    this.meshes_ = {};
  }

  // Allow me to go from room -> mesh and mesh -> room
  this.meshes_[room.room_id] = mesh;
  mesh.userData.room = room;

  layer.add(mesh);

  // Label
  mesh.userData.sprites = {};

  // Outline
  const edges_geometry = new THREE.EdgesGeometry(geometry);
  const outline = new THREE.LineSegments(
    edges_geometry,
    new THREE.LineBasicMaterial({
      'color': '#ffffff'
    })
  );
  outline.translateX(room.x);
  outline.translateY(room.y);
  outline.position.z = -extrude_height - (room.elevation || group.elevation);
  outline.visible = false;
  outline.layers.set(beestat.component.scene.layer_outline);
  mesh.userData.outline = outline;
  layer.add(outline);

  // Determine where the sprites will go.
  const geojson_polygon = [];
  room.points.forEach(function(point) {
    geojson_polygon.push([
      point.x,
      point.y
    ]);
  });
  const label_point = polylabel([geojson_polygon]);

  [
    'value',
    'icon'
  ].forEach(function(sprite_type) {
    const sprite_material = self.get_blank_label_material_();
    const sprite = new THREE.Sprite(sprite_material);

    // Scale to an appropriate-looking size.
    const scale_x = 0.14;
    const scale_y = scale_x * sprite_material.map.source.data.height / sprite_material.map.source.data.width;
    sprite.scale.set(scale_x, scale_y, 1);

    // Set center of sprite to bottom middle.
    sprite.center.set(0.5, 0);

    /**
     * Some arbitrary small number so the sprite is *just* above the room or
     * when you view from directly above sometimes they disappear.
     */
    const z_offset = 1;

    sprite.position.set(
      room.x + label_point[0],
      room.y + label_point[1],
      mesh.position.z - z_offset
    );
    layer.add(sprite);

    mesh.userData.sprites[sprite_type] = sprite;
  });
};


/**
 * Add a surface. Surface coordinates are relative to surface.x/y.
 *
 * @param {THREE.Group} layer The layer the surface belongs to.
 * @param {object} group The group the surface belongs to.
 * @param {object} surface The surface to add.
 */
beestat.component.scene.prototype.add_surface_ = function(layer, group, surface) {
  if (surface.points === undefined || surface.points.length < 3) {
    return;
  }

  const shape = new THREE.Shape();
  shape.moveTo(surface.points[0].x, surface.points[0].y);
  for (let i = 1; i < surface.points.length; i++) {
    shape.lineTo(surface.points[i].x, surface.points[i].y);
  }
  shape.closePath();

  const color = surface.color || '#9a9a96';
  const height = Math.max(0, Number(surface.height || 0));
  const elevation = surface.elevation || group.elevation || 0;
  const z_lift = beestat.component.scene.surface_z_lift;

  let geometry;
  let mesh_position_z;
  if (height > 0) {
    geometry = new THREE.ExtrudeGeometry(
      shape,
      {
        'depth': height,
        'bevelEnabled': false
      }
    );
    // Keep top of the surface slightly above its base plane.
    mesh_position_z = -height - elevation - z_lift;
  } else {
    geometry = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lies on z=0, so place it just above the base plane.
    mesh_position_z = -elevation - z_lift;
  }

  const material = new THREE.MeshStandardMaterial({
    'color': color,
    'roughness': 0.9,
    'metalness': 0.0,
    'side': THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = mesh_position_z;
  mesh.translateX(surface.x || 0);
  mesh.translateY(surface.y || 0);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData.is_environment = true;
  mesh.userData.is_surface = true;
  mesh.userData.base_surface_color = color;

  layer.add(mesh);
};


/**
 * Add all floor-plan surfaces to the environment layer.
 *
 * @param {THREE.Group} layer The environment surfaces layer.
 */
beestat.component.scene.prototype.add_surfaces_to_environment_ = function(layer) {
  const self = this;
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];

  floor_plan.data.groups.forEach(function(group) {
    (group.surfaces || []).forEach(function(surface) {
      self.add_surface_(layer, group, surface);
    });
  });
};


/**
 * Add exterior walls for a group. For each room, the room polygon is offset
 * outward by wall_thickness, then the union of all rooms is subtracted. This
 * leaves only exterior wall segments at the correct per-room height.
 *
 * @param {THREE.Group} layer The layer to add walls to.
 * @param {object} group The floor plan group.
 */
beestat.component.scene.prototype.add_walls_ = function(layer, group) {
  const wall_thickness = beestat.component.scene.wall_thickness;

  if (group.rooms.length === 0) {
    return;
  }

  // Convert all room polygons to absolute coordinates.
  const absolute_paths = [];
  group.rooms.forEach(function(room) {
    const absolute_path = [];
    room.points.forEach(function(point) {
      absolute_path.push({
        'x': room.x + point.x,
        'y': room.y + point.y
      });
    });
    absolute_paths.push(absolute_path);
  });

  // Union all room polygons (computed once per group).
  const union_clipper = new ClipperLib.Clipper();
  absolute_paths.forEach(function(path) {
    union_clipper.AddPath(
      path,
      ClipperLib.PolyType.ptSubject,
      true
    );
  });
  const all_rooms_union = new ClipperLib.Paths();
  union_clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    all_rooms_union,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  // For each room, compute exterior-only wall segments.
  for (var i = 0; i < group.rooms.length; i++) {
    const room = group.rooms[i];
    const abs_path = absolute_paths[i];

    // Offset this room's polygon outward by wall_thickness.
    const clipper_offset = new ClipperLib.ClipperOffset();
    clipper_offset.AddPath(
      abs_path,
      ClipperLib.JoinType.jtSquare,
      ClipperLib.EndType.etClosedPolygon
    );
    const outer = new ClipperLib.Paths();
    clipper_offset.Execute(outer, wall_thickness);

    // Subtract the all-rooms union from the outer offset.
    // What remains is only exterior wall segments for this room.
    const diff_clipper = new ClipperLib.Clipper();
    outer.forEach(function(path) {
      diff_clipper.AddPath(path, ClipperLib.PolyType.ptSubject, true);
    });
    all_rooms_union.forEach(function(path) {
      diff_clipper.AddPath(path, ClipperLib.PolyType.ptClip, true);
    });
    const wall_paths = new ClipperLib.Paths();
    diff_clipper.Execute(
      ClipperLib.ClipType.ctDifference,
      wall_paths,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero
    );

    if (wall_paths.length === 0) {
      continue;
    }

    const wall_height = room.height || group.height || 96;
    const elevation = room.elevation || group.elevation || 0;

    // Separate paths into outer boundaries and holes based on area sign.
    // Clipper returns CCW paths (positive area) as outers and CW paths
    // (negative area) as holes.
    const outers = [];
    const hole_paths = [];
    for (var j = 0; j < wall_paths.length; j++) {
      const points = wall_paths[j];
      if (points.length < 3) {
        continue;
      }
      const area = ClipperLib.Clipper.Area(points);
      if (Math.abs(area) < 1) {
        continue;
      }
      if (area > 0) {
        outers.push(points);
      } else {
        hole_paths.push(points);
      }
    }

    // Create a mesh for each outer boundary, attaching any contained holes.
    for (var j = 0; j < outers.length; j++) {
      const outer_points = outers[j];

      const shape = new THREE.Shape();
      shape.moveTo(outer_points[0].x, outer_points[0].y);
      for (var k = 1; k < outer_points.length; k++) {
        shape.lineTo(outer_points[k].x, outer_points[k].y);
      }

      // Add holes that are inside this outer boundary.
      for (var h = 0; h < hole_paths.length; h++) {
        if (
          ClipperLib.Clipper.PointInPolygon(
            hole_paths[h][0],
            outer_points
          ) !== 0
        ) {
          const hole = new THREE.Path();
          hole.moveTo(hole_paths[h][0].x, hole_paths[h][0].y);
          for (var m = 1; m < hole_paths[h].length; m++) {
            hole.lineTo(hole_paths[h][m].x, hole_paths[h][m].y);
          }
          shape.holes.push(hole);
        }
      }

      const geometry = new THREE.ExtrudeGeometry(
        shape,
        {
          'depth': wall_height,
          'bevelEnabled': false
        }
      );

      const siding_color = this.get_appearance_value_('siding_color');
      const material = new THREE.MeshStandardMaterial({
        'color': siding_color,
        'roughness': 0.7,
        'metalness': 0.0
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = -wall_height - elevation;
      mesh.userData.is_wall = true;
      mesh.userData.group_id = group.group_id;
      mesh.userData.wall_cuttable = true;
      mesh.layers.set(beestat.component.scene.layer_visible);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      layer.add(mesh);
    }
  }
};

