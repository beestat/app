import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiBatch } from '../../api/client';
import type { Sensor } from '../../types';
import type { FloorPlan } from './floorPlanModel';

interface RuntimeSensorRow { sensor_id: number; timestamp: string; temperature: number | null; occupancy: boolean | null }
export interface VisualizeRuntime {
  series: Record<'temperature' | 'occupancy', Record<number, Record<number, number>>>;
  min: Record<'temperature' | 'occupancy', number>;
  max: Record<'temperature' | 'occupancy', number>;
}

function localBoundary(date: Date, end = false) {
  const copy = new Date(date); copy.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, 0); return copy.toISOString();
}

function parseLegacyDate(value: string) {
  const [month, day, year] = value.split('/').map(Number); return new Date(year, month - 1, day);
}

function rangeFor(settings: Record<string, any>) {
  if (settings.range_type === 'static' && settings.range_static?.begin && settings.range_static?.end) return [localBoundary(parseLegacyDate(settings.range_static.begin)), localBoundary(parseLegacyDate(settings.range_static.end), true)];
  const days = Number(settings.range_dynamic ?? 7); const begin = new Date(); const end = new Date();
  if (days === 0 || days === 1) { begin.setDate(begin.getDate() - days); end.setDate(begin.getDate()); }
  else { begin.setDate(begin.getDate() - days); end.setDate(end.getDate() - 1); }
  return [localBoundary(begin), localBoundary(end, true)];
}

export function useVisualizeRuntime(plan: FloorPlan, sensors: Record<string, Sensor>, settings: Record<string, any>) {
  const sensorIds = useMemo(() => [...new Set(plan.data.groups.flatMap((group) => group.rooms.map((room) => room.sensor_id).filter((id): id is number => id != null)))], [plan]);
  const range = useMemo(() => rangeFor(settings), [settings.range_dynamic, settings.range_static?.begin, settings.range_static?.end, settings.range_type]);
  const query = useQuery({
    queryKey: ['visualize-runtime', sensorIds, range],
    enabled: sensorIds.length > 0,
    queryFn: ({ signal }) => apiBatch<Record<string, RuntimeSensorRow[]>>(sensorIds.map((sensorId) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensorId}`, arguments: { attributes: { sensor_id: sensorId, timestamp: { value: range, operator: 'between' } } } })), signal),
    staleTime: 5 * 60_000,
  });
  const data = useMemo<VisualizeRuntime>(() => {
    const sums: Record<'temperature' | 'occupancy', Record<number, Record<number, { total: number; count: number }>>> = { temperature: {}, occupancy: {} };
    sensorIds.forEach((sensorId) => {
      sums.temperature[sensorId] = {}; sums.occupancy[sensorId] = {};
      (query.data?.[`sensor_${sensorId}`] ?? []).forEach((row) => {
        const date = new Date(row.timestamp); const minute = date.getHours() * 60 + Math.floor(date.getMinutes() / 5) * 5;
        const values = { temperature: row.temperature, occupancy: row.occupancy == null ? null : row.occupancy ? 100 : 0 };
        (Object.keys(values) as Array<'temperature' | 'occupancy'>).forEach((type) => { const value = values[type]; if (value == null) return; const bucket = sums[type][sensorId][minute] ??= { total: 0, count: 0 }; bucket.total += Number(value); bucket.count++; });
      });
    });
    const series: VisualizeRuntime['series'] = { temperature: {}, occupancy: {} }; const min = { temperature: Infinity, occupancy: Infinity }; const max = { temperature: -Infinity, occupancy: -Infinity };
    (['temperature', 'occupancy'] as const).forEach((type) => sensorIds.forEach((sensorId) => {
      series[type][sensorId] = {};
      Object.entries(sums[type][sensorId]).forEach(([minute, bucket]) => { const value = bucket.total / bucket.count; series[type][sensorId][Number(minute)] = value; min[type] = Math.min(min[type], value); max[type] = Math.max(max[type], value); });
      if (!Number.isFinite(min[type])) { min[type] = type === 'temperature' ? 70 : 0; max[type] = type === 'temperature' ? 80 : 100; }
    }));
    return { series, min, max };
  }, [query.data, sensorIds]);
  return { ...query, data, sensorIds, sensors };
}
