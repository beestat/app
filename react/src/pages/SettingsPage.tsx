import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Radio, RadioGroup, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { ChartSpline, Copy, KeyRound, Palette, RefreshCw, Ruler, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiBatch, apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { CardHelpMenu } from '../components/common/CardHelpMenu';
import { ManageThermostatsCard } from '../components/settings/ManageThermostatsCard';
import { ThemePicker } from '../components/settings/ThemePicker';
import { useDashboard } from '../state/DashboardContext';

const compactCardContent = { pb: 2, '&:last-child': { pb: 2 } } as const;

function SettingsTitle({ icon: Icon, children }: { icon: typeof Palette; children: string }) {
  return <Stack direction="row" alignItems="center" gap={1}><Icon size={18} aria-hidden /><span>{children}</span></Stack>;
}

function readNested(source: Record<string, any>, path: string, fallback: unknown) {
  return path.split('.').reduce<any>((value, part) => value?.[part], source) ?? fallback;
}

function formatUtcDate(value: string) {
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function RadioMark({ checked = false }: { checked?: boolean }) {
  return <Box sx={{ width: 18, height: 18, border: '1px solid', borderColor: checked ? 'primary.main' : 'text.secondary', borderRadius: '50%', display: 'grid', placeItems: 'center', transition: 'border-color 160ms ease', '&::after': checked ? { content: '""', width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main' } : undefined }} />;
}

export function SettingsPage() {
  const { data, thermostat, refresh, setDashboardSetting } = useDashboard();
  const settings = data?.user?.settings ?? {};
  const profileKey = `thermostat.${thermostat?.thermostat_id}.profile`;
  const resolvedValues = useMemo(() => ({
    theme: String(readNested(settings, 'ui.theme', 'beestat')),
    highContrast: Boolean(readNested(settings, 'ui.high_contrast', false)),
    dock: Boolean(readNested(settings, 'ui.always_dock_tooltips', false)),
    gap: Boolean(settings.runtime_thermostat_summary_gap_fill ?? true),
    scale: Boolean(settings.runtime_thermostat_summary_smart_scale ?? true),
    temperature: String(readNested(settings, 'units.temperature', thermostat?.temperature_unit ?? '°F')).includes('C') ? '°C' : '°F',
    distance: String(readNested(settings, 'units.distance', 'ft')),
    currency: String(readNested(settings, 'units.currency', 'usd')),
    ignoreSolar: Boolean(readNested(settings, `${profileKey}.ignore_solar_gain`, false)),
    profileStart: String(readNested(settings, `${profileKey}.range_begin`, '')),
  }), [data?.user?.settings, profileKey, thermostat?.temperature_unit]);
  const [values, setValues] = useState(resolvedValues);
  useEffect(() => { setValues(resolvedValues); }, [resolvedValues]);
  const [message, setMessage] = useState('');
  const apiSession = useMemo(() => Object.values(data?.session ?? {}).find((session: any) => session.api_user_id != null) as any, [data?.session]);
  const update = async (key: string, value: unknown) => { setMessage('Saving…'); await apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } }); setDashboardSetting(key, value); setMessage('Saved'); window.setTimeout(() => setMessage(''), 1800); };
  const updateDistance = async (value: string) => {
    setMessage('Saving…');
    await apiBatch([
      { resource: 'user', method: 'update_setting', alias: 'distance', arguments: { key: 'units.distance', value } },
      { resource: 'user', method: 'update_setting', alias: 'area', arguments: { key: 'units.area', value: `${value}²` } },
    ]);
    setDashboardSetting('units.distance', value);
    setDashboardSetting('units.area', `${value}²`);
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
  const apiKeyAction = async (method: 'create_api_key' | 'recycle_api_key' | 'delete_api_key') => {
    const confirmation = method === 'recycle_api_key'
      ? 'Regenerating your API key will invalidate the current key. Any applications using the old key will stop working. Continue?'
      : 'Are you sure you want to delete your API key? This cannot be undone.';
    if (method !== 'create_api_key' && !confirm(confirmation)) return;
    await apiCall({ resource: 'user', method });
    await refresh();
  };
  return <Box sx={{ display: 'grid', gap: 2, pb: 2, '& .MuiTextField-root .MuiInputBase-root': { height: 32 } }}>
    <Snackbar open={Boolean(message)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} autoHideDuration={message === 'Saved' ? 1800 : null} onClose={() => setMessage('')}>
      <Alert severity="success" variant="filled" onClose={() => setMessage('')}>{message}</Alert>
    </Snackbar>
    <Stack direction="row" alignItems="center" justifyContent="space-between" px={{ xs: .5, sm: 1 }}>
      <Box><Typography variant="h5" component="h1">Settings</Typography><Typography color="text.secondary">Personalize beestat and manage your connected account.</Typography></Box>
      <CardHelpMenu label="Settings" href="https://doc.beestat.io/9d01e7256390473ca8121d4098d91c9d" />
    </Stack>
    <DashboardCard title={<SettingsTitle icon={Palette}>Appearance</SettingsTitle>} subheader="Choose a base palette, then optionally increase contrast." contentSx={compactCardContent}>
      <ThemePicker value={values.theme} highContrast={values.highContrast} onChange={(value) => { setValues((old) => ({ ...old, theme: value })); void update('ui.theme', value); }} onHighContrastChange={(value) => { setValues((old) => ({ ...old, highContrast: value })); void update('ui.high_contrast', value); }} />
    </DashboardCard>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, alignItems: 'stretch' }}>
      <DashboardCard title={<SettingsTitle icon={SlidersHorizontal}>Interface</SettingsTitle>} subheader="Control chart and summary behavior." contentSx={compactCardContent}>
        <Stack alignItems="flex-start" gap={.25}><FormControlLabel control={<Checkbox checked={values.dock} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, dock: value })); void update('ui.always_dock_tooltips', value); }} />} label="Always Dock Tooltips" /><Typography variant="overline" color="text.secondary" mt={1.25}>Thermostat Summary</Typography><FormControlLabel control={<Checkbox checked={values.gap} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, gap: value })); void update('runtime_thermostat_summary_gap_fill', value); }} />} label="Enable Gap Fill" /><FormControlLabel control={<Checkbox checked={values.scale} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, scale: value })); void update('runtime_thermostat_summary_smart_scale', value); }} />} label="Enable Smart Scale" /></Stack>
      </DashboardCard>
      <DashboardCard title={<SettingsTitle icon={Ruler}>Units</SettingsTitle>} subheader="Set measurements used throughout beestat." contentSx={compactCardContent}>
        <Stack gap={1.25} alignItems="flex-start"><Box><Typography variant="overline" color="text.secondary">Temperature</Typography><RadioGroup row value={values.temperature} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, temperature: value })); void update('units.temperature', value); }}><FormControlLabel value="°F" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="°F" /><FormControlLabel value="°C" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="°C" /></RadioGroup></Box><Box><Typography variant="overline" color="text.secondary">Distance / Area</Typography><RadioGroup row value={values.distance} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, distance: value })); void updateDistance(value); }}><FormControlLabel value="ft" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="ft / ft²" /><FormControlLabel value="m" control={<Radio icon={<RadioMark />} checkedIcon={<RadioMark checked />} />} label="m / m²" /></RadioGroup></Box><Box><Typography variant="overline" color="text.secondary" display="block" mb={.75}>Currency</Typography><Select size="small" value={values.currency} inputProps={{ 'aria-label': 'Currency' }} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, currency: value })); void update('units.currency', value); }} sx={{ minWidth: 90 }}>{['usd', 'cad', 'aud', 'gbp'].map((value) => <MenuItem key={value} value={value}>{value.toUpperCase()}</MenuItem>)}</Select></Box></Stack>
      </DashboardCard>
      <DashboardCard title={<SettingsTitle icon={ChartSpline}>Temperature Profiles</SettingsTitle>} subheader="Fine-tune how your home's thermal profile is calculated." contentSx={compactCardContent}>
        <Stack alignItems="flex-start"><FormControlLabel control={<Checkbox checked={values.ignoreSolar} onChange={(event) => { const value = event.target.checked; setValues((old) => ({ ...old, ignoreSolar: value })); void updateProfileSetting(`${profileKey}.ignore_solar_gain`, value); }} />} label="Ignore Solar Gain" /><Typography variant="overline" color="text.secondary" mt={1.25} mb={.75}>Custom Start Date</Typography><TextField size="small" type="date" value={values.profileStart} inputProps={{ 'aria-label': 'Custom Start Date' }} sx={{ width: '100%', maxWidth: 205 }} onChange={(event) => { const value = event.target.value; setValues((old) => ({ ...old, profileStart: value })); void updateProfileSetting(`${profileKey}.range_begin`, value || null); }} /><Typography variant="caption" color="text.secondary" mt={1}>Changing profile inputs regenerates your temperature profile.</Typography></Stack>
      </DashboardCard>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2, alignItems: 'stretch' }}>
      <ManageThermostatsCard />
      <DashboardCard title={<SettingsTitle icon={KeyRound}>Manage API Key</SettingsTitle>} action={<Button href="https://api.beestat.io/doc" target="_blank">Documentation</Button>} contentSx={compactCardContent}><Typography color="text.secondary">API keys allow you to access your beestat data programmatically. Keep your key secure and do not share it publicly.</Typography>{apiSession ? <><Typography fontWeight={600} mt={2}>Your API Key</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1, p: 1.5, bgcolor: 'surface.subtle', border: '1px solid', borderColor: 'divider', borderRadius: 1, fontFamily: 'monospace', overflow: 'hidden' }}><Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{apiSession.session_key}</Box><IconButton aria-label="Copy API key" onClick={() => void navigator.clipboard.writeText(apiSession.session_key)}><Copy /></IconButton></Box>{apiSession.created_at && <Typography variant="caption" color="text.secondary">Created: {formatUtcDate(apiSession.created_at)}</Typography>}<Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mt={2}><Button variant="contained" startIcon={<RefreshCw size={18} />} onClick={() => void apiKeyAction('recycle_api_key')}>Regenerate Key</Button><Button variant="outlined" color="error" startIcon={<Trash2 size={18} />} onClick={() => void apiKeyAction('delete_api_key')}>Delete Key</Button></Stack></> : <Button sx={{ mt: 2 }} variant="contained" color="success" startIcon={<KeyRound />} onClick={() => void apiKeyAction('create_api_key')}>Create API Key</Button>}</DashboardCard>
    </Box>
  </Box>;
}
