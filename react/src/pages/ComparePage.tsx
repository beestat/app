import {
  Alert, alpha, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, ListItemIcon, ListItemText, Menu,
  MenuItem, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, CircleHelp, Clock3, EllipsisVertical, Flame, Home, Layers, MapPin, Ruler, Settings2, Snowflake } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { CardHelpMenu } from '../components/common/CardHelpMenu';
import { useDashboard } from '../state/DashboardContext';
import type { ThemeColors } from '../theme';
import { convertTemperature, titleCase } from '../utils/format';

function profileValue(thermostat: any, group: string, name: string) {
  if (group === 'property') return thermostat?.property?.[name];
  return thermostat?.profile?.[group]?.[name];
}

function ordinal(day: number) {
  const remainder = day % 100;
  return `${day}${remainder >= 11 && remainder <= 13 ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th'}`;
}

function metricLabel(group: string, name: string, value: number, unit: string) {
  if (group === 'property' && name === 'age') return `${value}y`;
  if (group === 'property' && name === 'square_feet') return `${value.toLocaleString()} ft²`;
  if (group === 'runtime_per_degree_day') return `${Math.round(value)}m`;
  if (group === 'setpoint' || group === 'balance_point') return `${convertTemperature(value, unit).toFixed(group === 'setpoint' ? 1 : 0)}${unit}`;
  if (group === 'setback') return `${Number(convertTemperature(value, unit, '°F', true).toFixed(1))}${unit}`;
  return String(value);
}

const groupNames: Record<string, string[]> = {
  setback: ['cool', 'heat'],
  property: ['age', 'square_feet'],
  setpoint: ['cool', 'heat'],
  balance_point: ['heat_1', 'heat_2', 'resist'],
  runtime_per_degree_day: ['cool_1', 'cool_2', 'heat_1', 'heat_2', 'auxiliary_heat_1'],
};
function metricColors(colors: ThemeColors): Record<string, string[]> { return {
  setback: [colors.lightBlue.light, colors.orange.light], property: [colors.purple.main, colors.purple.main],
  setpoint: [colors.lightBlue.light, colors.orange.light], balance_point: [colors.orange.light, colors.orange.dark, colors.gray.main],
  runtime_per_degree_day: [colors.lightBlue.light, colors.lightBlue.main, colors.orange.light, colors.orange.dark, colors.red.main],
}; }

function smoothHistogramPath(histogram: Array<readonly [number, number]>, high: number) {
  const points = histogram.map(([, count], index) => ({
    x: (index + .5) * 100 / histogram.length,
    y: 98 - 94 * count / high,
  }));
  if (points.length < 2) return '';
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 2)];
    const control1X = previous.x + (point.x - before.x) / 6;
    const control1Y = previous.y + (point.y - before.y) / 6;
    const control2X = point.x - (after.x - previous.x) / 6;
    const control2Y = point.y - (after.y - previous.y) / 6;
    return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

const systemTypeOptions = {
  heat: ['gas', 'compressor', 'electric', 'boiler', 'geothermal', 'oil', 'none'],
  auxiliary_heat: ['gas', 'electric', 'oil', 'none'],
  cool: ['compressor', 'geothermal', 'none'],
} as const;
const systemTypeTitles = { heat: 'Heat', auxiliary_heat: 'Auxiliary Heat', cool: 'Cool' } as const;
type SystemMode = keyof typeof systemTypeOptions;
// Modes with neither a reported nor a detected type stay unselected and are left out of the save, as in legacy.
type SystemTypes = Partial<Record<SystemMode, string>>;

function selectedSystemTypes(thermostat: any): SystemTypes {
  return Object.fromEntries((Object.keys(systemTypeOptions) as SystemMode[]).map((mode) => {
    const reported = thermostat?.system_type?.reported?.[mode];
    const equipment = (typeof reported === 'string' ? reported : reported?.equipment)
      ?? thermostat?.system_type?.detected?.[mode]?.equipment;
    return [mode, equipment];
  }).filter(([, equipment]) => equipment != null)) as SystemTypes;
}

