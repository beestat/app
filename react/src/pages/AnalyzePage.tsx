import { Alert, Box, Chip, Stack } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { formatDuration } from '../utils/format';

export function AnalyzePage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const summary = useMemo(() => Object.values(data?.runtime_thermostat_summary ?? {}).filter((row) => Number(row.thermostat_id) === thermostatId).sort((a, b) => String(a.date).localeCompare(String(b.date))), [data?.runtime_thermostat_summary, thermostatId]);
  const summaryOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 430, zooming: { type: 'x' } }, title: { text: undefined }, credits: { enabled: false },
    xAxis: { type: 'datetime', labels: { style: { color: colors.gray.main } } },
    yAxis: [{ title: { text: 'Runtime (hours)', style: { color: colors.gray.main } }, gridLineColor: colors.slate.light }, { title: { text: 'Outdoor temperature', style: { color: colors.gray.main } }, opposite: true, gridLineWidth: 0 }],
    legend: { itemStyle: { color: colors.gray.light } }, tooltip: { shared: true, xDateFormat: '%b %e, %Y', backgroundColor: colors.slate.dark, style: { color: '#fff' } },
    plotOptions: { column: { stacking: 'normal', borderWidth: 0 }, series: { animation: false, marker: { enabled: false } } },
    series: ([
      ['sum_compressor_cool_1', 'Cool', colors.lightBlue.light], ['sum_compressor_heat_1', 'Heat', colors.orange.light], ['sum_auxiliary_heat_1', 'Aux Heat', colors.red.main], ['sum_fan', 'Fan', colors.gray.main],
    ].map(([key, name, color]) => ({ type: 'column', name, color, data: summary.map((row) => [Date.parse(`${row.date}T12:00:00`), Number(row[key]) / 3600]) })) as Highcharts.SeriesOptionsType[]).concat([
      { type: 'spline', name: 'Outdoor Temp', color: colors.gray.light, yAxis: 1, data: summary.map((row) => [Date.parse(`${row.date}T12:00:00`), row.avg_outdoor_temperature]) },
    ] as Highcharts.SeriesOptionsType[]),
  }), [summary]);
  const profileOptions = useMemo<Highcharts.Options>(() => {
    const temperature = thermostat?.profile?.temperature ?? {};
    const palette: Record<string, string> = { cool_1: colors.lightBlue.light, cool_2: colors.lightBlue.main, heat_1: colors.orange.light, heat_2: colors.orange.dark, auxiliary_heat_1: colors.red.main, auxiliary_heat_2: colors.red.dark };
    const series = Object.entries(temperature).filter(([, profile]) => profile && typeof profile === 'object').map(([key, profile]: [string, any]) => ({ type: 'spline' as const, name: key.replaceAll('_', ' '), color: palette[key] ?? colors.gray.main, data: Object.entries(profile.deltas ?? {}).map(([outdoor, delta]) => [Number(outdoor), Number(delta)]).sort((a, b) => a[0] - b[0]) }));
    return { chart: { backgroundColor: 'transparent', height: 410, zooming: { type: 'xy' } }, title: { text: undefined }, credits: { enabled: false }, xAxis: { title: { text: `Outdoor temperature (°${thermostat?.temperature_unit ?? 'F'})` }, labels: { style: { color: colors.gray.main } } }, yAxis: { title: { text: `Indoor change per hour (°${thermostat?.temperature_unit ?? 'F'})` }, gridLineColor: colors.slate.light }, legend: { itemStyle: { color: colors.gray.light } }, tooltip: { shared: true, backgroundColor: colors.slate.dark, style: { color: '#fff' } }, series };
  }, [thermostat]);
  const totals = useMemo(() => summary.reduce((acc, row) => { for (const key of ['sum_compressor_cool_1', 'sum_compressor_heat_1', 'sum_auxiliary_heat_1', 'sum_fan']) acc[key] = (acc[key] ?? 0) + Number(row[key] ?? 0); return acc; }, {} as Record<string, number>), [summary]);
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <DashboardCard title="Thermostat Summary" subheader="All available daily runtime data">
      <Stack direction="row" gap={1} flexWrap="wrap" mb={1}>{Object.entries(totals).map(([key, value]) => value ? <Chip key={key} label={`${key.replace('sum_', '').replaceAll('_', ' ')} ${formatDuration(value)}`} /> : null)}</Stack>
      {summary.length ? <HighchartsReact highcharts={Highcharts} options={summaryOptions} /> : <Alert severity="info">No summary data is available yet.</Alert>}
    </DashboardCard>
    <DashboardCard title="Temperature Profiles" subheader={(thermostat?.profile as any)?.metadata?.generated_at ? `Generated ${new Date((thermostat?.profile as any).metadata.generated_at).toLocaleDateString()}` : undefined}>
      {profileOptions.series?.length ? <HighchartsReact highcharts={Highcharts} options={profileOptions} /> : <Alert severity="info">A temperature profile has not been generated yet.</Alert>}
    </DashboardCard>
  </Box>;
}
