import { Alert, Box, Button, ButtonGroup, Stack, TextField, Typography } from '@mui/material';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { config } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const day = (offset = 0) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset); return date; };
export function DownloadPage() {
  const { thermostatId, thermostat } = useDashboard();
  const [begin, setBegin] = useState(isoDate(new Date()));
  const [end, setEnd] = useState(isoDate(new Date()));
  const platform = new URLSearchParams(window.location.search).get('platform');
  const nativeApp = platform === 'ios' || platform === 'android';
  const choose = (start: Date, finish: Date) => { setBegin(isoDate(start)); setEnd(isoDate(finish)); };
  const today = day();
  const thisWeek = day(-today.getDay());
  const lastWeek = day(-today.getDay() - 7);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const allTime = new Date(Math.max(new Date(thermostat?.data_begin ?? 0).getTime(), day(-365).getTime()));
  const presets: Array<[string, Date, Date]> = [['Today', today, today], ['Yesterday', day(-1), day(-1)], ['This Week', thisWeek, today], ['Last Week', lastWeek, day(-today.getDay() - 1)], ['This Month', thisMonth, today], ['Last Month', lastMonth, lastMonthEnd], ['All Time', allTime, today]];
  const download = () => { const [start, finish] = begin <= end ? [begin, end] : [end, begin]; const args = { thermostat_id: thermostatId, download_begin: new Date(`${start}T00:00:00`).toISOString(), download_end: new Date(`${finish}T23:55:00`).toISOString() }; window.location.assign(`${config.apiBase}?resource=runtime&method=download&arguments=${encodeURIComponent(JSON.stringify(args))}&api_key=${encodeURIComponent(config.apiKey)}`); };
  return <Box py={2}><DashboardCard title="Download Data" subheader={thermostat?.name}><Typography color="text.secondary">Beestat stores, at most, the past year of raw thermostat logs. Select a date range to download.</Typography><Typography variant="overline" display="block" mt={2}>Date Range</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={2} my={1}><TextField type="date" label="Begin" value={begin} error={!begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="End" value={end} error={!end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack><Typography variant="overline" display="block" mt={2}>Presets</Typography><ButtonGroup sx={{ mb: 2, flexWrap: 'wrap' }}>{presets.map(([label, start, finish]) => <Button key={label} variant={begin === isoDate(start) && end === isoDate(finish) ? 'contained' : 'outlined'} onClick={() => choose(start, finish)}>{label}</Button>)}</ButtonGroup>{nativeApp && <Alert severity="error" sx={{ mb: 2 }}>Download Data is only available directly in a browser.</Alert>}<Box><Button variant="contained" color="success" startIcon={<Download />} disabled={nativeApp || !thermostatId || !begin || !end} onClick={download}>Download</Button></Box></DashboardCard></Box>;
}
