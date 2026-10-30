import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiBatch, apiCall } from '../api/client';
import type { DashboardData, Thermostat } from '../types';
import { setSetting } from './settings';

const initialCalls = [
  ['thermostat', 'sync', 'thermostat_sync', {}],
  ['sensor', 'sync', 'sensor_sync', {}],
  ['user', 'read_id', 'user', {}],
  ['thermostat', 'read_id', 'thermostat', { attributes: { inactive: 0 } }],
  ['sensor', 'read_id', 'sensor', { attributes: { inactive: 0 } }],
  ['ecobee_thermostat', 'read_id', 'ecobee_thermostat', { attributes: { inactive: 0 } }],
  ['ecobee_sensor', 'read_id', 'ecobee_sensor', { attributes: { inactive: 0 } }],
  ['address', 'read_id', 'address', {}],
  ['floor_plan', 'read_id', 'floor_plan', {}],
  ['announcement', 'read_id', 'announcement', {}],
  ['runtime_thermostat_summary', 'read_id', 'runtime_thermostat_summary', {}],
  ['stripe_event', 'read_id', 'stripe_event', {}],
  ['user', 'session_read_id', 'session', {}],
  ['profile', 'read_id', 'profile', {}],
] as const;

interface DashboardContextValue {
  data?: DashboardData;
  loading: boolean;
  error?: string;
  thermostat?: Thermostat;
  thermostatId?: number;
  setThermostatId: (id: number) => void;
  refresh: () => Promise<unknown>;
  setDashboardSetting: (key: string, value: unknown) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

function setNestedSetting(source: Record<string, any>, key: string, value: unknown) {
  const result = { ...source };
  const parts = key.split('.');
  let cursor = result;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else cursor = cursor[part] = { ...(cursor[part] ?? {}) };
  });
  return result;
}

function mergeSettings(source: Record<string, any>, overrides: Record<string, any>) {
  const result = { ...source };
  Object.entries(overrides).forEach(([key, value]) => {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeSettings(result[key] ?? {}, value)
      : value;
  });
  return result;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => apiBatch<DashboardData>(initialCalls.map(([resource, method, alias, args]) => ({
      resource, method, alias, arguments: args,
    })), signal),
    select: (response) => ({
      ...response,
      user: response.user?.settings ? response.user : (Object.values(response.user ?? {})[0] ?? {}),
    }),
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    // Legacy poll_watcher polls right away when returning to a tab whose last poll is over
    // 6 minutes old; refetch on focus once the data is past the 5-minute poll interval.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  const thermostatIds = useMemo(
    () => Object.values(query.data?.thermostat ?? {}).map((item) => item.thermostat_id),
    [query.data?.thermostat],
  );
  const [thermostatId, setThermostatIdState] = useState<number | undefined>();
  const [settingOverrides, setSettingOverrides] = useState<Record<string, any>>({});
  const setDashboardSetting = useCallback((key: string, value: unknown) => {
    setSettingOverrides((current) => setNestedSetting(current, key, value));
  }, []);
  const dashboardData = useMemo(() => query.data ? {
    ...query.data,
    user: {
      ...query.data.user,
      settings: mergeSettings(query.data.user.settings ?? {}, settingOverrides),
    },
  } : undefined, [query.data, settingOverrides]);
  const serverThermostatId = Number(dashboardData?.user?.settings?.thermostat_id);

  useEffect(() => {
    if (!thermostatIds.length) return;
    if (!thermostatId || !thermostatIds.includes(thermostatId)) {
      const next = thermostatIds.includes(serverThermostatId) ? serverThermostatId : thermostatIds[0];
      setThermostatIdState(next);
      setSetting('thermostat_id', next);
      if (next !== serverThermostatId) void apiCall({ resource: 'user', method: 'update_setting', arguments: { key: 'thermostat_id', value: next } });
    }
  }, [serverThermostatId, thermostatId, thermostatIds]);

  // Legacy beestat.poll sends runtime.sync on every poll and then drops the cached chart data so
  // Detail, Sensor, Air Quality and 3D charts pick up new rows. Mirror that after each dashboard refresh.
  const queryClient = useQueryClient();
  const syncedThermostat = useRef<number>(undefined);
  useEffect(() => {
    if (!thermostatId) return;
    const isPoll = syncedThermostat.current === thermostatId;
    syncedThermostat.current = thermostatId;
    void apiCall({ resource: 'runtime', method: 'sync', arguments: { thermostat_id: thermostatId } })
      .then(() => {
        if (!isPoll) return;
        ['runtime-thermostat', 'runtime-sensors', 'air-quality', 'visualize-runtime'].forEach((key) => { void queryClient.invalidateQueries({ queryKey: [key] }); });
      })
      .catch(() => {});
  }, [query.dataUpdatedAt, queryClient, thermostatId]);

  const setThermostatId = useCallback((id: number) => {
    setThermostatIdState(id);
    setSetting('thermostat_id', id);
    void apiCall({ resource: 'user', method: 'update_setting', arguments: { key: 'thermostat_id', value: id } });
  }, []);

  const thermostat = thermostatId ? query.data?.thermostat[String(thermostatId)] : undefined;
  useEffect(() => {
    document.title = thermostat?.name ? `beestat • ${thermostat.name}` : 'beestat';
  }, [thermostat?.name]);

  const value = useMemo<DashboardContextValue>(() => ({
    data: dashboardData,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
    thermostat,
    thermostatId,
    setThermostatId,
    refresh: query.refetch,
    setDashboardSetting,
  }), [dashboardData, query.isLoading, query.error, query.refetch, setDashboardSetting, thermostat, thermostatId, setThermostatId]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider');
  return value;
}
