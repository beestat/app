import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import { CircleHelp, EllipsisVertical } from 'lucide-react';
import { useState } from 'react';

export function CardHelpMenu({ label, href }: { label: string; href: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <>
    <Tooltip title={`${label} options`}><IconButton aria-label={`${label} options`} onClick={(event) => setAnchor(event.currentTarget)}><EllipsisVertical size={20} /></IconButton></Tooltip>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <MenuItem component="a" href={href} target="_blank" rel="noreferrer" onClick={() => setAnchor(null)}><ListItemIcon><CircleHelp size={18} /></ListItemIcon><ListItemText>Help</ListItemText></MenuItem>
    </Menu>
  </>;
}
