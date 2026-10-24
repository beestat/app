export type SummaryPeriod = 'day' | 'week' | 'month' | 'year' | 'all';
export type SummaryGroup = Exclude<SummaryPeriod, 'all'>;

export interface SummaryConfig {
  count: number;
  period: SummaryPeriod;
  group: SummaryGroup;
}

export type SummarySourceRow = Record<string, unknown> & {
  date: string;
  count?: number;
};

export type SummaryRow = Record<string, number | string | null> & {
  date: string;
  count: number;
};

const sumKeys = [
  'sum_compressor_cool_1', 'sum_compressor_cool_2',
  'sum_compressor_heat_1', 'sum_compressor_heat_2',
  'sum_auxiliary_heat_1', 'sum_auxiliary_heat_2',
  'sum_fan', 'sum_humidifier', 'sum_dehumidifier',
  'sum_ventilator', 'sum_economizer',
  'sum_heating_degree_days', 'sum_cooling_degree_days',
] as const;

const runtimeKeys = new Set<string>(sumKeys.filter((key) => !key.includes('degree_days')));
const averageKeys = ['avg_outdoor_temperature', 'avg_outdoor_humidity', 'avg_indoor_temperature', 'avg_indoor_humidity'] as const;
const minKeys = ['min_outdoor_temperature'] as const;
const maxKeys = ['max_outdoor_temperature'] as const;

function utcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOf(date: Date, group: SummaryGroup) {
  const result = new Date(date);
  if (group === 'year') result.setUTCMonth(0, 1);
  if (group === 'month') result.setUTCDate(1);
  if (group === 'week') {
    const mondayOffset = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - mondayOffset);
  }
  return result;
}

function subtractLocal(date: Date, amount: number, period: Exclude<SummaryPeriod, 'all'>) {
  const result = new Date(date);
  if (period === 'day') result.setDate(result.getDate() - amount);
  if (period === 'week') result.setDate(result.getDate() - amount * 7);
  if (period === 'month') result.setMonth(result.getMonth() - amount);
  if (period === 'year') result.setFullYear(result.getFullYear() - amount);
  return result;
}

function localBoundary(date: Date, group: SummaryGroup) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  if (group === 'year') result.setMonth(0, 1);
  if (group === 'month') result.setDate(1);
  if (group === 'week') result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return new Date(Date.UTC(result.getFullYear(), result.getMonth(), result.getDate()));
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function expectedCount(date: Date, group: SummaryGroup) {
  if (group === 'day') return 288;
  if (group === 'week') return 2016;
  if (group === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate() * 288;
  const year = date.getUTCFullYear();
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365) * 288;
}

function beginDate(config: SummaryConfig, now: Date) {
  if (config.period === 'all') return undefined;
  const order: SummaryGroup[] = ['day', 'week', 'month', 'year'];
  const subtractOneLess = order.indexOf(config.group) >= order.indexOf(config.period);
  return localBoundary(subtractLocal(now, Math.max(0, config.count - (subtractOneLess ? 1 : 0)), config.period), config.group);
}

export function aggregateSummary(
  rows: SummarySourceRow[],
  config: SummaryConfig,
  gapFill: boolean,
  now = new Date(),
) {
  const buckets = new Map<string, SummarySourceRow[]>();
  for (const row of rows) {
    const date = utcDate(row.date);
    const key = dateKey(startOf(date, config.group));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }

  const begin = beginDate(config, now);
  const end = localBoundary(now, config.group);
  const keys = [...buckets.keys()].filter((key) => {
    const date = utcDate(key);
    return (!begin || date >= begin) && date <= end;
  }).sort();

  return keys.map((key, index): SummaryRow => {
    const bucket = buckets.get(key)!;
    const count = bucket.reduce((total, row) => total + number(row.count), 0);
    const result: SummaryRow = { date: key, count };
    for (const field of sumKeys) {
      let value = bucket.reduce((total, row) => total + number(row[field]), 0);
      if (runtimeKeys.has(field)) value /= 3600;
      if (gapFill && index < keys.length - 1 && count > 0) value *= expectedCount(utcDate(key), config.group) / count;
      result[field] = value;
    }
    for (const field of averageKeys) result[field] = Math.round(bucket.reduce((total, row) => total + number(row[field]), 0) / bucket.length);
    for (const field of minKeys) result[field] = Math.min(...bucket.map((row) => number(row[field])));
    for (const field of maxKeys) result[field] = Math.max(...bucket.map((row) => number(row[field])));
    return result;
  });
}

export function presetConfig(value: '3' | '12' | 'all'): SummaryConfig {
  if (value === '3') return { count: 3, period: 'month', group: 'day' };
  if (value === '12') return { count: 12, period: 'month', group: 'week' };
  return { count: 0, period: 'all', group: 'month' };
}

export function matchingPreset(config: SummaryConfig) {
  if (config.count === 3 && config.period === 'month' && config.group === 'day') return '3';
  if (config.count === 12 && config.period === 'month' && config.group === 'week') return '12';
  if (config.count === 0 && config.period === 'all' && config.group === 'month') return 'all';
  return 'custom';
}

export function smartScale(group: SummaryGroup) {
  if (group === 'day') return { max: 24, interval: 6 };
  if (group === 'week') return { max: 168, interval: 24 };
  if (group === 'month') return { max: 672, interval: 168 };
  return { max: 8760, interval: 2190 };
}
