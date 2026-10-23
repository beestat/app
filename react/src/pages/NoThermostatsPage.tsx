import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { apiBatch, config } from '../api/client';
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
  const reconnect = () => window.location.assign(`${config.apiBase}?resource=ecobee&method=authorize&arguments=%7B%7D&api_key=${encodeURIComponent(config.apiKey)}`);
  return <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}><DashboardCard title="Manage Thermostats"><Typography paragraph>Thermostats directly connected to your ecobee account are automatically added and synced. Reconnect ecobee, or add a shared thermostat by serial number.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button variant="contained" startIcon={<RefreshCw />} onClick={reconnect}>Reconnect ecobee</Button><TextField size="small" label="12-digit serial number" value={serial} onChange={(event) => setSerial(event.target.value.replace(/\D/g, '').slice(0, 12))} /><Button color="success" variant="contained" disabled={busy || serial.length !== 12} startIcon={<Plus />} onClick={() => void add()}>Add</Button></Stack></DashboardCard></Box>;
}
