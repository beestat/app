import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiCall } from '../../api/client';
import { colors } from '../../theme';
import type { Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';
import { chartTooltipHtml, stableTooltipPositioner } from '../common/chartTooltip';
import { RuntimeChips } from './RuntimeChips';
import { RuntimeRaceway } from './RuntimeRaceway';
import { ChartRangeMenu } from './ChartRangeMenu';
import { buildRuntimeData, equipment, formatRuntime, runtimeAxisLabel, runtimeTickPositions, unitLabel, type EquipmentCode, type RuntimeRow } from './runtimeData';
import { synchronizeChartPointers } from './chartSync';
import { useDashboard } from '../../state/DashboardContext';
import { chartRangeBounds, persistChartRange, settingDateToIso } from './persistChartRange';
import { convertTemperature } from '../../utils/format';

export const RuntimeDetailCard = memo(function RuntimeDetailCard({ thermostat }: { thermostat: Thermostat }) {
  const { data: dashboardData } = useDashboard();
  const displayUnit = String(dashboardData?.user?.settings?.units?.temperature ?? thermostat.temperature_unit);
  const [days, setDays] = useState(() => {
    const configured = Number(dashboardData?.user?.settings?.runtime_thermostat_detail_range_dynamic);
    return [1, 3, 7].includes(configured) ? configured : 3;
  });
  const [custom, setCustom] = useState<{ begin: string; end: string } | undefined>(() => {
    const settings = dashboardData?.user?.settings;
    const begin = settingDateToIso(settings?.runtime_thermostat_detail_range_static_begin);
    const end = settingDateToIso(settings?.runtime_thermostat_detail_range_static_end);
    return settings?.runtime_thermostat_detail_range_type === 'static' && begin && end ? { begin, end } : undefined;
  });
  const [extremes, setExtremes] = useState<[number, number]>();
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const racewayRef = useRef<HighchartsReact.RefObject>(null);
  const range = custom ? { value: [new Date(`${custom.begin}T00:00:00`).toISOString(), new Date(`${custom.end}T23:59:59`).toISOString()], operator: 'between' } : { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' };
  const query = useQuery({
    queryKey: ['runtime-thermostat', thermostat.thermostat_id, custom ?? days],
    queryFn: ({ signal }) => apiCall<RuntimeRow[]>({ resource: 'runtime_thermostat', method: 'read', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: range } } }, signal),
    staleTime: 5 * 60_000,
  });
  const data = useMemo(() => buildRuntimeData(query.data ?? [], thermostat), [query.data, thermostat]);
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
      type: key.includes('setpoint') ? 'line' as const : 'spline' as const, name, data: key.includes('humidity') ? data.temperature[key] : data.temperature[key].map(([x, value]) => [x, value == null ? null : convertTemperature(value, displayUnit)]), color,
      dashStyle: dashStyle as Highcharts.DashStyleValue, lineWidth, visible, yAxis: key.includes('humidity') ? 1 : 0,
      step: key.includes('setpoint') ? 'right' as const : undefined, turboThreshold: 0,
    }));
  }, [data, displayUnit]);
  const temperatureBounds = useMemo(() => {
    const values = series.filter((item) => item.visible && item.yAxis === 0).flatMap((item) => item.data.map((point) => point[1]).filter((value): value is number => typeof value === 'number'));
    if (!values.length) return undefined;
    const interval = displayUnit.includes('C') ? 5 : 10;
    return { min: Math.floor(Math.min(...values) / interval) * interval, max: Math.ceil(Math.max(...values) / interval) * interval, tickInterval: interval };
  }, [displayUnit, series]);
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 350, marginLeft: 45, spacing: [8, 0, 0, 0], style: { fontFamily: 'Montserrat' }, alignTicks: false, animation: false, zooming: { type: 'x' } },
    title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false },
    xAxis: { type: 'datetime', min: extremes?.[0] ?? data.min, max: extremes?.[1] ?? data.max, tickPositioner() { return runtimeTickPositions(data.timestamps, Number(this.min), Number(this.max), this.len); }, lineColor: colors.slate.light, tickLength: 0, labels: { rotation: -45, allowOverlap: true, style: { color: colors.gray.main, fontSize: '11px' }, formatter() { return runtimeAxisLabel(Number(this.value), this.axis.tickPositions); } }, events: { afterSetExtremes(event) { if (event.trigger && Number.isFinite(event.min) && Number.isFinite(event.max)) setExtremes([event.min, event.max]); } } },
    yAxis: [{ ...temperatureBounds, title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', allowDecimals: false, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: `{value}${unitLabel(displayUnit)}` } }, { title: { text: undefined }, opposite: true, alignTicks: false, min: 0, minRange: 100, ceiling: 100, gridLineWidth: 0, labels: { style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' }, format: '{value}%' } }],
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '500' }, itemHiddenStyle: { color: '#7f8c8d', textDecoration: 'line-through' }, itemHoverStyle: { color: colors.gray.main } },
    tooltip: { shared: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, positioner: stableTooltipPositioner(60), backgroundColor: 'transparent', borderWidth: 0, formatter() {
      const x = Number(this.x);
      const modeItems: { label: string; value: string; color: string }[] = [];
      const dataItems: { label: string; value: string; color: string }[] = [];
      const equipmentItems: { label: string; value: string; color: string }[] = [];
      const offItems: { label: string; value: string; color: string }[] = [];
      const mode = data.systemModeAt[x];
      const modeLabels: Record<string, string> = { auto: 'Auto', heat: 'Heat', cool: 'Cool', off: 'Off', auxiliary_heat: 'Aux' };
      const modeColors: Record<string, string> = { auto: colors.gray.main, heat: data.equipment.compressor_heat_1.color, cool: data.equipment.compressor_cool_1.color, off: colors.gray.main, auxiliary_heat: data.equipment.auxiliary_heat_1.color };
      if (modeLabels[mode]) modeItems.push({ label: 'System Mode', value: modeLabels[mode], color: modeColors[mode] });
      if (data.climateAt[x]) modeItems.push({ label: 'Comfort Profile', value: data.climateAt[x].replace(/[<>&]/g, ''), color: colors.gray.main });
      (this.points ?? []).forEach((point) => {
        if (point.y == null) return;
        const humidity = point.series.name.includes('Humidity');
        const value = humidity ? `${Math.round(point.y)}%` : `${Highcharts.numberFormat(point.y, 1)}${unitLabel(displayUnit)}`;
        dataItems.push({ label: point.series.name, value, color: String(point.color) });
      });
      (Object.keys(equipment) as EquipmentCode[]).forEach((code) => {
        const seconds = data.equipmentAt[x]?.[code] ?? 0;
        if (seconds > 0) equipmentItems.push({ label: data.equipment[code].name, value: formatRuntime(seconds), color: data.equipment[code].color });
      });
      if (data.offAt[x] > 0) offItems.push({ label: 'Off', value: formatRuntime(data.offAt[x]), color: colors.slate.light });
      return chartTooltipHtml(Highcharts.dateFormat('%a, %b %e @ %l:%M%P', x), [modeItems, dataItems, equipmentItems, offItems]);
    } },
    plotOptions: { series: { animation: false, marker: { enabled: false, states: { hover: { enabled: false } } }, states: { hover: { enabled: false }, inactive: { opacity: 1 } } } }, series,
  }), [data, displayUnit, extremes, series, temperatureBounds]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      dispose = synchronizeChartPointers([racewayRef.current?.chart, chartRef.current?.chart]);
    });
    return () => { cancelAnimationFrame(frame); dispose?.(); };
  }, [query.data, extremes]);

  const download = () => { const svg = chartRef.current?.container.current?.querySelector('svg'); if (!svg) return; const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-thermostat-detail.svg'; link.click(); URL.revokeObjectURL(url); };
  const changeDays = (value: number) => { setCustom(undefined); setDays(value); setExtremes(undefined); void persistChartRange('runtime_thermostat_detail', { days: value }); };
  const changeCustom = (begin: string, end: string) => { setCustom({ begin, end }); setExtremes(undefined); void persistChartRange('runtime_thermostat_detail', { begin, end }); };
  const rangeBounds = chartRangeBounds(thermostat.sync_begin ?? thermostat.data_begin, thermostat.sync_end ?? thermostat.data_end, 12);
  const subtitle = custom ? `${new Date(`${custom.begin}T00:00:00`).toLocaleDateString()} to ${new Date(`${custom.end}T00:00:00`).toLocaleDateString()}` : `Past ${days} day${days > 1 ? 's' : ''}`;
  return <DashboardCard title="Thermostat Detail" subheader={subtitle} action={<ChartRangeMenu days={custom ? undefined : days} setDays={changeDays} onCustom={changeCustom} onDownload={download} onReset={() => { setExtremes(undefined); chartRef.current?.chart.zoomOut(); }} helpUrl="https://doc.beestat.io/e499fb13fd4441f4b3f096baca1cb138" customTitle="Thermostat Detail - Custom Range" customDescription="Choose a custom range to display on the Thermostat Detail chart." maxDays={30} initialBegin={custom?.begin} initialEnd={custom?.end} minDate={rangeBounds.min} maxDate={rangeBounds.max} />}>
    {query.isLoading ? <Box sx={{ height: 365, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : !query.data?.length ? <Alert severity="info">No data to display for this range.</Alert> : <>
      <RuntimeChips data={data} />
      <RuntimeRaceway data={data} extremes={extremes} chartRef={racewayRef} />
      <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} containerProps={{ style: { marginTop: 8 } }} />
    </>}
  </DashboardCard>;
});
