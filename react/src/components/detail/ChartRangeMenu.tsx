import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { CalendarDays, CircleHelp, Download, EllipsisVertical, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function ChartRangeMenu({ days, setDays }: { days: number; setDays: (days: number) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return <>
    <IconButton aria-label="Chart menu" onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical /></IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
      {[1, 3, 7].map((value) => <MenuItem selected={days === value} key={value} onClick={() => { setDays(value); close(); }}><ListItemText>Past {value} Day{value > 1 ? 's' : ''}</ListItemText></MenuItem>)}
      <MenuItem disabled><ListItemIcon><CalendarDays size={18} /></ListItemIcon><ListItemText>Custom</ListItemText></MenuItem>
      <MenuItem disabled><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText>Download Chart</ListItemText></MenuItem>
      <MenuItem disabled><ListItemIcon><RotateCcw size={18} /></ListItemIcon><ListItemText>Reset Zoom</ListItemText></MenuItem>
      <MenuItem component="a" href="https://doc.beestat.io" target="_blank"><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
  </>;
}
