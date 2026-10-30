import { describe, expect, it } from 'vitest';
import { filterLifespan, filterReplaceIn } from './filterInfo';

describe('filter info', () => {
  const filter = (last_changed: string, life = 3) => ({ last_changed, life, life_units: 'month', runtime: 0 });

  it('counts days from now and truncates like Moment diff', () => {
    // Due Nov 8 at midnight; at 10am on Oct 29 that is 9.58 days away.
    expect(filterReplaceIn(filter('2026-08-08'), new Date(2026, 9, 29, 10))).toBe('9d');
    expect(filterReplaceIn(filter('2026-07-30'), new Date(2026, 9, 29, 10))).toBe('Now');
    expect(filterReplaceIn(filter('2026-07-28'), new Date(2026, 9, 29, 10))).toBe('1d overdue');
  });

  it('clamps month-end dates and splits long spans like Moment durations', () => {
    // Nov 30 + 3 months clamps to Feb 28.
    expect(filterReplaceIn(filter('2025-11-30'), new Date(2026, 0, 1, 12))).toBe('1mo 26d');
    expect(filterReplaceIn(filter('2026-10-29', 6), new Date(2026, 9, 29, 0))).toBe('5mo 29d');
  });

  it('handles runtime-hour filters', () => {
    expect(filterReplaceIn({ last_changed: '2026-01-01', life: 100, life_units: 'hour', runtime: 3600 * 40 })).toBe('60h');
    expect(filterReplaceIn({ last_changed: '2026-01-01', life: 100, life_units: 'hour', runtime: 3600 * 120 })).toBe('20h overdue');
  });

  it('pluralizes lifespan only above one', () => {
    expect(filterLifespan({ life: 3, life_units: 'month' })).toBe('3 months');
    expect(filterLifespan({ life: 1, life_units: 'month' })).toBe('1 month');
    expect(filterLifespan({ life: 500, life_units: 'hour' })).toBe('500 runtime hours');
  });
});