function effectiveSystemType(thermostat: any, mode: SystemMode) {
  const reported = thermostat?.system_type?.reported?.[mode] ?? {};
  const detected = thermostat?.system_type?.detected?.[mode] ?? {};
  return {
    equipment: reported.equipment ?? detected.equipment,
    stages: reported.stages ?? detected.stages,
  };
}

function MyHomeMenu({ thermostat, refresh }: { thermostat: any; refresh: () => Promise<unknown> }) {
  const theme = useTheme();
  const colors = theme.palette.colors;
  const systemTypeColors = { heat: colors.orange.main, auxiliary_heat: colors.red.dark, cool: colors.blue.light } as const;
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SystemTypes>(() => selectedSystemTypes(thermostat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showDialog = () => {
    setDraft(selectedSystemTypes(thermostat));
    setError('');
    setAnchor(null);
    window.setTimeout(() => setOpen(true), 225);
  };
  const save = async () => {
    if (!thermostat?.thermostat_id) return;
    setSaving(true);
    setError('');
    try {
      await apiCall({ resource: 'thermostat', method: 'set_reported_system_types', arguments: { thermostat_id: thermostat.thermostat_id, system_types: draft } });
      // Comparisons match on system type, so refetch metrics as legacy does after saving.
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['metrics', thermostat.thermostat_id] })]);
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update system types.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Tooltip title="My Home options"><IconButton aria-label="My Home options" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical size={20} /></IconButton></Tooltip>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <MenuItem onClick={showDialog}><ListItemIcon><Settings2 size={18} /></ListItemIcon><ListItemText>Change System Type</ListItemText></MenuItem>
      <MenuItem component="a" href="https://doc.beestat.io/cc594772031e41a58ff38e04e66cf0ec" target="_blank" rel="noreferrer" onClick={() => setAnchor(null)}><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="change-system-type-title">
      <DialogTitle id="change-system-type-title">Change System Type</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>What type of HVAC system do you have? System types that beestat detected are indicated.</Typography>
        {(Object.keys(systemTypeOptions) as SystemMode[]).map((mode) => <Box key={mode} sx={{ mb: 2 }}>
          <Typography variant="overline" display="block" sx={{ mb: .5 }}>{systemTypeTitles[mode]}</Typography>
          <ToggleButtonGroup exclusive value={draft[mode] ?? null} onChange={(_event, value: string | null) => value && setDraft((current) => ({ ...current, [mode]: value }))} sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: .75, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '4px !important' } }}>
            {systemTypeOptions[mode].map((option) => {
              const detected = thermostat?.system_type?.detected?.[mode]?.equipment === option;
              return <ToggleButton key={option} value={option} sx={{ bgcolor: 'background.paper', color: 'text.primary', px: 1, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: systemTypeColors[mode], color: theme.palette.getContrastText(systemTypeColors[mode]) } }}>{titleCase(option)}{detected ? ' [Detected]' : ''}</ToggleButton>;
            })}
          </ToggleButtonGroup>
        </Box>)}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions><Button color="inherit" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" color="success" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></DialogActions>
    </Dialog>
  </>;
}

