import { Box } from '@mui/material';
import { lazy, Suspense, useMemo } from 'react';
import { useDashboard } from '../state/DashboardContext';
import { SystemCard } from '../components/detail/SystemCard';
import { SensorsCard } from '../components/detail/SensorsCard';
import { AlertsCard } from '../components/detail/AlertsCard';
import { LazyMount } from '../components/common/LazyMount';

const RuntimeDetailCard = lazy(() => import('../components/detail/RuntimeDetailCard').then((module) => ({ default: module.RuntimeDetailCard })));
const SensorDetailCard = lazy(() => import('../components/detail/SensorDetailCard').then((module) => ({ default: module.SensorDetailCard })));

export function DetailPage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const sensors = useMemo(() => Object.values(data?.sensor ?? {}).filter((sensor) => sensor.thermostat_id === thermostatId), [data?.sensor, thermostatId]);
  if (!thermostat || !thermostatId) return null;
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, py: 2 }}>
    <SystemCard thermostat={thermostat} ecobee={data?.ecobee_thermostat[String(thermostat.ecobee_thermostat_id)]} />
    <SensorsCard sensors={sensors} thermostat={thermostat} />
    <AlertsCard alerts={thermostat.alerts ?? []} thermostatId={thermostatId} />
    <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}><LazyMount><Suspense fallback={null}><RuntimeDetailCard thermostat={thermostat} /></Suspense></LazyMount></Box>
    <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}><LazyMount><Suspense fallback={null}><SensorDetailCard thermostat={thermostat} sensors={sensors} /></Suspense></LazyMount></Box>
    <Box component="footer" sx={{ gridColumn: '1 / -1', textAlign: 'center', color: 'text.secondary', py: 2, '& a': { color: 'inherit', mx: .5 } }}><a href="https://doc.beestat.io" target="_blank">Help</a> · <a href="https://community.beestat.io" target="_blank">Feedback</a> · <a href="https://beestat.io/privacy.html" target="_blank">Privacy</a> · <a href="mailto:contact@beestat.io">Contact</a></Box>
  </Box>;
}
