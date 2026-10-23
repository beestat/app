import { Box, Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { config } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export function DownloadPage() {
  const { thermostatId, thermostat } = useDashboard();
  const [begin, setBegin] = useState(isoDate(new Date()));
  const [end, setEnd] = useState(isoDate(new Date()));
  const preset = (days: number) => { setEnd(isoDate(new Date())); setBegin(isoDate(new Date(Date.now() - days * 86_400_000))); };
  const download = () => { const args = { thermostat_id: thermostatId, download_begin: new Date(`${begin}T00:00:00`).toISOString(), download_end: new Date(`${end}T23:55:00`).toISOString() }; window.location.assign(`${config.apiBase}?resource=runtime&method=download&arguments=${encodeURIComponent(JSON.stringify(args))}&api_key=${encodeURIComponent(config.apiKey)}`); };
  return <Box py={2}><DashboardCard title="Download Data" subheader={thermostat?.name}><Typography color="text.secondary">Beestat stores up to the past year of raw thermostat logs. Select a date range to download.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={2} my={2}><TextField type="date" label="Begin" value={begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack><ButtonGroup sx={{ mb: 2, flexWrap: 'wrap' }}><Button onClick={() => preset(0)}>Today</Button><Button onClick={() => preset(1)}>Yesterday</Button><Button onClick={() => preset(7)}>Past Week</Button><Button onClick={() => preset(31)}>Past Month</Button><Button onClick={() => { setBegin(isoDate(new Date(thermostat?.data_begin ?? Date.now() - 365 * 86_400_000))); setEnd(isoDate(new Date())); }}>All Time</Button></ButtonGroup><Box><Button variant="contained" color="success" startIcon={<Download />} disabled={!thermostatId || !begin || !end} onClick={download}>Download</Button></Box></DashboardCard></Box>;
}
