import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import HighchartsReact from 'highcharts-react-official';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, Info, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { chartTooltipHtml, stableTooltipPositioner } from '../components/common/chartTooltip';
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

function legacyDurationParts(hours: number) {
  const duration = (globalThis as any).moment?.duration(hours, 'hours');
  return duration
    ? { hours: Math.floor(duration.asHours()), minutes: Number(duration.get('minutes')) }
    : { hours: Math.floor(hours), minutes: Math.floor((hours % 1) * 60) };
}

function formatLegacyHours(hours: number) {
  const duration = legacyDurationParts(hours);
  return `${duration.hours.toLocaleString()}h ${duration.minutes}m`;
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
    const hasCool2 = summary.some((row) => Number(row.sum_compressor_cool_2) !== 0);
    const hasHeat2 = summary.some((row) => Number(row.sum_compressor_heat_2) !== 0);
    const hasAux2 = summary.some((row) => Number(row.sum_auxiliary_heat_2) !== 0);
    const runtimeSeries = [
      ['sum_compressor_cool_1', hasCool2 ? 'Cool 1' : 'Cool', colors.lightBlue.light], ['sum_compressor_cool_2', 'Cool 2', colors.lightBlue.main], ['sum_compressor_heat_1', hasHeat2 ? 'Heat 1' : 'Heat', colors.orange.light], ['sum_compressor_heat_2', 'Heat 2', colors.orange.dark], ['sum_auxiliary_heat_1', hasAux2 ? 'Aux Heat 1' : 'Aux', colors.red.main], ['sum_auxiliary_heat_2', 'Aux Heat 2', colors.red.dark],
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
    const desktopTickInterval = Math.max(1, Math.ceil(Math.max(0, summary.length - 1) / 38));
    // Legacy Highcharts fits about eleven category labels across the compact
    // plot. Keep the explicit interval so newer Highcharts does not choose a
    // sparser (and less useful) 13-month cadence on phones.
    const mobileTickInterval = Math.max(1, Math.ceil(Math.max(0, summary.length - 1) / 11));
    return {
      chart: { backgroundColor: 'transparent', height: 350, marginLeft: 49, marginRight: 46, marginBottom: 108, spacing: [8, 0, 0, 0], zooming: { type: 'x' }, animation: false, events: { load() { const chart = this; const axis = chart.xAxis[0]; chart.container.addEventListener('mousemove', (event) => { const normalized = chart.pointer.normalize(event as any); if (!chart.isInsidePlot(normalized.chartX - chart.plotLeft, normalized.chartY - chart.plotTop)) return; const category = Math.round(axis.toValue(normalized.chartX)); const point = chart.series.flatMap((series) => series.points).find((candidate) => candidate.x === category); axis.drawCrosshair(normalized, point); }); chart.container.addEventListener('mouseleave', () => axis.hideCrosshair()); } } }, title: { text: undefined }, credits: { enabled: false },
      xAxis: { categories: summary.map((row) => String(row.date)), tickInterval: desktopTickInterval, tickLength: 0, crosshair: { color: 'rgba(255, 255, 255, 0.2)', width: 1, snap: true, zIndex: 100 }, labels: { style: { color: colors.gray.main }, formatter() { const date = new Date(`${String(this.value)}T00:00:00`); const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }); const year = date.getUTCFullYear(); if (config.group === 'year') return String(year); if (config.group === 'month') return `${month}${this.isFirst || date.getUTCMonth() === 0 || this.axis.chart.chartWidth <= 500 ? ` ${year}` : ''}`; if (config.group === 'week') return `${month} ${date.getUTCDate()}${this.isFirst || date.getUTCMonth() === 0 ? ` ${year}` : ''}`; return `${this.isFirst || date.getUTCDate() <= 2 ? `${month} ` : ''}${date.getUTCDate()}${this.isFirst || (date.getUTCMonth() === 0 && date.getUTCDate() <= 2) ? ` ${year}` : ''}`; } } },
      yAxis: [{ alignTicks: false, min: 0, softMax: useSmartScale ? scale.max : undefined, tickInterval: useSmartScale ? scale.interval : undefined, reversedStacks: false, title: { text: undefined }, labels: { format: '{value}h', style: { color: colors.gray.main, fontSize: '11px', textOverflow: 'none' } }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash' }, { alignTicks: false, title: { text: undefined }, opposite: true, allowDecimals: false, gridLineWidth: 0, labels: { format: `{value}${unit}`, style: { color: colors.gray.main, fontSize: '11px' } } }, { alignTicks: false, title: { text: undefined }, opposite: true, allowDecimals: false, gridLineWidth: 0, labels: { enabled: false } }],
      legend: { itemStyle: { color: colors.gray.light, fontWeight: '400' }, itemHiddenStyle: { color: colors.gray.dark, textDecoration: 'line-through' } }, tooltip: { shared: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, backgroundColor: 'transparent', borderWidth: 0, positioner: stableTooltipPositioner(60), formatter() {
        const points = this.points ?? [];
        const category = String(points[0]?.category ?? '');
        const date = new Date(`${category}T00:00:00Z`);
        const dateTitle = config.group === 'year' ? String(date.getUTCFullYear()) : config.group === 'month' ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : config.group === 'week' ? `Week of ${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${ordinal(date.getUTCDate())}, ${date.getUTCFullYear()}` : `${date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${ordinal(date.getUTCDate())}`;
        const groups: Record<'heat' | 'cool' | 'other', { label: string; value: string; color: string }[]> = { heat: [], cool: [], other: [] };
        const extremes = points.find((point) => point.series.name === 'Outdoor Temp Extremes') as Highcharts.Point & { low?: number; high?: number } | undefined;
        points.forEach((point) => {
          if (point.series.name === 'Outdoor Temp Extremes' || point.y == null) return;
          let value: string;
          if (point.series.name === 'Outdoor Temp') value = `${Math.round(point.y)}${unit}${extremes ? ` (${Math.round(Number(extremes.low))}${unit} to ${Math.round(Number(extremes.high))}${unit})` : ''}`;
          else if (point.series.name.includes('Degree Days')) value = Number(point.y).toFixed(1);
          else value = formatLegacyHours(point.y);
          const group = point.series.name.includes('Heat') || point.series.name.startsWith('Aux') ? 'heat' : point.series.name.includes('Cool') ? 'cool' : 'other';
          groups[group].push({ label: point.series.name, value, color: String(point.color) });
        });
        return chartTooltipHtml(dateTitle, [groups.heat, groups.cool, groups.other]);
      } },
      plotOptions: { column: { stacking: 'normal', borderWidth: 0, groupPadding: 0, pointPadding: 0 }, series: { animation: false, marker: { enabled: false, states: { hover: { enabled: false } } }, states: { hover: { enabled: false }, inactive: { opacity: 1 } } } },
      responsive: { rules: [{ condition: { maxWidth: 500 }, chartOptions: { chart: { marginBottom: 166 }, xAxis: { tickInterval: mobileTickInterval, labels: { step: 1 } } } }] },
      series: [...runtimeSeries, ...weatherSeries, ...degreeDaySeries],
    };
  }, [config.group, settings.runtime_thermostat_summary_smart_scale, summary, unit]);
  const chipData = useMemo(() => {
    const result = buildRuntimeData([]);
    // The legacy chips use Moment's duration bubbling, including its boundary
    // behavior for long fractional-hour totals. Moment is already loaded for
    // the ported visualizer, so retain that exact display contract here.
    for (const code of Object.keys(result.totals)) {
      const hours = summary.reduce((sum, row) => sum + Number(row[`sum_${code}`] ?? 0), 0);
      const duration = legacyDurationParts(hours);
      const seconds = duration.hours * 3600 + duration.minutes * 60;
      result.totals[code as keyof typeof result.totals] = seconds;
    }
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
    const baseExtremes = (parent: 'heat' | 'cool' | 'resist') => {
      const values = extentEntries.filter(([key]) => key.includes(parent)).flatMap(([, profile]) => Object.keys(profile.deltas ?? {}).map(Number));
      if (!values.length) return undefined;
      let min = Math.min(...values) - 5;
      let max = Math.max(...values) + 5;
      if (Number.isFinite(weather) && (parent === 'heat' || parent === 'resist')) min = Math.min(min, weather - 5);
      if (Number.isFinite(weather) && (parent === 'cool' || parent === 'resist')) max = Math.max(max, weather + 5);
      return [min, max] as const;
    };
    const heatExtremes = baseExtremes('heat');
    const coolExtremes = baseExtremes('cool');
    const resistExtremes = baseExtremes('resist');
    const parentExtremes = (parent: 'heat' | 'cool' | 'resist') => {
      if (parent === 'heat') return heatExtremes ?? [0, 0];
      if (parent === 'cool') return coolExtremes ?? [0, 0];
      return [Math.min(resistExtremes?.[0] ?? Infinity, heatExtremes?.[0] ?? Infinity), Math.max(resistExtremes?.[1] ?? -Infinity, coolExtremes?.[1] ?? -Infinity)];
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
    const absoluteY = Math.max(1, Math.ceil(Math.max(0, ...yValues.map((value) => Math.abs(value))) + .25));
    const profileXMin = Math.min(...entries.flatMap(([, profile]) => Object.keys(profile.deltas ?? {}).map(Number)));
    const plotLines = Number.isFinite(weather) ? [{ value: weather, color: colors.gray.light, dashStyle: 'ShortDash' as const, width: 1, zIndex: 2, label: { text: `Now: ${weather}${unit}`, style: { color: colors.gray.light } } }] : [];
    return { chart: { backgroundColor: 'transparent', height: 300, marginLeft: 36, marginRight: 0, marginBottom: 31, spacing: [8, 0, 0, 0], animation: false }, title: { text: undefined }, credits: { enabled: false }, xAxis: { lineWidth: 0, tickLength: 0, tickInterval: 5, gridLineWidth: 1, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', title: { text: undefined }, labels: { style: { color: colors.gray.main, textOverflow: 'none' }, format: `{value}${unit}` }, plotLines }, yAxis: { min: -absoluteY, max: absoluteY, tickInterval: 1, startOnTick: false, endOnTick: false, title: { text: undefined }, labels: { style: { textOverflow: 'none' }, format: `{value}${unit}` }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', plotLines: [{ value: 0, color: colors.slate.light, width: 3, zIndex: 1 }] }, legend: { enabled: false }, tooltip: { shared: true, useHTML: true, followPointer: true, hideDelay: 1, shadow: false, backgroundColor: 'transparent', borderWidth: 0, positioner: stableTooltipPositioner(60), formatter() { const rows = (this.points ?? []).filter((point) => !point.series.name.includes('raw')).map((point) => { const value = Number(point.y).toFixed(1); return { label: point.series.name, value: `${Number(value) > 0 ? '+' : ''}${value}${unit} / h`, color: String(point.color) }; }); return chartTooltipHtml(`Outdoor Temp: ${Math.round(Number(this.x))}${unit}`, [rows]); } }, plotOptions: { series: { animation: false, connectNulls: true, marker: { enabled: false, states: { hover: { enabled: false } } }, states: { hover: { enabled: false, lineWidthPlus: 0 }, inactive: { opacity: 1 } } } }, responsive: { rules: [{ condition: { maxWidth: 500 }, chartOptions: { chart: { marginBottom: 48 }, xAxis: { min: Number.isFinite(profileXMin) ? Math.floor(profileXMin / 10) * 10 : undefined, tickInterval: 10, labels: { step: 1 } } } }] }, series };
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
    <DashboardCard title="Temperature Profiles" subheader={profileSubtitle} action={<ProfileMenu profile={selectedProfile} unit={unit} subtitle={profileSubtitle} onDownload={() => saveSvg(profileRef, 'beestat-temperature-profiles.svg')} />} sx={{ '& .MuiCardContent-root': { pb: '10px !important' } }}>{profileOptions.series?.length ? <><HighchartsReact ref={profileRef} highcharts={Highcharts} options={profileOptions} />{profiles.length >= 2 && <Stack direction="row" gap={1} alignItems="center" pl={.25} mt="9px"><Slider min={0} max={profiles.length - 1} step={1} value={profileIndex ?? profiles.length - 1} onChange={(_, value) => setProfileIndex(value as number)} aria-label="Historical temperature profile" sx={{ color: colors.slate.light, '& .MuiSlider-thumb': { width: 14, height: 14, bgcolor: '#fff' }, '& .MuiSlider-track': { border: 0 }, '& .MuiSlider-rail': { opacity: 1, bgcolor: colors.slate.light } }} /><Typography sx={{ minWidth: 98, textAlign: 'right', whiteSpace: 'nowrap' }}>{new Date((profiles[profileIndex ?? profiles.length - 1] as any).profile.metadata.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography></Stack>}</> : <Alert severity="info">A temperature profile has not been generated yet.</Alert>}</DashboardCard>
  </Box>;
}
