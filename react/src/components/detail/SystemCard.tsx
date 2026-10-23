import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { CircleHelp, Droplets, Fan, Filter, Flame, Home, Info, MoreVertical, Snowflake, XCircle } from 'lucide-react';
import { memo, useState } from 'react';
import type { EcobeeThermostat, Thermostat } from '../../types';
import { colors } from '../../theme';
import { formatDuration, formatTemperature, titleCase } from '../../utils/format';
import { DashboardCard } from '../common/DashboardCard';

function equipmentIcon(equipment: string) {
  if (equipment.includes('cool')) return <Snowflake size={21} />;
  if (equipment.includes('heat')) return <Flame size={21} />;
  if (equipment === 'fan') return <Fan size={21} />;
  return <Info size={21} />;
}

export const SystemCard = memo(function SystemCard({ thermostat, ecobee }: { thermostat: Thermostat; ecobee?: EcobeeThermostat }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'thermostat' | 'filter'>();
  const temperature = (value: number | null | undefined, digits = 1) => formatTemperature(value, thermostat.temperature_unit, digits).replace(/°[FC]$/, '');
  const running = thermostat.running_equipment ?? [];
  const activeColor = running.some((item) => item.includes('cool')) ? colors.lightBlue.main : running.some((item) => item.includes('heat')) ? colors.orange.main : colors.slate.light;
  const mode = ecobee?.settings?.hvacMode ?? thermostat.system_mode?.mode ?? 'auto';
  const program = ecobee?.program ?? thermostat.program;
  const climateRef = program?.currentClimateRef;
  const climate = program?.climates?.find((item: any) => item.climateRef === climateRef);
  const scheduledHeat = Number(climate?.heatTemp ?? thermostat.setpoint_heat);
  const scheduledCool = Number(climate?.coolTemp ?? thermostat.setpoint_cool);
  const overridden = Math.abs(scheduledHeat - thermostat.setpoint_heat) > .01 || Math.abs(scheduledCool - thermostat.setpoint_cool) > .01;
  const setpoint = mode === 'cool' ? temperature(thermostat.setpoint_cool) : mode === 'heat' || mode === 'auxHeatOnly' ? temperature(thermostat.setpoint_heat) : `${temperature(thermostat.setpoint_heat)} - ${temperature(thermostat.setpoint_cool)}`;
  const statusTime = ecobee?.runtime?.lastStatusModified ? new Date(`${ecobee.runtime.lastStatusModified}Z`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined;
  const subtitle = <>{titleCase(String(mode))}{mode !== 'off' ? ` · ${overridden ? 'Overridden' : 'Schedule'} · ${setpoint}` : ''}{statusTime && <><br /><Box component="span" sx={{ color: colors.gray.dark }}>As of {statusTime}</Box></>}</>;
  const action = <><IconButton aria-label="System menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); setDialog('thermostat'); }}><ListItemIcon><Info size={18} /></ListItemIcon><ListItemText>Thermostat Info</ListItemText></MenuItem>{thermostat.filters && <MenuItem onClick={() => { setAnchor(null); setDialog('filter'); }}><ListItemIcon><Filter size={18} /></ListItemIcon><ListItemText>Filter Info</ListItemText></MenuItem>}<MenuItem component="a" href="https://doc.beestat.io" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu></>;
  const operatingMode = running.find((item) => item.includes('auxiliary_heat') || item.includes('compressor_heat') || item.includes('compressor_cool'));
  const simplifiedMode = operatingMode?.includes('cool') ? 'cool' : operatingMode?.includes('heat') ? 'heat' : undefined;
  const profile = operatingMode ? (thermostat.profile as any)?.temperature?.[operatingMode] : undefined;
  const rate = profile?.linear_trendline && thermostat.weather?.temperature != null ? Number(profile.linear_trendline.slope) * thermostat.weather.temperature + Number(profile.linear_trendline.intercept) : undefined;
  const degreesToGo = simplifiedMode === 'heat' ? thermostat.setpoint_heat - thermostat.temperature : simplifiedMode === 'cool' ? thermostat.temperature - thermostat.setpoint_cool : 0;
  const hoursToGo = simplifiedMode === 'heat' && rate ? degreesToGo / rate : simplifiedMode === 'cool' && rate ? degreesToGo / rate * -1 : undefined;
  const showTimeToTemperature = Boolean(simplifiedMode && degreesToGo > 0);
  return <DashboardCard title={`System - ${thermostat.name}`} subheader={subtitle} action={action}>
    <Box sx={{ position: 'relative', width: 180, height: 180, borderRadius: '50%', bgcolor: activeColor, mx: 'auto', my: 1, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <Box><Typography component="div" sx={{ fontSize: 48, fontWeight: 300, lineHeight: 1 }}>{temperature(thermostat.temperature)}</Typography><Stack direction="row" alignItems="center" justifyContent="center" gap={.5} mt={1}><Droplets size={18} /><span>{thermostat.humidity}%</span></Stack></Box>
      <Tooltip title={thermostat.weather?.condition ?? 'Outdoor conditions'}><Box sx={{ position: 'absolute', right: -5, top: 20, width: 66, height: 66, borderRadius: '50%', bgcolor: 'background.default', display: 'grid', placeItems: 'center' }}><Box><Typography sx={{ fontSize: 22, fontWeight: 300 }}>{temperature(thermostat.weather?.temperature, 0)}</Typography><Stack direction="row" justifyContent="center" alignItems="center"><Droplets size={14} /><Typography variant="caption">{thermostat.weather?.humidity_relative}%</Typography></Stack></Box></Box></Tooltip>
    </Box>
    <Divider sx={{ my: 1.5 }} />
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Stack direction="row" gap={.75} flexWrap="wrap">{running.length ? running.map((item) => <Chip key={item} size="small" icon={equipmentIcon(item)} label={titleCase(item)} />) : <Chip size="small" icon={<XCircle size={18} />} label="No equipment running" variant="outlined" />}</Stack><Stack direction="row" gap={.5} alignItems="center"><Home size={20} /><Typography variant="body2">{climate?.name ?? 'Home'}</Typography></Stack></Stack>
    {showTimeToTemperature && <Box sx={{ bgcolor: 'background.default', textAlign: 'center', p: 1, mt: 2, borderRadius: 1 }}><Typography fontWeight={600}>Time to {simplifiedMode}{rate != null ? ` (${formatTemperature(rate, thermostat.temperature_unit)} / h)` : ''}</Typography><Typography>{hoursToGo == null || !Number.isFinite(hoursToGo) ? 'Unknown' : Math.abs(rate ?? 0) < .05 ? 'Never' : `${formatDuration(hoursToGo * 3600)}${hoursToGo <= 12 ? ` (${new Date(Date.now() + hoursToGo * 3_600_000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : ''}`}</Typography></Box>}
    <Dialog open={dialog === 'thermostat'} onClose={() => setDialog(undefined)} fullWidth maxWidth="xs"><DialogTitle>Thermostat Info</DialogTitle><DialogContent><Stack gap={1}><Box><Typography fontWeight={600}>Name</Typography><Typography>{thermostat.name}</Typography></Box><Box><Typography fontWeight={600}>Model</Typography><Typography>{String(thermostat.model ?? ecobee?.modelNumber ?? 'Unknown')}</Typography></Box><Box><Typography fontWeight={600}>Data available since</Typography><Typography>{new Date(thermostat.data_begin).toLocaleDateString()}</Typography></Box></Stack></DialogContent><DialogActions><Button onClick={() => setDialog(undefined)}>Close</Button></DialogActions></Dialog>
    <Dialog open={dialog === 'filter'} onClose={() => setDialog(undefined)} fullWidth maxWidth="xs"><DialogTitle>Filter Info</DialogTitle><DialogContent><Stack gap={1}>{Object.entries(thermostat.filters ?? {}).map(([name, value]) => <Box key={name}><Typography fontWeight={600}>{titleCase(name)}</Typography><Typography>{typeof value === 'object' ? String((value as any)?.value ?? (value as any)?.life ?? 'Configured') : String(value)}</Typography></Box>)}</Stack></DialogContent><DialogActions><Button onClick={() => setDialog(undefined)}>Close</Button></DialogActions></Dialog>
  </DashboardCard>;
});
