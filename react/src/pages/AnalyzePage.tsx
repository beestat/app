import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import HighchartsReact from 'highcharts-react-official';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, Info, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { RuntimeChips } from '../components/detail/RuntimeChips';
import { buildRuntimeData, unitLabel } from '../components/detail/runtimeData';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { aggregateSummary, matchingPreset, presetConfig, smartScale, type SummaryConfig, type SummaryGroup, type SummaryPeriod, type SummarySourceRow } from './analyzeSummary';

function saveSvg(ref: React.RefObject<HighchartsReact.RefObject | null>, name: string) {
  const svg = ref.current?.container.current?.querySelector('svg');
  if (!svg) return;
  const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function ordinal(day: number) {
  const remainder = day % 100;
  return `${day}${remainder >= 11 && remainder <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'}`;
}

const profileNames: Record<string, string> = { cool_1: 'Cool 1 Δ', cool_2: 'Cool 2 Δ', heat_1: 'Heat 1 Δ', heat_2: 'Heat 2 Δ', resist: 'Resist Δ', auxiliary_heat_1: 'Aux Heat 1 Δ', auxiliary_heat_2: 'Aux Heat 2 Δ' };
const profileOrder = ['heat_1', 'heat_2', 'auxiliary_heat_1', 'auxiliary_heat_2', 'cool_1', 'cool_2', 'resist'];

function profileTrend(profile: any) {
  const points = Object.entries(profile?.deltas ?? {}).map(([x, y]) => [Number(x), Number(y)] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!points.length) return undefined;
  const meanX = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point[0] - meanX) ** 2, 0);
  const slope = denominator ? points.reduce((sum, point) => sum + (point[0] - meanX) * (point[1] - meanY), 0) / denominator : 0;
  return { slope, intercept: meanY - slope * meanX };
}

function SummaryMenu({ config, setConfig, onDownload, onReset }: { config: SummaryConfig; setConfig: (value: SummaryConfig) => void; onDownload: () => void; onReset: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null); const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState(config);
  const preset = matchingPreset(config);
  const choose = (value: '3' | '12' | 'all') => { setConfig(presetConfig(value)); setAnchor(null); };
  const openCustom = () => { setDraft(config); setAnchor(null); setCustomOpen(true); };
  const setPeriod = (_: React.MouseEvent<HTMLElement>, value: SummaryPeriod | null) => value && setDraft((old) => ({ ...old, period: value, count: value === 'all' ? 0 : Math.max(1, old.count) }));
  const setGroup = (_: React.MouseEvent<HTMLElement>, value: SummaryGroup | null) => value && setDraft((old) => ({ ...old, group: value }));
  return <><IconButton aria-label="Thermostat summary menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem selected={preset === '3'} onClick={() => choose('3')}><ListItemText>Past 3 Months</ListItemText></MenuItem><MenuItem selected={preset === '12'} onClick={() => choose('12')}><ListItemText>Past 12 Months</ListItemText></MenuItem><MenuItem selected={preset === 'all'} onClick={() => choose('all')}><ListItemText>All Time</ListItemText></MenuItem><MenuItem selected={preset === 'custom'} onClick={openCustom}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); onDownload(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); onReset(); }}><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem><MenuItem component="a" href="https://doc.beestat.io/3225b739ebbc42d68a18260565fda4f1" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu><Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Thermostat Summary - Custom Range</DialogTitle><DialogContent><Typography color="text.secondary" mb={2}>Choose a custom range to display on the Thermostat Summary chart.</Typography><Typography fontWeight={600} mb={1}>Time Period</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}><TextField size="small" label="Count" disabled={draft.period === 'all'} value={draft.period === 'all' ? '∞' : draft.count} slotProps={{ htmlInput: { inputMode: 'numeric' } }} onChange={(event) => setDraft((old) => ({ ...old, count: Math.max(1, Number.parseInt(event.target.value.replace(/\D/g, ''), 10) || 1) }))} sx={{ width: 100 }} /><ToggleButtonGroup exclusive value={draft.period} onChange={setPeriod} size="small" sx={{ flexWrap: 'wrap' }}>{(['day', 'week', 'month', 'year', 'all'] as SummaryPeriod[]).map((value) => <ToggleButton key={value} value={value}>{value === 'all' ? 'All' : `${value}s`}</ToggleButton>)}</ToggleButtonGroup></Stack><Typography fontWeight={600} mt={2} mb={1}>Group By</Typography><ToggleButtonGroup exclusive value={draft.group} onChange={setGroup} size="small" sx={{ flexWrap: 'wrap' }}>{(['day', 'week', 'month', 'year'] as SummaryGroup[]).map((value) => <ToggleButton key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</ToggleButton>)}</ToggleButtonGroup></DialogContent><DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => { setConfig(draft); setCustomOpen(false); }}>Save</Button></DialogActions></Dialog></>;
}

