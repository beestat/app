import { describe, expect, it } from 'vitest';
import { equipmentFor, formatRuntime } from './runtimeData';

describe('formatRuntime', () => {
  it('matches the legacy tooltip duration format below one hour', () => {
    expect(formatRuntime(5 * 60 + 59)).toBe('0h 5m');
  });

  it('matches the legacy tooltip duration format above one hour', () => {
    expect(formatRuntime(2 * 3600 + 17 * 60)).toBe('2h 17m');
  });
});

describe('equipmentFor', () => {
  const thermostat = (heat: string, stages: Record<string, number>) => ({ system_type: {
    reported: { heat: { equipment: null, stages: null }, cool: { equipment: null, stages: null }, auxiliary_heat: { equipment: null, stages: null } },
    detected: { heat: { equipment: heat, stages: stages.heat }, cool: { equipment: 'compressor', stages: stages.cool }, auxiliary_heat: { equipment: 'electric', stages: stages.auxiliary_heat } },
  } });

  it('numbers first stages only when a second stage exists', () => {
    const meta = equipmentFor(thermostat('compressor', { heat: 2, cool: 2, auxiliary_heat: 1 }));
    expect([meta.compressor_heat_1.name, meta.compressor_cool_1.name, meta.auxiliary_heat_1.name, meta.auxiliary_heat_2.name]).toEqual(['Heat 1', 'Cool 1', 'Aux', 'Aux 2']);
    expect(equipmentFor(thermostat('compressor', { heat: 1, cool: 1, auxiliary_heat: 2 })).auxiliary_heat_1.name).toBe('Aux Heat 1');
  });

  it('treats auxiliary stages as primary heat when the heat is not a heat pump', () => {
    const meta = equipmentFor(thermostat('gas', { heat: 1, cool: 1, auxiliary_heat: 2 }));
    expect(meta.auxiliary_heat_1).toMatchObject({ name: 'Heat', color: meta.compressor_heat_1.color });
    expect(meta.auxiliary_heat_2).toMatchObject({ name: 'Heat 2', color: meta.compressor_heat_2.color });
  });

  it('prefers reported config over detected', () => {
    const value = thermostat('gas', { heat: 1, cool: 1, auxiliary_heat: 1 });
    value.system_type.reported.heat = { equipment: 'compressor', stages: 2 } as any;
    expect(equipmentFor(value)).toMatchObject({ compressor_heat_1: { name: 'Heat 1' }, auxiliary_heat_1: { name: 'Aux' } });
  });
});
