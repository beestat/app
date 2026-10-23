import { Box, Button, Grid, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Check, Heart, MessageCircle } from 'lucide-react';
import { DashboardCard } from '../components/common/DashboardCard';

export function ContributePage() {
  return <Box py={2}><Grid container spacing={2}><Grid size={{ xs: 12, md: 7 }}><DashboardCard title="Support beestat" subheader="Help keep independent HVAC analytics running"><Typography paragraph>Beestat is built and operated independently. Contributions support infrastructure, development, and long-term maintenance.</Typography><Button variant="contained" color="error" startIcon={<Heart />} href="https://www.patreon.com/beestat" target="_blank">Become a supporter</Button><Button sx={{ ml: 1 }} startIcon={<MessageCircle />} href="https://community.beestat.io" target="_blank">Community</Button></DashboardCard></Grid><Grid size={{ xs: 12, md: 5 }}><DashboardCard title="Supporter benefits"><List dense>{['Support continued development', 'Help cover hosting costs', 'Early access to selected features', 'A healthier independent project'].map((item) => <ListItem key={item}><ListItemIcon><Check size={20} /></ListItemIcon><ListItemText primary={item} /></ListItem>)}</List></DashboardCard></Grid></Grid></Box>;
}
