import { memo, useMemo, useState } from 'react';
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
  const query = useQuery({
    queryKey: ['runtime-thermostat', thermostat.thermostat_id, days],
    queryFn: ({ signal }) => apiCall<RuntimeRow[]>({ resource: 'runtime_thermostat', method: 'read', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' } } } }, signal),
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
    xAxis: { type: 'datetime', min: data.min, max: data.max, lineColor: colors.slate.light, tickColor: colors.slate.light, labels: { style: { color: colors.gray.main, fontSize: '11px' }, format: '{value:%a %l%P}' } },
    yAxis: [{ title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', allowDecimals: false, labels: { style: { color: colors.gray.main, fontSize: '11px' }, format: `{value}${unitLabel(thermostat.temperature_unit)}` } }, { title: { text: undefined }, opposite: true, min: 0, minRange: 100, ceiling: 100, gridLineWidth: 0, labels: { style: { color: colors.gray.main, fontSize: '11px' }, format: '{value}%' } }],
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' }, itemHoverStyle: { color: '#fff' } },
    tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0, valueDecimals: 1 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, states: { inactive: { opacity: .35 } } } }, series,
  }), [data, series, thermostat.temperature_unit]);

  return <DashboardCard title="Thermostat Detail" subheader={`Past ${days} day${days > 1 ? 's' : ''}`} action={<ChartRangeMenu days={days} setDays={setDays} />}>
    {query.isLoading ? <Box sx={{ height: 365, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : !query.data?.length ? <Alert severity="info">No data to display for this range.</Alert> : <>
      <RuntimeChips data={data} />
      <RuntimeRaceway data={data} />
      <HighchartsReact highcharts={Highcharts} options={options} />
    </>}
  </DashboardCard>;
});
