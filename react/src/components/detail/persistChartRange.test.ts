// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chartRangeBounds, settingDateToIso } from './persistChartRange';

describe('chart range dates', () => {
  afterEach(() => vi.useRealTimers());

  it('converts legacy and timestamp settings to date input values', () => {
    expect(settingDateToIso('10/8/2026')).toBe('2026-10-08');
    expect(settingDateToIso('2026-10-08 15:30:00')).toBe('2026-10-08');
  });

  it('clamps the available start to the rolling legacy data window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 12));
    expect(chartRangeBounds('2019-01-01', '2026-10-27', 3)).toEqual({ min: '2026-07-28', max: '2026-10-27' });
    expect(chartRangeBounds('2026-09-01', '2026-10-27', 3)).toEqual({ min: '2026-09-01', max: '2026-10-27' });
  });
});
