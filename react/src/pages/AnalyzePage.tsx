import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, Info, RotateCcw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DashboardCard } from '../components/common/DashboardCard';
import { RuntimeChips } from '../components/detail/RuntimeChips';
import { buildRuntimeData, unitLabel } from '../components/detail/runtimeData';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';

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

function SummaryMenu({ range, setRange, onDownload, onReset }: { range: string; setRange: (value: string) => void; onDownload: () => void; onReset: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null); const [customOpen, setCustomOpen] = useState(false);
  const [begin, setBegin] = useState(new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)); const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const choose = (value: string) => { setRange(value); setAnchor(null); };
  return <><IconButton aria-label="Thermostat summary menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem selected={range === '3'} onClick={() => choose('3')}><ListItemText>Past 3 Months</ListItemText></MenuItem><MenuItem selected={range === '12'} onClick={() => choose('12')}><ListItemText>Past 12 Months</ListItemText></MenuItem><MenuItem selected={range === 'all'} onClick={() => choose('all')}><ListItemText>All Time</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); setCustomOpen(true); }}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); onDownload(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); onReset(); }}><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem><MenuItem component="a" href="https://doc.beestat.io" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu><Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Thermostat Summary - Custom Range</DialogTitle><DialogContent><Stack gap={2} pt={1}><TextField type="date" label="Start" value={begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack></DialogContent><DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" disabled={!begin || !end || begin > end} onClick={() => { choose(`${begin}|${end}`); setCustomOpen(false); }}>Apply</Button></DialogActions></Dialog></>;
}

function ProfileMenu({ profile, onDownload }: { profile: unknown; onDownload: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null); const [info, setInfo] = useState(false);
  const downloadProfile = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'beestat-temperature-profile.json'; link.click(); URL.revokeObjectURL(url); };
  return <><IconButton aria-label="Temperature profiles menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); onDownload(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); downloadProfile(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Profile</ListItemText></MenuItem><MenuItem onClick={() => { setAnchor(null); setInfo(true); }}><ListItemIcon><Info size={18} /></ListItemIcon><ListItemText>More Info</ListItemText></MenuItem><MenuItem component="a" href="https://doc.beestat.io" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu><Dialog open={info} onClose={() => setInfo(false)}><DialogTitle>Temperature Profiles</DialogTitle><DialogContent><Typography>Temperature profiles show how quickly your home gains or loses heat at different outdoor temperatures. Solid data traces and dashed trendlines make equipment stages and balance points directly comparable.</Typography></DialogContent><DialogActions><Button onClick={() => setInfo(false)}>Close</Button></DialogActions></Dialog></>;
}

