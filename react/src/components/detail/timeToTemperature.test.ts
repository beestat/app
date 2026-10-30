import { describe, expect, it } from 'vitest';
import { operatingMode, timeToTemperature } from './timeToTemperature';

const profile = (mode: string, slope: number, intercept: number) => ({ temperature: { [mode]: { linear_trendline: { slope, intercept } } } });
const base = { temperature: 68, setpointHeat: 70, setpointCool: 76, outdoorTemperature: 40 };

describe('time to temperature', () => {
  it('uses legacy operating mode priority rather than list order', () => {
    expect(operatingMode(['cool_1', 'heat_2', 'auxiliary_heat_1'])).toBe('auxiliary_heat_1');
    expect(operatingMode(['fan'])).toBeUndefined();
  });

  it('hides when off or already at the setpoint', () => {
    expect(timeToTemperature({ ...base, running: ['fan'] })).toBeUndefined();
    expect(timeToTemperature({ ...base, running: ['heat_1'], temperature: 70 })).toBeUndefined();
  });

  it('formats like beestat.time with a moment h:mm a clock', () => {
    // 2 degrees at 1.6 degrees per hour is 1.25h.
    const result = timeToTemperature({ ...base, running: ['heat_1'], profile: profile('heat_1', 0, 1.6) }, new Date(2026, 9, 30, 14, 0));
    expect(result).toEqual({ mode: 'heat', rate: 1.6, text: '1h 15m (3:15 pm)' });
    const short = timeToTemperature({ ...base, running: ['heat_1'], profile: profile('heat_1', 0, 4.8) }, new Date(2026, 9, 30, 9, 0));
    expect(short?.text).toBe('25m (9:25 am)');
  });

  it('reports Never for rates that round to zero, including exactly zero', () => {
    expect(timeToTemperature({ ...base, running: ['heat_1'], profile: profile('heat_1', 0, 0) })?.text).toBe('Never');
    expect(timeToTemperature({ ...base, running: ['cool_1'], temperature: 78, profile: profile('cool_1', 0, -0.04) })?.text).toBe('Never');
  });

  it('reports Unknown without profile data', () => {
    expect(timeToTemperature({ ...base, running: ['auxiliary_heat_1'], profile: null })).toEqual({ mode: 'heat', text: 'Unknown' });
  });
});
