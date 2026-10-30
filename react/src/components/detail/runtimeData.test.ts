import { describe, expect, it } from 'vitest';
import { buildRuntimeData, equipmentFor, formatRuntime, runtimeTickPositions } from './runtimeData';

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

describe('buildRuntimeData', () => {
  const row = (minute: number, values: Record<string, unknown>) => ({ timestamp: `2026-10-29T12:${String(minute).padStart(2, '0')}:00Z`, ...values });

  it('splits compressor seconds by compressor mode and accessories by type', () => {
    const data = buildRuntimeData([
      row(5, { compressor_mode: 'cool', compressor_1: 300, compressor_2: 120, accessory_type: 'dehumidifier', accessory: 60, fan: 300 }),
      row(0, { compressor_mode: 'heat', compressor_1: 200, auxiliary_heat_1: 30 }),
    ]);
    expect(data.timestamps).toEqual([Date.parse('2026-10-29T12:00:00Z'), Date.parse('2026-10-29T12:05:00Z')]);
    expect(data.totals).toMatchObject({ compressor_heat_1: 200, compressor_cool_1: 300, compressor_cool_2: 120, auxiliary_heat_1: 30, dehumidifier: 60, humidifier: 0, fan: 300 });
    expect(data.equipment.compressor_cool_1.points).toEqual([[data.timestamps[0], null], [data.timestamps[1], 16]]);
  });

  it('only shows a setpoint while its mode can act on it, like legacy', () => {
    const data = buildRuntimeData([
      row(0, { system_mode: 'cool', setpoint_heat: 68, setpoint_cool: 75 }),
      row(5, { system_mode: 'auxiliary_heat', setpoint_heat: 68, setpoint_cool: 75 }),
      row(10, { system_mode: 'auto', setpoint_heat: 68, setpoint_cool: 75 }),
    ]);
    expect(data.temperature.setpoint_heat.map(([, value]) => value)).toEqual([null, 68, 68]);
    expect(data.temperature.setpoint_cool.map(([, value]) => value)).toEqual([75, null, 75]);
  });

  it('maps comfort profile events onto calendar lanes', () => {
    const data = buildRuntimeData([
      row(0, { climate: 'Sleep' }),
      row(5, { event: 'smartRecovery' }),
      row(10, { event: 'ecoAway' }),
      row(15, { climate: 'Work' }),
    ]);
    expect(Object.values(data.climateAt)).toEqual(['Sleep', 'Smart Recovery', 'Eco Away', 'Work']);
    expect(data.equipment.calendar_event_custom.points.map(([, value]) => value)).toEqual([null, null, null, 3]);
  });

  it('labels equipment for the given thermostat', () => {
    const furnace = { system_type: { reported: {}, detected: { heat: { equipment: 'gas', stages: 1 }, cool: { stages: 1 }, auxiliary_heat: { stages: 1 } } } };
    expect(buildRuntimeData([], furnace).equipment.auxiliary_heat_1.name).toBe('Heat');
  });
});

describe('runtimeTickPositions', () => {
  it('picks sampled rows at roughly one label per 25 pixels', () => {
    const timestamps = Array.from({ length: 100 }, (_, index) => index * 300_000);
    const ticks = runtimeTickPositions(timestamps, 0, timestamps.at(-1)!, 500);
    expect(ticks).toHaveLength(20);
    expect(ticks.every((tick) => timestamps.includes(tick))).toBe(true);
    expect(runtimeTickPositions(timestamps, 10, 5, 500)).toEqual([]);
  });
});
