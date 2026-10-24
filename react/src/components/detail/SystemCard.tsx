import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { AlarmClock, Ban as XCircle, CircleDollarSign, CircleHelp, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, DropletOff, Droplets, Fan, Filter, Flame, History, Home, Info, Lightbulb, MoreVertical, Snowflake, Sun, Wind } from 'lucide-react';
import { memo, useState } from 'react';
import type { EcobeeThermostat, Thermostat } from '../../types';
import { colors } from '../../theme';
import { formatDuration, formatTemperature, titleCase } from '../../utils/format';
import { DashboardCard } from '../common/DashboardCard';

const thermostatModels: Record<string, string> = {
  apolloEms: 'ecobee4 EMS', apolloSmart: 'ecobee4', athenaEms: 'ecobee3 EMS', athenaSmart: 'ecobee3', corSmart: 'Côr', idtEms: 'Smart EMS', idtSmart: 'Smart', nikeEms: 'ecobee3 lite EMS', nikeSmart: 'ecobee3 lite', siEms: 'Smart Si EMS', siSmart: 'Smart Si', vulcanSmart: 'Smart Thermostat', aresSmart: 'Smart Thermostat Premium', artemisSmart: 'Smart Thermostat Enhanced', attisPro: 'Smart Thermostat Lite', attisRetail: 'Smart Thermostat Essential',
};

function InfoGrid({ fields }: { fields: { name: string; value: React.ReactNode }[] }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>{fields.map((field) => <Box key={field.name}><Typography fontWeight={600} mb={.5}>{field.name}</Typography><Typography component="div">{field.value}</Typography></Box>)}</Box>;
}

function fullDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return `${date.toLocaleDateString('en-US', { month: 'short' })} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
}

function filterDetails(filter: any) {
  const lastChanged = new Date(`${filter.last_changed}T00:00:00`);
  const runtimeHours = Math.round(Number(filter.runtime) / 3600);
  let replaceIn = 'Unknown';
  if (filter.life_units === 'month') {
    const replace = new Date(Date.UTC(lastChanged.getFullYear(), lastChanged.getMonth() + Number(filter.life), lastChanged.getDate()));
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.trunc((replace.getTime() - today) / 86_400_000);
    if (days < 0) replaceIn = `${Math.abs(days)}d overdue`;
    else if (days === 0) replaceIn = 'Now';
    else if (days < 35) replaceIn = `${days}d`;
    else { const months = Math.floor(days / 30.436875); replaceIn = `${months}mo ${days - Math.round(months * 30.436875)}d`; }
  } else if (filter.life_units === 'hour') {
    const hours = Number(filter.life) - runtimeHours;
    replaceIn = hours < 0 ? `${Math.abs(hours)}h overdue` : hours === 0 ? 'Now' : `${hours}h`;
  }
  const lifespan = `${filter.life}${filter.life_units === 'hour' ? ' runtime' : ''} ${filter.life_units}${Number(filter.life) === 1 ? '' : 's'}`;
  return [
    { name: 'Last Changed', value: lastChanged.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
    { name: 'Lifespan', value: lifespan }, { name: 'Replace In', value: replaceIn }, { name: 'Runtime', value: `${runtimeHours}h` },
  ];
}

function weatherIcon(condition?: string) {
  const value = condition ?? '';
  if (value.includes('lightning') || value.includes('thunder')) return { Icon: CloudLightning, color: colors.yellow.main };
  if (value.includes('snow') || value.includes('sleet')) return { Icon: CloudSnow, color: colors.gray.light };
  if (value.includes('rain') || value.includes('drizzle')) return { Icon: CloudRain, color: colors.lightBlue.light };
  if (value.includes('fog') || value.includes('mist')) return { Icon: CloudFog, color: colors.gray.light };
  if (value === 'sunny' || value === 'clear') return { Icon: Sun, color: colors.yellow.main };
  return { Icon: Cloud, color: colors.gray.light };
}

function filterAppearance(type: string) {
  if (type === 'furnace') return { Icon: Flame, title: 'Furnace' };
  if (type === 'uv_lamp') return { Icon: Lightbulb, title: 'UV Lamp' };
  if (type === 'humidifier') return { Icon: Droplets, title: 'Humidifier' };
  if (type === 'dehumidifier') return { Icon: DropletOff, title: 'Dehumidifier' };
  if (type === 'ventilator') return { Icon: Fan, title: 'Ventilator' };
  return { Icon: Filter, title: titleCase(type) };
}

function windLabel(speed: number, bearing: number) {
  if (!speed) return '0mph';
  const bearings = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return `${speed}mph ${bearings[Math.floor(((bearing / 22.5) + .5) % 16)]}`;
}

function equipmentAppearance(equipment: string) {
  if (equipment.includes('cool')) return { icon: <Snowflake size={22} />, color: colors.lightBlue.light, title: 'Cool' };
  if (equipment.includes('auxiliary_heat')) return { icon: <Flame size={22} />, color: colors.red.main, title: 'Aux heat' };
  if (equipment.includes('heat')) return { icon: <Flame size={22} />, color: colors.orange.main, title: 'Heat' };
  if (equipment === 'fan') return { icon: <Fan size={22} />, color: colors.gray.light, title: 'Fan' };
  if (equipment === 'humidifier') return { icon: <Droplets size={22} />, color: colors.gray.main, title: 'Humidifier' };
  if (equipment === 'dehumidifier') return { icon: <DropletOff size={22} />, color: colors.gray.main, title: 'Dehumidifier' };
  if (equipment === 'ventilator') return { icon: <Wind size={22} />, color: colors.gray.main, title: 'Ventilator' };
  if (equipment === 'economizer') return { icon: <CircleDollarSign size={22} />, color: colors.gray.main, title: 'Economizer' };
  return { icon: <Info size={22} />, color: colors.gray.main, title: titleCase(equipment) };
}

function ordinal(value: number) {
  const remainder = value % 100;
  return `${value}${remainder >= 11 && remainder <= 13 ? 'th' : value % 10 === 1 ? 'st' : value % 10 === 2 ? 'nd' : value % 10 === 3 ? 'rd' : 'th'}`;
}

function formatStatusTime(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return Date.now() - date.getTime() > 3 * 3_600_000
    ? `${date.toLocaleDateString('en-US', { month: 'short' })} ${ordinal(date.getDate())} at ${time}`
    : time;
}

export const SystemCard = memo(function SystemCard({ thermostat, ecobee, lastSync }: { thermostat: Thermostat; ecobee?: EcobeeThermostat; lastSync?: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'thermostat' | 'filter' | 'weather'>();
  const temperature = (value: number | null | undefined, digits = 1) => formatTemperature(value, thermostat.temperature_unit, digits).replace(/°[FC]$/, '');
  const running = thermostat.running_equipment ?? [];
  const activeColor = running.some((item) => item.includes('cool')) ? colors.lightBlue.main : running.some((item) => item.includes('heat')) ? colors.orange.main : colors.slate.dark;
  const mode = ecobee?.settings?.hvacMode ?? thermostat.system_mode?.mode ?? 'auto';
  const program = thermostat.program ?? ecobee?.program;
  const climateRef = program?.currentClimateRef;
  const climate = program?.climates?.find((item: any) => item.climateRef === climateRef);
  const scheduledHeat = Number(climate?.heatTemp ?? thermostat.setpoint_heat);
  const scheduledCool = Number(climate?.coolTemp ?? thermostat.setpoint_cool);
  const overridden = Math.abs(scheduledHeat - thermostat.setpoint_heat) > .01 || Math.abs(scheduledCool - thermostat.setpoint_cool) > .01;
  const setpoint = mode === 'cool' ? temperature(thermostat.setpoint_cool) : mode === 'heat' || mode === 'auxHeatOnly' ? temperature(thermostat.setpoint_heat) : `${temperature(thermostat.setpoint_heat)} - ${temperature(thermostat.setpoint_cool)}`;
  const statusTime = ecobee?.runtime?.lastStatusModified ? formatStatusTime(ecobee.runtime.lastStatusModified) : undefined;
  const modeLabel = mode === 'auxHeatOnly' ? 'Aux' : titleCase(String(mode));
  const subtitle = <>{modeLabel}{mode !== 'off' ? ` · ${overridden ? 'Overridden' : 'Schedule'} · ${setpoint}` : ''}{statusTime && <><br /><Tooltip title={lastSync ? `Last sync: ${formatStatusTime(lastSync)}` : ''}><Box component="span" sx={{ color: colors.gray.dark }}>As of {statusTime}</Box></Tooltip></>}</>;
  const action = <><IconButton aria-label="System menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setAnchor(null); setDialog('thermostat'); }}><ListItemIcon><Info size={18} /></ListItemIcon><ListItemText>Thermostat Info</ListItemText></MenuItem>{Object.keys(thermostat.filters ?? {}).length > 0 && <MenuItem onClick={() => { setAnchor(null); setDialog('filter'); }}><ListItemIcon><Filter size={18} /></ListItemIcon><ListItemText>Filter Info</ListItemText></MenuItem>}<MenuItem component="a" href="https://doc.beestat.io/System-44b441bdd99b4c3991d6e0ace2dce893" target="_blank" rel="noreferrer"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem></Menu></>;
  const operatingMode = running.find((item) => item.includes('auxiliary_heat') || /(^|compressor_)heat_\d/.test(item) || /(^|compressor_)cool_\d/.test(item));
  const simplifiedMode = operatingMode?.includes('cool') ? 'cool' : operatingMode?.includes('heat') ? 'heat' : undefined;
  const profile = operatingMode ? (thermostat.profile as any)?.temperature?.[operatingMode] : undefined;
  const rate = profile?.linear_trendline && thermostat.weather?.temperature != null ? Number(profile.linear_trendline.slope) * thermostat.weather.temperature + Number(profile.linear_trendline.intercept) : undefined;
  const degreesToGo = simplifiedMode === 'heat' ? thermostat.setpoint_heat - thermostat.temperature : simplifiedMode === 'cool' ? thermostat.temperature - thermostat.setpoint_cool : 0;
  const hoursToGo = simplifiedMode === 'heat' && rate ? degreesToGo / rate : simplifiedMode === 'cool' && rate ? degreesToGo / rate * -1 : undefined;
  const showTimeToTemperature = Boolean(simplifiedMode && degreesToGo > 0);
  const ClimateIcon = climate?.climateRef === 'sleep' ? AlarmClock : climate?.climateRef === 'away' || (climate?.climateRef !== 'home' && climate?.isOccupied !== true) ? History : Home;
  const indoorTemperature = temperature(thermostat.temperature);
  const [temperatureWhole, temperatureFraction] = indoorTemperature.split('.');
  const { Icon: WeatherIcon, color: weatherColor } = weatherIcon(thermostat.weather?.condition);
  return <DashboardCard title={`System - ${thermostat.name}`} subheader={subtitle} action={action} sx={{ minHeight: { md: 398 } }}>
    <Box sx={{ position: 'relative', width: 180, height: 180, borderRadius: '50%', bgcolor: activeColor, mx: 'auto', my: 1, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      <Box><Box sx={{ lineHeight: 1 }}><Typography component="span" sx={{ fontSize: 48, fontWeight: 300 }}>{temperatureWhole}</Typography>{temperatureFraction != null && <Typography component="span" sx={{ fontSize: 24 }}>.{temperatureFraction}</Typography>}</Box><Stack direction="row" alignItems="center" justifyContent="center" gap={.5} mt={1}><Droplets size={18} /><span>{thermostat.humidity}%</span></Stack></Box>
      <Tooltip title={titleCase(thermostat.weather?.condition ?? 'Outdoor conditions')}><Box role="button" aria-label="Weather details" tabIndex={0} onClick={() => setDialog('weather')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setDialog('weather'); }} sx={{ position: 'absolute', right: -5, top: 20, width: 66, height: 66, borderRadius: '50%', bgcolor: 'background.default', display: 'grid', placeItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: colors.gray.dark } }}><Box><Typography sx={{ fontSize: 22, fontWeight: 300 }}>{temperature(thermostat.weather?.temperature, 0)}</Typography><Stack direction="row" justifyContent="center" alignItems="center"><Droplets size={14} /><Typography variant="caption">{thermostat.weather?.humidity_relative}%</Typography></Stack></Box></Box></Tooltip>
    </Box>
    <Divider sx={{ my: 1.5 }} />
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Stack direction="row" gap={.75} flexWrap="wrap">{running.length ? running.map((item) => { const appearance = equipmentAppearance(item); const match = item.match(/_(\d)$/); const modeKey = item.startsWith('auxiliary_heat') ? 'auxiliary_heat' : item.startsWith('heat') ? 'heat' : item.startsWith('cool') ? 'cool' : undefined; const stages = modeKey ? (thermostat.system_type as any)?.detected?.[modeKey]?.stages : 0; const stage = match?.[1] !== '1' || Number(stages) > 1 ? match?.[1] : undefined; return <Tooltip key={item} title={`${appearance.title}${stage ? ` ${stage}` : ''}`}><Stack direction="row" alignItems="end" sx={{ color: appearance.color }}>{appearance.icon}{stage && <Typography variant="caption" fontWeight={600} color="inherit">{stage}</Typography>}</Stack></Tooltip>; }) : <Tooltip title="No equipment running"><Stack direction="row" alignItems="end" color="text.secondary"><XCircle size={22} /><Typography variant="caption">none</Typography></Stack></Tooltip>}</Stack><Stack direction="row" gap={.5} alignItems="center"><ClimateIcon size={20} /><Typography variant="body2">{climate?.name ?? 'Home'}</Typography></Stack></Stack>
    {showTimeToTemperature && <Box sx={{ bgcolor: 'background.default', textAlign: 'center', p: 1, mt: 2, borderRadius: 1 }}><Typography fontWeight={600}>Time to {simplifiedMode}{rate != null ? ` (${formatTemperature(rate, thermostat.temperature_unit)} / h)` : ''}</Typography><Typography>{hoursToGo == null || !Number.isFinite(hoursToGo) ? 'Unknown' : (simplifiedMode === 'heat' && (rate ?? 0) < .05) || (simplifiedMode === 'cool' && (rate ?? 0) > -.05) ? 'Never' : `${formatDuration(hoursToGo * 3600)}${hoursToGo <= 12 ? ` (${new Date(Date.now() + hoursToGo * 3_600_000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : ''}`}</Typography></Box>}
    <Dialog open={dialog === 'thermostat'} onClose={() => setDialog(undefined)} fullWidth maxWidth="sm"><DialogTitle>Thermostat Info</DialogTitle><DialogContent><InfoGrid fields={[{ name: 'Model', value: thermostatModels[String(ecobee?.model_number)] ?? 'Unknown' }, { name: 'Serial Number', value: String(ecobee?.identifier ?? 'Unknown') }, { name: 'Firmware Revision', value: String(ecobee?.version?.thermostatFirmwareVersion ?? 'Unknown') }, { name: 'First Connected', value: fullDate(ecobee?.runtime?.firstConnected) }]} /></DialogContent><DialogActions><Button onClick={() => setDialog(undefined)}>Close</Button></DialogActions></Dialog>
    <Dialog open={dialog === 'filter'} onClose={() => setDialog(undefined)} fullWidth maxWidth="sm"><DialogTitle>Filter Info</DialogTitle><DialogContent><Stack gap={2}>{Object.entries(thermostat.filters ?? {}).map(([type, value]) => { const appearance = filterAppearance(type); return <Box key={type}><Stack direction="row" alignItems="center" gap={.75} mb={1}><appearance.Icon size={24} /><Typography fontWeight={600}>{appearance.title}</Typography></Stack><Box sx={{ bgcolor: colors.gray.light, color: colors.slate.dark, p: 2, borderRadius: 1 }}><InfoGrid fields={filterDetails(value)} /></Box></Box>; })}</Stack></DialogContent><DialogActions><Button onClick={() => setDialog(undefined)}>Close</Button></DialogActions></Dialog>
    <Dialog open={dialog === 'weather'} onClose={() => setDialog(undefined)} fullWidth maxWidth="sm"><DialogTitle>Weather</DialogTitle><DialogContent><Stack direction="row" alignItems="center" gap={2} mb={2}><WeatherIcon size={64} color={weatherColor} strokeWidth={1.5} /><Box><Stack direction="row" alignItems="baseline" gap={1}><Typography sx={{ fontSize: 24 }}>{formatTemperature(thermostat.weather?.temperature, thermostat.temperature_unit, 0)}</Typography><Typography sx={{ fontSize: 18 }}>{titleCase(thermostat.weather?.condition ?? 'unknown')}</Typography></Stack><Typography color="text.secondary">Low: {temperature(Number(thermostat.weather?.temperature_low), 0)}&nbsp;&nbsp; High: {temperature(Number(thermostat.weather?.temperature_high), 0)}</Typography></Box></Stack><InfoGrid fields={[{ name: 'Humidity', value: `${thermostat.weather?.humidity_relative}%` }, { name: 'Dew Point', value: formatTemperature(Number(thermostat.weather?.dew_point), thermostat.temperature_unit, 0) }, { name: 'Wind', value: windLabel(Number(thermostat.weather?.wind_speed), Number(thermostat.weather?.wind_bearing)) }, { name: 'Pressure', value: `${thermostat.weather?.barometric_pressure}mb` }]} /></DialogContent><DialogActions><Button onClick={() => setDialog(undefined)}>Close</Button></DialogActions></Dialog>
  </DashboardCard>;
});