function MetricRow({ group, name, metric, value, unit }: { group: string; name: string; metric: any; value: number; unit: string }) {
  const theme = useTheme();
  const colors = theme.palette.colors;
  const groupColors = metricColors(colors);
  const interval = Number(metric?.interval);
  if (!Number.isFinite(value) || !Number.isFinite(interval) || interval <= 0) return null;
  const precision = Number.isInteger(interval) ? 0 : String(interval).split('.')[1]?.length ?? 0;
  const roundedValue = Math.round(value / interval) * interval;
  const cutoffMin = group === 'setback' || group === 'runtime_per_degree_day' || (group === 'property' && name === 'age') ? 0 : group === 'property' && name === 'square_feet' ? 500 : null;
  const statisticalMin = Math.floor((Number(metric.median) - Number(metric.standard_deviation) * 2) / interval) * interval;
  const min = Math.min(cutoffMin == null ? statisticalMin : Math.max(statisticalMin, cutoffMin), roundedValue);
  const max = Math.max(Math.ceil((Number(metric.median) + Number(metric.standard_deviation) * 2) / interval) * interval, roundedValue);
  const histogram: Array<readonly [number, number]> = [];
  for (let bucket = min; bucket <= max + interval / 2; bucket += interval) {
    const key = bucket.toFixed(precision);
    histogram.push([bucket, Number(metric.histogram?.[key] ?? 0) + (key === roundedValue.toFixed(precision) ? 1 : 0)]);
  }
  const high = Math.max(...histogram.map(([, count]) => count), 1);
  const others = histogram.reduce((sum, [, count]) => sum + count, 0);
  const ownIndex = Math.max(0, histogram.findIndex(([bucket]) => roundedValue >= bucket && roundedValue < bucket + interval));
  const below = histogram.slice(0, ownIndex).reduce((sum, [, count]) => sum + count, 0);
  const above = histogram.slice(ownIndex + 1).reduce((sum, [, count]) => sum + count, 0);
  // Legacy divides first, then scales and uses toFixed; 100 * 113 / 200 would round 56.5 up where legacy shows 56.
  const percentile = (Math.max(below, above) / Math.max(others, 1) * 100).toFixed(0);
  const symbol = below >= above ? '>' : '<';
  const left = `${Math.max(10, Math.min(90, (ownIndex + .5) * 100 / histogram.length))}%`;
  const colorIndex = Math.max(0, groupNames[group]?.indexOf(name) ?? 0);
  const Icon = group === 'property' ? (name === 'age' ? Clock3 : Ruler) : name === 'resist' ? Activity : name.startsWith('cool') ? Snowflake : Flame;
  const label = name === 'auxiliary_heat_1' ? 'Aux' : group === 'property' && name === 'square_feet' ? 'Area' : titleCase(name.replaceAll('_', ' '));
  const accent = groupColors[group]?.[colorIndex] ?? colors.lightBlue.main;
  const curve = smoothHistogramPath(histogram, high);
  const ownHeight = Math.max(2, 38 * (histogram[ownIndex]?.[1] ?? 0) / high);
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '128px minmax(0, 1fr)', sm: '148px minmax(0, 1fr)' }, minHeight: 68, mb: .75, overflow: 'hidden', borderRadius: 1, bgcolor: 'surface.subtle' }}>
    <Box sx={{ borderLeft: `4px solid ${accent}`, bgcolor: alpha(accent, .1), display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', alignItems: 'center', px: .75, py: .5 }}>
      <Icon size={19} color={accent} strokeWidth={2.25} style={{ justifySelf: 'center' }} />
      <Box sx={{ minWidth: 0 }}><Typography fontWeight={600} noWrap>{label}</Typography><Typography variant="caption" display="block" color="text.secondary">{others.toLocaleString()} others</Typography><Typography variant="caption" display="block" sx={{ color: accent, fontWeight: 600 }}>{symbol} {percentile}% homes</Typography></Box>
    </Box>
    <Box sx={{ bgcolor: 'surface.chart', position: 'relative', display: 'flex', alignItems: 'flex-end', pt: '24px', overflow: 'hidden' }}>
      {histogram.map(([bucket, count], index) => <Box key={bucket} sx={{ flex: '1 1 0', minWidth: '1px', height: `${100 * count / high}%`, bgcolor: alpha(accent, index === ownIndex ? .28 : .12), borderBottom: `2px solid ${alpha(accent, index === ownIndex ? .48 : .2)}` }} />)}
      <Box component="svg" aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" sx={{ position: 'absolute', inset: '22px 0 3px', width: '100%', height: 'calc(100% - 25px)', overflow: 'visible', pointerEvents: 'none' }}><Box component="path" d={curve} fill="none" stroke={accent} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" sx={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }} /></Box>
      <Typography sx={{ position: 'absolute', left, bottom: `${Math.max(19, ownHeight)}px`, minWidth: 54, px: .5, py: .125, ml: '-27px', borderRadius: .75, bgcolor: 'surface.raised', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600, boxShadow: 1 }}>{metricLabel(group, name, roundedValue, unit)}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', left: 5, bottom: 1 }}>{metricLabel(group, name, min, unit)}</Typography><Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', right: 5, bottom: 1 }}>{metricLabel(group, name, max, unit)}</Typography>
    </Box>
  </Box>;
}

