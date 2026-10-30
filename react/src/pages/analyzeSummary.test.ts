import { describe, expect, it } from 'vitest';
import { aggregateSummary, legacyDurationParts, matchingPreset, presetConfig, smartScale } from './analyzeSummary';

describe('analyze summary aggregation', () => {
  const rows = [
    { date: '2026-01-31', count: 288, sum_compressor_cool_1: 3600, avg_outdoor_temperature: 30, min_outdoor_temperature: 20, max_outdoor_temperature: 40 },
    { date: '2026-02-01', count: 144, sum_compressor_cool_1: 7200, avg_outdoor_temperature: 50, min_outdoor_temperature: 45, max_outdoor_temperature: 55 },
    { date: '2026-02-02', count: 288, sum_compressor_cool_1: 10800, avg_outdoor_temperature: 70, min_outdoor_temperature: 60, max_outdoor_temperature: 80 },
  ];

  it('groups weeks on Monday and applies the legacy reducers', () => {
    const result = aggregateSummary(rows, { count: 1, period: 'year', group: 'week' }, false, new Date('2026-02-03T12:00:00Z'));
    expect(result.map((row) => row.date)).toEqual(['2026-01-26', '2026-02-02']);
    expect(result[0].sum_compressor_cool_1).toBe(3);
    expect(result[0].avg_outdoor_temperature).toBe(40);
    expect(result[0].min_outdoor_temperature).toBe(20);
    expect(result[0].max_outdoor_temperature).toBe(55);
  });

  it('gap fills completed buckets but leaves the newest bucket untouched', () => {
    const result = aggregateSummary(rows.slice(1), { count: 1, period: 'month', group: 'day' }, true, new Date('2026-02-03T12:00:00Z'));
    expect(result[0].sum_compressor_cool_1).toBe(4);
    expect(result[1].sum_compressor_cool_1).toBe(3);
  });

  it('defines the exact legacy presets and smart scales', () => {
    expect(matchingPreset(presetConfig('12'))).toBe('12');
    expect(presetConfig('all')).toEqual({ count: 0, period: 'all', group: 'month' });
    expect(smartScale('year')).toEqual({ max: 8760, interval: 2190 });
  });

  it('uses local calendar dates for range boundaries', () => {
    const summer = [
      { date: '2026-07-23', count: 288, sum_compressor_cool_1: 3600 },
      { date: '2026-07-24', count: 288, sum_compressor_cool_1: 7200 },
    ];
    const result = aggregateSummary(summer, presetConfig('3'), false, new Date(2026, 9, 23, 21, 30));
    expect(result.map((row) => row.date)).toEqual(['2026-07-23', '2026-07-24']);
  });
});

describe('legacy runtime chip durations', () => {
  it('matches Moment minute truncation on real totals', () => {
    // Values and expected text captured from legacy beestat.time on dev.
    expect(legacyDurationParts(568.8166666666666)).toEqual({ hours: 568, minutes: 49 });
    expect(legacyDurationParts(6601.649999999998)).toEqual({ hours: 6601, minutes: 38 });
    expect(legacyDurationParts(11684.783333333331)).toEqual({ hours: 11684, minutes: 46 });
    expect(legacyDurationParts(9736.129166666662)).toEqual({ hours: 9736, minutes: 7 });
  });
});
