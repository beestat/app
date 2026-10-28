import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

export function NoThermostatsPage() {
  const { data, refresh } = useDashboard();
  const [serial, setSerial] = useState('');
  const [busy, setBusy] = useState(false);
  const thermostats = useMemo(() => Object.values(data?.ecobee_thermostat ?? {}).sort((a: any, b: any) => String(a.name ?? '').localeCompare(String(b.name ?? ''))), [data?.ecobee_thermostat]);
  const add = async () => {
    if (serial.length !== 12) return;
    setBusy(true);
    try {
      await apiBatch([{ resource: 'ecobee_thermostat', method: 'create', alias: 'create', arguments: { attributes: { identifier: serial } } }, { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } }]);
      await refresh();
    } finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    setBusy(true);
    try {
      await apiBatch([{ resource: 'ecobee_thermostat', method: 'update', alias: 'delete', arguments: { attributes: { ecobee_thermostat_id: id, inactive: 1 } } }, { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } }]);
      await refresh();
    } finally { setBusy(false); }
  };
  return <Box sx={{ pb: 2 }}><DashboardCard title="Manage Thermostats"><Typography paragraph>Thermostats directly connected to your ecobee account are automatically added and synced. In some cases, shared thermostats cannot be automatically detected. Add them here.</Typography><Typography fontWeight={600} mb={1}>Existing Thermostats</Typography><Stack gap={1} mb={2}>{thermostats.map((item: any) => <Stack key={item.ecobee_thermostat_id} direction="row" alignItems="center" gap={2}><Typography>{item.name || '(Sync Queued)'}</Typography><Typography>{item.identifier}</Typography><IconButton color="error" disabled={busy} aria-label={`Remove ${item.name || 'thermostat'}`} onClick={() => void remove(item.ecobee_thermostat_id)}><Trash2 size={17} /></IconButton></Stack>)}</Stack><Typography fontWeight={600} mb={1}>Add Thermostat</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField size="small" label="Serial #" value={serial} slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12 } }} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} /><Button color="success" variant="contained" disabled={busy} startIcon={<Plus />} onClick={() => void add()}>Add Thermostat</Button></Stack></DashboardCard></Box>;
}
