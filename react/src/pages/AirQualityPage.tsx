import { Alert, Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { ChartRangeMenu } from '../components/detail/ChartRangeMenu';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';

function heatColor(value?: number) {
  if (value == null) return colors.slate.light;
  const t = Math.max(0, Math.min(1, value / 100));
  if (t < .5) return `rgb(${Math.round(32 + 446 * t)},${Math.round(191 + 80 * t)},${Math.round(107 - 78 * t)})`;
  return `rgb(${Math.round(255 - 20 * (t - .5))},${Math.round(215 - 312 * (t - .5))},${Math.round(48 + 36 * (t - .5))})`;
}

export function AirQualityPage() {
  const { data, thermostatId } = useDashboard();
  const [days, setDays] = useState(3);
  const sensors = useMemo(() => Object.values(data?.sensor ?? {}).filter((sensor) => sensor.thermostat_id === thermostatId && sensor.type === 'thermostat'), [data?.sensor, thermostatId]);
  const query = useQuery({ queryKey: ['air-quality', thermostatId, sensors.map((s) => s.sensor_id)], enabled: sensors.length > 0, queryFn: ({ signal }) => apiBatch<Record<string, any[]>>(sensors.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: { value: new Date(Date.now() - 28 * 86_400_000).toISOString(), operator: '>=' } } } })), signal), staleTime: 5 * 60_000 });
  const allRows = useMemo(() => Object.values(query.data ?? {}).flat().sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))), [query.data]);
  const rows = useMemo(() => { const begin = Date.now() - days * 86_400_000; return allRows.filter((row) => Date.parse(row.timestamp) >= begin); }, [allRows, days]);
  const occupancy = useMemo<Highcharts.Options>(() => ({ chart: { backgroundColor: colors.slate.dark, height: 50, marginLeft: 45, marginRight: 15, marginTop: 0, marginBottom: 0, animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, xAxis: { type: 'datetime', visible: false }, yAxis: { visible: false, min: 0, max: 1 }, tooltip: { enabled: false }, plotOptions: { series: { animation: false, marker: { enabled: false }, enableMouseTracking: false } }, series: [{ type: 'line', data: rows.map((row) => [Date.parse(row.timestamp), row.occupancy === true ? .5 : null]), color: colors.blue.main, lineWidth: 7, step: 'left' }] }), [rows]);
  const options = useMemo<Highcharts.Options>(() => ({ chart: { backgroundColor: 'transparent', height: 450, zooming: { type: 'x' }, animation: false, marginLeft: 60, marginRight: 20 }, title: { text: undefined }, credits: { enabled: false }, xAxis: { type: 'datetime', labels: { style: { color: colors.gray.main }, format: '{value:%a %l%P}' } }, yAxis: [{ top: '0%', height: '27%', offset: 0, title: { text: 'Air Quality (%)', rotation: 0, align: 'high', y: -10, x: 55 }, min: 0, softMax: 100, gridLineColor: colors.slate.light }, { top: '35%', height: '27%', offset: 0, title: { text: 'TVOC Concentration (ppb)', rotation: 0, align: 'high', y: -10, x: 90 }, gridLineColor: colors.slate.light }, { top: '70%', height: '27%', offset: 0, title: { text: 'CO₂ Concentration (ppm)', rotation: 0, align: 'high', y: -10, x: 85 }, gridLineColor: colors.slate.light }], legend: { enabled: false }, tooltip: { shared: true, backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 }, plotOptions: { series: { animation: false, marker: { enabled: false }, turboThreshold: 0 } }, series: [{ type: 'spline', name: 'Air Quality', color: colors.gray.light, yAxis: 0, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), row.air_quality]) }, { type: 'spline', name: 'TVOC', color: colors.yellow.dark, yAxis: 1, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), row.voc_concentration]) }, { type: 'spline', name: 'CO₂', color: colors.blue.main, yAxis: 2, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), row.co2_concentration]) }] }), [rows]);
  const grid = useMemo(() => { const values = new Map<string, number[]>(); allRows.forEach((row) => { if (typeof row.air_quality !== 'number') return; const date = new Date(row.timestamp); const key = `${date.getDay()}_${date.getHours()}`; values.set(key, [...(values.get(key) ?? []), row.air_quality]); }); return values; }, [allRows]);
  if (!sensors.length) return <Box py={2}><Alert severity="info">Air quality requires a supported thermostat with an indoor air-quality sensor.</Alert></Box>;
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <DashboardCard title="Air Quality Detail" subheader={`Past ${days} days`} action={<ChartRangeMenu days={days} setDays={setDays} />}>{query.isLoading ? <Box sx={{ height: 400, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : <><HighchartsReact highcharts={Highcharts} options={occupancy} /><HighchartsReact highcharts={Highcharts} options={options} /></>}</DashboardCard>
    <DashboardCard title="Air Quality Summary" subheader="Past 4 weeks"><Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(24, minmax(7px, 1fr))', alignItems: 'center' }}><Box />{Array.from({ length: 24 }, (_, hour) => <Typography key={hour} variant="caption" textAlign="center">{hour % 12 || 12}{hour >= 12 ? 'p' : 'a'}</Typography>)}{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].flatMap((day, dayIndex) => [<Typography key={day}>{day}</Typography>, ...Array.from({ length: 24 }, (_, hour) => { const values = grid.get(`${dayIndex}_${hour}`); const average = values?.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined; return <Tooltip key={`${day}_${hour}`} title={average == null ? 'No data' : Math.round(average)}><Box sx={{ height: 20, bgcolor: heatColor(average) }} /></Tooltip>; })])}</Box></DashboardCard>
  </Box>;
}
