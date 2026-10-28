import { describe, expect, it } from 'vitest';
import { formatRuntime } from './runtimeData';

describe('formatRuntime', () => {
  it('matches the legacy tooltip duration format below one hour', () => {
    expect(formatRuntime(5 * 60 + 59)).toBe('0h 5m');
  });

  it('matches the legacy tooltip duration format above one hour', () => {
    expect(formatRuntime(2 * 3600 + 17 * 60)).toBe('2h 17m');
  });
});
