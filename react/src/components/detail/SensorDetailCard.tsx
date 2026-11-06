import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiBatch } from '../../api/client';
import type { Sensor, Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';
import { BeestatLoader } from '../common/BeestatLoader';
import { chartTooltipHtml, stableTooltipPositioner } from '../common/chartTooltip';
import { useDockedTooltip } from '../common/DockedTooltip';
import { RuntimeRaceway } from './RuntimeRaceway';
import { ChartRangeMenu } from './ChartRangeMenu';
import { buildRuntimeData, runtimeAxisLabel, runtimeTickPositions, unitLabel, type Point, type RuntimeRow } from './runtimeData';
import { synchronizeChartPointers } from './chartSync';
import { useDashboard } from '../../state/DashboardContext';
import { chartRangeBounds, persistChartRange, settingDateToIso } from './persistChartRange';
import { convertTemperature } from '../../utils/format';
import { localDaysAgoIso } from '../../utils/date';

function sortSensors(sensors: Sensor[]) {
  return [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

function swimlane(count: number, index: number) {
  const spacing = Math.min(Math.floor(15 / count), 4);
  const baseWidth = Math.min(Math.floor(50 / count), 16);
  return { y: baseWidth * index + Math.round(baseWidth / 2), width: baseWidth - spacing };
}

export const SensorDetailCard = memo(function SensorDetailCard({ thermostat, sensors }: { thermostat: Thermostat; sensors: Sensor[] }) {
  const theme = useTheme();
  const colors = theme.palette.colors;
  const palette = useMemo(() => [colors.blue.main, colors.red.main, colors.yellow.main, colors.green.main, colors.orange.main, colors.teal.main, colors.purple.main, colors.lightBlue.main, colors.blue.light, colors.red.light, colors.yellow.light, colors.green.light], [colors]);
  const { data: dashboardData } = useDashboard();
  const displayUnit = String(dashboardData?.user?.settings?.units?.temperature ?? thermostat.temperature_unit);
  const [days, setDays] = useState(() => {
    const configured = Number(dashboardData?.user?.settings?.runtime_sensor_detail_range_dynamic);
    return [1, 3, 7].includes(configured) ? configured : 3;
  });
  const [custom, setCustom] = useState<{ begin: string; end: string } | undefined>(() => {
    const settings = dashboardData?.user?.settings;
    const begin = settingDateToIso(settings?.runtime_sensor_detail_range_static_begin);
    const end = settingDateToIso(settings?.runtime_sensor_detail_range_static_end);
    return settings?.runtime_sensor_detail_range_type === 'static' && begin && end ? { begin, end } : undefined;
  });
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const { show: showTooltip, panel: dockedTooltip } = useDockedTooltip();
  const occupancyRef = useRef<HighchartsReact.RefObject>(null);
  const racewayRef = useRef<HighchartsReact.RefObject>(null);
  const range = custom ? { value: [new Date(`${custom.begin}T00:00:00`).toISOString(), new Date(`${custom.end}T23:59:59`).toISOString()], operator: 'between' } : { value: localDaysAgoIso(Date.now(), days), operator: '>=' };
  // Legacy assigns colors from the API/cache insertion order, then sorts the
  // sensors for display. Preserve that distinction so a named sensor keeps
  // the exact same color in its line, occupancy lane, and legend.
  const sensorColors = useMemo(() => new Map(sensors.map((sensor, index) => [sensor.sensor_id, palette[index % palette.length]])), [palette, sensors]);
  const ordered = useMemo(() => sortSensors(sensors), [sensors]);
  const query = useQuery({
    queryKey: ['runtime-sensors', thermostat.thermostat_id, ordered.map((sensor) => sensor.sensor_id), custom ?? days], enabled: ordered.length > 0,
    queryFn: ({ signal }) => apiBatch<Record<string, RuntimeRow[]>>([
      ...ordered.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: range } } })),
      { resource: 'runtime_thermostat', method: 'read', alias: 'runtime_thermostat', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: range } } },
    ], signal), staleTime: 5 * 60_000,
  });
  const runtime = useMemo(() => buildRuntimeData(query.data?.runtime_thermostat ?? [], thermostat, colors), [colors, query.data, thermostat]);
  const sensorSeries = useMemo(() => ordered.map((sensor, index) => {
    const rows = query.data?.[`sensor_${sensor.sensor_id}`] ?? [];
    const lane = swimlane(ordered.length, index);
    return { sensor, color: sensorColors.get(sensor.sensor_id) ?? palette[index % palette.length], lane, temperature: rows.map((row) => [Date.parse(row.timestamp), typeof row.temperature === 'number' ? convertTemperature(row.temperature, displayUnit) : null] as Point), occupancy: rows.map((row) => [Date.parse(row.timestamp), row.occupancy === true ? lane.y : null] as Point) };
  }), [displayUnit, ordered, palette, query.data, sensorColors]);
  // Legacy runtime_sensor_detail keeps each sensor's occupancy lane in sync with its temperature legend item.
  // Visibility lives in state so both charts follow it and data refreshes keep the choice.
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const legendToggle = (name: string, initial: boolean) => ({ legendItemClick() { setVisibility((old) => ({ ...old, [name]: !(old[name] ?? initial) })); return false; } });
  const occupancyOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: theme.palette.surface.subtle, height: 58, marginLeft: 45, marginBottom: 0, spacing: [8, 0, 0, 0], style: { fontFamily: 'Montserrat' }, animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, lineWidth: 0, tickLength: 0, labels: { enabled: false } }, yAxis: { min: 0, max: 50, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } }, tooltip: { shared: true, outside: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, positioner: stableTooltipPositioner(0), backgroundColor: 'transparent', borderWidth: 0, formatter() { return chartTooltipHtml(Highcharts.dateFormat('%a, %b %e @ %l:%M%P', Number(this.x)), [(this.points ?? []).map((point) => ({ label: point.series.name, value: 'Occupied', color: String(point.color) }))]); } },
    plotOptions: { series: { animation: false, marker: { enabled: false, states: { hover: { enabled: false } } }, states: { hover: { enabled: false }, inactive: { opacity: 1 } }, connectNulls: false } },
    series: sensorSeries.filter((item) => item.occupancy.some((point) => point[1] !== null)).map((item) => ({ type: 'line', name: item.sensor.name, data: item.occupancy, color: item.color, lineWidth: item.lane.width, linecap: 'square', step: 'left', turboThreshold: 0, visible: visibility[item.sensor.name] ?? true })),
  }), [colors, extremes, runtime.max, runtime.min, sensorSeries, theme.palette.surface.subtle, visibility]);
  const temperatureOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 300, marginLeft: 45, spacing: [8, 0, 0, 0], style: { fontFamily: 'Montserrat' }, animation: false, zooming: { type: 'x' } }, title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, tickPositioner() { return runtimeTickPositions(runtime.timestamps, Number(this.min), Number(this.max), this.len); }, lineColor: colors.slate.light, tickLength: 0, labels: { rotation: -45, allowOverlap: true, style: { color: colors.gray.main, fontSize: '11px' }, formatter() { return runtimeAxisLabel(Number(this.value), this.axis.tickPositions); } }, events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } } },
    yAxis: { title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', allowDecimals: false, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: `{value}${unitLabel(displayUnit)}` } },
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '500' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' }, itemHoverStyle: { color: colors.gray.main } },
    tooltip: { shared: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, positioner: stableTooltipPositioner(0), backgroundColor: 'transparent', borderWidth: 0, formatter() {
      const x = Number(this.x);
      const mode = runtime.climateAt[x] ? [{ label: 'Comfort Profile', value: runtime.climateAt[x].replace(/[<>&]/g, ''), color: colors.gray.main }] : [];
      const readings = [...(this.points ?? [])].filter((point) => point.y != null).sort((a, b) => Number(b.y) - Number(a.y)).map((point) => {
        const sensor = sensorSeries.find((item) => item.sensor.name === point.series.name);
        const occupied = sensor?.occupancy.some(([timestamp, value]) => timestamp === x && value !== null);
        return { label: point.series.name, value: `${Highcharts.numberFormat(Number(point.y), 1)}${unitLabel(displayUnit)}${occupied ? ' ●' : ''}`, color: String(point.color) };
      });
      return showTooltip(chartTooltipHtml(Highcharts.dateFormat('%a, %b %e @ %l:%M%P', x), [mode, readings]));
    } },
    plotOptions: { series: { animation: false, marker: { enabled: false, states: { hover: { enabled: false } } }, turboThreshold: 0, states: { hover: { enabled: false }, inactive: { opacity: 1 } } } },
    series: [...sensorSeries.map((item) => ({ type: 'spline' as const, name: item.sensor.name, data: item.temperature, color: item.color, lineWidth: 1, visible: visibility[item.sensor.name] ?? true, events: legendToggle(item.sensor.name, true) })), { type: 'spline' as const, name: 'Indoor Temp', data: runtime.temperature.indoor_temperature.map(([x, value]) => [x, value == null ? null : convertTemperature(value, displayUnit)]), color: colors.gray.light, lineWidth: 2, visible: visibility['Indoor Temp'] ?? false, events: legendToggle('Indoor Temp', false) }, { type: 'spline' as const, name: 'Outdoor Temp', data: runtime.temperature.outdoor_temperature.map(([x, value]) => [x, value == null ? null : convertTemperature(value, displayUnit)]), color: colors.gray.light, dashStyle: 'ShortDash' as const, lineWidth: 1, visible: visibility['Outdoor Temp'] ?? false, events: legendToggle('Outdoor Temp', false) }],
  }), [colors, displayUnit, extremes, runtime, sensorSeries, showTooltip, visibility]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      dispose = synchronizeChartPointers([racewayRef.current?.chart, occupancyRef.current?.chart, chartRef.current?.chart]);
    });
    return () => { cancelAnimationFrame(frame); dispose?.(); };
  }, [query.data, extremes]);

  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-sensor-detail.svg'; link.click(); URL.revokeObjectURL(url); };
  const changeDays = (value: number) => { setCustom(undefined); setDays(value); setExtremes(undefined); void persistChartRange('runtime_sensor_detail', { days: value }); };
  const changeCustom = (begin: string, end: string) => { setCustom({ begin, end }); setExtremes(undefined); void persistChartRange('runtime_sensor_detail', { begin, end }); };
  const rangeBounds = chartRangeBounds(thermostat.sync_begin ?? thermostat.data_begin, thermostat.sync_end ?? thermostat.data_end, 3);
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <DashboardCard title="Sensor Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={changeDays} onCustom={changeCustom} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io/891f94a6bdb34895a453b7b91591ec29" customTitle="Sensor Detail - Custom Range" customDescription="Choose a custom range to display on the Sensor Detail chart. Max range is 7 days at a time and 3 months in the past." maxDays={7} initialBegin={custom?.begin} initialEnd={custom?.end} minDate={rangeBounds.min} maxDate={rangeBounds.max} />}>
    {query.isLoading ? <Box sx={{ height: 435, display: 'grid', placeItems: 'center' }}><BeestatLoader label="Loading sensor detail" /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : <><RuntimeRaceway data={runtime} extremes={extremes} chartRef={racewayRef} /><HighchartsReact ref={occupancyRef} highcharts={Highcharts} options={occupancyOptions} containerProps={{ style: { marginTop: 8 } }} /><HighchartsReact ref={chartRef} highcharts={Highcharts} options={temperatureOptions} containerProps={{ style: { marginTop: 8 } }} />{dockedTooltip}</>}
  </DashboardCard>;
});
