import { memo, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiCall } from '../../api/client';
import { colors } from '../../theme';
import type { Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';
import { RuntimeChips } from './RuntimeChips';
import { RuntimeRaceway } from './RuntimeRaceway';
import { ChartRangeMenu } from './ChartRangeMenu';
import { buildRuntimeData, unitLabel, type RuntimeRow } from './runtimeData';

export const RuntimeDetailCard = memo(function RuntimeDetailCard({ thermostat }: { thermostat: Thermostat }) {
  const [days, setDays] = useState(3);
  const [custom, setCustom] = useState<{ begin: string; end: string }>();
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const range = custom ? { value: [`${custom.begin}T00:00:00`, `${custom.end}T23:59:59`], operator: 'between' } : { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' };
  const query = useQuery({
    queryKey: ['runtime-thermostat', thermostat.thermostat_id, custom ?? days],
    queryFn: ({ signal }) => apiCall<RuntimeRow[]>({ resource: 'runtime_thermostat', method: 'read', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: range } } }, signal),
    staleTime: 5 * 60_000,
  });
  const data = useMemo(() => buildRuntimeData(query.data ?? []), [query.data]);
  const series = useMemo(() => {
    const definitions = [
      ['indoor_temperature', 'Indoor Temp', colors.gray.light, 'Solid', 2, true],
      ['outdoor_temperature', 'Outdoor Temp', colors.gray.light, 'ShortDash', 1, true],
      ['setpoint_heat', 'Heat Setpoint', colors.orange.light, 'Solid', 1, true],
      ['setpoint_cool', 'Cool Setpoint', colors.lightBlue.light, 'Solid', 1, true],
      ['indoor_humidity', 'Indoor Humidity', colors.teal.main, 'Solid', 2, false],
      ['outdoor_humidity', 'Outdoor Humidity', colors.teal.main, 'ShortDash', 1, false],
    ] as const;
    return definitions.filter(([key]) => data.temperature[key].some((point) => point[1] !== null)).map(([key, name, color, dashStyle, lineWidth, visible]) => ({
      type: key.includes('setpoint') ? 'line' as const : 'spline' as const, name, data: data.temperature[key], color,
      dashStyle: dashStyle as Highcharts.DashStyleValue, lineWidth, visible, yAxis: key.includes('humidity') ? 1 : 0,
      step: key.includes('setpoint') ? 'right' as const : undefined, turboThreshold: 0,
    }));
  }, [data]);
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 300, marginLeft: 45, marginRight: 45, animation: false, zooming: { type: 'x' } },
    title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? data.min, max: extremes?.[1] ?? data.max, lineColor: colors.slate.light, tickColor: colors.slate.light, crosshair: { color: colors.gray.main, width: 1 }, labels: { style: { color: colors.gray.main, fontSize: '11px' }, format: '{value:%a %l%P}' }, events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } } },
    yAxis: [{ title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', allowDecimals: false, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: `{value}${unitLabel(thermostat.temperature_unit)}` } }, { title: { text: undefined }, opposite: true, min: 0, minRange: 100, ceiling: 100, gridLineWidth: 0, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: '{value}%' } }],
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' }, itemHoverStyle: { color: '#fff' } },
    tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0, valueDecimals: 1 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, states: { inactive: { opacity: .35 } } } }, series,
  }), [data, extremes, series, thermostat.temperature_unit]);

  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-thermostat-detail.svg'; link.click(); URL.revokeObjectURL(url); };
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <DashboardCard title="Thermostat Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={(value) => { setCustom(undefined); setDays(value); setExtremes(undefined); }} onCustom={(begin, end) => { setCustom({ begin, end }); setExtremes(undefined); }} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io/891f94a6bdb34895a453b7b91591ec29" />}>
    {query.isLoading ? <Box sx={{ height: 365, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : !query.data?.length ? <Alert severity="info">No data to display for this range.</Alert> : <>
      <RuntimeChips data={data} />
      <RuntimeRaceway data={data} extremes={extremes} />
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
    </>}
  </DashboardCard>;
});
