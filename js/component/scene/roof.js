/**
 * Scene methods split from scene.js.
 */


/**
 * Get the ceiling Z-position for a room.
 *
 * @param {object} group The floor plan group
 * @param {object} room The room
 *
 * @return {number} The ceiling Z position
 */
beestat.component.scene.prototype.get_ceiling_z_ = function(group, room) {
  const elevation = room.elevation || group.elevation || 0;
  const height = room.height || group.height || 96;
  return -(elevation + height);
};


/**
 * Convert room.points (relative coordinates) to absolute coordinates.
 *
 * @param {object} room The room
 *
 * @return {Array} Array of absolute coordinate points {x, y}
 */
beestat.component.scene.prototype.convert_room_to_absolute_polygon_ = function(room) {
  const absolute = [];
  room.points.forEach(function(point) {
    absolute.push({
      'x': room.x + point.x,
      'y': room.y + point.y
    });
  });
  return absolute;
};


/**
 * Compute which ceiling areas are exposed (not covered by floors above).
 *
 * @param {object} floor_plan The floor plan
 *
 * @return {Array} Array of {ceiling_z, polygons[]} for roof outline rendering
 */
beestat.component.scene.prototype.compute_exposed_ceiling_areas_ = function(floor_plan) {
  const self = this;

  // Step 1: Group ceilings by Z-level
  const ceiling_levels = {}; // Key: ceiling_z, Value: array of room polygons

  floor_plan.data.groups.forEach(function(group) {
    group.rooms.forEach(function(room) {
      const elevation = room.elevation || group.elevation || 0;

      // Skip basements (below ground)
      if (elevation < 0) {
        return;
      }

      const ceiling_z = self.get_ceiling_z_(group, room);

      if (!ceiling_levels[ceiling_z]) {
        ceiling_levels[ceiling_z] = [];
      }

      ceiling_levels[ceiling_z].push(
        self.convert_room_to_absolute_polygon_(room)
      );
    });
  });

  // Step 2: Sort ceiling levels (ascending Z = highest to lowest)
  const sorted_levels = Object.keys(ceiling_levels)
    .map(z => parseFloat(z))
    .sort((a, b) => a - b);

  const exposed_areas = [];

  // Step 3: For each level, compute exposed area
  sorted_levels.forEach(function(current_ceiling_z, index) {
    const current_polygons = ceiling_levels[current_ceiling_z];

    // Union all rooms at this level
    const union_clipper = new ClipperLib.Clipper();
    current_polygons.forEach(function(polygon) {
      union_clipper.AddPath(polygon, ClipperLib.PolyType.ptSubject, true);
    });

    const ceiling_area = new ClipperLib.Paths();
    union_clipper.Execute(
      ClipperLib.ClipType.ctUnion,
      ceiling_area,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero
    );

    // Compute occlusion from all higher levels
    const occlusion_clipper = new ClipperLib.Clipper();
    let has_occlusion = false;

    for (let i = 0; i < index; i++) {
      const above_ceiling_z = sorted_levels[i];
      const above_polygons = ceiling_levels[above_ceiling_z];

      above_polygons.forEach(function(polygon) {
        occlusion_clipper.AddPath(polygon, ClipperLib.PolyType.ptSubject, true);
        has_occlusion = true;
      });
    }

    let exposed;

    if (!has_occlusion) {
      // Top floor - no occlusion, entire ceiling is exposed
      exposed = ceiling_area;
    } else {
      // Compute union of all occlusion polygons
      const occlusion_area = new ClipperLib.Paths();
      occlusion_clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        occlusion_area,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
      );

      // Subtract occlusion from ceiling
      const diff_clipper = new ClipperLib.Clipper();
      ceiling_area.forEach(function(path) {
        diff_clipper.AddPath(path, ClipperLib.PolyType.ptSubject, true);
      });
      occlusion_area.forEach(function(path) {
        diff_clipper.AddPath(path, ClipperLib.PolyType.ptClip, true);
      });

      exposed = new ClipperLib.Paths();
      diff_clipper.Execute(
        ClipperLib.ClipType.ctDifference,
        exposed,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
      );
    }

    // Filter out tiny polygons (floating-point artifacts)
    const filtered = exposed.filter(function(path) {
      return Math.abs(ClipperLib.Clipper.Area(path)) > 1;
    });

    if (filtered.length > 0) {
      exposed_areas.push({
        'ceiling_z': current_ceiling_z,
        'polygons': filtered
      });
    }
  });

  return exposed_areas;
};


