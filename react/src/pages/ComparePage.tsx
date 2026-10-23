import { Alert, Box, Button, ButtonGroup, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock3, Flame, Home, Layers, MapPin, Ruler, Snowflake } from 'lucide-react';
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

function MetricRow({ group, name, metric, value, unit }: { group: string; name: string; metric: any; value: number; unit: string }) {
  const interval = Number(metric?.interval);
  if (!Number.isFinite(value) || !Number.isFinite(interval) || interval <= 0) return null;
  const precision = Number.isInteger(interval) ? 0 : String(interval).split('.')[1]?.length ?? 0;
  const roundedValue = Math.round(value / interval) * interval;
  const min = Math.min(Math.floor((Number(metric.median) - Number(metric.standard_deviation) * 2) / interval) * interval, roundedValue);
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
  const label = name === 'auxiliary_heat_1' ? 'Aux' : titleCase(name.replaceAll('_', ' '));
  return <Box sx={{ display: 'grid', gridTemplateColumns: '136px 1fr', height: 70, mb: .5, overflow: 'hidden' }}>
    <Box sx={{ bgcolor: groupColors[group]?.[colorIndex] ?? colors.lightBlue.main, display: 'grid', gridTemplateColumns: '36px 1fr', alignItems: 'center', pr: .5 }}><Icon size={20} style={{ justifySelf: 'center' }} /><Box><Typography>{label}</Typography><Typography variant="caption" display="block">{others.toLocaleString()} others</Typography><Typography variant="caption">{symbol} {percentile}% homes</Typography></Box></Box>
    <Box sx={{ bgcolor: 'background.default', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1px', px: 1, pt: 1.5, overflow: 'hidden' }}>
      {histogram.map(([bucket, count]) => <Box key={bucket} sx={{ flex: 1, minWidth: 1, height: `${Math.max(2, 80 * count / high)}%`, bgcolor: colors.slate.light }} />)}
      <Box sx={{ position: 'absolute', left, top: 3, bottom: 3, width: 2, bgcolor: '#fff' }}><Typography sx={{ position: 'absolute', right: 5, top: 0, whiteSpace: 'nowrap', fontWeight: 600 }}>{metricLabel(group, name, roundedValue, unit)}</Typography></Box>
      <Typography variant="caption" sx={{ position: 'absolute', left: 4, bottom: 0 }}>{metricLabel(group, name, min, unit)}</Typography><Typography variant="caption" sx={{ position: 'absolute', right: 4, bottom: 0 }}>{metricLabel(group, name, max, unit)}</Typography>
    </Box>
  </Box>;
}

export function ComparePage() {
  const { data, thermostat, thermostatId } = useDashboard();
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
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}><DashboardCard title="Comparison Settings"><Typography variant="overline">Region</Typography><Box><ButtonGroup><Button variant={region === 'nearby' ? 'contained' : 'outlined'} color="success" onClick={() => { setRegion('nearby'); saveComparison('comparison_region', 'nearby'); }}>Nearby</Button><Button variant={region === 'global' ? 'contained' : 'outlined'} color="success" onClick={() => { setRegion('global'); saveComparison('comparison_region', 'global'); }}>Global</Button></ButtonGroup></Box><Typography variant="overline" display="block" mt={2}>Property</Typography><ButtonGroup>{(['similar', 'same_structure', 'all'] as const).map((value) => <Button key={value} variant={propertyType === value ? 'contained' : 'outlined'} color="secondary" onClick={() => { setPropertyType(value); saveComparison('comparison_property_type', value); }}>{value === 'similar' ? 'Very Similar' : value === 'same_structure' ? 'Same Type' : 'All'}</Button>)}</ButtonGroup><Typography variant="body2" color="text.secondary" mt={2}>Matching system type and stages · {region === 'nearby' ? 'within 250 miles' : 'any region'} · {propertyType.replaceAll('_', ' ')}</Typography></DashboardCard></Grid>
      <Grid size={{ xs: 12, md: 6 }}><DashboardCard title="My Home"><Typography variant="overline">System</Typography><Stack direction="row" gap={1} flexWrap="wrap">{(['heat', 'auxiliary_heat', 'cool'] as const).map((mode) => { const system = thermostat?.system_type?.detected?.[mode]; if (!system?.equipment) return null; const Icon = mode === 'cool' ? Snowflake : Flame; return <Chip key={mode} icon={<Icon />} color={mode === 'cool' ? 'primary' : mode === 'auxiliary_heat' ? 'error' : 'warning'} label={`${titleCase(system.equipment)}${system.stages ? ` (${system.stages} Stage${system.stages > 1 ? 's' : ''})` : ''}`} />; })}</Stack><Typography variant="overline" display="block" mt={2}>Region</Typography><Chip icon={<MapPin />} color="success" label={String(address?.normalized?.components?.state_abbreviation ?? address?.normalized?.components?.country_iso_3 ?? 'No data')} /><Typography variant="overline" display="block" mt={2}>Property</Typography><Stack direction="row" gap={1} flexWrap="wrap">{thermostat?.property?.structure_type && <Chip icon={<Home />} label={titleCase(thermostat.property.structure_type)} />}{thermostat?.property?.stories && <Chip icon={<Layers />} label={`${thermostat.property.stories} stories`} />}{thermostat?.property?.square_feet && <Chip icon={<Ruler />} label={`${thermostat.property.square_feet.toLocaleString()} ft²`} />}{thermostat?.property?.age && <Chip icon={<Clock3 />} label={`${thermostat.property.age} years`} />}</Stack></DashboardCard></Grid>
    </Grid>
    <DashboardCard title="Metrics" subheader={(thermostat?.profile as any)?.metadata?.generated_at ? `Generated ${new Date((thermostat?.profile as any).metadata.generated_at).toLocaleString()} from the past year of data (updated weekly).` : 'Compared with matching beestat homes'}>{metrics.isLoading ? <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : metrics.error ? <Alert severity="error">{metrics.error.message}</Alert> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gridTemplateAreas: { xs: '"setback" "property" "setpoint" "balance_point" "runtime_per_degree_day"', md: '"setback property setpoint" "balance_point runtime_per_degree_day empty"' }, columnGap: 2, alignItems: 'start' }}>{Object.entries(metrics.data ?? {}).map(([group, values]) => <Box key={group} sx={{ gridArea: group, mb: 2, minWidth: 0 }}><Typography variant="overline">{titleCase(group.replaceAll('_', ' '))}</Typography>{Object.entries(values).map(([name, metric]) => <MetricRow key={name} group={group} name={name} metric={metric} value={Number(profileValue(thermostat, group, name))} unit={thermostat?.temperature_unit ?? '°F'} />)}</Box>)}</Box>}</DashboardCard>
  </Box>;
}
