import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { Apple, Heart, Play, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall, config } from '../../api/client';
import type { DashboardData } from '../../types';
import { DashboardCard } from '../common/DashboardCard';

function utcSettingDate(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function settingDate(value: unknown) {
  if (!value) return 0;
  return new Date(`${String(value).replace(' ', 'T').replace(/Z$/, '')}Z`).getTime();
}

function contributionIsActive(data: DashboardData) {
  const stripeActive = Object.values(data.stripe_event ?? {}).some((event: any) => event.type === 'invoice.paid' && Number(event.data?.period_end ?? 0) * 1000 <= Date.now());
  return data.user?.patreon_status?.patron_status === 'active_patron' || stripeActive;
}

export function ReminderCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const settings = data.user?.settings ?? {};
  const contributeHiddenUntil = settingDate(settings.contribute_reminder_hide_until);
  const showContribute = !hidden && !config.isDemo && !contributionIsActive(data) && contributeHiddenUntil <= Date.now();
  const platform = new URLSearchParams(window.location.search).get('platform');
  const rateHideUntil = settingDate(settings.ui?.rate_app_reminder_hide_until);
  const showRate = !showContribute && !hidden && (platform === 'ios' || platform === 'android') && Number(settings.meta?.opens?.[platform]) > 10 && rateHideUntil <= Date.now();

  const saveHiddenUntil = async (key: string, date: Date) => {
    setHidden(true);
    await apiCall({ resource: 'user', method: 'update_setting', arguments: { key, value: utcSettingDate(date) } });
  };

  if (showContribute) {
    const hideForMonth = () => {
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() + 1);
      setDialogOpen(false);
      void saveHiddenUntil('contribute_reminder_hide_until', date);
    };
    return <>
      <DashboardCard title="Enjoy beestat?" sx={{ gridColumn: '1 / -1', bgcolor: 'success.main' }} action={<IconButton aria-label="Dismiss contribution reminder" onClick={() => setDialogOpen(true)}><X /></IconButton>}>
        <Button fullWidth variant="contained" color="success" startIcon={<Heart />} onClick={() => navigate('/contribute')} sx={{ justifyContent: 'flex-start', textAlign: 'left', p: 2, bgcolor: 'success.dark' }}>
          <Box><Typography fontWeight={700}>Support this project!</Typography><Typography variant="body2">Your contribution matters</Typography></Box>
        </Button>
      </DashboardCard>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Enjoy beestat?</DialogTitle>
        <DialogContent><Typography paragraph>Beestat is completely free to use and does not run ads or sell your data. If you want to help, <strong>consider supporting the project</strong>. Among other benefits, it will hide this banner permanently.</Typography><Typography>If you prefer not to give, you can hide this banner. Please keep using and enjoying beestat! :)</Typography></DialogContent>
        <DialogActions><Button onClick={hideForMonth}>Hide for one month</Button><Button variant="contained" color="success" startIcon={<Heart />} onClick={() => { setDialogOpen(false); navigate('/contribute'); }}>Support beestat</Button></DialogActions>
      </Dialog>
    </>;
  }

  if (showRate) {
    const ios = platform === 'ios';
    const storeName = ios ? 'the App Store' : 'Google Play';
    const storeUrl = ios ? 'https://apps.apple.com/us/app/beestat/id6469190206?platform=ipad' : 'https://play.google.com/store/apps/details?id=io.beestat';
    const dismiss = () => { const date = new Date(); date.setUTCFullYear(date.getUTCFullYear() + 1000); void saveHiddenUntil('ui.rate_app_reminder_hide_until', date); };
    return <DashboardCard title="Like the app? Leave a rating or review!" sx={{ gridColumn: '1 / -1' }} action={<IconButton aria-label="Dismiss rating reminder" onClick={dismiss}><X /></IconButton>}>
      <Button fullWidth variant="contained" color="success" startIcon={ios ? <Apple /> : <Play />} href={storeUrl} target="_blank" onClick={dismiss}>Rate now on {storeName}</Button>
    </DashboardCard>;
  }

  return null;
}
