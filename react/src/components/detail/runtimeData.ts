import { colors, type ThemeColors } from '../../theme';

export type RuntimeRow = Record<string, unknown> & { timestamp: string };
export type Point = [number, number | null];

function makeEquipment(palette: ThemeColors) {
  return {
    compressor_heat_1: { name: 'Heat', color: palette.orange.light, y: 16, width: 12 }, compressor_heat_2: { name: 'Heat 2', color: palette.orange.dark, y: 16, width: 12 },
    auxiliary_heat_1: { name: 'Aux', color: palette.red.main, y: 16, width: 12 }, auxiliary_heat_2: { name: 'Aux 2', color: palette.red.dark, y: 16, width: 12 },
    compressor_cool_1: { name: 'Cool', color: palette.lightBlue.light, y: 16, width: 12 }, compressor_cool_2: { name: 'Cool 2', color: palette.lightBlue.main, y: 16, width: 12 },
    fan: { name: 'Fan', color: palette.gray.main, y: 29, width: 6 }, humidifier: { name: 'Humidifier', color: palette.gray.light, y: 39, width: 6 },
    dehumidifier: { name: 'Dehumidifier', color: palette.gray.light, y: 39, width: 6 }, ventilator: { name: 'Ventilator', color: palette.gray.light, y: 39, width: 6 },
    economizer: { name: 'Economizer', color: palette.gray.light, y: 39, width: 6 },
  } as const;
}

export const equipment = makeEquipment(colors);

export type EquipmentCode = keyof typeof equipment;

function makeCalendar(palette: ThemeColors) {
  return {
    smartrecovery: { code: 'calendar_event_smartrecovery', name: 'Smart Recovery', color: palette.yellow.main }, home: { code: 'calendar_event_home', name: 'Home', color: palette.green.main },
    away: { code: 'calendar_event_away', name: 'Away', color: palette.gray.main }, sleep: { code: 'calendar_event_sleep', name: 'Sleep', color: palette.purple.light },
    smarthome: { code: 'calendar_event_smarthome', name: 'Smart Home', color: palette.yellow.main }, smartaway: { code: 'calendar_event_smartaway', name: 'Smart Away', color: palette.yellow.main },
    hold: { code: 'calendar_event_hold', name: 'Hold', color: palette.gray.main }, vacation: { code: 'calendar_event_vacation', name: 'Vacation', color: palette.blue.main },
    quicksave: { code: 'calendar_event_quicksave', name: 'Quick Save', color: palette.gray.main }, door: { code: 'calendar_event_door_window_open', name: 'Door/Window Open', color: palette.teal.light },
    other: { code: 'calendar_event_other', name: 'Other', color: palette.gray.main }, custom: { code: 'calendar_event_custom', name: 'Custom', color: palette.teal.main },
  } as const;
}

const calendar = makeCalendar(colors);

type CalendarValue = { code: string; name: string; color: string };

function calendarValue(row: RuntimeRow, values = calendar): CalendarValue {
  const event = String(row.event ?? '');
  if (!event) {
    const climate = String(row.climate ?? '');
    if (!climate) return calendar.other;
    const known = calendar[climate.toLowerCase() as 'home' | 'away' | 'sleep'];
    return known ?? { ...calendar.custom, name: climate };
  }
  if (/SmartRecovery/i.test(event)) return calendar.smartrecovery;
  if (/^home$/i.test(event)) return calendar.home;
  if (/^away$/i.test(event)) return calendar.away;
  if (/^(smarthome|ecohome)$/i.test(event)) return { ...calendar.smarthome, name: /^eco/i.test(event) ? 'Eco Home' : 'Smart Home' };
  if (/^(smartaway|ecoaway)/i.test(event)) return { ...calendar.smartaway, name: /^eco/i.test(event) ? 'Eco Away' : 'Smart Away' };
  if (/^(auto|today|hold)$/i.test(event)) return calendar.hold;
  if (/^vacation$/i.test(event) || /(\S\S\S\s\d+\s\d{4})|(\d{12})/i.test(event)) return calendar.vacation;
  if (/^quicksave$/i.test(event)) return calendar.quicksave;
  if (/^dwOpen$/i.test(event)) return calendar.door;
  return calendar.other;
}

