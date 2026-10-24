export interface FloorPoint { x: number; y: number }

export interface FloorEntity {
  x: number;
  y: number;
  name?: string;
  editor_hidden?: boolean;
  editor_locked?: boolean;
  [key: string]: unknown;
}

export interface PolygonEntity extends FloorEntity {
  points: FloorPoint[];
  color?: string;
}

export interface Room extends PolygonEntity {
  room_id: string;
  sensor_id?: number;
  ceiling_height?: number;
}

export interface Surface extends PolygonEntity { surface_id: string }
export interface Opening extends FloorEntity {
  opening_id: string;
  type?: 'window' | 'door' | 'empty' | string;
  points: FloorPoint[];
  width?: number;
}
export interface Tree extends FloorEntity { tree_id: string; diameter?: number; type?: string }
export interface Light extends FloorEntity { light_id: string; temperature_k?: number }

export interface FloorGroup {
  group_id: string;
  name?: string;
  icon?: string;
  elevation?: number;
  height?: number;
  rooms: Room[];
  surfaces: Surface[];
  openings: Opening[];
  trees: Tree[];
  lights: Light[];
}

export interface FloorPlan {
  floor_plan_id: number;
  name: string;
  data: {
    groups: FloorGroup[];
    appearance?: Record<string, unknown>;
    scene?: Record<string, unknown>;
  };
}

export type EntityType = 'rooms' | 'surfaces' | 'openings' | 'trees' | 'lights';

export function polygonArea(points: FloorPoint[]) {
  return Math.abs(points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2);
}

export function floorPlanArea(plan: FloorPlan) {
  return Math.round(plan.data.groups.reduce((total, group) => total + group.rooms.reduce((sum, room) => sum + polygonArea(room.points), 0), 0) / 144);
}

export function entityId(type: EntityType, entity: FloorEntity) {
  return String(entity[`${type.slice(0, -1)}_id`] ?? '');
}

export function entityBounds(group: FloorGroup) {
  const points: FloorPoint[] = [];
  const appendPolygon = (entity: PolygonEntity | Opening) => entity.points.forEach((point) => points.push({ x: entity.x + point.x, y: entity.y + point.y }));
  group.rooms.forEach(appendPolygon);
  group.surfaces.forEach(appendPolygon);
  group.openings.forEach((opening) => opening.points.forEach((point) => points.push(point)));
  group.trees.forEach((tree) => { const radius = Number(tree.diameter ?? 72) / 2; points.push({ x: tree.x - radius, y: tree.y - radius }, { x: tree.x + radius, y: tree.y + radius }); });
  group.lights.forEach((light) => points.push({ x: light.x - 8, y: light.y - 8 }, { x: light.x + 8, y: light.y + 8 }));
  if (!points.length) return { x: 0, y: 0, width: 800, height: 500 };
  const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x || 1, height: Math.max(...ys) - y || 1 };
}