function MetricGroup({ group, values, thermostat, unit }: { group: string; values: Record<string, any> | undefined; thermostat: any; unit: string }) {
  if (!values) return null;
  const metrics = Object.entries(values).filter(([, metric]) => metric != null);
  if (!metrics.length) return null;
  return <Box sx={{ minWidth: 0 }}><Typography variant="overline" component="h3" sx={{ display: 'block', mb: .75, color: 'text.secondary' }}>{titleCase(group.replaceAll('_', ' '))}</Typography>{metrics.map(([name, metric]) => <MetricRow key={name} group={group} name={name} metric={metric} value={Number(profileValue(thermostat, group, name))} unit={unit} />)}</Box>;
}

function MetricColumns({ values, thermostat, unit }: { values: Record<string, Record<string, any>> | undefined; thermostat: any; unit: string }) {
  if (!values) return null;
  const groups = Object.entries(values).map(([group, groupValues]) => {
    const populated = Object.fromEntries(Object.entries(groupValues ?? {}).filter(([, metric]) => metric != null));
    return [group, populated] as const;
  }).filter(([, populated]) => Object.keys(populated).length > 0);
  if (!groups.length) {
    return <Typography>We couldn't generate any metrics for your system. Try broadening your comparison settings and ensuring your system type and thermostat address are properly set.</Typography>;
  }
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 2, pt: .5, alignItems: 'start' }}>
    {groups.map(([group, groupValues]) => <MetricGroup key={group} group={group} values={groupValues} thermostat={thermostat} unit={unit} />)}
  </Box>;
}