export function AnalyzePage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const [summaryRange, setSummaryRange] = useState('3');
  const [profileIndex, setProfileIndex] = useState<number>();
  const summaryRef = useRef<HighchartsReact.RefObject>(null);
  const profileRef = useRef<HighchartsReact.RefObject>(null);
  const settings = data?.user?.settings ?? {};
  const allSummary = useMemo(() => Object.values(data?.runtime_thermostat_summary ?? {}).filter((row) => Number(row.thermostat_id) === thermostatId).sort((a, b) => String(a.date).localeCompare(String(b.date))), [data?.runtime_thermostat_summary, thermostatId]);
  const summary = useMemo(() => {
    if (summaryRange === 'all') return allSummary;
    if (summaryRange.includes('|')) { const [begin, end] = summaryRange.split('|'); return allSummary.filter((row) => String(row.date) >= begin && String(row.date) <= end); }
    const begin = new Date(); begin.setMonth(begin.getMonth() - Number(summaryRange)); begin.setHours(0, 0, 0, 0);
    return allSummary.filter((row) => Date.parse(String(row.date)) >= begin.getTime());
  }, [allSummary, summaryRange]);
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
  const profiles = useMemo(() => Object.values(data?.profile ?? {}).filter((item: any) => Number(item.thermostat_id) === thermostatId && item.profile).sort((a: any, b: any) => String(a.profile.metadata?.generated_at).localeCompare(String(b.profile.metadata?.generated_at))) as any[], [data?.profile, thermostatId]);
  const selectedProfile = profileIndex === undefined ? thermostat?.profile : profiles[Math.min(profileIndex, Math.max(0, profiles.length - 1))]?.profile ?? thermostat?.profile;
  const profileOptions = useMemo<Highcharts.Options>(() => {
    const temperature = selectedProfile?.temperature ?? {};
    const palette: Record<string, string> = { cool_1: colors.lightBlue.light, cool_2: colors.lightBlue.main, heat_1: colors.orange.light, heat_2: colors.orange.dark, resist: colors.gray.main, auxiliary_heat_1: colors.red.main, auxiliary_heat_2: colors.red.dark };
    const names: Record<string, string> = { cool_1: 'Cool 1 Δ', cool_2: 'Cool 2 Δ', heat_1: 'Heat 1 Δ', heat_2: 'Heat 2 Δ', resist: 'Resist Δ', auxiliary_heat_1: 'Aux Heat 1 Δ', auxiliary_heat_2: 'Aux Heat 2 Δ' };
    const entries = Object.entries(temperature).filter(([, value]) => value && typeof value === 'object') as [string, any][];
    const weather = Math.round(Number(thermostat?.weather?.temperature));
    const parentExtremes = (parent: 'heat' | 'cool' | 'resist') => {
      const values = entries.filter(([key]) => key.includes(parent)).flatMap(([, profile]) => Object.keys(profile.deltas ?? {}).map(Number));
      if (Number.isFinite(weather) && (parent === 'resist' || parent === 'heat')) values.push(weather);
      if (Number.isFinite(weather) && (parent === 'resist' || parent === 'cool')) values.push(weather);
      return values.length ? [Math.min(...values) - 5, Math.max(...values) + 5] : [0, 0];
    };
    const series = entries.flatMap(([key, profile]) => {
      const raw = Object.entries(profile.deltas ?? {}).map(([x, y]) => [Number(x), Number(y)] as [number, number]).sort((a, b) => a[0] - b[0]);
      const trend = profile.linear_trendline;
      const parent = key.includes('cool') ? 'cool' : key.includes('resist') ? 'resist' : 'heat';
      const [xMin, xMax] = parentExtremes(parent);
      const line = trend && raw.length ? [[xMin, trend.slope * xMin + trend.intercept], [xMax, trend.slope * xMax + trend.intercept]] : [];
      const zones = raw.length ? [{ value: raw[0][0], dashStyle: 'ShortDash' as const }, { value: raw.at(-1)![0], dashStyle: 'Solid' as const }, { dashStyle: 'ShortDash' as const }] : undefined;
      return [{ type: 'spline' as const, name: `${names[key] ?? key} raw`, color: palette[key] ?? colors.gray.main, data: raw, dashStyle: 'ShortDot' as const, lineWidth: 1, marker: { enabled: false }, showInLegend: false }, { type: 'line' as const, name: names[key] ?? key, color: palette[key] ?? colors.gray.main, data: line, lineWidth: 2, marker: { enabled: false }, zoneAxis: 'x' as const, zones }];
    });
    const yValues = series.flatMap((item) => (item.data as [number, number][]).map((point) => point[1])).filter(Number.isFinite);
    const absoluteY = Math.max(1, ...yValues.map((value) => Math.abs(value) + .25));
    const plotLines = Number.isFinite(weather) ? [{ value: weather, color: colors.gray.light, dashStyle: 'ShortDash' as const, width: 1, zIndex: 2, label: { text: `Now: ${weather}${unit}`, style: { color: colors.gray.light } } }] : [];
    return { chart: { backgroundColor: 'transparent', height: 300, animation: false }, title: { text: undefined }, credits: { enabled: false }, xAxis: { lineWidth: 0, tickLength: 0, tickInterval: 5, gridLineWidth: 1, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', title: { text: undefined }, labels: { style: { color: colors.gray.main, textOverflow: 'none' }, format: `{value}${unit}` }, plotLines }, yAxis: { min: -absoluteY, max: absoluteY, tickInterval: 1, startOnTick: false, endOnTick: false, title: { text: undefined }, labels: { style: { textOverflow: 'none' }, format: `{value}${unit}` }, gridLineColor: colors.slate.light, gridLineDashStyle: 'LongDash', plotLines: [{ value: 0, color: colors.slate.light, width: 3, zIndex: 1 }] }, legend: { enabled: false }, tooltip: { shared: true, backgroundColor: colors.slate.dark, style: { color: '#fff' }, borderWidth: 0 }, plotOptions: { series: { animation: false, connectNulls: true, states: { hover: { lineWidthPlus: 0 } } } }, series };
  }, [selectedProfile, thermostat?.weather?.temperature, unit]);
  const generated = selectedProfile?.metadata?.generated_at;
  const durationWeeks = Math.round(Number(selectedProfile?.metadata?.duration ?? 365) / 7);
  const duration = durationWeeks === 0 ? 'few days' : durationWeeks === 1 ? 'week' : durationWeeks >= 52 ? 'year' : `${durationWeeks} weeks`;
  const generatedDate = generated ? new Date(generated) : undefined;
  const profileSubtitle = generatedDate ? `Generated ${generatedDate.toLocaleDateString('en-US', { month: 'short' })} ${ordinal(generatedDate.getDate())}, ${generatedDate.getFullYear()} @ ${generatedDate.toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase()} from the past ${duration} of data (updated weekly).` : undefined;
  const summaryLabel = summaryRange === 'all' ? 'All time' : summaryRange.includes('|') ? summaryRange.split('|').map((value) => new Date(`${value}T00:00:00`).toLocaleDateString()).join(' to ') : `Past ${summaryRange} months`;
  const summarySubtitle = `${summaryLabel}, grouped by day (Gap Fill: ${settings.runtime_thermostat_summary_gap_fill ? 'On' : 'Off'}, Smart Scale: ${settings.runtime_thermostat_summary_smart_scale === false ? 'Off' : 'On'})`;
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <DashboardCard title="Thermostat Summary" subheader={summarySubtitle} action={<SummaryMenu range={summaryRange} setRange={setSummaryRange} onDownload={() => saveSvg(summaryRef, 'beestat-thermostat-summary.svg')} onReset={() => summaryRef.current?.chart.zoomOut()} />}><RuntimeChips data={chipData} summary />{summary.length ? <HighchartsReact ref={summaryRef} highcharts={Highcharts} options={summaryOptions} /> : <Alert severity="info">No summary data is available yet.</Alert>}</DashboardCard>
    <DashboardCard title="Temperature Profiles" subheader={profileSubtitle} action={<ProfileMenu profile={selectedProfile} onDownload={() => saveSvg(profileRef, 'beestat-temperature-profiles.svg')} />}>{profileOptions.series?.length ? <><HighchartsReact ref={profileRef} highcharts={Highcharts} options={profileOptions} />{profiles.length >= 2 && <Stack direction="row" gap={1.5} alignItems="center" px={.5}><Slider min={0} max={profiles.length - 1} step={1} value={profileIndex ?? profiles.length - 1} onChange={(_, value) => setProfileIndex(value as number)} aria-label="Historical temperature profile" /><Typography sx={{ minWidth: 100, textAlign: 'right', whiteSpace: 'nowrap' }}>{new Date((profiles[profileIndex ?? profiles.length - 1] as any).profile.metadata.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography></Stack>}</> : <Alert severity="info">A temperature profile has not been generated yet.</Alert>}</DashboardCard>
  </Box>;
}
