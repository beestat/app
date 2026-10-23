import { Alert, Box, Button, Divider, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiBatch, apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

function readNested(source: Record<string, any>, path: string, fallback: unknown) {
  return path.split('.').reduce<any>((value, part) => value?.[part], source) ?? fallback;
}

export function SettingsPage() {
  const { data, thermostat, refresh } = useDashboard();
  const settings = data?.user?.settings ?? {};
  const profileKey = `thermostat.${thermostat?.thermostat_id}.profile`;
  const [values, setValues] = useState({
    dock: Boolean(readNested(settings, 'ui.always_dock_tooltips', false)),
    gap: Boolean(settings.runtime_thermostat_summary_gap_fill ?? true),
    scale: Boolean(settings.runtime_thermostat_summary_smart_scale ?? true),
    temperature: String(readNested(settings, 'units.temperature', thermostat?.temperature_unit ?? 'F')).replace('°', ''),
    distance: String(readNested(settings, 'units.distance', 'ft')),
    currency: String(readNested(settings, 'units.currency', 'usd')),
    ignoreSolar: Boolean(readNested(settings, `${profileKey}.ignore_solar_gain`, false)),
    profileStart: String(readNested(settings, `${profileKey}.range_begin`, '')),
  });
  const [serial, setSerial] = useState('');
  const [message, setMessage] = useState('');
  const apiSession = useMemo(() => Object.values(data?.session ?? {}).find((session: any) => session.api_user_id != null) as any, [data?.session]);
  const update = async (key: string, value: unknown) => { setMessage('Saving…'); await apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } }); setMessage('Saved'); window.setTimeout(() => setMessage(''), 1800); };
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
  return <Box sx={{ display: 'grid', gap: 2, py: 2 }}>
    {message && <Alert severity="success">{message}</Alert>}
    <DashboardCard title="Settings">
      <Typography fontWeight={600}>User Interface</Typography>
      <FormControlLabel control={<Switch checked={values.dock} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, dock: value })); void update('ui.always_dock_tooltips', value); }} />} label="Always dock tooltips" />
      <Typography fontWeight={600} mt={1.5}>Units</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mt={1}>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Temperature</InputLabel><Select value={values.temperature} label="Temperature" onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, temperature: value })); void update('units.temperature', value); }}><MenuItem value="F">°F</MenuItem><MenuItem value="C">°C</MenuItem></Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Distance / Area</InputLabel><Select value={values.distance} label="Distance / Area" onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, distance: value })); void update('units.distance', value); }}><MenuItem value="ft">ft / ft²</MenuItem><MenuItem value="m">m / m²</MenuItem></Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Currency</InputLabel><Select value={values.currency} label="Currency" onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, currency: value })); void update('units.currency', value); }}>{['usd', 'cad', 'aud', 'gbp'].map((value) => <MenuItem key={value} value={value}>{value.toUpperCase()}</MenuItem>)}</Select></FormControl>
      </Stack>
      <Typography fontWeight={600} mt={2}>Thermostat Summary</Typography>
      <Stack><FormControlLabel control={<Switch checked={values.gap} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, gap: value })); void update('runtime_thermostat_summary_gap_fill', value); }} />} label="Enable Gap Fill" /><FormControlLabel control={<Switch checked={values.scale} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, scale: value })); void update('runtime_thermostat_summary_smart_scale', value); }} />} label="Enable Smart Scale" /></Stack>
      <Typography fontWeight={600} mt={1.5}>Temperature Profiles</Typography>
      <Stack alignItems="flex-start"><FormControlLabel control={<Switch checked={values.ignoreSolar} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, ignoreSolar: value })); void updateProfileSetting(`${profileKey}.ignore_solar_gain`, value); }} />} label="Ignore Solar Gain" /><TextField size="small" type="date" label="Custom Start Date" value={values.profileStart} InputLabelProps={{ shrink: true }} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, profileStart: value })); void updateProfileSetting(`${profileKey}.range_begin`, value || null); }} /></Stack>
    </DashboardCard>
    <DashboardCard title="Manage Thermostats"><Typography color="text.secondary" mb={2}>Thermostats connected to your ecobee account are automatically added and synced.</Typography><Stack gap={1}>{Object.values(data?.ecobee_thermostat ?? {}).map((item: any) => <Stack key={item.ecobee_thermostat_id} direction="row" alignItems="center" gap={2} sx={{ bgcolor: 'background.default', p: 1.25, borderRadius: 1 }}><Box flex={1}><Typography>{item.name || '(Sync queued)'}</Typography><Typography variant="caption" color="text.secondary">{item.identifier}</Typography></Box><Button color="error" startIcon={<Trash2 size={17} />} onClick={() => void removeThermostat(item.ecobee_thermostat_id)}>Remove</Button></Stack>)}</Stack><Divider sx={{ my: 2 }} /><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField size="small" label="12-digit serial number" value={serial} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} /><Button variant="contained" color="success" disabled={serial.length !== 12} startIcon={<Plus />} onClick={() => void addThermostat()}>Add Thermostat</Button></Stack></DashboardCard>
    <DashboardCard title="Manage API Key" action={<Button href="https://api.beestat.io/doc" target="_blank">API Documentation</Button>}><Typography color="text.secondary">API keys allow programmatic access to your beestat data. Keep yours secure.</Typography>{apiSession ? <><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1, fontFamily: 'monospace', overflow: 'hidden' }}><Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{apiSession.session_key}</Box><Button startIcon={<Copy />} onClick={() => void navigator.clipboard.writeText(apiSession.session_key)}>Copy</Button></Box><Stack direction="row" gap={1}><Button startIcon={<RefreshCw />} onClick={() => void apiKeyAction('recycle_api_key')}>Regenerate</Button><Button color="error" startIcon={<Trash2 />} onClick={() => void apiKeyAction('delete_api_key')}>Delete</Button></Stack></> : <Button sx={{ mt: 2 }} variant="contained" color="success" startIcon={<KeyRound />} onClick={() => void apiKeyAction('create_api_key')}>Create API Key</Button>}</DashboardCard>
  </Box>;
}
