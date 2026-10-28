import { describe, expect, it } from 'vitest';
import { localTimestamp } from './downloadDates';

describe('download timestamp formatting', () => {
  it('keeps the selected local calendar dates and legacy times', () => {
    const begin = localTimestamp('2026-10-28', 0, 0);
    const end = localTimestamp('2026-10-28', 23, 55);
    expect(begin).toMatch(/^2026-10-28T00:00:00[+-]\d{2}:\d{2}$/);
    expect(end).toMatch(/^2026-10-28T23:55:00[+-]\d{2}:\d{2}$/);
  });
});
