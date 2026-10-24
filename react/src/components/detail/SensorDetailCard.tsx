import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiBatch } from '../../api/client';
import { colors } from '../../theme';
import type { Sensor, Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';
import { RuntimeRaceway } from './RuntimeRaceway';
import { ChartRangeMenu } from './ChartRangeMenu';
import { buildRuntimeData, runtimeAxisLabel, unitLabel, type Point, type RuntimeRow } from './runtimeData';

const palette = [colors.blue.main, colors.red.main, colors.yellow.main, colors.green.main, colors.orange.main, colors.teal.main, colors.purple.main, colors.lightBlue.main, colors.blue.light, colors.red.light, colors.yellow.light, colors.green.light];

function sortSensors(sensors: Sensor[]) {
  return [...sensors].sort((a, b) => a.type === 'thermostat' ? -1 : b.type === 'thermostat' ? 1 : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

function swimlane(count: number, index: number) {
  const spacing = Math.min(Math.floor(15 / count), 4);
  const baseWidth = Math.min(Math.floor(50 / count), 16);
  return { y: baseWidth * index + Math.round(baseWidth / 2), width: baseWidth - spacing };
}

export const SensorDetailCard = memo(function SensorDetailCard({ thermostat, sensors }: { thermostat: Thermostat; sensors: Sensor[] }) {
  const [days, setDays] = useState(3);
  const [custom, setCustom] = useState<{ begin: string; end: string }>();
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const occupancyRef = useRef<HighchartsReact.RefObject>(null);
  const range = custom ? { value: [`${custom.begin}T00:00:00`, `${custom.end}T23:59:59`], operator: 'between' } : { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' };
  const ordered = useMemo(() => sortSensors(sensors), [sensors]);
  const query = useQuery({
    queryKey: ['runtime-sensors', thermostat.thermostat_id, ordered.map((sensor) => sensor.sensor_id), custom ?? days], enabled: ordered.length > 0,
    queryFn: ({ signal }) => apiBatch<Record<string, RuntimeRow[]>>([
      ...ordered.map((sensor) => ({ resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`, arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: range } } })),
      { resource: 'runtime_thermostat', method: 'read', alias: 'runtime_thermostat', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: range } } },
    ], signal), staleTime: 5 * 60_000,
  });
  const runtime = useMemo(() => buildRuntimeData(query.data?.runtime_thermostat ?? []), [query.data]);
  const sensorSeries = useMemo(() => ordered.map((sensor, index) => {
    const rows = query.data?.[`sensor_${sensor.sensor_id}`] ?? [];
    const lane = swimlane(ordered.length, index);
    return { sensor, color: palette[index % palette.length], lane, temperature: rows.map((row) => [Date.parse(row.timestamp), typeof row.temperature === 'number' ? row.temperature : null] as Point), occupancy: rows.map((row) => [Date.parse(row.timestamp), row.occupancy === true ? lane.y : null] as Point) };
  }), [ordered, query.data]);
  const occupancyOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: colors.slate.dark, height: 50, marginLeft: 45, marginRight: 45, marginTop: 0, marginBottom: 0, animation: false }, title: { text: undefined }, credits: { enabled: false }, legend: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, visible: false, crosshair: { color: colors.gray.main, width: 1 } }, yAxis: { min: 0, max: 50, reversed: true, endOnTick: false, gridLineWidth: 0, title: { text: undefined }, labels: { enabled: false } }, tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', headerFormat: '<b>{point.key}</b><br/>', pointFormat: '<span style="color:{point.color}">●</span> {series.name}: Occupied<br/>', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, connectNulls: false } },
    series: sensorSeries.filter((item) => item.occupancy.some((point) => point[1] !== null)).map((item) => ({ type: 'line', name: item.sensor.name, data: item.occupancy, color: item.color, lineWidth: item.lane.width, linecap: 'square', step: 'left', turboThreshold: 0 })),
  }), [extremes, runtime.max, runtime.min, sensorSeries]);
  const temperatureOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 300, marginLeft: 45, marginRight: 45, animation: false, zooming: { type: 'x' } }, title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? runtime.min, max: extremes?.[1] ?? runtime.max, tickInterval: 3 * 3_600_000, lineColor: colors.slate.light, crosshair: { color: colors.gray.main, width: 1 }, labels: { rotation: -45, allowOverlap: true, style: { color: colors.gray.main, fontSize: '11px' }, formatter() { return runtimeAxisLabel(Number(this.value), this.axis.tickPositions); } }, events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } } },
    yAxis: { title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', allowDecimals: false, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: `{value}${unitLabel(thermostat.temperature_unit)}` } },
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' }, itemHoverStyle: { color: '#fff' } },
    tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0, valueSuffix: unitLabel(thermostat.temperature_unit), valueDecimals: 1 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, turboThreshold: 0, states: { inactive: { opacity: .35 } } } },
    series: [...sensorSeries.map((item) => ({ type: 'spline' as const, name: item.sensor.name, data: item.temperature, color: item.color, lineWidth: 1 })), { type: 'spline' as const, name: 'Indoor Temp', data: runtime.temperature.indoor_temperature, color: colors.gray.light, lineWidth: 2, visible: false }, { type: 'spline' as const, name: 'Outdoor Temp', data: runtime.temperature.outdoor_temperature, color: colors.gray.light, dashStyle: 'ShortDash' as const, lineWidth: 1, visible: false }],
  }), [extremes, runtime, sensorSeries, thermostat.temperature_unit]);

  useEffect(() => {
    const charts = [occupancyRef.current?.chart, chartRef.current?.chart].filter(Boolean) as Highcharts.Chart[];
    const containers = charts.map((chart) => chart.container);
    const move = (event: MouseEvent) => charts.forEach((chart) => {
      const normalized = chart.pointer.normalize(event);
      const point = chart.series.filter((series) => series.visible).map((series) => series.searchPoint(normalized, true)).find(Boolean);
      if (point) chart.xAxis[0].drawCrosshair(normalized, point);
    });
    const leave = () => charts.forEach((chart) => chart.xAxis[0].hideCrosshair());
    containers.forEach((container) => { container.addEventListener('mousemove', move); container.addEventListener('mouseleave', leave); });
    return () => containers.forEach((container) => { container.removeEventListener('mousemove', move); container.removeEventListener('mouseleave', leave); });
  }, [query.data, extremes]);

  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-sensor-detail.svg'; link.click(); URL.revokeObjectURL(url); };
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <DashboardCard title="Sensor Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={(value) => { setCustom(undefined); setDays(value); setExtremes(undefined); }} onCustom={(begin, end) => { setCustom({ begin, end }); setExtremes(undefined); }} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io/891f94a6bdb34895a453b7b91591ec29" />}>
    {query.isLoading ? <Box sx={{ height: 394, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : <><RuntimeRaceway data={runtime} extremes={extremes} /><HighchartsReact ref={occupancyRef} highcharts={Highcharts} options={occupancyOptions} /><HighchartsReact ref={chartRef} highcharts={Highcharts} options={temperatureOptions} /></>}
  </DashboardCard>;
});
