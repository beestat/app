import { Alert, Box, Button, CircularProgress, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo, useRef, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { chartTooltipHtml, stableTooltipPositioner } from '../components/common/chartTooltip';
import { useDockedTooltip } from '../components/common/DockedTooltip';
import { ChartRangeMenu } from '../components/detail/ChartRangeMenu';
import { buildRuntimeData, runtimeAxisLabel, type RuntimeRow } from '../components/detail/runtimeData';
import { chartRangeBounds, persistChartRange, settingDateToIso } from '../components/detail/persistChartRange';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { CalendarDays, CircleHelp, EllipsisVertical, ExternalLink } from 'lucide-react';

function heatColor(value?: number) {
  if (value == null) return colors.slate.light;
  const t = Math.max(0, Math.min(1, value / 100));
  const from = t < .5 ? [32, 191, 107] : [247, 183, 49];
  const to = t < .5 ? [247, 183, 49] : [235, 59, 90];
  const progress = t < .5 ? t * 2 : (t - .5) * 2;
  return `rgb(${from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress)).join(',')})`;
}

function SummaryRangeMenu({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const choose = (value: number) => { setAnchor(null); onChange(value); };
  return <>
    <IconButton aria-label="Air Quality summary options" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical size={20} /></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <MenuItem selected={days === 7} onClick={() => choose(7)}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Past 1 Week</ListItemText></MenuItem>
      <MenuItem selected={days === 28} onClick={() => choose(28)}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Past 4 Weeks</ListItemText></MenuItem>
      <MenuItem component="a" href="https://doc.beestat.io/25a1a894a7f4432ead5831bef48770bd" target="_blank" rel="noreferrer" onClick={() => setAnchor(null)}><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
  </>;
}

export function AirQualityPage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const [days, setDays] = useState(() => {
    const configured = Number(data?.user?.settings?.air_quality_detail_range_dynamic);
    return [1, 3, 7].includes(configured) ? configured : 3;
  });
  const [summaryDays, setSummaryDays] = useState(() => Number(data?.user?.settings?.air_quality_summary_range_dynamic) === 7 ? 7 : 28);
  const [custom, setCustom] = useState<{ begin: string; end: string } | undefined>(() => {
    const settings = data?.user?.settings;
    const begin = settingDateToIso(settings?.air_quality_detail_range_static_begin);
    const end = settingDateToIso(settings?.air_quality_detail_range_static_end);
    return settings?.air_quality_detail_range_type === 'static' && begin && end ? { begin, end } : undefined;
  });
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  // Legacy draws three charts here, each docking its own tooltip underneath.
  const airQualityTooltip = useDockedTooltip();
  const vocTooltip = useDockedTooltip();
  const co2Tooltip = useDockedTooltip();
  const compactSummary = useMediaQuery('(max-width:700px)');
  const sensors = useMemo(() => Object.values(data?.sensor ?? {}).filter((sensor) => sensor.thermostat_id === thermostatId), [data?.sensor, thermostatId]);
  const thermostatSensors = useMemo(() => sensors.filter((sensor) => sensor.type === 'thermostat'), [sensors]);
  const ecobee = thermostat ? data?.ecobee_thermostat?.[String(thermostat.ecobee_thermostat_id)] as any : undefined;
  const supportsAirQuality = ecobee?.model_number === 'aresSmart';
  const summaryBegin = Date.now() - summaryDays * 86_400_000;
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
  const runtime = useMemo(() => buildRuntimeData(thermostatRows.filter((row) => { const time = Date.parse(row.timestamp); return time >= requestedBegin && time <= end; }) as RuntimeRow[], thermostat), [end, requestedBegin, thermostat, thermostatRows]);
  const occupancyOptions = useMemo<Highcharts.Options>(() => {
    const palette = [colors.blue.main, colors.red.main, colors.yellow.main, colors.green.main, colors.orange.main, colors.teal.main, colors.purple.main, colors.lightBlue.main, colors.blue.light, colors.red.light, colors.yellow.light, colors.green.light, colors.orange.light, colors.teal.light, colors.purple.light, colors.lightBlue.light, colors.blue.dark, colors.red.dark, colors.yellow.dark, colors.green.dark, colors.orange.dark, colors.teal.dark, colors.purple.dark, colors.lightBlue.dark];
    const sensorColors = new Map(sensors.map((sensor, index) => [sensor.sensor_id, palette[index % palette.length]]));
    const ordered = [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name));
    const series = ordered.map((sensor, index) => {
      const spacing = Math.min(Math.floor(15 / Math.max(ordered.length, 1)), 4);
      const baseWidth = Math.min(Math.floor(50 / Math.max(ordered.length, 1)), 16);
      const width = baseWidth - spacing;
      const y = baseWidth * (index + 1) + Math.round(baseWidth / 2);
      return { type: 'line' as const, name: sensor.name, color: sensorColors.get(sensor.sensor_id), lineWidth: width, linecap: 'square' as const, step: 'left' as const, data: (query.data?.[`sensor_${sensor.sensor_id}`] ?? []).map((row) => [Date.parse(row.timestamp), row.occupancy === true ? y : null]), turboThreshold: 0 };
    }).filter((seriesItem) => seriesItem.data.some((point) => point[1] !== null));
    return { chart: { backgroundColor: colors.slate.dark, height: 58, marginLeft: 45, marginRight: 0, marginTop: 8, marginBottom: 0, spacing: [0, 0, 0, 0], animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, visible: false }, yAxis: { min: 0, max: 50, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } }, tooltip: { enabled: false }, plotOptions: { series: { animation: false, marker: { enabled: false }, enableMouseTracking: false, connectNulls: false } }, series };
  }, [extremes, query.data, runtime.max, runtime.min, sensors]);
  const detailOptions = useMemo(() => {
    const xAxis = (labels: boolean): Highcharts.XAxisOptions => ({
      type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max,
      tickPositioner() { const min = Number(this.min); const max = Number(this.max); const sample = 5 * 60_000; const sampleCount = Math.max(1, (max - min) / sample); const interval = Math.max(sample, Math.ceil(sampleCount * 25.4 / Math.max(1, this.len)) * sample); const positions = []; for (let value = min; value <= max; value += interval) positions.push(value); return positions; },
      labels: labels ? { rotation: -45, allowOverlap: true, overflow: 'allow', step: 1, style: { color: colors.gray.main, textOverflow: 'none', width: 80 }, formatter() { return runtimeAxisLabel(Number(this.value), this.axis.tickPositions); } } : { enabled: false },
      events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } },
    });
    const options = (height: number, series: Highcharts.SeriesOptionsType[], yAxis: Highcharts.YAxisOptions, showLabels = false): Highcharts.Options => ({
      chart: { backgroundColor: 'transparent', height, marginLeft: 60, marginRight: 0, marginTop: 8, marginBottom: showLabels ? 71 : 10, spacing: [0, 0, 0, 0], zooming: { type: 'x' }, animation: false },
      title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false }, xAxis: xAxis(showLabels), yAxis,
      tooltip: { shared: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, backgroundColor: 'transparent', borderWidth: 0, positioner: stableTooltipPositioner(0), formatter() {
        const point = this.points?.[0];
        if (!point || point.y == null) return false;
        const suffix = point.series.name === 'TVOC' ? ' ppb' : point.series.name === 'CO₂' ? ' ppm' : '';
        const title = point.series.name === 'Air Quality' ? Highcharts.dateFormat('%a, %b %e @ %l:%M%P', Number(this.x)) : null;
        const show = point.series.name === 'TVOC' ? vocTooltip.show : point.series.name === 'CO₂' ? co2Tooltip.show : airQualityTooltip.show;
        return show(chartTooltipHtml(title, [[{ label: point.series.name, value: `${point.y}${suffix}`, color: String(point.color) }]]));
      } },
      plotOptions: { series: { animation: false, marker: { enabled: false, states: { hover: { enabled: false } } }, states: { hover: { enabled: false }, inactive: { opacity: 1 } }, turboThreshold: 0 } },
      responsive: showLabels ? { rules: [{ condition: { maxWidth: 500 }, chartOptions: { chart: { marginBottom: 66 } } }] } : undefined,
      series,
    });
    const axis: Highcharts.YAxisOptions = { title: { text: undefined }, min: 0, tickAmount: 2, labels: { style: { color: colors.gray.main, textOverflow: 'none' } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' };
    return {
      airQuality: options(75, [{ type: 'spline', name: 'Air Quality', color: colors.gray.main, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.air_quality : 0]) }], { ...axis, max: 100, tickAmount: undefined, tickInterval: 100 }),
      voc: options(75, [{ type: 'spline', name: 'TVOC', color: colors.yellow.dark, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.voc_concentration : 0]) }], { ...axis, labels: { ...axis.labels, formatter() { return Number(this.value).toLocaleString('en-US', { useGrouping: false }); } } }),
      co2: options(135, [{ type: 'spline', name: 'CO₂', color: colors.blue.main, lineWidth: 1, data: rows.map((row) => [Date.parse(row.timestamp), supportsAirQuality ? row.co2_concentration : 0]) }], axis, true),
    };
  }, [extremes, rows, runtime.max, runtime.min, supportsAirQuality]);
  const grid = useMemo(() => { const values = new Map<string, number[]>(); summaryRows.forEach((row) => { if (supportsAirQuality && typeof row.air_quality !== 'number') return; const date = new Date(row.timestamp); const key = `${date.getDay()}_${date.getHours()}`; values.set(key, [...(values.get(key) ?? []), supportsAirQuality ? row.air_quality : 0]); }); return values; }, [summaryRows, supportsAirQuality]);
  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-air-quality.svg'; link.click(); URL.revokeObjectURL(url); };
  const changeDetailDays = (value: number) => { setCustom(undefined); setDays(value); setExtremes(undefined); void persistChartRange('air_quality_detail', { days: value }); };
  const changeDetailCustom = (begin: string, end: string) => { setCustom({ begin, end }); setExtremes(undefined); void persistChartRange('air_quality_detail', { begin, end }); };
  const rangeBounds = chartRangeBounds(thermostat?.sync_begin ?? thermostat?.data_begin, thermostat?.sync_end ?? thermostat?.data_end, 1);
  const updateSummaryRange = (value: number) => {
    setSummaryDays(value);
    void apiBatch([
      { resource: 'user', method: 'update_setting', alias: 'summary_days', arguments: { key: 'air_quality_summary_range_dynamic', value } },
      { resource: 'user', method: 'update_setting', alias: 'summary_type', arguments: { key: 'air_quality_summary_range_type', value: 'dynamic' } },
    ]);
  };
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <Box sx={{ display: 'grid', gap: 2, pb: 2 }}>
    {!supportsAirQuality && <DashboardCard title="Unsupported Thermostat" sx={{ bgcolor: colors.blue.light }}><Typography mb={2}>Access to Air Quality information requires a compatible thermostat. Support beestat by buying through this affiliate link.</Typography><Button component="a" href="https://amzn.to/3A7vv3S" target="_blank" rel="noreferrer" variant="contained" color="success" startIcon={<ExternalLink />}><Box textAlign="left"><div>Ecobee Smart Thermostat Premium</div><Typography variant="caption">Amazon Affiliate</Typography></Box></Button></DashboardCard>}
    <DashboardCard title="Air Quality Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={changeDetailDays} onCustom={changeDetailCustom} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io/2685b4aae86a4f5d80dd0a4e5dd88201" customTitle="Air Quality Detail - Custom Range" customDescription="Choose a custom range to display on the Air Quality Detail chart. Max range is 7 days at a time and 90 days in the past." maxDays={7} initialBegin={custom?.begin} initialEnd={custom?.end} minDate={rangeBounds.min} maxDate={rangeBounds.max} />}>{query.isLoading || summaryQuery.isLoading ? <Box sx={{ height: 400, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error || summaryQuery.error ? <Alert severity="error">{query.error?.message ?? summaryQuery.error?.message}</Alert> : <><HighchartsReact highcharts={Highcharts} options={occupancyOptions} /><Typography component="p" sx={{ my: '17px' }}>Air Quality (%)</Typography><HighchartsReact ref={chartRef} highcharts={Highcharts} options={detailOptions.airQuality} />{airQualityTooltip.panel}<Typography component="p" sx={{ my: '17px' }}>TVOC Concentration (ppb)</Typography><HighchartsReact highcharts={Highcharts} options={detailOptions.voc} />{vocTooltip.panel}<Typography component="p" sx={{ my: '16.5px' }}>CO₂ Concentration (ppm)</Typography><HighchartsReact highcharts={Highcharts} options={detailOptions.co2} />{co2Tooltip.panel}</>}</DashboardCard>
    <DashboardCard title="Air Quality Summary" subheader={`Past ${summaryDays / 7} week${summaryDays === 7 ? '' : 's'}`} action={<SummaryRangeMenu days={summaryDays} onChange={updateSummaryRange} />}><Box sx={{ display: 'grid', gridTemplateColumns: '50px repeat(24, minmax(7px, 1fr))', alignItems: 'center', overflowX: 'auto' }}><Box />{Array.from({ length: 24 }, (_, hour) => <Typography key={hour} variant="caption" textAlign="center">{hour % 12 || 12}{compactSummary ? '' : hour >= 12 ? 'p' : 'a'}</Typography>)}{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].flatMap((day, dayIndex) => [<Typography key={day}>{day}</Typography>, ...Array.from({ length: 24 }, (_, hour) => { const values = grid.get(`${dayIndex}_${hour}`); const average = values?.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined; return <Tooltip key={`${day}_${hour}`} title={average == null ? 'No data' : Math.round(average)}><Box sx={{ height: 20, bgcolor: heatColor(average) }} /></Tooltip>; })])}</Box></DashboardCard>
  </Box>;
}