export function ComparePage() {
  const theme = useTheme();
  const colors = theme.palette.colors;
  const { data, thermostat, thermostatId, refresh } = useDashboard();
  const settings = data?.user?.settings ?? {};
  const temperatureUnit = String(settings.units?.temperature ?? thermostat?.temperature_unit ?? '°F');
  const [region, setRegion] = useState<'nearby' | 'global'>(settings.comparison_region === 'nearby' ? 'nearby' : 'global');
  const initialProperty = ['similar', 'same_structure', 'all'].includes(settings.comparison_property_type) ? settings.comparison_property_type : 'similar';
  const [propertyType, setPropertyType] = useState<'similar' | 'same_structure' | 'all'>(initialProperty);
  const saveComparison = (key: string, value: string) => void apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } });
  const attributes = useMemo(() => {
    const result: Record<string, unknown> = {};
    const property = thermostat?.property ?? {};
    if (propertyType !== 'all' && property.structure_type) result.property_structure_type = property.structure_type;
    if (propertyType === 'similar') {
      if (property.age != null) result.property_age = { operator: 'between', value: [Math.max(0, property.age - 10), property.age + 10] };
      if (property.square_feet != null) result.property_square_feet = { operator: 'between', value: [Math.max(0, property.square_feet - 1000), property.square_feet + 1000] };
      if (property.stories != null && property.structure_type !== 'apartment') result.property_stories = property.stories < 2 ? property.stories : { operator: '>=', value: property.stories };
    }
    if (region === 'nearby') result.radius = { operator: '<', value: 250 };
    return result;
  }, [propertyType, region, thermostat?.property]);
  const metrics = useQuery({ queryKey: ['metrics', thermostatId, attributes], enabled: Boolean(thermostatId), queryFn: ({ signal }) => apiCall<Record<string, Record<string, any>>>({ resource: 'thermostat', method: 'get_metrics', arguments: { thermostat_id: thermostatId!, attributes } }, signal) });
  const address = thermostat?.address_id ? data?.address[String(thermostat.address_id)] : undefined;
  const addressParts = address?.normalized?.components ?? {};
  const regionLabel = [addressParts.state_abbreviation, addressParts.country_iso_3].filter(Boolean).join(', ') || 'No data';
  const generatedAt = (thermostat?.profile as any)?.metadata?.generated_at ? new Date((thermostat?.profile as any).metadata.generated_at) : undefined;
  const generatedLabel = generatedAt ? `Generated ${generatedAt.toLocaleDateString('en-US', { month: 'short' })} ${ordinal(generatedAt.getDate())} @ ${generatedAt.toLocaleTimeString('en-US', { hour: 'numeric' }).toLowerCase()} from the past year of data (updated weekly).` : 'Compared with matching beestat homes';
  const ageRange = (attributes.property_age as { value?: number[] } | undefined)?.value;
  const areaRange = (attributes.property_square_feet as { value?: number[] } | undefined)?.value;
  const storiesFilter = attributes.property_stories as { operator?: string; value?: number } | number | undefined;
  const propertyChipColor = theme.palette.getContrastText(colors.purple.main);
  const propertyChipSx = { bgcolor: colors.purple.main, color: propertyChipColor, '& .MuiChip-icon': { color: propertyChipColor } };
  return <Box sx={{ display: 'grid', gap: 2, pb: 2 }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <DashboardCard title="Comparison Settings" action={<CardHelpMenu label="Comparison Settings" href="https://doc.beestat.io/596040eadd014928830b4d1d54692761" />} contentSx={{ pb: 4, '&:last-child': { pb: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, '@media (min-width: 801px)': { gridTemplateColumns: 'calc((100% - 32px) / 3) 1fr' } }}>
            <Box><Typography variant="overline" display="block" mb={1}>Region</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{(['nearby', 'global'] as const).map((value) => <Button key={value} variant="contained" sx={{ px: '7px', minWidth: 0, borderRadius: .5, textTransform: 'none', bgcolor: region === value ? colors.green.main : colors.slate.light, '&:hover': { bgcolor: region === value ? colors.green.dark : colors.slate.main } }} onClick={() => { setRegion(value); saveComparison('comparison_region', value); }}>{titleCase(value)}</Button>)}</Box></Box>
            <Box><Typography variant="overline" display="block" mb={1}>Property</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{(['similar', 'same_structure', 'all'] as const).map((value) => <Button key={value} variant="contained" sx={{ px: '7px', minWidth: 0, borderRadius: .5, textTransform: 'none', bgcolor: propertyType === value ? colors.purple.main : colors.slate.light, '&:hover': { bgcolor: propertyType === value ? colors.purple.dark : colors.slate.main } }} onClick={() => { setPropertyType(value); saveComparison('comparison_property_type', value); }}>{value === 'similar' ? 'Very Similar' : value === 'same_structure' ? `Type: ${titleCase(thermostat?.property?.structure_type ?? '')}` : 'All'}</Button>)}</Box></Box>
          </Box>
          <Box mt={2}><Typography fontWeight={600} mb={1}>Comparing to homes like...</Typography><Typography>Matching system type and stages</Typography><Typography color={attributes.property_structure_type == null ? 'text.secondary' : 'inherit'}>{attributes.property_structure_type == null ? 'Any property type' : `Property Type: ${String(attributes.property_structure_type)}`}</Typography><Typography color={ageRange ? 'inherit' : 'text.secondary'}>{ageRange ? `Between ${ageRange[0]} and ${ageRange[1]} years old` : 'Any property age'}</Typography><Typography color={areaRange ? 'inherit' : 'text.secondary'}>{areaRange ? `Between ${areaRange[0]} and ${areaRange[1]} ft²` : 'Any square footage'}</Typography><Typography color={storiesFilter == null ? 'text.secondary' : 'inherit'}>{typeof storiesFilter === 'object' ? `${storiesFilter.operator === '>=' ? 'At least' : storiesFilter.operator} ${storiesFilter.value} stories` : storiesFilter == null ? 'Any number of stories' : `${storiesFilter} stories`}</Typography><Typography color={region === 'nearby' ? 'inherit' : 'text.secondary'}>{region === 'nearby' ? 'Within 250 miles of your location' : 'Any region'}</Typography></Box>
          <Box aria-hidden height={8} />
        </DashboardCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <DashboardCard title="My Home" action={<MyHomeMenu thermostat={thermostat} refresh={refresh} />} contentSx={{ pb: 4, '&:last-child': { pb: 4 } }}>
          <Typography variant="overline" display="block" mb={1}>System</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {(Object.keys(systemTypeOptions) as SystemMode[]).map((mode) => {
              const system = effectiveSystemType(thermostat, mode);
              if (!system.equipment) return null;
              const Icon = mode === 'cool' ? Snowflake : Flame;
              const stages = mode !== 'auxiliary_heat' && Number(system.stages) > 1 ? ' (2 Stage)' : '';
              const chipColor = mode === 'cool' ? 'primary' : mode === 'auxiliary_heat' ? 'error' : 'warning';
              const contrast = theme.palette[chipColor].contrastText;
              return <Chip key={mode} icon={<Icon />} color={chipColor} label={`${titleCase(system.equipment)}${stages}`} sx={{ color: contrast, '& .MuiChip-icon': { color: contrast } }} />;
            })}
          </Stack>
          <Typography variant="overline" display="block" mt={2} mb={1}>Region</Typography>
          <Chip icon={<MapPin />} color={regionLabel === 'No data' ? 'default' : 'success'} label={regionLabel} sx={regionLabel === 'No data' ? undefined : { color: 'success.contrastText', '& .MuiChip-icon': { color: 'success.contrastText' } }} />
          <Typography variant="overline" display="block" mt={2} mb={1}>Property</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {thermostat?.property?.structure_type && <Chip icon={<Home />} label={titleCase(thermostat.property.structure_type)} sx={propertyChipSx} />}
            {thermostat?.property?.stories && ['detached', 'townhouse', 'semi-detached'].includes(thermostat.property.structure_type ?? '') && <Chip icon={<Layers />} label={`${thermostat.property.stories} ${thermostat.property.stories === 1 ? 'Story' : 'Stories'}`} sx={propertyChipSx} />}
            {thermostat?.property?.square_feet && <Chip icon={<Ruler />} label={`${thermostat.property.square_feet.toLocaleString()} ft²`} sx={propertyChipSx} />}
            {thermostat?.property?.age && <Chip icon={<Clock3 />} label={`${thermostat.property.age} Years`} sx={propertyChipSx} />}
          </Stack>
          <Box aria-hidden height={8} />
        </DashboardCard>
      </Grid>
    </Grid>
    <DashboardCard title="Metrics" subheader={generatedLabel} action={<CardHelpMenu label="Metrics" href="https://doc.beestat.io/ebfdf00f7f34436c980cd6344a767a12" />}>{metrics.isLoading ? <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : metrics.error ? <Alert severity="error">{metrics.error.message}</Alert> : <MetricColumns values={metrics.data} thermostat={thermostat} unit={temperatureUnit} />}</DashboardCard>
  </Box>;
}
