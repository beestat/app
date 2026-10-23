import { memo, useMemo, useState } from 'react';
import { Alert, Box, Button, ButtonGroup, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { apiBatch } from '../../api/client';
import { colors } from '../../theme';
import type { Sensor, Thermostat } from '../../types';
import { DashboardCard } from '../common/DashboardCard';

const palette = [colors.blue.main, colors.red.main, colors.yellow.main, colors.green.main, colors.orange.main, colors.teal.main, colors.purple.main, colors.lightBlue.main];

export const SensorDetailCard = memo(function SensorDetailCard({ thermostat, sensors }: { thermostat: Thermostat; sensors: Sensor[] }) {
  const [days, setDays] = useState(3);
  const query = useQuery({
    queryKey: ['runtime-sensors', thermostat.thermostat_id, sensors.map((sensor) => sensor.sensor_id), days],
    enabled: sensors.length > 0,
    queryFn: ({ signal }) => apiBatch<Record<string, any[]>>(sensors.map((sensor) => ({
      resource: 'runtime_sensor', method: 'read', alias: `sensor_${sensor.sensor_id}`,
      arguments: { attributes: { sensor_id: sensor.sensor_id, timestamp: { value: new Date(Date.now() - days * 86_400_000).toISOString(), operator: '>=' } } },
    })), signal),
    staleTime: 5 * 60_000,
  });
  const options = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 430, zooming: { type: 'x' }, animation: false }, title: { text: undefined }, credits: { enabled: false },
    xAxis: { type: 'datetime', labels: { style: { color: colors.gray.main } }, lineColor: colors.slate.light },
    yAxis: [{ title: { text: undefined }, gridLineColor: colors.slate.light, labels: { style: { color: colors.gray.main }, format: `{value}°${thermostat.temperature_unit}` } }, { title: { text: undefined }, visible: false, min: 0, max: sensors.length + 1 }],
    legend: { itemStyle: { color: colors.gray.light }, itemHoverStyle: { color: '#fff' } },
    tooltip: { shared: true, xDateFormat: '%a, %b %e @ %l:%M%P', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
    plotOptions: { series: { animation: false, marker: { enabled: false }, turboThreshold: 0 } },
    series: sensors.flatMap((sensor, index) => {
      const rows = query.data?.[`sensor_${sensor.sensor_id}`] ?? [];
      const color = palette[index % palette.length];
      return [
        { type: 'spline' as const, name: sensor.name, color, lineWidth: sensor.type === 'thermostat' ? 2 : 1.5, data: rows.map((row) => [Date.parse(row.timestamp), row.temperature]) },
        { type: 'area' as const, name: `${sensor.name} occupancy`, color, yAxis: 1, showInLegend: false, fillOpacity: .12, lineWidth: 3, step: 'left' as const, data: rows.map((row) => [Date.parse(row.timestamp), row.occupancy ? index + 1 : null]) },
      ];
    }),
  }), [days, query.data, sensors, thermostat.temperature_unit]);
  return <DashboardCard title="Sensor Detail" subheader={`Past ${days} day${days > 1 ? 's' : ''}`} action={<ButtonGroup size="small">{[1, 3, 7, 14, 31].map((value) => <Button key={value} variant={days === value ? 'contained' : 'outlined'} onClick={() => setDays(value)}>{value}d</Button>)}</ButtonGroup>}>
    {query.isLoading ? <Box sx={{ height: 430, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : query.error ? <Alert severity="error">{query.error.message}</Alert> : <HighchartsReact highcharts={Highcharts} options={options} />}
  </DashboardCard>;
});
