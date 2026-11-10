import { describe, expect, it } from 'vitest';
import { exportFilename } from './chartExport';

describe('exportFilename', () => {
  const now = new Date(2026, 10, 10);

  it('uses a short subtitle', () => {
    expect(exportFilename('Thermostat Detail', 'Past 7 days', now)).toBe('Thermostat Detail - Past 7 days.png');
  });

  it('falls back to the date for long or missing subtitles', () => {
    expect(exportFilename('Temperature Profiles', 'Generated Nov 5th, 2026 @ 7 am from the past year of data (updated weekly).', now)).toBe('Temperature Profiles - 2026-11-10.png');
    expect(exportFilename('Temperature Profiles', undefined, now)).toBe('Temperature Profiles - 2026-11-10.png');
  });

  it('removes characters that are invalid in file names', () => {
    expect(exportFilename('Sensor Detail', '10/1/2026 to 10/3/2026', now)).toBe('Sensor Detail - 10-1-2026 to 10-3-2026.png');
  });
});
