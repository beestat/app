import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, TextField } from '@mui/material';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface Props {
  days?: number;
  setDays: (days: number) => void;
  onCustom?: (begin: string, end: string) => void;
  onDownload?: () => void;
  onReset?: () => void;
  helpUrl?: string;
}

export function ChartRangeMenu({ days, setDays, onCustom, onDownload, onReset, helpUrl = 'https://doc.beestat.io' }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const prior = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
  const [begin, setBegin] = useState(prior); const [end, setEnd] = useState(today);
  const close = () => setAnchor(null);
  return <>
    <IconButton aria-label="Chart menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
      {[1, 3, 7].map((value) => <MenuItem selected={days === value} key={value} onClick={() => { setDays(value); close(); }}><ListItemText>Past {value} Day{value > 1 ? 's' : ''}</ListItemText></MenuItem>)}
      <MenuItem onClick={() => { close(); setCustomOpen(true); }}><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem>
      <MenuItem disabled={!onDownload} onClick={() => { close(); onDownload?.(); }}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem>
      <MenuItem disabled={!onReset} onClick={() => { close(); onReset?.(); }}><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem>
      <MenuItem component="a" href={helpUrl} target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
    <Dialog open={customOpen} onClose={() => setCustomOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Custom date range</DialogTitle><DialogContent><Stack gap={2} pt={1}><TextField type="date" label="Start" value={begin} onChange={(event) => setBegin(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="End" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack></DialogContent><DialogActions><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="contained" disabled={!begin || !end || begin > end} onClick={() => { onCustom?.(begin, end); setCustomOpen(false); }}>Apply</Button></DialogActions></Dialog>
  </>;
}
