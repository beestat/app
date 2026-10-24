import { describe, expect, it } from 'vitest';
import { entityBounds, floorPlanArea, polygonArea, type FloorPlan } from './floorPlanModel';

const plan: FloorPlan = {
  floor_plan_id: 1,
  name: 'Test',
  data: { groups: [{
    group_id: 'ground', name: 'Ground', elevation: 0, height: 96,
    rooms: [{ room_id: 'room', x: 10, y: 20, points: [{ x: 0, y: 0 }, { x: 144, y: 0 }, { x: 144, y: 120 }, { x: 0, y: 120 }] }],
    surfaces: [], openings: [], trees: [], lights: [],
  }] },
};

describe('floor plan model', () => {
  it('computes polygon and plan area in square feet', () => {
    expect(polygonArea(plan.data.groups[0].rooms[0].points)).toBe(17_280);
    expect(floorPlanArea(plan)).toBe(120);
  });

  it('includes translated polygon coordinates in bounds', () => {
    expect(entityBounds(plan.data.groups[0])).toEqual({ x: 10, y: 20, width: 144, height: 120 });
  });
});