function ProfileMenu({ profile, unit, subtitle, onDownload }: { profile: any; unit: string; subtitle?: string; onDownload: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null); const [info, setInfo] = useState(false);
  const downloadProfile = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `Temperature Profile - ${String(profile?.metadata?.generated_at ?? '').slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); };
  const fields = profileOrder.flatMap((key) => { const trend = profileTrend(profile?.temperature?.[key]); return trend ? [{ key, name: profileNames[key] ?? key, ...trend }] : []; });
  return <><IconButton aria-label="Temperature profiles menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); onDownload(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem>{profile && <><MenuItem onClick={() => { setAnchor(null); downloadProfile(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Profile</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); setInfo(true); }}><ListItemIcon><Info size={18} /></ListItemIcon><ListItemText>More Info</ListItemText></MenuItem></>}<MenuItem component="a" href="https://doc.beestat.io/9c0fba6793dd4bc68f798c1516f0ea25" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu><Dialog open={info} onClose={() => setInfo(false)} fullWidth maxWidth="sm"><DialogTitle>Temperature Profiles Info</DialogTitle><DialogContent><Typography color="text.secondary" mb={2}>{subtitle}</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>{fields.map((field) => <Box key={field.key}><Typography fontWeight={600} mb={.5}>{field.name}</Typography><Typography>Slope = {field.slope.toFixed(4)}<br />Intercept = {field.intercept.toFixed(4)}{unit}</Typography></Box>)}</Box></DialogContent><DialogActions><Button onClick={() => setInfo(false)}>Close</Button></DialogActions></Dialog></>;
}

export function AnalyzePage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const [summaryConfig, setSummaryConfig] = useState<SummaryConfig>();
  const [profileIndex, setProfileIndex] = useState<number>();
  const summaryRef = useRef<HighchartsReact.RefObject>(null);
  const profileRef = useRef<HighchartsReact.RefObject>(null);
  const settings = data?.user?.settings ?? {};
  const storedSummaryConfig = useMemo<SummaryConfig>(() => ({
    count: Number(settings.runtime_thermostat_summary_time_count ?? 0),
    period: (settings.runtime_thermostat_summary_time_period ?? 'all') as SummaryPeriod,
    group: (settings.runtime_thermostat_summary_group_by ?? 'month') as SummaryGroup,
  }), [settings.runtime_thermostat_summary_group_by, settings.runtime_thermostat_summary_time_count, settings.runtime_thermostat_summary_time_period]);
  const config = summaryConfig ?? storedSummaryConfig;
  const allSummary = useMemo(() => Object.values(data?.runtime_thermostat_summary ?? {}).filter((row) => Number(row.thermostat_id) === thermostatId).sort((a, b) => String(a.date).localeCompare(String(b.date))) as SummarySourceRow[], [data?.runtime_thermostat_summary, thermostatId]);
  const gapFill = settings.runtime_thermostat_summary_gap_fill !== false;
  const summary = useMemo(() => aggregateSummary(allSummary, config, gapFill), [allSummary, config, gapFill]);
  const updateSummaryConfig = (value: SummaryConfig) => {
    setSummaryConfig(value);
    void apiBatch([
      { resource: 'user', method: 'update_setting', alias: 'count', arguments: { key: 'runtime_thermostat_summary_time_count', value: value.count } },
      { resource: 'user', method: 'update_setting', alias: 'period', arguments: { key: 'runtime_thermostat_summary_time_period', value: value.period } },
      { resource: 'user', method: 'update_setting', alias: 'group', arguments: { key: 'runtime_thermostat_summary_group_by', value: value.group } },
    ]);
  };
  const unit = unitLabel(thermostat?.temperature_unit ?? '°F');
  const summaryOptions = useMemo<Highcharts.Options>(() => {
    const runtimeSeries = [
      ['sum_compressor_cool_1', 'Cool 1', colors.lightBlue.light], ['sum_compressor_cool_2', 'Cool 2', colors.lightBlue.main], ['sum_compressor_heat_1', 'Heat 1', colors.orange.light], ['sum_compressor_heat_2', 'Heat 2', colors.orange.dark], ['sum_auxiliary_heat_1', 'Aux 1', colors.red.main], ['sum_auxiliary_heat_2', 'Aux 2', colors.red.dark],
    ].filter(([key]) => summary.some((row) => Number(row[key]) !== 0)).map(([key, name, color]) => ({ type: 'column' as const, name, color, yAxis: 0, data: summary.map((row) => Number(row[key])) }));
    const weatherSeries: Highcharts.SeriesOptionsType[] = [{ type: 'spline', id: 'outdoor-temperature', name: 'Outdoor Temp', color: colors.gray.light, dashStyle: 'ShortDash', lineWidth: 1, yAxis: 1, data: summary.map((row) => Number(row.avg_outdoor_temperature)) }];
    if (summary.some((row) => row.min_outdoor_temperature != null && row.max_outdoor_temperature != null)) weatherSeries.push({ type: 'areasplinerange', name: 'Outdoor Temp Extremes', linkedTo: 'outdoor-temperature', color: colors.gray.dark, fillOpacity: .2, lineWidth: 0, yAxis: 1, data: summary.map((row) => [Number(row.min_outdoor_temperature), Number(row.max_outdoor_temperature)]) });
    const hasDegreeDays = summary.some((row) => Number(row.sum_heating_degree_days) !== 0 || Number(row.sum_cooling_degree_days) !== 0);
    const degreeDaySeries: Highcharts.SeriesOptionsType[] = hasDegreeDays ? [
      { type: 'spline', id: 'degree-days', name: 'Degree Days', color: colors.red.dark, lineWidth: 2, visible: false, yAxis: 2, data: summary.map((row) => Number(row.sum_heating_degree_days)) },
      { type: 'spline', name: 'Cooling Degree Days', linkedTo: 'degree-days', color: colors.lightBlue.dark, lineWidth: 2, visible: false, yAxis: 2, data: summary.map((row) => Number(row.sum_cooling_degree_days)) },
    ] : [];
    const useSmartScale = settings.runtime_thermostat_summary_smart_scale !== false;
    const scale = smartScale(config.group);
    return {
      chart: { backgroundColor: 'transparent', height: 350, zooming: { type: 'x' }, animation: false }, title: { text: undefined }, credits: { enabled: false },
      xAxis: { categories: summary.map((row) => String(row.date)), tickLength: 0, labels: { style: { color: colors.gray.main }, formatter() { const date = new Date(`${String(this.value)}T00:00:00`); const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }); const year = date.getUTCFullYear(); if (config.group === 'year') return String(year); if (config.group === 'month') return `${month}${this.isFirst || date.getUTCMonth() === 0 ? ` ${year}` : ''}`; if (config.group === 'week') return `${month} ${date.getUTCDate()}${this.isFirst || date.getUTCMonth() === 0 ? ` ${year}` : ''}`; return `${this.isFirst || date.getUTCDate() <= 2 ? `${month} ` : ''}${date.getUTCDate()}${this.isFirst || (date.getUTCMonth() === 0 && date.getUTCDate() <= 2) ? ` ${year}` : ''}`; } } },
      yAxis: [{ alignTicks: false, min: 0, softMax: useSmartScale ? scale.max : undefined, tickInterval: useSmartScale ? scale.interval : undefined, reversedStacks: false, title: { text: undefined }, labels: { format: '{value}h', style: { color: colors.gray.main } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' }, { alignTicks: false, title: { text: undefined }, opposite: true, allowDecimals: false, tickInterval: unit.includes('C') ? 10 : 20, gridLineWidth: 0, labels: { format: `{value}${unit}`, style: { color: colors.gray.main } } }, { alignTicks: false, title: { text: undefined }, opposite: true, allowDecimals: false, gridLineWidth: 0, labels: { enabled: false } }],
      legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' } }, tooltip: { shared: true, xDateFormat: '%b %e, %Y', backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 },
      plotOptions: { column: { stacking: 'normal', borderWidth: 0, groupPadding: 0 }, series: { animation: false, marker: { enabled: false } } },
      series: [...runtimeSeries, ...weatherSeries, ...degreeDaySeries],
    };
  }, [config.group, settings.runtime_thermostat_summary_smart_scale, summary, unit]);
  const chipData = useMemo(() => {
    const result = buildRuntimeData([]);
    for (const code of Object.keys(result.totals)) result.totals[code as keyof typeof result.totals] = summary.reduce((sum, row) => sum + Number(row[`sum_${code}`] ?? 0), 0) * 3600;
    return result;
  }, [summary]);
  const profiles = useMemo(() => Object.values(data?.profile ?? {}).filter((item: any) => Number(item.thermostat_id) === thermostatId && item.profile).sort((a: any, b: any) => String(a.profile.metadata?.generated_at).localeCompare(String(b.profile.metadata?.generated_at))) as any[], [data?.profile, thermostatId]);
  const selectedProfile = profileIndex === undefined ? thermostat?.profile : profiles[Math.min(profileIndex, Math.max(0, profiles.length - 1))]?.profile ?? thermostat?.profile;
  const profileOptions = useMemo<Highcharts.Options>(() => {
    const temperature = selectedProfile?.temperature ?? {};
    const palette: Record<string, string> = { cool_1: colors.lightBlue.light, cool_2: colors.lightBlue.main, heat_1: colors.orange.light, heat_2: colors.orange.dark, resist: colors.gray.main, auxiliary_heat_1: colors.red.main, auxiliary_heat_2: colors.red.dark };
    const entries = Object.entries(temperature).filter(([, value]) => value && typeof value === 'object') as [string, any][];
    const extentEntries = Object.entries(thermostat?.profile?.temperature ?? temperature).filter(([, value]) => value && typeof value === 'object') as [string, any][];
    const weather = Math.round(Number(thermostat?.weather?.temperature));
    const parentExtremes = (parent: 'heat' | 'cool' | 'resist') => {
      const values = extentEntries.filter(([key]) => key.includes(parent)).flatMap(([, profile]) => Object.keys(profile.deltas ?? {}).map(Number));
      if (Number.isFinite(weather) && (parent === 'resist' || parent === 'heat')) values.push(weather);
      if (Number.isFinite(weather) && (parent === 'resist' || parent === 'cool')) values.push(weather);
      return values.length ? [Math.min(...values) - 5, Math.max(...values) + 5] : [0, 0];
    };
    const series = entries.flatMap(([key, profile]) => {
      const raw = Object.entries(profile.deltas ?? {}).map(([x, y]) => [Number(x), Number(y)] as [number, number]).sort((a, b) => a[0] - b[0]);
      const trend = profileTrend(profile);
      const parent = key.includes('cool') ? 'cool' : key.includes('resist') ? 'resist' : 'heat';
      const [xMin, xMax] = parentExtremes(parent);
      const line = trend && raw.length ? Array.from({ length: Math.max(0, Math.floor(xMax - xMin)) + 1 }, (_, index) => { const x = xMin + index; return [x, trend.slope * x + trend.intercept] as [number, number]; }) : [];
      const zones = raw.length ? [{ value: raw[0][0], dashStyle: 'ShortDash' as const }, { value: raw.at(-1)![0], dashStyle: 'Solid' as const }] : undefined;
      return [{ type: 'spline' as const, name: `${profileNames[key] ?? key} raw`, color: palette[key] ?? colors.gray.main, data: raw, dashStyle: 'ShortDot' as const, lineWidth: 1, marker: { enabled: false }, showInLegend: false }, { type: 'line' as const, name: profileNames[key] ?? key, color: palette[key] ?? colors.gray.main, data: line, dashStyle: 'ShortDash' as const, lineWidth: 2, marker: { enabled: false }, zoneAxis: 'x' as const, zones }];
    });
    const yValues = extentEntries.flatMap(([, profile]) => Object.values(profile.deltas ?? {}).map(Number)).filter(Number.isFinite);
    const absoluteY = Math.max(1, ...yValues.map((value) => Math.abs(value) + .25));
    const plotLines = Number.isFinite(weather) ? [{ value: weather, color: colors.gray.light, dashStyle: 'ShortDash' as const, width: 1, zIndex: 2, label: { text: `Now: ${weather}${unit}`, style: { color: colors.gray.light } } }] : [];
    return { chart: { backgroundColor: 'transparent', height: 300, animation: false }, title: { text: undefined }, credits: { enabled: false }, xAxis: { lineWidth: 0, tickLength: 0, tickInterval: 5, gridLineWidth: 1, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', title: { text: undefined }, labels: { style: { color: colors.gray.main, textOverflow: 'none' }, format: `{value}${unit}` }, plotLines }, yAxis: { min: -absoluteY, max: absoluteY, tickInterval: 1, startOnTick: false, endOnTick: false, title: { text: undefined }, labels: { style: { textOverflow: 'none' }, format: `{value}${unit}` }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', plotLines: [{ value: 0, color: colors.slate.light, width: 3, zIndex: 1 }] }, legend: { enabled: false }, tooltip: { shared: true, useHTML: true, backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0, formatter() { const rows = (this.points ?? []).filter((point) => !point.series.name.includes('raw')).map((point) => { const value = Number(point.y).toFixed(1); return `<div><span style="color:${point.color}">●</span> ${point.series.name}: <b>${Number(value) > 0 ? '+' : ''}${value}${unit} / h</b></div>`; }).join(''); return `<div style="margin-bottom:4px"><b>Outdoor Temp: ${Math.round(Number(this.x))}${unit}</b></div>${rows}`; } }, plotOptions: { series: { animation: false, connectNulls: true, states: { hover: { lineWidthPlus: 0 } } } }, series };
  }, [selectedProfile, thermostat?.weather?.temperature, unit]);
  const generated = selectedProfile?.metadata?.generated_at;
  const durationWeeks = Math.round(Number(selectedProfile?.metadata?.duration ?? 365) / 7);
  const duration = durationWeeks === 0 ? 'few days' : durationWeeks === 1 ? 'week' : durationWeeks >= 52 ? 'year' : `${durationWeeks} weeks`;
  const generatedDate = generated ? new Date(generated) : undefined;
  const profileSubtitle = generatedDate ? `Generated ${generatedDate.toLocaleDateString('en-US', { month: 'short' })} ${ordinal(generatedDate.getDate())}, ${generatedDate.getFullYear()} @ ${generatedDate.toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase()} from the past ${duration} of data (updated weekly).` : undefined;
  const summaryLabel = config.period === 'all' ? 'All time' : `Past ${config.count} ${config.period}${config.count === 1 ? '' : 's'}`;
  const summarySubtitle = `${summaryLabel}, grouped by ${config.group} (Gap Fill: ${gapFill ? 'On' : 'Off'}, Smart Scale: ${settings.runtime_thermostat_summary_smart_scale === false ? 'Off' : 'On'})`;
  return <Box sx={{ display: 'grid', gap: 2, pb: 2 }}>
    <DashboardCard title="Thermostat Summary" subheader={summarySubtitle} action={<SummaryMenu config={config} setConfig={updateSummaryConfig} onDownload={() => saveSvg(summaryRef, 'beestat-thermostat-summary.svg')} onReset={() => summaryRef.current?.chart.zoomOut()} />}><RuntimeChips data={chipData} summary />{summary.length ? <HighchartsReact ref={summaryRef} highcharts={Highcharts} options={summaryOptions} /> : <Alert severity="info">No summary data is available yet.</Alert>}</DashboardCard>
    <DashboardCard title="Temperature Profiles" subheader={profileSubtitle} action={<ProfileMenu profile={selectedProfile} unit={unit} subtitle={profileSubtitle} onDownload={() => saveSvg(profileRef, 'beestat-temperature-profiles.svg')} />}>{profileOptions.series?.length ? <><HighchartsReact ref={profileRef} highcharts={Highcharts} options={profileOptions} />{profiles.length >= 2 && <Stack direction="row" gap={1.5} alignItems="center" px={.5}><Slider min={0} max={profiles.length - 1} step={1} value={profileIndex ?? profiles.length - 1} onChange={(_, value) => setProfileIndex(value as number)} aria-label="Historical temperature profile" /><Typography sx={{ minWidth: 100, textAlign: 'right', whiteSpace: 'nowrap' }}>{new Date((profiles[profileIndex ?? profiles.length - 1] as any).profile.metadata.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography></Stack>}</> : <Alert severity="info">A temperature profile has not been generated yet.</Alert>}</DashboardCard>
  </Box>;
}
