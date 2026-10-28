import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Radio, RadioGroup, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiBatch, apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { CardHelpMenu } from '../components/common/CardHelpMenu';
import { useDashboard } from '../state/DashboardContext';

function readNested(source: Record<string, any>, path: string, fallback: unknown) {
  return path.split('.').reduce<any>((value, part) => value?.[part], source) ?? fallback;
}

function formatUtcDate(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function RadioMark({ checked = false }: { checked?: boolean }) {
  return <Box sx={{ width: 20, height: 20, border: '1px solid', borderColor: 'text.secondary', borderRadius: '3px', display: 'grid', placeItems: 'center', '&::after': checked ? { content: '""', width: 11, height: 11, borderRadius: '2px', bgcolor: 'primary.main' } : undefined }} />;
}

export function SettingsPage() {
  const { data, thermostat, refresh } = useDashboard();
  const settings = data?.user?.settings ?? {};
  const profileKey = `thermostat.${thermostat?.thermostat_id}.profile`;
  const [values, setValues] = useState({
    dock: Boolean(readNested(settings, 'ui.always_dock_tooltips', false)),
    gap: Boolean(settings.runtime_thermostat_summary_gap_fill ?? true),
    scale: Boolean(settings.runtime_thermostat_summary_smart_scale ?? true),
    temperature: String(readNested(settings, 'units.temperature', thermostat?.temperature_unit ?? '°F')).includes('C') ? '°C' : '°F',
    distance: String(readNested(settings, 'units.distance', 'ft')),
    currency: String(readNested(settings, 'units.currency', 'usd')),
    ignoreSolar: Boolean(readNested(settings, `${profileKey}.ignore_solar_gain`, false)),
    profileStart: String(readNested(settings, `${profileKey}.range_begin`, '')),
  });
  const [serial, setSerial] = useState('');
  const [message, setMessage] = useState('');
  const apiSession = useMemo(() => Object.values(data?.session ?? {}).find((session: any) => session.api_user_id != null) as any, [data?.session]);
  const update = async (key: string, value: unknown) => { setMessage('Saving…'); await apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } }); setMessage('Saved'); window.setTimeout(() => setMessage(''), 1800); };
  const updateDistance = async (value: string) => {
    setMessage('Saving…');
    await apiBatch([
      { resource: 'user', method: 'update_setting', alias: 'distance', arguments: { key: 'units.distance', value } },
      { resource: 'user', method: 'update_setting', alias: 'area', arguments: { key: 'units.area', value: `${value}²` } },
    ]);
    setMessage('Saved');
    window.setTimeout(() => setMessage(''), 1800);
  };
  const updateProfileSetting = async (key: string, value: unknown) => {
    await update(key, value);
    if (!thermostat?.thermostat_id) return;
    await apiBatch([
      { resource: 'thermostat', method: 'generate_profile', arguments: { thermostat_id: thermostat.thermostat_id }, clear_cache: true },
      { resource: 'thermostat', method: 'update', arguments: { attributes: { thermostat_id: thermostat.thermostat_id, profile: null } } },
    ]);
    await refresh();
  };
  const addThermostat = async () => { if (serial.length !== 12) return; await apiBatch([{ resource: 'ecobee_thermostat', method: 'create', alias: 'create', arguments: { attributes: { identifier: serial } } }, { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } }]); setSerial(''); await refresh(); };
  const removeThermostat = async (id: number) => { if (!confirm('Remove this thermostat from beestat?')) return; await apiCall({ resource: 'ecobee_thermostat', method: 'update', arguments: { attributes: { ecobee_thermostat_id: id, inactive: 1 } } }); await refresh(); };
  const apiKeyAction = async (method: 'create_api_key' | 'recycle_api_key' | 'delete_api_key') => { if (method !== 'create_api_key' && !confirm(`${method === 'delete_api_key' ? 'Delete' : 'Regenerate'} your API key? Existing integrations will stop working.`)) return; await apiCall({ resource: 'user', method }); await refresh(); };
  return <Box sx={{ display: 'grid', gap: 2, pb: 2, '& .MuiCardContent-root': { pb: '16px !important' }, '& .MuiTextField-root .MuiInputBase-root': { height: 32 } }}>
    <Snackbar open={Boolean(message)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} autoHideDuration={message === 'Saved' ? 1800 : null} onClose={() => setMessage('')}>
      <Alert severity="success" variant="filled" onClose={() => setMessage('')}>{message}</Alert>
    </Snackbar>
    <DashboardCard title="Settings" action={<CardHelpMenu label="Settings" href="https://doc.beestat.io/9d01e7256390473ca8121d4098d91c9d" />} sx={{ minHeight: 607 }}>
      <Typography fontWeight={600}>User Interface</Typography>
      <FormControlLabel control={<Checkbox checked={values.dock} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, dock: value })); void update('ui.always_dock_tooltips', value); }} />} label="Always Dock Tooltips" />
      <Typography fontWeight={600} mt={1.5}>Units</Typography>
      <Stack gap={1} mt={1} alignItems="flex-start">
        <Box><Typography>Temperature</Typography><RadioGroup row value={values.temperature} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, temperature: value })); void update('units.temperature', value); }}><FormControlLabel value="°F" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="°F" /><FormControlLabel value="°C" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="°C" /></RadioGroup></Box>
        <Box><Typography>Distance / Area</Typography><RadioGroup row value={values.distance} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, distance: value })); void updateDistance(value); }}><FormControlLabel value="ft" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="ft / ft²" /><FormControlLabel value="m" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="m / m²" /></RadioGroup></Box>
        <Box><Typography mb={1.5}>Currency</Typography><Select size="small" value={values.currency} inputProps={{ 'aria-label': 'Currency' }} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, currency: value })); void update('units.currency', value); }} sx={{ minWidth: 65 }}>{['usd', 'cad', 'aud', 'gbp'].map((value) => <MenuItem key={value} value={value}>{value.toUpperCase()}</MenuItem>)}</Select></Box>
      </Stack>
      <Typography fontWeight={600} mt={2}>Thermostat Summary</Typography>
      <Stack alignItems="flex-start"><FormControlLabel control={<Checkbox checked={values.gap} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, gap: value })); void update('runtime_thermostat_summary_gap_fill', value); }} />} label="Enable Gap Fill" /><FormControlLabel control={<Checkbox checked={values.scale} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, scale: value })); void update('runtime_thermostat_summary_smart_scale', value); }} />} label="Enable Smart Scale" /></Stack>
      <Typography fontWeight={600} mt={1.5}>Temperature Profiles</Typography>
      <Stack alignItems="flex-start"><FormControlLabel control={<Checkbox checked={values.ignoreSolar} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, ignoreSolar: value })); void updateProfileSetting(`${profileKey}.ignore_solar_gain`, value); }} />} label="Ignore Solar Gain" /><Typography mb={1.5}>Custom Start Date</Typography><TextField size="small" type="date" value={values.profileStart} inputProps={{ 'aria-label': 'Custom Start Date' }} sx={{ width: 205 }} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, profileStart: value })); void updateProfileSetting(`${profileKey}.range_begin`, value || null); }} /></Stack>
    </DashboardCard>
    <DashboardCard title="Manage Thermostats"><Typography mb={2}>Thermostats directly connected to your ecobee account are automatically added and synced. In some cases, shared thermostats cannot be automatically detected. Add them here.</Typography><Typography fontWeight={600} mb={1}>Existing Thermostats</Typography><Stack gap={1}>{Object.values(data?.ecobee_thermostat ?? {}).map((item: any) => <Stack key={item.ecobee_thermostat_id} direction="row" alignItems="center" gap={2}><Typography>{item.name || '(Sync queued)'}</Typography><Typography>{item.identifier}</Typography><IconButton color="error" aria-label={`Remove ${item.name || 'thermostat'}`} onClick={() => void removeThermostat(item.ecobee_thermostat_id)}><Trash2 size={17} /></IconButton></Stack>)}</Stack><Typography fontWeight={600} mt={1} mb={1}>Add Thermostat</Typography><Stack direction="row" gap={2} sx={{ '@media (max-width: 350px)': { flexDirection: 'column' } }}><TextField size="small" placeholder="Serial #" value={serial} inputProps={{ 'aria-label': 'Serial #' }} sx={{ width: 150, flexShrink: 0 }} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} /><Button variant="contained" color="success" sx={{ height: 32, px: 1, whiteSpace: 'nowrap' }} onClick={() => void addThermostat()}>Add Thermostat</Button></Stack></DashboardCard>
    <DashboardCard title="Manage API Key" action={<Button href="https://api.beestat.io/doc" target="_blank">API Documentation</Button>} sx={{ minHeight: { xs: 340, md: 306 } }}><Typography>API keys allow you to access your beestat data programmatically. Keep your API key secure and do not share it publicly.</Typography>{apiSession ? <><Typography fontWeight={600} mt={2}>Your API Key</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1, p: 1.5, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace', overflow: 'hidden' }}><Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{apiSession.session_key}</Box><IconButton aria-label="Copy API key" onClick={() => void navigator.clipboard.writeText(apiSession.session_key)}><Copy /></IconButton></Box>{apiSession.created_at && <Typography variant="caption" color="text.secondary">Created: {formatUtcDate(apiSession.created_at)}</Typography>}<Typography fontWeight={600} mt="31px" mb={.5}>Manage</Typography><Stack direction="row" gap={2}><Button variant="contained" startIcon={<RefreshCw size={18} />} onClick={() => void apiKeyAction('recycle_api_key')}>Regenerate Key</Button><Button variant="contained" color="error" startIcon={<Trash2 size={18} />} onClick={() => void apiKeyAction('delete_api_key')}>Delete Key</Button></Stack></> : <Button sx={{ mt: 2 }} variant="contained" color="success" startIcon={<KeyRound />} onClick={() => void apiKeyAction('create_api_key')}>Create API Key</Button>}</DashboardCard>
  </Box>;
}
