import { Box, Button, Card, CardContent, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { useState } from 'react';
import { apiCall, config } from '../../api/client';
import { useDashboard } from '../../state/DashboardContext';

function shouldShow(user: Record<string, any>) {
  if (config.isDemo || user.settings?.songstead?.promo_dismissed === true) return false;
  const start = Date.UTC(2026, 7, 27);
  const end = Date.UTC(2026, 8, 4);
  const elapsed = Date.now() - start;
  const rollout = elapsed <= 0 ? 0 : elapsed >= end - start ? 100 : Math.round(100 * elapsed / (end - start));
  const created = user.created_at ? new Date(`${String(user.created_at).replace(' ', 'T').replace(/Z$/, '')}Z`).getTime() : 0;
  const oldEnough = !created || created <= Date.now() - 7 * 86_400_000;
  return Number(user.user_id) % 100 < rollout && oldEnough;
}

export function SongsteadPromo() {
  const { data } = useDashboard();
  const [visible, setVisible] = useState(() => shouldShow(data?.user ?? {}));
  const updateSetting = (key: string, value: unknown) => void apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value } });
  if (!visible) return null;
  return <Card sx={{ gridColumn: '1 / -1', bgcolor: '#fff', color: '#263238', position: 'relative' }}>
    <IconButton aria-label="Dismiss Songstead promotion" onClick={() => { setVisible(false); updateSetting('songstead.promo_dismissed', true); }} sx={{ position: 'absolute', right: 10, top: 10, color: '#8c9bb1' }}><X /></IconButton>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography sx={{ color: '#8c9bb1', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: .5 }}>A note from the developer</Typography>
      <Typography sx={{ color: '#263238', fontSize: 18, fontWeight: 600, mb: .5 }}>Introducing Songstead</Typography>
      <Typography sx={{ color: '#37474f', lineHeight: 1.5, mb: 1.5 }}>Are you a musician, taking lessons, or just curious what else I've been up to? Check out my latest app: Songstead! I built it as a musician, for musicians. It's got chord charts, setlists, and sharing tools to keep your band or team organized, plus a generous free tier (best in the space, no credit card needed). It would mean a lot if you tried it out!</Typography>
      <Box><Button href="https://songstead.app" target="_blank" rel="noreferrer" variant="contained" onClick={() => updateSetting('songstead.promo_clicked_at', new Date().toISOString().slice(0, 19).replace('T', ' '))} sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 48, px: 1, textTransform: 'none', bgcolor: '#238ac9' }}>Check it out at songstead.app</Button></Box>
    </CardContent>
  </Card>;
}