/**
 * Add roofs to the scene based on the configured roof style.
 */
beestat.component.scene.prototype.add_roofs_ = function() {
  // Resolve configured roof mode and available skeleton runtime.
  const skeleton_builder = this.get_skeleton_builder_();
  const roof_style = this.get_appearance_value_('roof_style');

  // Prefer requested roof style; fall back to flat until skeleton runtime is ready.
  if (roof_style === 'flat') {
    this.add_flat_roofs_();
  } else if (roof_style === 'hip' && skeleton_builder !== undefined) {
    this.add_hip_roofs_(skeleton_builder);
  } else {
    if (roof_style === 'hip') {
      this.listen_for_skeleton_builder_ready_();
    }
    this.add_flat_roofs_();
  }
};


/**
 * Add hip roofs using the straight skeleton algorithm.
 *
 * @param {object} skeleton_builder
 */
beestat.component.scene.prototype.add_hip_roofs_ = function(skeleton_builder) {
  // Gather exposed ceiling polygons and shared roof style settings.
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);
  const roof_color = this.get_appearance_value_('roof_color');

  // Create layer for generated roof meshes.
  const roofs_layer = new THREE.Group();
  this.floor_plan_group_.add(roofs_layer);
  this.layers_['roof'] = roofs_layer;

  const roof_pitch = beestat.component.scene.roof_pitch;

  // Build hip roof geometry per exposed polygon.
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      try {
        // Normalize polygon topology before offset/skeleton operations.
        const simplified = ClipperLib.Clipper.SimplifyPolygon(
          polygon,
          ClipperLib.PolyFillType.pftNonZero
        );

        simplified.forEach(function(simple_polygon) {
          if (simple_polygon.length < 3) {
            return;
          }

          // Expand polygon to add overhang around the exposed ceiling footprint.
          const roof_overhang = beestat.component.scene.roof_overhang;
          const clipper_offset = new ClipperLib.ClipperOffset();
          clipper_offset.AddPath(
            simple_polygon,
            ClipperLib.JoinType.jtMiter,
            ClipperLib.EndType.etClosedPolygon
          );
          const offset_polygons = new ClipperLib.Paths();
          clipper_offset.Execute(offset_polygons, roof_overhang);

          // Use the offset polygon if successful, otherwise use original
          const roof_polygon = (offset_polygons.length > 0) ? offset_polygons[0] : simple_polygon;

          // Add a thin base skirt so eaves have subtle physical thickness.
          const base_shape = new THREE.Shape();
          base_shape.moveTo(roof_polygon[0].x, roof_polygon[0].y);
          for (let i = 1; i < roof_polygon.length; i++) {
            base_shape.lineTo(roof_polygon[i].x, roof_polygon[i].y);
          }
          base_shape.closePath();

          const hip_roof_base_thickness = 4;
          const base_geometry = new THREE.ExtrudeGeometry(base_shape, {
            'depth': hip_roof_base_thickness,
            'bevelEnabled': false
          });
          const base_material = new THREE.MeshStandardMaterial({
            'color': roof_color,
            'side': THREE.DoubleSide,
            'flatShading': false,
            'roughness': 0.85,
            'metalness': 0.0
          });
          const base_mesh = new THREE.Mesh(base_geometry, base_material);
          // Nudge downward so the top cap doesn't z-fight with hip roof faces.
          base_mesh.position.z = area.ceiling_z + 0.5;
          base_mesh.userData.is_roof = true;
          base_mesh.layers.set(beestat.component.scene.layer_visible);
          base_mesh.castShadow = true;
          base_mesh.receiveShadow = true;
          roofs_layer.add(base_mesh);

          // Convert polygon into straight-skeleton input format.
          const ring = roof_polygon.map(function(point) {
            return [point.x, point.y];
          });
          ring.push([roof_polygon[0].x, roof_polygon[0].y]);

          const coordinates = [ring];
          const result = skeleton_builder.buildFromPolygon(coordinates);

          if (!result) {
            return;
          }

          // Boundary vertices stay at ceiling level; interior vertices get raised by pitch.
          const boundary_vertex_count = roof_polygon.length;
          const boundary_set = new Set();
          for (let i = 0; i < boundary_vertex_count; i++) {
            boundary_set.add(i);
          }

          // Helper: compute shortest distance from a point to roof footprint edges.
          const compute_distance_to_boundary = function(point_x, point_y) {
            let min_distance = Infinity;

            for (let i = 0; i < roof_polygon.length; i++) {
              const p1 = roof_polygon[i];
              const p2 = roof_polygon[(i + 1) % roof_polygon.length];

              // Calculate perpendicular distance from point to line segment
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const length_sq = dx * dx + dy * dy;

              if (length_sq === 0) {
                // Point to point distance
                const dist = Math.sqrt(
                  Math.pow(point_x - p1.x, 2) + Math.pow(point_y - p1.y, 2)
                );
                min_distance = Math.min(min_distance, dist);
                continue;
              }

              // Project point onto line segment
              let t = ((point_x - p1.x) * dx + (point_y - p1.y) * dy) / length_sq;
              t = Math.max(0, Math.min(1, t));

              const closest_x = p1.x + t * dx;
              const closest_y = p1.y + t * dy;

              const dist = Math.sqrt(
                Math.pow(point_x - closest_x, 2) + Math.pow(point_y - closest_y, 2)
              );

              min_distance = Math.min(min_distance, dist);
            }

            return min_distance;
          };

          // Lift interior skeleton vertices to form sloped hip planes.
          const vertices_3d = result.vertices.map(function(vertex, index) {
            const is_boundary = boundary_set.has(index);
            let height = 0;

            if (!is_boundary) {
              // Interior skeleton vertex - raise it based on distance to boundary
              const distance = compute_distance_to_boundary(vertex[0], vertex[1]);
              height = distance * roof_pitch;
            }

            return new THREE.Vector3(
              vertex[0],
              vertex[1],
              area.ceiling_z - height  // Negative Z = higher in world coords
            );
          });

          // Triangulate each skeleton face and emit a renderable mesh.
          result.polygons.forEach(function(face) {
            if (face.length < 3) {
              return;
            }

            // Create triangulated mesh for this face
            const face_vertices = face.map(function(idx) {
              return vertices_3d[idx];
            });

            // Triangulate the face (simple fan triangulation from first vertex)
            const triangles = [];
            for (let i = 1; i < face_vertices.length - 1; i++) {
              triangles.push(
                face_vertices[0],
                face_vertices[i],
                face_vertices[i + 1]
              );
            }

            // Create geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(triangles);
            geometry.computeVertexNormals();

            // Create material - use appearance roof color
            const material = new THREE.MeshStandardMaterial({
              'color': roof_color,
              'side': THREE.DoubleSide,
              'flatShading': false,
              'roughness': 0.8,
              'metalness': 0.0
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.is_roof = true;
            mesh.layers.set(beestat.component.scene.layer_visible);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            roofs_layer.add(mesh);
          });
        });
      } catch (error) {
        console.error('Error generating roof:', error, polygon);
      }
    });
  });
};


