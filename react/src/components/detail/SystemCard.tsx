import { Box, Chip, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { CloudSun, Droplets, Fan, Flame, Home, Info, Snowflake, XCircle } from 'lucide-react';
import { memo } from 'react';
import type { EcobeeThermostat, Thermostat } from '../../types';
import { colors } from '../../theme';
import { formatTemperature, titleCase } from '../../utils/format';
import { DashboardCard } from '../common/DashboardCard';

function equipmentIcon(equipment: string) {
  if (equipment.includes('cool')) return <Snowflake size={21} />;
  if (equipment.includes('heat')) return <Flame size={21} />;
  if (equipment === 'fan') return <Fan size={21} />;
  return <Info size={21} />;
}

export const SystemCard = memo(function SystemCard({ thermostat, ecobee }: { thermostat: Thermostat; ecobee?: EcobeeThermostat }) {
  const running = thermostat.running_equipment ?? [];
  const activeColor = running.some((item) => item.includes('cool')) ? colors.lightBlue.main
    : running.some((item) => item.includes('heat')) ? colors.orange.main : colors.slate.light;
  const mode = ecobee?.settings?.hvacMode ?? thermostat.system_mode?.mode ?? 'auto';
  return (
    <DashboardCard title={`System - ${thermostat.name}`} subheader={`${titleCase(String(mode))} · Heat ${formatTemperature(thermostat.setpoint_heat, thermostat.temperature_unit, 0)} · Cool ${formatTemperature(thermostat.setpoint_cool, thermostat.temperature_unit, 0)}`} action={<IconButton aria-label="Thermostat information"><Info size={20} /></IconButton>}>
      <Box sx={{ position: 'relative', width: 196, height: 196, borderRadius: '50%', bgcolor: activeColor, mx: 'auto', my: 1, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08), 0 8px 28px rgba(0,0,0,.18)' }}>
        <Box><Typography component="div" sx={{ fontSize: 48, fontWeight: 300, lineHeight: 1 }}>{formatTemperature(thermostat.temperature, thermostat.temperature_unit)}</Typography><Stack direction="row" alignItems="center" justifyContent="center" gap={.5} mt={1}><Droplets size={18} /><span>{thermostat.humidity}%</span></Stack></Box>
        <Tooltip title="Outdoor conditions"><Box sx={{ position: 'absolute', right: -5, top: 32, width: 70, height: 70, borderRadius: '50%', bgcolor: 'background.default', display: 'grid', placeItems: 'center' }}><Box><CloudSun size={18} /><Typography variant="body2">{formatTemperature(thermostat.weather?.temperature, thermostat.temperature_unit, 0)}</Typography></Box></Box></Tooltip>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack direction="row" gap={.75} flexWrap="wrap">
          {running.length ? running.map((item) => <Chip key={item} size="small" icon={equipmentIcon(item)} label={titleCase(item)} />) : <Chip size="small" icon={<XCircle size={18} />} label="No equipment running" variant="outlined" />}
        </Stack>
        <Stack direction="row" gap={.5} alignItems="center"><Home size={20} /><Typography variant="body2">Home</Typography></Stack>
      </Stack>
    </DashboardCard>
  );
});
