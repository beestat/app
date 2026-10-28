import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, ListItemIcon, ListItemText, Menu,
  MenuItem, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Activity, CircleHelp, Clock3, EllipsisVertical, Flame, Home, Layers, MapPin, Ruler, Settings2, Snowflake } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { CardHelpMenu } from '../components/common/CardHelpMenu';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { titleCase } from '../utils/format';

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
  if (group === 'setpoint' || group === 'balance_point') return `${value.toFixed(group === 'setpoint' ? 1 : 0)}${unit}`;
  if (group === 'setback') return `${value}${unit}`;
  return String(value);
}

const groupNames: Record<string, string[]> = {
  setback: ['cool', 'heat'],
  property: ['age', 'square_feet'],
  setpoint: ['cool', 'heat'],
  balance_point: ['heat_1', 'heat_2', 'resist'],
  runtime_per_degree_day: ['cool_1', 'cool_2', 'heat_1', 'heat_2', 'auxiliary_heat_1'],
};
const groupColors: Record<string, string[]> = {
  setback: [colors.lightBlue.light, colors.orange.light],
  property: [colors.purple.main, colors.purple.main],
  setpoint: [colors.lightBlue.light, colors.orange.light],
  balance_point: [colors.orange.light, colors.orange.dark, colors.gray.main],
  runtime_per_degree_day: [colors.lightBlue.light, colors.lightBlue.main, colors.orange.light, colors.orange.dark, colors.red.main],
};

const systemTypeOptions = {
  heat: ['gas', 'compressor', 'electric', 'boiler', 'geothermal', 'oil', 'none'],
  auxiliary_heat: ['gas', 'electric', 'oil', 'none'],
  cool: ['compressor', 'geothermal', 'none'],
} as const;
const systemTypeTitles = { heat: 'Heat', auxiliary_heat: 'Auxiliary Heat', cool: 'Cool' } as const;
const systemTypeColors = { heat: colors.orange.main, auxiliary_heat: colors.red.dark, cool: colors.lightBlue.main } as const;
type SystemMode = keyof typeof systemTypeOptions;
type SystemTypes = Record<SystemMode, string>;