/**
 * Add flat roofs to the scene.
 */
beestat.component.scene.prototype.add_flat_roofs_ = function() {
  // Gather exposed ceiling polygons and shared roof style settings.
  const floor_plan = beestat.cache.floor_plan[this.floor_plan_id_];
  const exposed_areas = this.compute_exposed_ceiling_areas_(floor_plan);
  const roof_color = this.get_appearance_value_('roof_color');

  // Create layer for generated roof meshes.
  const roofs_layer = new THREE.Group();
  this.floor_plan_group_.add(roofs_layer);
  this.layers_['roof'] = roofs_layer;

  // Build flat roof geometry per exposed polygon.
  exposed_areas.forEach(function(area) {
    area.polygons.forEach(function(polygon) {
      if (polygon.length < 3) {
        return;
      }

      try {
        // Normalize polygon topology before offset/extrusion.
        const simplified = ClipperLib.Clipper.SimplifyPolygon(
          polygon,
          ClipperLib.PolyFillType.pftNonZero
        );

        simplified.forEach(function(simple_polygon) {
          if (simple_polygon.length < 3) {
            return;
          }

          // Expand polygon to add overhang around the exposed ceiling footprint.
          const roof_overhang = beestat.component.scene.roof_overhang;
          const clipper_offset = new ClipperLib.ClipperOffset();
          clipper_offset.AddPath(
            simple_polygon,
            ClipperLib.JoinType.jtMiter,
            ClipperLib.EndType.etClosedPolygon
          );
          const offset_polygons = new ClipperLib.Paths();
          clipper_offset.Execute(offset_polygons, roof_overhang);

          // Use the offset polygon if successful, otherwise use original
          const roof_polygon = (offset_polygons.length > 0) ? offset_polygons[0] : simple_polygon;

          // Build the flat roof footprint shape for extrusion.
          const shape = new THREE.Shape();
          shape.moveTo(roof_polygon[0].x, roof_polygon[0].y);
          for (let i = 1; i < roof_polygon.length; i++) {
            shape.lineTo(roof_polygon[i].x, roof_polygon[i].y);
          }
          shape.closePath();

          // Extrude the footprint so the flat roof has physical depth.
          const flat_roof_depth = 6; // 6 inches of depth
          const geometry = new THREE.ExtrudeGeometry(shape, {
            'depth': flat_roof_depth,
            'bevelEnabled': false
          });

          // Create material - use appearance roof color
          const material = new THREE.MeshStandardMaterial({
            'color': roof_color,
            'side': THREE.DoubleSide,
            'flatShading': false,
            'roughness': 0.9,  // Slightly higher roughness for flat roofs
            'metalness': 0.0
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.z = area.ceiling_z - flat_roof_depth;  // Position so top is at ceiling level
          mesh.userData.is_roof = true;
          mesh.layers.set(beestat.component.scene.layer_visible);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          roofs_layer.add(mesh);
        });
      } catch (error) {
        console.error('Error generating flat roof:', error, polygon);
      }
    });
  });
};


/**
 * Get the straight-skeleton runtime when it has finished initializing.
 *
 * @return {object|undefined}
 */
beestat.component.scene.prototype.get_skeleton_builder_ = function() {
  if (window.SkeletonBuilderInitialized === true) {
    return window.SkeletonBuilder;
  }
  return undefined;
};


/**
 * If the skeleton runtime is still loading, listen for readiness and rerender
 * once so hip roofs replace fallback flat roofs.
 */
beestat.component.scene.prototype.listen_for_skeleton_builder_ready_ = function() {
  const self = this;

  if (this.skeleton_builder_ready_handler_ !== undefined) {
    return;
  }

  this.skeleton_builder_ready_handler_ = function() {
    if (self.skeleton_builder_ready_handler_ !== undefined) {
      window.removeEventListener('skeleton_builder_ready', self.skeleton_builder_ready_handler_);
      delete self.skeleton_builder_ready_handler_;
    }

    if (self.rendered_ === true) {
      self.rerender();
    }
  };

  window.addEventListener('skeleton_builder_ready', this.skeleton_builder_ready_handler_);
};
