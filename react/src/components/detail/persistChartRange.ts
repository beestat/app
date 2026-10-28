import { apiBatch } from '../../api/client';

function legacyDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${month}/${day}/${year}`;
}

export function settingDateToIso(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return undefined;
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

export function persistChartRange(prefix: string, range: { days: number } | { begin: string; end: string }) {
  const entries: Array<[string, unknown]> = 'days' in range
    ? [[`${prefix}_range_dynamic`, range.days], [`${prefix}_range_type`, 'dynamic']]
    : [[`${prefix}_range_static_begin`, legacyDate(range.begin)], [`${prefix}_range_static_end`, legacyDate(range.end)], [`${prefix}_range_type`, 'static']];
  return apiBatch(entries.map(([key, value], index) => ({ resource: 'user', method: 'update_setting', alias: `range_${index}`, arguments: { key, value } })));
}
