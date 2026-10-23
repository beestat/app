import { Alert, Box, Button, ButtonGroup, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';

export function AirQualityPage() {
  const { data, thermostatId } = useDashboard();
  const [days, setDays] = useState(3);
  const sensors = useMemo(() => Object.values(data?.sensor ?? {}).filter((sensor) => sensor.thermostat_id === thermostatId && sensor.type === 'thermostat'), [data?.sensor, thermostatId]);
  const query = useQuery({ queryKey: ['air-quality', thermostatId, days, sensors.map((s) => s.sensor_id)], enabled: sensors.length > 0, queryFn: ({ signal }) => apiBatch<Record<string, any[]>>(sensors.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' } } } })), signal) });
  const rows = useMemo(() => Object.values(query.data ?? {}).flat().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))), [query.data]);
  const options = useMemo<Highcharts.Options>(() => ({ chart: { backgroundColor: 'transparent', height: 540, zooming: { type: 'x' } }, title: { text: undefined }, credits: { enabled: false }, xAxis: { type: 'datetime', labels: { style: { color: colors.gray.main } } }, yAxis: [{ title: { text: 'Air quality (%)' }, min: 0, max: 100, gridLineColor: colors.slate.light }, { title: { text: 'Concentration' }, opposite: true, gridLineWidth: 0 }], legend: { itemStyle: { color: colors.gray.light } }, tooltip: { shared: true, backgroundColor: colors.slate.dark, style: { color: '#fff' } }, plotOptions: { series: { animation: false, marker: { enabled: false }, turboThreshold: 0 } }, series: [{ type: 'spline', name: 'Air Quality', color: colors.green.main, data: rows.map((row) => [Date.parse(row.timestamp), row.air_quality]) }, { type: 'spline', name: 'TVOC (ppb)', color: colors.purple.main, yAxis: 1, data: rows.map((row) => [Date.parse(row.timestamp), row.voc_concentration]) }, { type: 'spline', name: 'CO₂ (ppm)', color: colors.lightBlue.main, yAxis: 1, data: rows.map((row) => [Date.parse(row.timestamp), row.co2_concentration]) }] }), [rows]);
  if (!sensors.length) return <Box py={2}><Alert severity="info">Air quality requires a supported thermostat with an indoor air-quality sensor.</Alert></Box>;
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}><DashboardCard title="Air Quality Detail" subheader={`Past ${days} days`} action={<ButtonGroup size="small">{[1, 3, 7, 14, 31].map((value) => <Button key={value} variant={days === value ? 'contained' : 'outlined'} onClick={() => setDays(value)}>{value}d</Button>)}</ButtonGroup>}>{query.isLoading ? <Box sx={{ height: 400, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : <HighchartsReact highcharts={Highcharts} options={options} />}</DashboardCard></Box>;
}
