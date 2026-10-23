import { describe, expect, it } from 'vitest';
import { formatDuration, formatTemperature, titleCase } from './format';

describe('format utilities', () => {
  it('formats temperatures without mutating the unit', () => {
    expect(formatTemperature(71.06, 'F')).toBe('71.1°F');
    expect(formatTemperature(null, 'C')).toBe('—');
  });

  it('formats runtime durations', () => {
    expect(formatDuration(65 * 60)).toBe('1h 05m');
    expect(formatDuration(12 * 60)).toBe('12m');
  });

  it('turns API keys into labels', () => {
    expect(titleCase('auxiliary_heat_1')).toBe('Auxiliary Heat 1');
  });
});
