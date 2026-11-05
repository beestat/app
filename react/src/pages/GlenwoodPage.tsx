import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { apiBatch, config } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { calendarDayDistance } from '../utils/date';

const settingCall = (key: string, value: unknown, alias: string) => ({
  resource: 'user', method: 'update_setting', alias, arguments: { key, value },
});

export function GlenwoodEnrollmentPage() {
  const { data, refresh } = useDashboard();
  const settings = data?.user?.settings ?? {};
  const thermostats = useMemo(() => Object.values(data?.thermostat ?? {}).sort((a, b) => a.name.localeCompare(b.name)), [data?.thermostat]);
  const enrolled = settings.glenwood_enrolled === true;
  const [name, setName] = useState(String(settings.glenwood_name ?? ''));
  const [unit, setUnit] = useState(String(settings.glenwood_unit ?? ''));
  const [selected, setSelected] = useState<number[]>(() => Array.isArray(settings.glenwood_thermostat_ids)
    ? settings.glenwood_thermostat_ids.map(Number)
    : thermostats.map((thermostat) => thermostat.thermostat_id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || !unit.trim() || selected.length === 0) {
      setError('Name, Unit #, and at least one thermostat are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      await apiBatch([
        settingCall('glenwood_enrolled', true, 'enrolled'),
        settingCall('glenwood_name', name.trim(), 'name'),
        settingCall('glenwood_unit', unit.trim(), 'unit'),
        settingCall('glenwood_thermostat_ids', selected, 'thermostats'),
        settingCall('glenwood_enrolled_at', new Date().toISOString(), 'enrolled_at'),
      ]);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to enroll.');
    } finally { setSaving(false); }
  };

  const unenroll = async () => {
    setSaving(true); setError('');
    try {
      await apiBatch([
        settingCall('glenwood_enrolled', false, 'enrolled'),
        settingCall('glenwood_name', null, 'name'),
        settingCall('glenwood_unit', null, 'unit'),
        settingCall('glenwood_thermostat_ids', null, 'thermostats'),
        settingCall('glenwood_enrolled_at', null, 'enrolled_at'),
      ]);
      setName(''); setUnit(''); setSelected(thermostats.map((thermostat) => thermostat.thermostat_id));
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to unenroll.');
    } finally { setSaving(false); }
  };

  const visibleThermostats = enrolled ? thermostats.filter((thermostat) => selected.includes(thermostat.thermostat_id)) : thermostats;
  return <Box sx={{ display: 'grid', gap: 2, pb: 2 }}>
    <DashboardCard title="Privacy" sx={{ minHeight: 275 }}><Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
      <Typography paragraph>By enrolling, you agree to share certain thermostat data from your beestat account with Glenwood Condominium and its management company. This data will be used only for program administration, energy management, and related reporting.</Typography>
      <Box component="ul" sx={{ pl: '53px', my: 2 }}>
        <li><strong>What is shared:</strong> Runtime summaries and temperature averages, as needed by Glenwood Condominium for its reporting.</li>
        <li><strong>What is not shared:</strong> Specific occupancy data, your personal account credentials, email address, or other unrelated personal information.</li>
        <li><strong>Control:</strong> You may unenroll at any time through your beestat account, which will stop all future sharing.</li>
      </Box>
      <Typography>Beestat will not sell your data, and data shared with Glenwood Condominium will not be disclosed to other parties except as required by law.</Typography>
    </Box></DashboardCard>
    <DashboardCard title="Enrollment" sx={{ minHeight: 285 }}>
      <Typography sx={{ color: enrolled ? 'success.main' : 'error.main', mb: 2 }}>{enrolled ? 'You are currently enrolled.' : 'You are not currently enrolled.'}</Typography>
      <Stack direction="row" gap={2} mb={2}>
        <TextField size="small" label="Name" value={name} disabled={enrolled || saving} inputProps={{ maxLength: 64 }} sx={{ minWidth: 0, width: { xs: 'calc((100% - 16px) / 2)', sm: 185 } }} onChange={(event) => setName(event.target.value)} />
        <TextField size="small" label="Unit #" value={unit} disabled={enrolled || saving} inputProps={{ maxLength: 16 }} sx={{ minWidth: 0, width: { xs: 'calc((100% - 16px) / 2)', sm: 185 } }} onChange={(event) => setUnit(event.target.value)} />
      </Stack>
      <Typography fontWeight={600} mb={.5}>{enrolled ? 'Enrolled Thermostats' : 'Thermostats to Enroll'}</Typography>
      <Stack alignItems="flex-start" mb={2}>{visibleThermostats.map((thermostat) => <FormControlLabel key={thermostat.thermostat_id} label={thermostat.name} control={<Checkbox checked={selected.includes(thermostat.thermostat_id)} disabled={enrolled || saving} onChange={(event) => setSelected((current) => event.target.checked ? [...current, thermostat.thermostat_id] : current.filter((id) => id !== thermostat.thermostat_id))} />} />)}</Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box textAlign="right"><Button variant="contained" color={enrolled ? 'error' : 'success'} disabled={saving} onClick={() => void (enrolled ? unenroll() : save())}>{saving ? 'Saving…' : enrolled ? 'Unenroll' : 'Enroll'}</Button></Box>
    </DashboardCard>
  </Box>;
}

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Parse as UTC so the round trip below holds in every time zone; rolled-over dates like 02-30 fail it.
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function GlenwoodReportPage() {
  const [begin, setBegin] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const run = () => {
    if (!begin || !end) { setError('Both begin and end dates are required.'); return; }
    if (!validIsoDate(begin) || !validIsoDate(end)) { setError('Both dates must be valid.'); return; }
    // These are calendar dates, not elapsed instants. Local-midnight elapsed
    // time can be 23/25 hours across DST and differs from Moment's diff(days).
    const days = calendarDayDistance(begin, end);
    if (days > 366) { setError('Maximum range is one year.'); return; }
    setError('');
    const args = encodeURIComponent(JSON.stringify({ download_begin: begin, download_end: end }));
    window.location.assign(`${config.apiBase}?resource=runtime&method=download_glenwood_report&arguments=${args}&api_key=${encodeURIComponent(config.apiKey)}`);
  };
  return <Box pb={2}><DashboardCard title="Run Report" sx={{ minHeight: 195 }}>
    <Stack direction="row" gap={2} mt="13px" mb={2}>
      <TextField size="small" type="date" label="Begin Date" value={begin} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 0, width: 110 }} onChange={(event) => setBegin(event.target.value)} />
      <TextField size="small" type="date" label="End Date" value={end} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 0, width: 110 }} onChange={(event) => setEnd(event.target.value)} />
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <Box textAlign="right"><Button variant="contained" color="success" onClick={run}>Run</Button></Box>
  </DashboardCard></Box>;
}
