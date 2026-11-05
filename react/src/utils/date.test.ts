import { describe, expect, it } from 'vitest';
import { localDaysAgo, localDaysAgoIso } from './date';

describe('localDaysAgo', () => {
  it('preserves local wall-clock fields while subtracting calendar days', () => {
    const now = new Date(2026, 10, 5, 12, 34, 56, 789);
    const result = localDaysAgo(now, 7);
    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual([2026, 9, 29]);
    expect([result.getHours(), result.getMinutes(), result.getSeconds(), result.getMilliseconds()]).toEqual([12, 34, 56, 789]);
    expect(now.getTime()).toBe(new Date(2026, 10, 5, 12, 34, 56, 789).getTime());
  });

  it('returns the same instant as the calendar-day result in ISO form', () => {
    const now = new Date(2026, 2, 10, 8, 15);
    expect(localDaysAgoIso(now, 3)).toBe(localDaysAgo(now, 3).toISOString());
  });
});