function number(row: RuntimeRow, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function equipmentSeconds(row: RuntimeRow, code: EquipmentCode): number {
  if (code.startsWith('compressor_heat_') && row.compressor_mode !== 'heat') return 0;
  if (code.startsWith('compressor_cool_') && row.compressor_mode !== 'cool') return 0;
  if (code.startsWith('compressor_')) return number(row, code.replace(/compressor_(heat|cool)/, 'compressor')) ?? 0;
  if (code === 'humidifier' || code === 'dehumidifier' || code === 'ventilator' || code === 'economizer') {
    return row.accessory_type === code ? number(row, 'accessory') ?? 0 : 0;
  }
  return number(row, code) ?? 0;
}

export interface RuntimeChartData {
  min: number;
  max: number;
  timestamps: number[];
  temperature: Record<'indoor_temperature' | 'outdoor_temperature' | 'setpoint_heat' | 'setpoint_cool' | 'indoor_humidity' | 'outdoor_humidity', Point[]>;
  equipment: Record<string, { name: string; color: string; width: number; points: Point[] }>;
  totals: Record<EquipmentCode, number>;
  climateAt: Record<number, string>;
  systemModeAt: Record<number, string>;
  equipmentAt: Record<number, Partial<Record<EquipmentCode, number>>>;
  /** Tooltip durations per timestamp: the full length of the run (or off period) that the timestamp belongs to. */
  durationAt: Record<number, Partial<Record<DurationCode, number>>>;
}

export type DurationCode = EquipmentCode | 'off_heat_cool';

// Legacy beestat.runtime_thermostat equipment loop order.
const durationEquipment: EquipmentCode[] = ['fan', 'compressor_heat_1', 'compressor_heat_2', 'auxiliary_heat_1', 'auxiliary_heat_2', 'compressor_cool_1', 'compressor_cool_2', 'humidifier', 'dehumidifier', 'ventilator', 'economizer'];

/**
 * Port of the duration bookkeeping in legacy beestat.runtime_thermostat.get_data.
 * Legacy stores a reference to a running {seconds} object at each timestamp and keeps
 * adding to it, so every point of a run reports the run's total length. Objects are
 * replaced (not zeroed) on reset, which ends a run. Raw row values are compared exactly
 * as legacy does, including its === 0 reset checks.
 */
function legacyDurations(rows: RuntimeRow[]) {
  type Duration = { seconds: number };
  const durations: Record<DurationCode, Duration> = Object.fromEntries([...Object.keys(equipment), 'off_heat_cool'].map((code) => [code, { seconds: 0 }])) as Record<DurationCode, Duration>;
  const references: Record<number, Partial<Record<DurationCode, Duration>>> = {};
  rows.forEach((row) => {
    const value = (field: string) => row[field] as any;
    const x = Date.parse(row.timestamp);
    const refs: Partial<Record<DurationCode, Duration>> = references[x] = {};

    if (value('compressor_1') === 0 && value('compressor_2') === 0 && (['compressor_heat_1', 'compressor_heat_2', 'compressor_cool_1', 'compressor_cool_2'] as const).some((code) => durations[code].seconds > 0)) {
      (['compressor_heat_1', 'compressor_heat_2', 'compressor_cool_1', 'compressor_cool_2'] as const).forEach((code) => { durations[code] = { seconds: 0 }; });
    }
    if (value('auxiliary_heat_1') === 0 && value('auxiliary_heat_2') === 0 && (durations.auxiliary_heat_1.seconds > 0 || durations.auxiliary_heat_2.seconds > 0)) {
      durations.auxiliary_heat_1 = { seconds: 0 };
      durations.auxiliary_heat_2 = { seconds: 0 };
    }
    if (value('fan') === 0) durations.fan = { seconds: 0 };
    if (value('accessory') === 0) (['humidifier', 'dehumidifier', 'ventilator', 'economizer'] as const).forEach((code) => { durations[code] = { seconds: 0 }; });

    const longest = Math.max(value('compressor_1'), value('compressor_2'), value('auxiliary_heat_1'), value('auxiliary_heat_2'));
    if (durations.off_heat_cool.seconds === 0 && value('compressor_1') + value('compressor_2') < 300 && value('auxiliary_heat_1') + value('auxiliary_heat_2') < 300) {
      durations.off_heat_cool = { seconds: 300 - longest };
    } else if (durations.off_heat_cool.seconds > 0 && (value('compressor_1') > 0 || value('compressor_2') > 0 || value('auxiliary_heat_1') > 0 || value('auxiliary_heat_2') > 0)) {
      durations.off_heat_cool.seconds += 300 - longest;
      durations.off_heat_cool = { seconds: 0 };
    } else if (durations.off_heat_cool.seconds > 0) {
      durations.off_heat_cool.seconds += 300;
    }
    refs.off_heat_cool = durations.off_heat_cool;

    durationEquipment.forEach((code) => {
      const seconds = equipmentSeconds(row, code);
      if (!(seconds > 0)) return;
      refs[code] = durations[code];
      if (code === 'auxiliary_heat_1' || code === 'compressor_heat_1' || code === 'compressor_cool_1') {
        const second = code.replace('1', '2') as EquipmentCode;
        refs[second] = durations[second];
      }
      durations[code].seconds += seconds;
      if (code.endsWith('2')) {
        const first = code.replace('2', '1') as EquipmentCode;
        refs[first] = durations[first];
      }
    });
  });
  return Object.fromEntries(Object.entries(references).map(([x, refs]) => [x, Object.fromEntries(Object.entries(refs).map(([code, duration]) => [code, duration!.seconds]))])) as Record<number, Partial<Record<DurationCode, number>>>;
}

// Legacy beestat.thermostat.get_stages / get_system_type: reported config wins over detected.
export function stageCount(thermostat: any, mode: string) {
  const systemType = thermostat?.system_type;
  return Number(systemType?.reported?.[mode]?.stages ?? systemType?.detected?.[mode]?.stages ?? 0);
}

export function systemType(thermostat: any, mode: string) {
  const systemType = thermostat?.system_type;
  return String(systemType?.reported?.[mode]?.equipment ?? systemType?.detected?.[mode]?.equipment ?? 'unknown');
}

/**
 * Equipment names and colors for one thermostat, applying legacy layer/load.js:
 * first stages are numbered only when a second stage exists, and on systems
 * whose heat is not a heat pump the auxiliary stages are the primary heat.
 */
export type EquipmentMeta = Record<EquipmentCode, { name: string; color: string; y: number; width: number }>;

export function equipmentFor(thermostat: any, palette: ThemeColors = colors): EquipmentMeta {
  const themedEquipment = makeEquipment(palette);
  const result = Object.fromEntries(Object.entries(themedEquipment).map(([code, meta]) => [code, { ...meta }])) as EquipmentMeta;
  if (stageCount(thermostat, 'heat') > 1) result.compressor_heat_1.name = 'Heat 1';
  if (stageCount(thermostat, 'auxiliary_heat') > 1) result.auxiliary_heat_1.name = 'Aux Heat 1';
  if (stageCount(thermostat, 'cool') > 1) result.compressor_cool_1.name = 'Cool 1';
  if (thermostat && !['compressor', 'geothermal'].includes(systemType(thermostat, 'heat'))) {
    result.auxiliary_heat_1 = { ...result.auxiliary_heat_1, name: result.compressor_heat_1.name, color: result.compressor_heat_1.color };
    result.auxiliary_heat_2 = { ...result.auxiliary_heat_2, name: result.compressor_heat_2.name, color: result.compressor_heat_2.color };
  }
  return result;
}

export function buildRuntimeData(input: RuntimeRow[], thermostat?: any, palette: ThemeColors = colors): RuntimeChartData {
  const meta = equipmentFor(thermostat, palette);
  const calendarValues = makeCalendar(palette);
  const rows = [...input].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const result: RuntimeChartData = {
    min: rows.length ? Date.parse(rows[0].timestamp) : Date.now(),
    max: rows.length ? Date.parse(rows.at(-1)!.timestamp) : Date.now(),
    timestamps: [],
    temperature: { indoor_temperature: [], outdoor_temperature: [], setpoint_heat: [], setpoint_cool: [], indoor_humidity: [], outdoor_humidity: [] },
    equipment: {},
    totals: Object.fromEntries(Object.keys(equipment).map((key) => [key, 0])) as Record<EquipmentCode, number>,
    climateAt: {},
    systemModeAt: {},
    equipmentAt: {},
    durationAt: {},
  };
  Object.entries(meta).forEach(([code, value]) => { result.equipment[code] = { ...value, points: [] }; });
  Object.values(calendarValues).forEach((meta) => { result.equipment[meta.code] = { name: meta.name, color: meta.color, width: 6, points: [] }; });

  rows.forEach((row) => {
    const x = Date.parse(row.timestamp);
    result.timestamps.push(x);
    result.temperature.indoor_temperature.push([x, number(row, 'indoor_temperature')]);
    result.temperature.outdoor_temperature.push([x, number(row, 'outdoor_temperature')]);
    result.temperature.indoor_humidity.push([x, number(row, 'indoor_humidity')]);
    result.temperature.outdoor_humidity.push([x, number(row, 'outdoor_humidity')]);
    const mode = String(row.system_mode ?? '');
    result.systemModeAt[x] = mode;
    result.equipmentAt[x] = {};
    result.temperature.setpoint_heat.push([x, ['auto', 'heat', 'auxiliary_heat'].includes(mode) ? number(row, 'setpoint_heat') : null]);
    result.temperature.setpoint_cool.push([x, ['auto', 'cool'].includes(mode) ? number(row, 'setpoint_cool') : null]);

    const activeCalendar = calendarValue(row, calendarValues);
    result.climateAt[x] = activeCalendar.name;
    Object.keys(result.equipment).filter((key) => key.startsWith('calendar_event_')).forEach((code) => {
      result.equipment[code].points.push([x, code === activeCalendar.code ? 3 : null]);
    });
    (Object.keys(meta) as EquipmentCode[]).forEach((code) => {
      const seconds = equipmentSeconds(row, code);
      result.equipmentAt[x][code] = seconds;
      result.totals[code] += seconds;
      result.equipment[code].points.push([x, seconds > 0 ? meta[code].y : null]);
    });
  });
  result.durationAt = legacyDurations(rows);
  return result;
}

export function formatRuntime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toLocaleString();
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function runtimeAxisLabel(value: number, tickPositions?: readonly number[]) {
  const date = new Date(value);
  const positions = tickPositions ?? [];
  const index = positions.indexOf(value);
  const previous = index > 0 ? new Date(positions[index - 1]) : undefined;
  const dayChanged = !previous || previous.getFullYear() !== date.getFullYear() || previous.getMonth() !== date.getMonth() || previous.getDate() !== date.getDate();
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const hour24 = date.getHours();
  const hour = `${hour24 % 12 || 12}${hour24 < 12 ? 'am' : 'pm'}`;
  return `${dayChanged ? `${day} ` : ''}${hour}`;
}

export function runtimeTickPositions(timestamps: readonly number[], min: number, max: number, width: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const visible = timestamps.filter((timestamp) => timestamp >= min && timestamp <= max);
  if (!visible.length) return [];
  // The legacy chart uses a category axis and selects roughly one rotated
  // label per 25 plot pixels. Select actual sampled rows as it does; adding a
  // fixed five-minute duration drifts whenever an API sample is absent.
  const interval = Math.max(1, Math.ceil(visible.length * 25 / Math.max(1, width)));
  return visible.filter((_, index) => index % interval === 0);
}

export function unitLabel(unit: string) {
  return unit.startsWith('°') ? unit : `°${unit}`;
}
