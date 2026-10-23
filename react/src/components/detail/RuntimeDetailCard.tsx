import { memo, useMemo, useState } from 'react';
import { Alert, Box, Button, ButtonGroup, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiCall } from '../../api/client';
import { colors } from '../../theme';
import type { Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';

type RuntimeRow = Record<string, any> & { timestamp: string };

const seriesMeta: Record<string, { name: string; color: string; dash?: string }> = {
  indoor_temperature: { name: 'Indoor Temp', color: colors.gray.light },
  outdoor_temperature: { name: 'Outdoor Temp', color: colors.gray.main, dash: 'ShortDash' },
  setpoint_heat: { name: 'Heat Setpoint', color: colors.orange.light },
  setpoint_cool: { name: 'Cool Setpoint', color: colors.lightBlue.light },
  indoor_humidity: { name: 'Indoor Humidity', color: colors.teal.main },
  outdoor_humidity: { name: 'Outdoor Humidity', color: colors.teal.light, dash: 'ShortDash' },
};

export const RuntimeDetailCard = memo(function RuntimeDetailCard({ thermostat }: { thermostat: Thermostat }) {
  const [days, setDays] = useState(3);
  const query = useQuery({
    queryKey: ['runtime-thermostat', thermostat.thermostat_id, days],
    queryFn: ({ signal }) => apiCall<RuntimeRow[]>({ resource: 'runtime_thermostat', method: 'read', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, timestamp: { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' } } } }, signal),
    staleTime: 5 * 60_000,
  });
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 410, animation: false, zooming: { type: 'x' } },
    boost: { enabled: true, useGPUTranslations: true },
    title: { text: undefined }, credits: { enabled: false }, exporting: { enabled: false },
    xAxis: { type: 'datetime', lineColor: colors.slate.light, tickColor: colors.slate.light, labels: { style: { color: colors.gray.main } } },
    yAxis: [{ title: { text: undefined }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', labels: { style: { color: colors.gray.main }, format: `{value}°${thermostat.temperature_unit}` } }, { title: { text: undefined }, opposite: true, min: 0, max: 100, gridLineWidth: 0, labels: { style: { color: colors.gray.main }, format: '{value}%' } }],
    legend: { itemStyle: { color: colors.gray.light }, itemHoverStyle: { color: '#fff' } },
    tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
    plotOptions: { series: { animation: false, turboThreshold: 0, marker: { enabled: false }, states: { inactive: { opacity: .35 } } } },
    series: Object.entries(seriesMeta).map(([key, meta]) => ({
      type: 'line', name: meta.name, color: meta.color, dashStyle: meta.dash as Highcharts.DashStyleValue | undefined,
      yAxis: key.includes('humidity') ? 1 : 0,
      visible: !key.includes('humidity'),
      step: key.includes('setpoint') ? 'right' : undefined,
      lineWidth: key === 'indoor_temperature' ? 2 : 1,
      data: (query.data ?? []).map((row) => [Date.parse(row.timestamp), row[key]]),
    })),
  }), [query.data, thermostat.temperature_unit]);
  return (
    <DashboardCard title="Thermostat Detail" subheader={`Past ${days} day${days > 1 ? 's' : ''}`} action={<ButtonGroup size="small">{[1, 3, 7, 14, 31].map((value) => <Button key={value} variant={days === value ? 'contained' : 'outlined'} onClick={() => setDays(value)}>{value}d</Button>)}</ButtonGroup>}>
      {query.isLoading ? <Box sx={{ height: 410, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : !query.data?.length ? <Alert severity="info">No data to display for this range.</Alert> : <HighchartsReact highcharts={Highcharts} options={options} immutable={false} />}
    </DashboardCard>
  );
});
