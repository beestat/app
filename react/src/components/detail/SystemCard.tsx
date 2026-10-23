import { Box, Chip, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Droplets, Fan, Flame, Home, Info, Snowflake, XCircle } from 'lucide-react';
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
  const activeColor = running.some((item) => item.includes('cool')) ? colors.lightBlue.main : running.some((item) => item.includes('heat')) ? colors.orange.main : colors.slate.light;
  const mode = ecobee?.settings?.hvacMode ?? thermostat.system_mode?.mode ?? 'auto';
  const climateRef = thermostat.program?.currentClimateRef;
  const climate = thermostat.program?.climates?.find((item: any) => item.climateRef === climateRef);
  const scheduledHeat = Number(climate?.heatTemp ?? thermostat.setpoint_heat);
  const scheduledCool = Number(climate?.coolTemp ?? thermostat.setpoint_cool);
  const overridden = Math.abs(scheduledHeat - thermostat.setpoint_heat) > .01 || Math.abs(scheduledCool - thermostat.setpoint_cool) > .01;
  const setpoint = mode === 'cool' ? formatTemperature(thermostat.setpoint_cool, thermostat.temperature_unit, 1) : mode === 'heat' || mode === 'auxHeatOnly' ? formatTemperature(thermostat.setpoint_heat, thermostat.temperature_unit, 1) : `${formatTemperature(thermostat.setpoint_heat, thermostat.temperature_unit, 1)} - ${formatTemperature(thermostat.setpoint_cool, thermostat.temperature_unit, 1)}`;
  const statusTime = ecobee?.runtime?.lastStatusModified ? new Date(`${ecobee.runtime.lastStatusModified}Z`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined;
  const subtitle = <>{titleCase(String(mode))}{mode !== 'off' ? ` · ${overridden ? 'Overridden' : 'Schedule'} · ${setpoint}` : ''}{statusTime && <><br /><Box component="span" sx={{ color: colors.gray.dark }}>As of {statusTime}</Box></>}</>;
  return <DashboardCard title={`System - ${thermostat.name}`} subheader={subtitle} action={<IconButton aria-label="Thermostat information"><Info size={20} /></IconButton>}>
    <Box sx={{ position: 'relative', width: 180, height: 180, borderRadius: '50%', bgcolor: activeColor, mx: 'auto', my: 1, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <Box><Typography component="div" sx={{ fontSize: 48, fontWeight: 300, lineHeight: 1 }}>{formatTemperature(thermostat.temperature, thermostat.temperature_unit)}</Typography><Stack direction="row" alignItems="center" justifyContent="center" gap={.5} mt={1}><Droplets size={18} /><span>{thermostat.humidity}%</span></Stack></Box>
      <Tooltip title={thermostat.weather?.condition ?? 'Outdoor conditions'}><Box sx={{ position: 'absolute', right: -5, top: 20, width: 66, height: 66, borderRadius: '50%', bgcolor: 'background.default', display: 'grid', placeItems: 'center' }}><Box><Typography sx={{ fontSize: 22, fontWeight: 300 }}>{formatTemperature(thermostat.weather?.temperature, thermostat.temperature_unit, 0)}</Typography><Stack direction="row" justifyContent="center" alignItems="center"><Droplets size={14} /><Typography variant="caption">{thermostat.weather?.humidity_relative}%</Typography></Stack></Box></Box></Tooltip>
    </Box>
    <Divider sx={{ my: 1.5 }} />
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Stack direction="row" gap={.75} flexWrap="wrap">{running.length ? running.map((item) => <Chip key={item} size="small" icon={equipmentIcon(item)} label={titleCase(item)} />) : <Chip size="small" icon={<XCircle size={18} />} label="No equipment running" variant="outlined" />}</Stack><Stack direction="row" gap={.5} alignItems="center"><Home size={20} /><Typography variant="body2">{climate?.name ?? 'Home'}</Typography></Stack></Stack>
  </DashboardCard>;
});
