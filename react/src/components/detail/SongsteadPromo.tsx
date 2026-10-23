import { Box, Button, Card, CardContent, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { useState } from 'react';

export function SongsteadPromo() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <Card sx={{ gridColumn: '1 / -1', bgcolor: '#fff', color: '#263238', position: 'relative' }}>
    <IconButton aria-label="Dismiss Songstead promotion" onClick={() => setVisible(false)} sx={{ position: 'absolute', right: 10, top: 10, color: '#8c9bb1' }}><X /></IconButton>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography sx={{ color: '#8c9bb1', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: .5 }}>A note from the developer</Typography>
      <Typography sx={{ color: '#263238', fontSize: 18, fontWeight: 600, mb: .5 }}>Introducing Songstead</Typography>
      <Typography sx={{ color: '#37474f', lineHeight: 1.5, mb: 1.5 }}>Are you a musician, taking lessons, or just curious what else I've been up to? Check out my latest app: Songstead! I built it as a musician, for musicians. It's got chord charts, setlists, and sharing tools to keep your band or team organized, plus a generous free tier (best in the space, no credit card needed). It would mean a lot if you tried it out!</Typography>
      <Box><Button href="https://songstead.app" target="_blank" variant="contained" sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 330 }, bgcolor: '#238ac9' }}>Check it out at songstead.app</Button></Box>
    </CardContent>
  </Card>;
}
