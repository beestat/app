import { Alert, Box } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { DashboardCard } from '../components/common/DashboardCard';
import { RuntimeChips } from '../components/detail/RuntimeChips';
import { buildRuntimeData, unitLabel } from '../components/detail/runtimeData';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';

export function AnalyzePage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const summary = useMemo(() => {
    const begin = new Date(); begin.setMonth(begin.getMonth() - 3); begin.setHours(0, 0, 0, 0);
    return Object.values(data?.runtime_thermostat_summary ?? {}).filter((row) => Number(row.thermostat_id) === thermostatId && Date.parse(String(row.date)) >= begin.getTime()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [data?.runtime_thermostat_summary, thermostatId]);
  const unit = unitLabel(thermostat?.temperature_unit ?? '°F');
  const summaryOptions = useMemo<Highcharts.Options>(() => ({
    chart: { backgroundColor: 'transparent', height: 350, zooming: { type: 'x' }, animation: false }, title: { text: undefined }, credits: { enabled: false },
    xAxis: { type: 'datetime', labels: { style: { color: colors.gray.main }, format: '{value:%b %e}' } },
    yAxis: [{ min: 0, softMax: 24, tickInterval: 6, title: { text: undefined }, labels: { format: '{value}h', style: { color: colors.gray.main } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' }, { title: { text: undefined }, opposite: true, gridLineWidth: 0, labels: { format: `{value}${unit}`, style: { color: colors.gray.main } } }],
    legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' } }, tooltip: { shared: true, xDateFormat: '%b %e, %Y', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
    plotOptions: { column: { stacking: 'normal', borderWidth: 0, groupPadding: 0 }, series: { animation: false, marker: { enabled: false } } },
    series: ([
      ['sum_compressor_cool_1', 'Cool 1', colors.lightBlue.light], ['sum_compressor_cool_2', 'Cool 2', colors.lightBlue.main], ['sum_compressor_heat_1', 'Heat 1', colors.orange.light], ['sum_compressor_heat_2', 'Heat 2', colors.orange.dark], ['sum_auxiliary_heat_1', 'Aux 1', colors.red.main], ['sum_auxiliary_heat_2', 'Aux 2', colors.red.dark],
    ].map(([key, name, color]) => ({ type: 'column', name, color, data: summary.map((row) => [Date.parse(`${row.date}T12:00:00Z`), Number(row[key]) / 3600]) })) as Highcharts.SeriesOptionsType[]).concat([{ type: 'spline', name: 'Outdoor Temp', color: colors.gray.light, dashStyle: 'ShortDash', lineWidth: 1, yAxis: 1, data: summary.map((row) => [Date.parse(`${row.date}T12:00:00Z`), row.avg_outdoor_temperature]) }] as Highcharts.SeriesOptionsType[]),
  }), [summary, unit]);
  const chipData = useMemo(() => {
    const result = buildRuntimeData([]);
    for (const code of Object.keys(result.totals)) result.totals[code as keyof typeof result.totals] = summary.reduce((sum, row) => sum + Number(row[`sum_${code}`] ?? 0), 0);
    return result;
  }, [summary]);
  const profileOptions = useMemo<Highcharts.Options>(() => {
    const temperature = thermostat?.profile?.temperature ?? {};
    const palette: Record<string, string> = { cool_1: colors.lightBlue.light, cool_2: colors.lightBlue.main, heat_1: colors.orange.light, heat_2: colors.orange.dark, resist: colors.gray.main, auxiliary_heat_1: colors.red.main, auxiliary_heat_2: colors.red.dark };
    const names: Record<string, string> = { cool_1: 'Cool 1 Δ', cool_2: 'Cool 2 Δ', heat_1: 'Heat 1 Δ', heat_2: 'Heat 2 Δ', resist: 'Resist Δ', auxiliary_heat_1: 'Aux Heat 1 Δ', auxiliary_heat_2: 'Aux Heat 2 Δ' };
    const entries = Object.entries(temperature).filter(([, value]) => value && typeof value === 'object') as [string, any][];
    const series = entries.flatMap(([key, profile]) => {
      const raw = Object.entries(profile.deltas ?? {}).map(([x, y]) => [Number(x), Number(y)] as [number, number]).sort((a, b) => a[0] - b[0]);
      const trend = profile.linear_trendline;
      const line = trend && raw.length ? [[raw[0][0], trend.slope * raw[0][0] + trend.intercept], [raw.at(-1)![0], trend.slope * raw.at(-1)![0] + trend.intercept]] : [];
      return [{ type: 'spline' as const, name: `${names[key] ?? key} raw`, color: palette[key] ?? colors.gray.main, data: raw, lineWidth: 1, showInLegend: false }, { type: 'line' as const, name: names[key] ?? key, color: palette[key] ?? colors.gray.main, data: line, dashStyle: 'ShortDash' as const, lineWidth: 2, marker: { enabled: false } }];
    });
    const balance = thermostat?.profile?.balance_point ?? {};
    const plotLines = Object.entries(balance).filter(([, value]) => typeof value === 'number').map(([key, value]) => ({ value: Number(value), color: palette[key] ?? colors.gray.light, dashStyle: 'ShortDot' as const, width: 1, label: { text: `${names[key] ?? key}: ${value}${unit}`, style: { color: colors.gray.light } } }));
    return { chart: { backgroundColor: 'transparent', height: 350, zooming: { type: 'xy' }, animation: false }, title: { text: undefined }, credits: { enabled: false }, xAxis: { title: { text: `Outdoor temperature (${unit})` }, labels: { style: { color: colors.gray.main }, format: `{value}${unit}` }, plotLines }, yAxis: { title: { text: `Indoor change per hour (${unit})` }, labels: { format: `{value}${unit}` }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' }, legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' } }, tooltip: { shared: true, backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 }, series };
  }, [thermostat, unit]);
  const generated = (thermostat?.profile as any)?.metadata?.generated_at;
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <DashboardCard title="Thermostat Summary" subheader="Past 3 months, grouped by day (Gap Fill: Off, Smart Scale: On)"><RuntimeChips data={chipData} />{summary.length ? <HighchartsReact highcharts={Highcharts} options={summaryOptions} /> : <Alert severity="info">No summary data is available yet.</Alert>}</DashboardCard>
    <DashboardCard title="Temperature Profiles" subheader={generated ? `Generated ${new Date(generated).toLocaleString()} from the past year of data (updated weekly).` : undefined}>{profileOptions.series?.length ? <HighchartsReact highcharts={Highcharts} options={profileOptions} /> : <Alert severity="info">A temperature profile has not been generated yet.</Alert>}</DashboardCard>
  </Box>;
}