function selectedSystemTypes(thermostat: any): SystemTypes {
  return Object.fromEntries((Object.keys(systemTypeOptions) as SystemMode[]).map((mode) => {
    const reported = thermostat?.system_type?.reported?.[mode];
    const equipment = (typeof reported === 'string' ? reported : reported?.equipment)
      ?? thermostat?.system_type?.detected?.[mode]?.equipment
      ?? 'none';
    return [mode, equipment];
  })) as SystemTypes;
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
      await refresh();
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
          <ToggleButtonGroup exclusive value={draft[mode]} onChange={(_event, value: string | null) => value && setDraft((current) => ({ ...current, [mode]: value }))} sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: .75, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '4px !important' } }}>
            {systemTypeOptions[mode].map((option) => {
              const detected = thermostat?.system_type?.detected?.[mode]?.equipment === option;
              return <ToggleButton key={option} value={option} sx={{ bgcolor: colors.slate.main, color: '#fff', px: 1, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: systemTypeColors[mode], color: '#fff' } }}>{titleCase(option)}{detected ? ' [Detected]' : ''}</ToggleButton>;
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
  const percentile = Math.round(100 * Math.max(below, above) / Math.max(others, 1));
  const symbol = below >= above ? '>' : '<';
  const left = `${Math.min(85, (ownIndex + .5) * 100 / histogram.length)}%`;
  const colorIndex = Math.max(0, groupNames[group]?.indexOf(name) ?? 0);
  const Icon = group === 'property' ? (name === 'age' ? Clock3 : Ruler) : name === 'resist' ? Activity : name.startsWith('cool') ? Snowflake : Flame;
  const label = name === 'auxiliary_heat_1' ? 'Aux' : group === 'property' && name === 'square_feet' ? 'Area' : titleCase(name.replaceAll('_', ' '));
  const ownHeight = Math.max(2, 40 * (histogram[ownIndex]?.[1] ?? 0) / high);
  return <Box sx={{ display: 'grid', gridTemplateColumns: '136px 1fr', height: 60, mb: .5, overflow: 'hidden' }}>
    <Box sx={{ bgcolor: groupColors[group]?.[colorIndex] ?? colors.lightBlue.main, display: 'grid', gridTemplateColumns: '36px 1fr', alignItems: 'center', pr: .5 }}><Icon size={20} style={{ justifySelf: 'center' }} /><Box><Typography>{label}</Typography><Typography variant="caption" display="block">{others.toLocaleString()} others</Typography><Typography variant="caption">{symbol} {percentile}% homes</Typography></Box></Box>
    <Box sx={{ bgcolor: colors.slate.dark, position: 'relative', display: 'flex', alignItems: 'flex-end', pt: '20px', overflow: 'hidden' }}>
      {histogram.map(([bucket, count], index) => <Box key={bucket} sx={{ flex: '1 1 0', minWidth: '1px', height: `${100 * count / high}%`, bgcolor: index === ownIndex ? '#516169' : colors.slate.light, borderBottom: `2px solid ${index === ownIndex ? '#516169' : colors.slate.light}` }} />)}
      <Typography sx={{ position: 'absolute', left, bottom: `${Math.max(20, ownHeight)}px`, width: 60, ml: '-30px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600, textShadow: '1px 1px 1px rgba(0,0,0,.5)' }}>{metricLabel(group, name, roundedValue, unit)}</Typography>
      <Typography variant="caption" sx={{ position: 'absolute', left: 4, bottom: 0 }}>{metricLabel(group, name, min, unit)}</Typography><Typography variant="caption" sx={{ position: 'absolute', right: 4, bottom: 0 }}>{metricLabel(group, name, max, unit)}</Typography>
    </Box>
  </Box>;
}

function MetricGroup({ group, values, thermostat }: { group: string; values: Record<string, any> | undefined; thermostat: any }) {
  if (!values) return null;
  const metrics = Object.entries(values).filter(([, metric]) => metric != null);
  if (!metrics.length) return null;
  return <Box sx={{ mb: '18px', minWidth: 0 }}><Typography component="p" sx={{ my: 1 }}>{titleCase(group.replaceAll('_', ' '))}</Typography>{metrics.map(([name, metric]) => <MetricRow key={name} group={group} name={name} metric={metric} value={Number(profileValue(thermostat, group, name))} unit={thermostat?.temperature_unit ?? '°F'} />)}</Box>;
}

function MetricColumns({ values, thermostat }: { values: Record<string, Record<string, any>> | undefined; thermostat: any }) {
  const threeColumns = useMediaQuery('(min-width:1001px)');
  const twoColumns = useMediaQuery('(min-width:801px)');
  if (!values) return null;
  const columnCount = threeColumns ? 3 : twoColumns ? 2 : 1;
  const columns = Array.from({ length: columnCount }, () => ({ size: 0, groups: [] as Array<[string, Record<string, any>]> }));
  Object.entries(values).forEach(([group, groupValues]) => {
    const populated = Object.fromEntries(Object.entries(groupValues ?? {}).filter(([, metric]) => metric != null));
    const size = Object.keys(populated).length;
    if (!size) return;
    const column = columns.reduce((smallest, candidate) => candidate.size < smallest.size ? candidate : smallest, columns[0]);
    column.groups.push([group, populated]);
    column.size += size;
  });
  if (columns.every((column) => column.size === 0)) {
    return <Typography>We couldn't generate any metrics for your system. Try broadening your comparison settings and ensuring your system type and thermostat address are properly set.</Typography>;
  }
  return <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, columnGap: 0, mx: -1, pt: '1px', '@media (min-width: 801px)': { pt: '5px' } }}>
    {columns.map((column, index) => <Box key={index} sx={{ px: 1 }}>{column.groups.map(([group, groupValues]) => <MetricGroup key={group} group={group} values={groupValues} thermostat={thermostat} />)}</Box>)}
  </Box>;
}

export function ComparePage() {
  const { data, thermostat, thermostatId, refresh } = useDashboard();
  const settings = data?.user?.settings ?? {};
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
  return <Box sx={{ display: 'grid', gap: 2, pb: 2 }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <DashboardCard title="Comparison Settings" action={<CardHelpMenu label="Comparison Settings" href="https://doc.beestat.io/596040eadd014928830b4d1d54692761" />} sx={{ '& .MuiCardContent-root': { pb: 4 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2, '@media (min-width: 801px)': { gridTemplateColumns: 'calc((100% - 32px) / 3) 1fr' } }}>
            <Box><Typography variant="overline" display="block" mb={1}>Region</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{(['nearby', 'global'] as const).map((value) => <Button key={value} variant="contained" sx={{ px: '7px', minWidth: 0, borderRadius: .5, textTransform: 'none', bgcolor: region === value ? colors.green.main : colors.slate.light, '&:hover': { bgcolor: region === value ? colors.green.dark : colors.slate.main } }} onClick={() => { setRegion(value); saveComparison('comparison_region', value); }}>{titleCase(value)}</Button>)}</Box></Box>
            <Box><Typography variant="overline" display="block" mb={1}>Property</Typography><Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{(['similar', 'same_structure', 'all'] as const).map((value) => <Button key={value} variant="contained" sx={{ px: '7px', minWidth: 0, borderRadius: .5, textTransform: 'none', bgcolor: propertyType === value ? colors.purple.main : colors.slate.light, '&:hover': { bgcolor: propertyType === value ? colors.purple.dark : colors.slate.main } }} onClick={() => { setPropertyType(value); saveComparison('comparison_property_type', value); }}>{value === 'similar' ? 'Very Similar' : value === 'same_structure' ? `Type: ${titleCase(thermostat?.property?.structure_type ?? '')}` : 'All'}</Button>)}</Box></Box>
          </Box>
          <Box mt={2}><Typography fontWeight={600} mb={1}>Comparing to homes like...</Typography><Typography>Matching system type and stages</Typography><Typography color={attributes.property_structure_type == null ? 'text.secondary' : 'inherit'}>{attributes.property_structure_type == null ? 'Any property type' : `Property Type: ${titleCase(String(attributes.property_structure_type))}`}</Typography><Typography color={ageRange ? 'inherit' : 'text.secondary'}>{ageRange ? `Between ${ageRange[0]} and ${ageRange[1]} years old` : 'Any property age'}</Typography><Typography color={areaRange ? 'inherit' : 'text.secondary'}>{areaRange ? `Between ${areaRange[0]} and ${areaRange[1]} ft²` : 'Any square footage'}</Typography><Typography color={storiesFilter == null ? 'text.secondary' : 'inherit'}>{typeof storiesFilter === 'object' ? `${storiesFilter.operator === '>=' ? 'At least' : storiesFilter.operator} ${storiesFilter.value} stories` : storiesFilter == null ? 'Any number of stories' : `${storiesFilter} stories`}</Typography><Typography color={region === 'nearby' ? 'inherit' : 'text.secondary'}>{region === 'nearby' ? 'Within 250 miles of your location' : 'Any region'}</Typography></Box>
          <Box aria-hidden height={8} />
        </DashboardCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <DashboardCard title="My Home" action={<MyHomeMenu thermostat={thermostat} refresh={refresh} />} sx={{ '& .MuiCardContent-root': { pb: 4 } }}>
          <Typography variant="overline" display="block" mb={1}>System</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {(Object.keys(systemTypeOptions) as SystemMode[]).map((mode) => {
              const system = effectiveSystemType(thermostat, mode);
              if (!system.equipment) return null;
              const Icon = mode === 'cool' ? Snowflake : Flame;
              const stages = mode !== 'auxiliary_heat' && Number(system.stages) > 1 ? ' (2 Stage)' : '';
              return <Chip key={mode} icon={<Icon />} color={mode === 'cool' ? 'primary' : mode === 'auxiliary_heat' ? 'error' : 'warning'} label={`${titleCase(system.equipment)}${stages}`} sx={{ color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />;
            })}
          </Stack>
          <Typography variant="overline" display="block" mt={2} mb={1}>Region</Typography>
          <Chip icon={<MapPin />} color={regionLabel === 'No data' ? 'default' : 'success'} label={regionLabel} sx={{ color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
          <Typography variant="overline" display="block" mt={2} mb={1}>Property</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {thermostat?.property?.structure_type && <Chip icon={<Home />} label={titleCase(thermostat.property.structure_type)} sx={{ bgcolor: colors.purple.main, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />}
            {thermostat?.property?.stories && ['detached', 'townhouse', 'semi-detached'].includes(thermostat.property.structure_type ?? '') && <Chip icon={<Layers />} label={`${thermostat.property.stories} ${thermostat.property.stories === 1 ? 'Story' : 'Stories'}`} sx={{ bgcolor: colors.purple.main, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />}
            {thermostat?.property?.square_feet && <Chip icon={<Ruler />} label={`${thermostat.property.square_feet.toLocaleString()} ft²`} sx={{ bgcolor: colors.purple.main, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />}
            {thermostat?.property?.age && <Chip icon={<Clock3 />} label={`${thermostat.property.age} Years`} sx={{ bgcolor: colors.purple.main, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />}
          </Stack>
          <Box aria-hidden height={8} />
        </DashboardCard>
      </Grid>
    </Grid>
    <DashboardCard title="Metrics" subheader={generatedLabel} action={<CardHelpMenu label="Metrics" href="https://doc.beestat.io/ebfdf00f7f34436c980cd6344a767a12" />}>{metrics.isLoading ? <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : metrics.error ? <Alert severity="error">{metrics.error.message}</Alert> : <MetricColumns values={metrics.data} thermostat={thermostat} />}</DashboardCard>
  </Box>;
}
