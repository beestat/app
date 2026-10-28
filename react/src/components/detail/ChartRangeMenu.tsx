import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface Props {
  days?: number;
  setDays: (days: number) => void;
  onCustom?: (begin: string, end: string) => void;
  onDownload?: () => void;
  onReset?: () => void;
  helpUrl?: string;
  customTitle?: string;
  customDescription?: string;
  maxDays?: number;
  initialBegin?: string;
  initialEnd?: string;
}

export function ChartRangeMenu({ days, setDays, onCustom, onDownload, onReset, helpUrl = 'https://doc.beestat.io', customTitle = 'Custom date range', customDescription = 'Choose a custom range to display on this chart.', maxDays = 30, initialBegin, initialEnd }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeType, setRangeType] = useState<'dynamic' | 'static'>('dynamic');
  const [dynamicDays, setDynamicDays] = useState(days ?? 3);
  const today = new Date().toISOString().slice(0, 10);
  const prior = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const [begin, setBegin] = useState(prior); const [end, setEnd] = useState(today);
  const close = () => setAnchor(null);
  const staticDays = begin && end ? Math.floor(Math.abs(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${begin}T00:00:00Z`)) / 86_400_000) + 1 : 0;
  const rangeInvalid = rangeType === 'dynamic' ? !Number.isInteger(dynamicDays) || dynamicDays < 1 || dynamicDays > maxDays : !begin || !end || staticDays > maxDays;
  const openCustom = () => { close(); setRangeType(days == null ? 'static' : 'dynamic'); setDynamicDays(days ?? dynamicDays); if (initialBegin) setBegin(initialBegin); if (initialEnd) setEnd(initialEnd); setCustomOpen(true); };
  const applyCustom = () => {
    if (rangeType === 'dynamic') setDays(dynamicDays);
    else onCustom?.(begin <= end ? begin : end, begin <= end ? end : begin);
    setCustomOpen(false);
  };
  return <>
    <IconButton aria-label="Chart menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
      {[1, 3, 7].map((value) => <MenuItem selected={days === value} key={value} onClick={() => { setDays(value); close(); }}><ListItemText>Past {value} Day{value > 1 ? 's' : ''}</ListItemText></MenuItem>)}
      <MenuItem onClick={openCustom}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem>
      <MenuItem disabled={!onDownload} onClick={() => { close(); onDownload?.(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem>
      <MenuItem disabled={!onReset} onClick={() => { close(); onReset?.(); }}><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem>
      <MenuItem component="a" href={helpUrl} target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
    <Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>{customTitle}</DialogTitle>
      <DialogContent><Stack gap={2} pt={1}>
        <Typography>{customDescription}</Typography>
        <Typography variant="overline">Range Type</Typography>
        <ToggleButtonGroup exclusive fullWidth value={rangeType} onChange={(_event, value) => value && setRangeType(value)} color="primary">
          <ToggleButton value="dynamic">Dynamic</ToggleButton><ToggleButton value="static">Static</ToggleButton>
        </ToggleButtonGroup>
        {rangeType === 'dynamic'
          ? <TextField type="number" label="Days" value={dynamicDays} onChange={(event) => setDynamicDays(Number(event.target.value))} slotProps={{ htmlInput: { min: 1, max: maxDays, step: 1 } }} />
          : <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><TextField fullWidth type="date" label="Start" value={begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField fullWidth type="date" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack>}
        {rangeInvalid && <Alert severity="error">Max range is {maxDays} days.</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" disabled={rangeInvalid} onClick={applyCustom}>Save</Button></DialogActions>
    </Dialog>
  </>;
}
