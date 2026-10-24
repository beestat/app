import { colors } from '../../theme';

export type RuntimeRow = Record<string, unknown> & { timestamp: string };
export type Point = [number, number | null];

export const equipment = {
  compressor_heat_1: { name: 'Heat', color: colors.orange.light, y: 16, width: 12 },
  compressor_heat_2: { name: 'Heat 2', color: colors.orange.dark, y: 16, width: 12 },
  auxiliary_heat_1: { name: 'Aux', color: colors.red.main, y: 16, width: 12 },
  auxiliary_heat_2: { name: 'Aux 2', color: colors.red.dark, y: 16, width: 12 },
  compressor_cool_1: { name: 'Cool', color: colors.lightBlue.light, y: 16, width: 12 },
  compressor_cool_2: { name: 'Cool 2', color: colors.lightBlue.main, y: 16, width: 12 },
  fan: { name: 'Fan', color: colors.gray.main, y: 29, width: 6 },
  humidifier: { name: 'Humidifier', color: colors.gray.light, y: 39, width: 6 },
  dehumidifier: { name: 'Dehumidifier', color: colors.gray.light, y: 39, width: 6 },
  ventilator: { name: 'Ventilator', color: colors.gray.light, y: 39, width: 6 },
  economizer: { name: 'Economizer', color: colors.gray.light, y: 39, width: 6 },
} as const;

export type EquipmentCode = keyof typeof equipment;

const calendar = {
  smartrecovery: { code: 'calendar_event_smartrecovery', name: 'Smart Recovery', color: colors.yellow.main },
  home: { code: 'calendar_event_home', name: 'Home', color: colors.green.main },
  away: { code: 'calendar_event_away', name: 'Away', color: colors.gray.main },
  sleep: { code: 'calendar_event_sleep', name: 'Sleep', color: colors.purple.light },
  smarthome: { code: 'calendar_event_smarthome', name: 'Smart Home', color: colors.yellow.main },
  smartaway: { code: 'calendar_event_smartaway', name: 'Smart Away', color: colors.yellow.main },
  hold: { code: 'calendar_event_hold', name: 'Hold', color: colors.gray.main },
  vacation: { code: 'calendar_event_vacation', name: 'Vacation', color: colors.blue.main },
  quicksave: { code: 'calendar_event_quicksave', name: 'Quick Save', color: colors.gray.main },
  door: { code: 'calendar_event_door_window_open', name: 'Door/Window Open', color: colors.teal.light },
  other: { code: 'calendar_event_other', name: 'Other', color: colors.gray.main },
  custom: { code: 'calendar_event_custom', name: 'Custom', color: colors.teal.main },
} as const;

type CalendarValue = { code: string; name: string; color: string };

function calendarValue(row: RuntimeRow): CalendarValue {
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
  temperature: Record<'indoor_temperature' | 'outdoor_temperature' | 'setpoint_heat' | 'setpoint_cool' | 'indoor_humidity' | 'outdoor_humidity', Point[]>;
  equipment: Record<string, { name: string; color: string; width: number; points: Point[] }>;
  totals: Record<EquipmentCode, number>;
  climateAt: Record<number, string>;
}

export function buildRuntimeData(input: RuntimeRow[]): RuntimeChartData {
  const rows = [...input].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const result: RuntimeChartData = {
    min: rows.length ? Date.parse(rows[0].timestamp) : Date.now(),
    max: rows.length ? Date.parse(rows.at(-1)!.timestamp) : Date.now(),
    temperature: { indoor_temperature: [], outdoor_temperature: [], setpoint_heat: [], setpoint_cool: [], indoor_humidity: [], outdoor_humidity: [] },
    equipment: {},
    totals: Object.fromEntries(Object.keys(equipment).map((key) => [key, 0])) as Record<EquipmentCode, number>,
    climateAt: {},
  };
  Object.entries(equipment).forEach(([code, meta]) => { result.equipment[code] = { ...meta, points: [] }; });
  Object.values(calendar).forEach((meta) => { result.equipment[meta.code] = { name: meta.name, color: meta.color, width: 6, points: [] }; });

  rows.forEach((row) => {
    const x = Date.parse(row.timestamp);
    result.temperature.indoor_temperature.push([x, number(row, 'indoor_temperature')]);
    result.temperature.outdoor_temperature.push([x, number(row, 'outdoor_temperature')]);
    result.temperature.indoor_humidity.push([x, number(row, 'indoor_humidity')]);
    result.temperature.outdoor_humidity.push([x, number(row, 'outdoor_humidity')]);
    const mode = String(row.system_mode ?? '');
    result.temperature.setpoint_heat.push([x, ['auto', 'heat', 'auxiliary_heat'].includes(mode) ? number(row, 'setpoint_heat') : null]);
    result.temperature.setpoint_cool.push([x, ['auto', 'cool'].includes(mode) ? number(row, 'setpoint_cool') : null]);

    const activeCalendar = calendarValue(row);
    result.climateAt[x] = activeCalendar.name;
    Object.keys(result.equipment).filter((key) => key.startsWith('calendar_event_')).forEach((code) => {
      result.equipment[code].points.push([x, code === activeCalendar.code ? 3 : null]);
    });
    (Object.keys(equipment) as EquipmentCode[]).forEach((code) => {
      const seconds = equipmentSeconds(row, code);
      result.totals[code] += seconds;
      result.equipment[code].points.push([x, seconds > 0 ? equipment[code].y : null]);
    });
  });
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
  const hour = date.toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '').toLowerCase();
  return `${dayChanged ? `${day} ` : ''}${hour}`;
}

export function unitLabel(unit: string) {
  return unit.startsWith('°') ? unit : `°${unit}`;
}
