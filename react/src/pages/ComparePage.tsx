import { Alert, Box, Button, ButtonGroup, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Clock3, Flame, Home, Layers, MapPin, Ruler, Snowflake } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { titleCase } from '../utils/format';

function profileValue(thermostat: any, group: string, name: string) {
  if (group === 'property') return thermostat?.property?.[name];
  return thermostat?.profile?.[group]?.[name];
}

function metricLabel(group: string, name: string, value: number, unit: string) {
  if (group === 'property' && name === 'age') return `${value}y`;
  if (group === 'property' && name === 'square_feet') return `${value.toLocaleString()} ft²`;
  if (group === 'runtime_per_degree_day') return `${Math.round(value)}m`;
  if (group === 'setpoint' || group === 'balance_point') return `${value.toFixed(group === 'setpoint' ? 1 : 0)}${unit}`;
  if (group === 'setback') return `${value}${unit}`;
  return String(value);
}

function MetricRow({ group, name, metric, value, unit }: { group: string; name: string; metric: any; value: number; unit: string }) {
  const histogram = Object.entries(metric?.histogram ?? {}).map(([key, count]) => [Number(key), Number(count)] as const).sort((a, b) => a[0] - b[0]);
  if (!Number.isFinite(value) || !histogram.length) return null;
  const min = histogram[0][0]; const max = histogram.at(-1)![0]; const high = Math.max(...histogram.map(([, count]) => count), 1);
  const others = histogram.reduce((sum, [, count]) => sum + count, 0);
  const below = histogram.filter(([bucket]) => bucket <= value).reduce((sum, [, count]) => sum + count, 0);
  const percentile = Math.round(100 * below / Math.max(others, 1));
  const left = `${Math.max(0, Math.min(100, 100 * (value - min) / Math.max(max - min, 1)))}%`;
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '136px 1fr', sm: '168px 1fr' }, minHeight: 62, mb: .5 }}>
    <Box sx={{ bgcolor: 'primary.main', px: 1.25, py: .75 }}><Typography>{titleCase(name.replaceAll('_', ' '))}</Typography><Typography variant="caption" display="block">{others.toLocaleString()} others</Typography><Typography variant="caption">{percentile >= 50 ? '>' : '<'} {percentile}% homes</Typography></Box>
    <Box sx={{ bgcolor: 'background.default', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1px', px: 1, pt: 1.5 }}>
      {histogram.map(([bucket, count]) => <Box key={bucket} sx={{ flex: 1, minWidth: 1, height: `${Math.max(2, 80 * count / high)}%`, bgcolor: colors.slate.light }} />)}
      <Box sx={{ position: 'absolute', left, top: 3, bottom: 3, width: 2, bgcolor: '#fff' }}><Typography sx={{ position: 'absolute', right: 5, top: 0, whiteSpace: 'nowrap', fontWeight: 600 }}>{metricLabel(group, name, value, unit)}</Typography></Box>
      <Typography variant="caption" sx={{ position: 'absolute', left: 4, bottom: 0 }}>{metricLabel(group, name, min, unit)}</Typography><Typography variant="caption" sx={{ position: 'absolute', right: 4, bottom: 0 }}>{metricLabel(group, name, max, unit)}</Typography>
    </Box>
  </Box>;
}

export function ComparePage() {
  const { data, thermostat, thermostatId } = useDashboard();
  const [region, setRegion] = useState<'nearby' | 'global'>('global');
  const [propertyType, setPropertyType] = useState<'similar' | 'same_structure' | 'all'>('similar');
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
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}><DashboardCard title="Comparison Settings"><Typography variant="overline">Region</Typography><Box><ButtonGroup><Button variant={region === 'nearby' ? 'contained' : 'outlined'} color="success" onClick={() => setRegion('nearby')}>Nearby</Button><Button variant={region === 'global' ? 'contained' : 'outlined'} color="success" onClick={() => setRegion('global')}>Global</Button></ButtonGroup></Box><Typography variant="overline" display="block" mt={2}>Property</Typography><ButtonGroup>{(['similar', 'same_structure', 'all'] as const).map((value) => <Button key={value} variant={propertyType === value ? 'contained' : 'outlined'} color="secondary" onClick={() => setPropertyType(value)}>{value === 'similar' ? 'Very Similar' : value === 'same_structure' ? 'Same Type' : 'All'}</Button>)}</ButtonGroup><Typography variant="body2" color="text.secondary" mt={2}>Matching system type and stages · {region === 'nearby' ? 'within 250 miles' : 'any region'} · {propertyType.replaceAll('_', ' ')}</Typography></DashboardCard></Grid>
      <Grid size={{ xs: 12, md: 6 }}><DashboardCard title="My Home"><Typography variant="overline">System</Typography><Stack direction="row" gap={1} flexWrap="wrap">{(['heat', 'auxiliary_heat', 'cool'] as const).map((mode) => { const system = thermostat?.system_type?.detected?.[mode]; if (!system?.equipment) return null; const Icon = mode === 'cool' ? Snowflake : Flame; return <Chip key={mode} icon={<Icon />} color={mode === 'cool' ? 'primary' : mode === 'auxiliary_heat' ? 'error' : 'warning'} label={`${titleCase(system.equipment)}${system.stages ? ` (${system.stages} Stage${system.stages > 1 ? 's' : ''})` : ''}`} />; })}</Stack><Typography variant="overline" display="block" mt={2}>Region</Typography><Chip icon={<MapPin />} color="success" label={String(address?.normalized?.components?.state_abbreviation ?? address?.normalized?.components?.country_iso_3 ?? 'No data')} /><Typography variant="overline" display="block" mt={2}>Property</Typography><Stack direction="row" gap={1} flexWrap="wrap">{thermostat?.property?.structure_type && <Chip icon={<Home />} label={titleCase(thermostat.property.structure_type)} />}{thermostat?.property?.stories && <Chip icon={<Layers />} label={`${thermostat.property.stories} stories`} />}{thermostat?.property?.square_feet && <Chip icon={<Ruler />} label={`${thermostat.property.square_feet.toLocaleString()} ft²`} />}{thermostat?.property?.age && <Chip icon={<Clock3 />} label={`${thermostat.property.age} years`} />}</Stack></DashboardCard></Grid>
    </Grid>
    <DashboardCard title="Metrics" subheader={(thermostat?.profile as any)?.metadata?.generated_at ? `Generated ${new Date((thermostat?.profile as any).metadata.generated_at).toLocaleString()} from the past year of data (updated weekly).` : 'Compared with matching beestat homes'}>{metrics.isLoading ? <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : metrics.error ? <Alert severity="error">{metrics.error.message}</Alert> : <Box sx={{ columns: { xs: 1, md: 2, lg: 3 }, columnGap: 2 }}>{Object.entries(metrics.data ?? {}).map(([group, values]) => <Box key={group} sx={{ breakInside: 'avoid', mb: 2 }}><Typography variant="overline">{titleCase(group.replaceAll('_', ' '))}</Typography>{Object.entries(values).map(([name, metric]) => <MetricRow key={name} group={group} name={name} metric={metric} value={Number(profileValue(thermostat, group, name))} unit={thermostat?.temperature_unit ?? '°F'} />)}</Box>)}</Box>}</DashboardCard>
  </Box>;
}
