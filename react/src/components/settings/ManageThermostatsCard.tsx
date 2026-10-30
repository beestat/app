import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiBatch } from '../../api/client';
import { useDashboard } from '../../state/DashboardContext';
import { DashboardCard } from '../common/DashboardCard';

/** The exact legacy Manage Thermostats card, shared by both app states. */
export function ManageThermostatsCard() {
  const { data, refresh } = useDashboard();
  const [serial, setSerial] = useState('');
  const [busy, setBusy] = useState(false);
  const thermostats = useMemo(() => Object.values(data?.ecobee_thermostat ?? {})
    .sort((left: any, right: any) => String(left.name ?? '').localeCompare(String(right.name ?? ''))), [data?.ecobee_thermostat]);

  const add = async () => {
    if (serial.length !== 12 || busy) return;
    setBusy(true);
    try {
      await apiBatch([
        { resource: 'ecobee_thermostat', method: 'create', alias: 'create', arguments: { attributes: { identifier: serial } } },
        { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } },
      ]);
      setSerial('');
      await refresh();
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiBatch([
        { resource: 'ecobee_thermostat', method: 'update', alias: 'delete', arguments: { attributes: { ecobee_thermostat_id: id, inactive: 1 } } },
        { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } },
      ]);
      await refresh();
    } finally { setBusy(false); }
  };

  return <DashboardCard title="Manage Thermostats">
    <Typography mb={2}>Thermostats directly connected to your ecobee account are automatically added and synced. In some cases, shared thermostats cannot be automatically detected. Add them here.</Typography>
    <Typography fontWeight={600} mb={1}>Existing Thermostats</Typography>
    <Stack gap={1}>{thermostats.map((item: any) => <Stack key={item.ecobee_thermostat_id} direction="row" alignItems="center" gap={2}>
      <Typography>{item.name || '(Sync Queued)'}</Typography>
      <Typography>{item.identifier}</Typography>
      <IconButton color="error" disabled={busy} aria-label={`Remove ${item.name || 'thermostat'}`} onClick={() => void remove(item.ecobee_thermostat_id)}><Trash2 size={17} /></IconButton>
    </Stack>)}</Stack>
    <Typography fontWeight={600} mt={1} mb={1}>Add Thermostat</Typography>
    <Stack direction="row" gap={2} sx={{ '@media (max-width: 350px)': { flexDirection: 'column' } }}>
      <TextField size="small" placeholder="Serial #" value={serial} disabled={busy} slotProps={{ htmlInput: { 'aria-label': 'Serial #', inputMode: 'numeric' } }} sx={{ width: 150, flexShrink: 0 }} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} />
      <Button variant="contained" color="success" disabled={busy || serial.length !== 12} sx={{ height: 32, px: 1, whiteSpace: 'nowrap' }} onClick={() => void add()}>Add Thermostat</Button>
    </Stack>
  </DashboardCard>;
}
