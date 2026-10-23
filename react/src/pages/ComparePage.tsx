import { Alert, Box, Button, ButtonGroup, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Flame, Home, Layers, MapPin, Ruler, Snowflake } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';
import { titleCase } from '../utils/format';

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
      <Grid size={{ xs: 12, md: 6 }}><DashboardCard title="My Home"><Typography variant="overline">System</Typography><Stack direction="row" gap={1} flexWrap="wrap"><Chip icon={<Flame />} color="warning" label={titleCase(String(thermostat?.system_type?.detected?.heat?.type ?? 'Heat'))} /><Chip icon={<Snowflake />} color="primary" label={titleCase(String(thermostat?.system_type?.detected?.cool?.type ?? 'Cool'))} /></Stack><Typography variant="overline" display="block" mt={2}>Region</Typography><Chip icon={<MapPin />} color="success" label={String(address?.normalized?.components?.state_abbreviation ?? address?.normalized?.components?.country_iso_3 ?? 'No data')} /><Typography variant="overline" display="block" mt={2}>Property</Typography><Stack direction="row" gap={1} flexWrap="wrap">{thermostat?.property?.structure_type && <Chip icon={<Home />} label={titleCase(thermostat.property.structure_type)} />}{thermostat?.property?.stories && <Chip icon={<Layers />} label={`${thermostat.property.stories} stories`} />}{thermostat?.property?.square_feet && <Chip icon={<Ruler />} label={`${thermostat.property.square_feet.toLocaleString()} ft²`} />}</Stack></DashboardCard></Grid>
    </Grid>
    <DashboardCard title="Metrics" subheader="Compared with matching beestat homes">{metrics.isLoading ? <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : metrics.error ? <Alert severity="error">{metrics.error.message}</Alert> : <Box sx={{ columns: { xs: 1, md: 2, lg: 3 }, columnGap: 2 }}>{Object.entries(metrics.data ?? {}).map(([group, values]) => <Box key={group} sx={{ breakInside: 'avoid', mb: 2 }}><Typography variant="overline">{titleCase(group)}</Typography>{Object.entries(values).filter(([, value]) => value !== null).map(([name, value]) => <Box key={name} sx={{ bgcolor: 'background.default', p: 1.25, mb: .5, borderRadius: 1 }}><Typography variant="body2" color="text.secondary">{titleCase(name)}</Typography><Typography fontSize={18}>{typeof value === 'object' ? String(value?.value ?? value?.user ?? JSON.stringify(value)) : String(value)}</Typography></Box>)}</Box>)}</Box>}</DashboardCard>
  </Box>;
}
