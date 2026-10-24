import { Alert, Box, Button, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useRef, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { ChartRangeMenu } from '../components/detail/ChartRangeMenu';
import { buildRuntimeData, runtimeAxisLabel, type RuntimeRow } from '../components/detail/runtimeData';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { ExternalLink } from 'lucide-react';

function heatColor(value?: number) {
  if (value == null) return colors.slate.light;
  const t = Math.max(0, Math.min(1, value / 100));
  const from = t < .5 ? [32, 191, 107] : [247, 183, 49];
  const to = t < .5 ? [247, 183, 49] : [235, 59, 90];
  const progress = t < .5 ? t * 2 : (t - .5) * 2;
  return `rgb(${from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress)).join(',')})`;
}

export function AirQualityPage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const [days, setDays] = useState(3);
  const [custom, setCustom] = useState<{ begin: string; end: string }>();
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const sensors = useMemo(() => Object.values(data?.sensor ?? {}).filter((sensor) => sensor.thermostat_id === thermostatId), [data?.sensor, thermostatId]);
  const thermostatSensors = useMemo(() => sensors.filter((sensor) => sensor.type === 'thermostat'), [sensors]);
  const ecobee = thermostat ? data?.ecobee_thermostat?.[String(thermostat.ecobee_thermostat_id)] as any : undefined;
  const supportsAirQuality = ecobee?.model_number === 'aresSmart';
  const summaryBegin = Date.now() - 28 * 86_400_000;
  const requestedBegin = custom ? new Date(`${custom.begin}T00:00:00`).getTime() : Date.now() - days * 86_400_000;
  const fetchBegin = new Date(requestedBegin).toISOString();
  const query = useQuery({
    queryKey: ['air-quality', thermostatId, sensors.map((sensor) => sensor.sensor_id), fetchBegin.slice(0, 10)],
    enabled: sensors.length > 0 && Boolean(thermostatId),
    queryFn: ({ signal }) => apiBatch<Record<string, any[]>>([
      ...sensors.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: { value: fetchBegin, operator: '>=' } } } })),
      { resource: 'runtime_thermostat', method: 'read', alias: 'thermostat', arguments: { attributes: { thermostat_id: thermostatId, timestamp: { value: fetchBegin, operator: '>=' } } } },
    ], signal),
    staleTime: 5 * 60_000,
  });
  const summaryQuery = useQuery({
    queryKey: ['air-quality-summary', thermostatId, thermostatSensors.map((sensor) => sensor.sensor_id), new Date(summaryBegin).toISOString().slice(0, 10)],
    enabled: thermostatSensors.length > 0,
    queryFn: ({ signal }) => apiBatch<Record<string, any[]>>(thermostatSensors.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: { value: new Date(summaryBegin).toISOString(), operator: '>=' } } } })), signal),
    staleTime: 5 * 60_000,
  });
  const summaryRows = useMemo(() => Object.values(summaryQuery.data ?? {}).flat(), [summaryQuery.data]);
  const thermostatRows = useMemo(() => query.data?.thermostat ?? [], [query.data]);
  const end = custom ? new Date(`${custom.end}T23:59:59`).getTime() : Date.now() - 3_600_000;
  const rows = useMemo(() => summaryRows.filter((row) => { const time = Date.parse(row.timestamp); return time >= requestedBegin && time <= end; }), [summaryRows, end, requestedBegin]);
  const runtime = useMemo(() => buildRuntimeData(thermostatRows.filter((row) => { const time = Date.parse(row.timestamp); return time >= requestedBegin && time <= end; }) as RuntimeRow[]), [end, requestedBegin, thermostatRows]);
  const occupancyOptions = useMemo<Highcharts.Options>(() => {
    const palette = [colors.blue.main, colors.red.main, colors.yellow.main, colors.green.main, colors.orange.main, colors.teal.main];
    const ordered = [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name));
    const series = ordered.map((sensor, index) => {
      const width = Math.max(3, Math.min(12, Math.floor(48 / Math.max(ordered.length, 1)) - 2));
      const y = (index + .5) * (48 / Math.max(ordered.length, 1));
      return { type: 'line' as const, name: sensor.name, color: palette[index % palette.length], lineWidth: width, linecap: 'square' as const, step: 'left' as const, data: (query.data?.[`sensor_${sensor.sensor_id}`] ?? []).map((row) => [Date.parse(row.timestamp), row.occupancy === true ? y : null]), turboThreshold: 0 };
    }).filter((seriesItem) => seriesItem.data.some((point) => point[1] !== null));
    return { chart: { backgroundColor: colors.slate.dark, height: 50, marginLeft: 45, marginRight: 20, marginTop: 0, marginBottom: 0, animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, visible: false }, yAxis: { min: 0, max: 50, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } }, tooltip: { enabled: false }, plotOptions: { series: { animation: false, marker: { enabled: false }, enableMouseTracking: false, connectNulls: false } }, series };
  }, [extremes, query.data, runtime.max, runtime.min, sensors]);
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 450, zooming: { type: 'x' }, animation: false, marginLeft: 60, marginRight: 20 }, title: { text: undefined }, credits: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, tickInterval: 2 * 3_600_000, labels: { rotation: -45, allowOverlap: true, style: { color: colors.gray.main }, formatter() { return runtimeAxisLabel(Number(this.value), this.axis.tickPositions); } }, events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } } },
    yAxis: [
      { top: '8%', height: '20%', offset: 0, title: { text: undefined }, min: 0, softMax: 100, tickAmount: 2, labels: { style: { color: colors.gray.main, textOverflow: 'none' } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' },
      { top: '43%', height: '20%', offset: 0, title: { text: undefined }, min: 0, tickAmount: 2, labels: { style: { color: colors.gray.main, textOverflow: 'none' }, formatter() { return Number(this.value).toLocaleString('en-US', { useGrouping: false }); } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' },
      { top: '78%', height: '18%', offset: 0, title: { text: undefined }, min: 0, tickAmount: 2, labels: { style: { color: colors.gray.main, textOverflow: 'none' } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' },
    ],
    legend: { enabled: false }, tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, turboThreshold: 0 } },
    series: [
      { type: 'spline', name: 'Air Quality', color: colors.gray.light, yAxis: 0, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.air_quality : 0]) },
      { type: 'spline', name: 'TVOC', color: colors.yellow.dark, yAxis: 1, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.voc_concentration : 0]) },
      { type: 'spline', name: 'CO₂', color: colors.blue.main, yAxis: 2, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.co2_concentration : 0]) },
    ],
  }), [extremes, rows, runtime.max, runtime.min, supportsAirQuality]);
  const grid = useMemo(() => { const values = new Map<string, number[]>(); summaryRows.forEach((row) => { if (supportsAirQuality && typeof row.air_quality !== 'number') return; const date = new Date(row.timestamp); const key = `${date.getDay()}_${date.getHours()}`; values.set(key, [...(values.get(key) ?? []), supportsAirQuality ? row.air_quality : 0]); }); return values; }, [summaryRows, supportsAirQuality]);
  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-air-quality.svg'; link.click(); URL.revokeObjectURL(url); };
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    {!supportsAirQuality && <DashboardCard title="Unsupported Thermostat" sx={{ bgcolor: colors.blue.light }}><Typography mb={2}>Access to Air Quality information requires a compatible thermostat. Support beestat by buying through this affiliate link.</Typography><Button component="a" href="https://amzn.to/3A7vv3S" target="_blank" rel="noreferrer" variant="contained" color="success" startIcon={<ExternalLink />}><Box textAlign="left"><div>Ecobee Smart Thermostat Premium</div><Typography variant="caption">Amazon Affiliate</Typography></Box></Button></DashboardCard>}
    <DashboardCard title="Air Quality Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={(value) => { setCustom(undefined); setDays(value); setExtremes(undefined); }} onCustom={(begin, customEnd) => { setCustom({ begin, end: customEnd }); setExtremes(undefined); }} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io" />}>{query.isLoading || summaryQuery.isLoading ? <Box sx={{ height: 400, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error || summaryQuery.error ? <Alert severity="error">{query.error?.message ?? summaryQuery.error?.message}</Alert> : <><HighchartsReact highcharts={Highcharts} options={occupancyOptions} /><Box sx={{ position: 'relative' }}><Typography sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>Air Quality (%)</Typography><Typography sx={{ position: 'absolute', top: '30%', left: 0, zIndex: 1 }}>TVOC Concentration (ppb)</Typography><Typography sx={{ position: 'absolute', top: '54%', left: 0, zIndex: 1 }}>CO₂ Concentration (ppm)</Typography><HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} /></Box></>}</DashboardCard>
    <DashboardCard title="Air Quality Summary" subheader="Past 4 weeks"><Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(24, minmax(7px, 1fr))', alignItems: 'center', overflowX: 'auto' }}><Box />{Array.from({ length: 24 }, (_, hour) => <Typography key={hour} variant="caption" textAlign="center">{hour % 12 || 12}{hour >= 12 ? 'p' : 'a'}</Typography>)}{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].flatMap((day, dayIndex) => [<Typography key={day}>{day}</Typography>, ...Array.from({ length: 24 }, (_, hour) => { const values = grid.get(`${dayIndex}_${hour}`); const average = values?.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined; return <Tooltip key={`${day}_${hour}`} title={average == null ? 'No data' : Math.round(average)}><Box sx={{ height: 20, bgcolor: heatColor(average) }} /></Tooltip>; })])}</Box></DashboardCard>
  </Box>;
}
