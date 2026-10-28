import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

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
  });
  const thermostatIds = useMemo(
    () => Object.values(query.data?.thermostat ?? {}).map((item) => item.thermostat_id),
    [query.data?.thermostat],
  );
  const [thermostatId, setThermostatIdState] = useState<number | undefined>();
  const serverThermostatId = Number(query.data?.user?.settings?.thermostat_id);

  useEffect(() => {
    if (!thermostatIds.length) return;
    if (!thermostatId || !thermostatIds.includes(thermostatId)) {
      const next = thermostatIds.includes(serverThermostatId) ? serverThermostatId : thermostatIds[0];
      setThermostatIdState(next);
      setSetting('thermostat_id', next);
      if (next !== serverThermostatId) void apiCall({ resource: 'user', method: 'update_setting', arguments: { key: 'thermostat_id', value: next } });
    }
  }, [serverThermostatId, thermostatId, thermostatIds]);

  useEffect(() => {
    if (!thermostatId) return;
    void apiCall({ resource: 'runtime', method: 'sync', arguments: { thermostat_id: thermostatId } });
  }, [thermostatId]);

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
    data: query.data,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
    thermostat,
    thermostatId,
    setThermostatId,
    refresh: query.refetch,
  }), [query.data, query.isLoading, query.error, query.refetch, thermostat, thermostatId, setThermostatId]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider');
  return value;
}
