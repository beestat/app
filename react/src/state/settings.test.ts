// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSetting, setSetting } from './settings';

describe('local settings', () => {
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('round-trips values under the beestat prefix', () => {
    setSetting('thermostat_id', 34012);
    expect(localStorage.getItem('beestat.react.thermostat_id')).toBe('34012');
    expect(getSetting('thermostat_id', 0)).toBe(34012);
    expect(getSetting('missing', 'fallback')).toBe('fallback');
  });

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    expect(() => setSetting('thermostat_id', 1)).not.toThrow();
    expect(getSetting('thermostat_id', 7)).toBe(7);
  });
});
