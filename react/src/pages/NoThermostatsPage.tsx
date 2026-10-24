import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { apiBatch } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

export function NoThermostatsPage() {
  const { refresh } = useDashboard();
  const [serial, setSerial] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (serial.length !== 12) return;
    setBusy(true);
    try {
      await apiBatch([{ resource: 'ecobee_thermostat', method: 'create', alias: 'create', arguments: { attributes: { identifier: serial } } }, { resource: 'ecobee_thermostat', method: 'read_id', alias: 'read_id', arguments: { attributes: { inactive: 0 } } }]);
      await refresh();
    } finally { setBusy(false); }
  };
  return <Box sx={{ pb: 2 }}><DashboardCard title="Manage Thermostats"><Typography paragraph>Thermostats directly connected to your ecobee account are automatically added and synced. In some cases, shared thermostats cannot be automatically detected. Add them here.</Typography><Typography fontWeight={600} mb={1}>Existing Thermostats</Typography><Typography color="text.secondary" mb={2}>No thermostats are currently connected.</Typography><Typography fontWeight={600} mb={1}>Add Thermostat</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField size="small" label="Serial #" value={serial} inputProps={{ inputMode: 'numeric', maxLength: 12 }} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} /><Button color="success" variant="contained" disabled={busy || serial.length !== 12} startIcon={<Plus />} onClick={() => void add()}>Add Thermostat</Button></Stack></DashboardCard></Box>;
}
