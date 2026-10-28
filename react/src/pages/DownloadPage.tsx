import { Alert, Box, Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { config } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { isoDate, localTimestamp } from './downloadDates';

const day = (offset = 0) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset); return date; };

export function downloadUrl(thermostatId: number, begin: string, end: string) {
  const [start, finish] = begin <= end ? [begin, end] : [end, begin];
  const args = {
    thermostat_id: thermostatId,
    download_begin: localTimestamp(start, 0, 0),
    download_end: localTimestamp(finish, 23, 55),
  };
  return `${config.apiBase}?resource=runtime&method=download&arguments=${encodeURIComponent(JSON.stringify(args))}&api_key=${encodeURIComponent(config.apiKey)}`;
}

function DownloadData({ dialog, onClose }: { dialog?: boolean; onClose?: () => void }) {
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
  const oneYearAgo = new Date(today); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const allTime = new Date(Math.max(new Date(thermostat?.data_begin ?? 0).getTime(), oneYearAgo.getTime()));
  const presets: Array<[string, Date, Date]> = [['Today', today, today], ['Yesterday', day(-1), day(-1)], ['This Week', thisWeek, today], ['Last Week', lastWeek, day(-today.getDay() - 1)], ['This Month', thisMonth, today], ['Last Month', lastMonth, lastMonthEnd], ['All Time', allTime, today]];
  const valid = Boolean(thermostatId && begin && end);
  const download = () => { if (!thermostatId || !begin || !end) return; window.location.assign(downloadUrl(thermostatId, begin, end)); };
  const fields = <>
    <Typography color="text.secondary">Beestat stores, at most, the past year of raw thermostat logs. Select a date range to download.</Typography>
    <Typography variant="overline" display="block" mt={2}>Date Range</Typography>
    <Stack direction="row" gap={1} my={1} alignItems="center" flexWrap="wrap">
      <TextField size="small" type="date" value={begin} error={!begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Begin date' } }} sx={{ width: 160 }} />
      <Typography color="text.secondary">to</Typography>
      <TextField size="small" type="date" value={end} error={!end} onChange={(event) => setEnd(event.target.value)} slotProps={{ htmlInput: { 'aria-label': 'End date' } }} sx={{ width: 160 }} />
    </Stack>
    {!begin && <Typography color="error">Invalid begin date.</Typography>}
    {!end && <Typography color="error">Invalid end date.</Typography>}
    <Typography variant="overline" display="block" mt={2}>Presets</Typography>
    <ButtonGroup sx={{ mb: 2, flexWrap: 'wrap', '& .MuiButtonGroup-grouped': { borderRadius: 0 } }}>
      {presets.map(([label, start, finish]) => <Button key={label} variant={begin === isoDate(start) && end === isoDate(finish) ? 'contained' : 'outlined'} onClick={() => choose(start, finish)}>{label}</Button>)}
    </ButtonGroup>
    {nativeApp && <Alert severity="error">Download Data is only available directly in a browser.</Alert>}
  </>;

  if (dialog) return <Dialog open onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>Download Data</DialogTitle><DialogContent dividers>{fields}</DialogContent><DialogActions><Button color="inherit" onClick={onClose}>Cancel</Button><Button variant="contained" color="success" startIcon={<Download />} disabled={nativeApp || !valid} onClick={download}>Download</Button></DialogActions></Dialog>;
  return <Box py={2}><DashboardCard title="Download Data" subheader={thermostat?.name}>{fields}<Box mt={1}><Button variant="contained" color="success" startIcon={<Download />} disabled={nativeApp || !valid} onClick={download}>Download</Button></Box></DashboardCard></Box>;
}

export function DownloadDialog({ onClose }: { onClose: () => void }) { return <DownloadData dialog onClose={onClose} />; }
export function DownloadPage() { return <DownloadData />; }
