import {
  Box, Button, Grid, IconButton, InputAdornment, List, ListItem, ListItemIcon,
  ListItemText, Menu, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography,
} from '@mui/material';
import {
  Check, CircleHelp, CreditCard, EllipsisVertical, Gift, Heart, Link2Off,
  MessageCircle, Sparkles, Sticker, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiCall, config } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';
import { colors } from '../theme';

type Currency = 'usd' | 'cad' | 'aud' | 'gbp';
type Interval = 'year' | 'month';

const oneTimeLinks: Record<Currency, Record<'dev' | 'live', string>> = {
  usd: { dev: 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG', live: 'https://donate.stripe.com/7sIcPp4Gt6APais144' },
  cad: { dev: 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG', live: 'https://donate.stripe.com/28obLl4Gte3hfCMdR4' },
  aud: { dev: 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG', live: 'https://donate.stripe.com/dR66r12ylcZd3U4aER' },
  gbp: { dev: 'https://donate.stripe.com/test_bIY2by6pS1ii99u8wG', live: 'https://donate.stripe.com/4gwbLl3Cpe3hais3cs' },
};

const merchandise: Record<Currency, { amount: number; paymentLink: Record<'dev' | 'live', string> }> = {
  usd: { amount: 5, paymentLink: { dev: 'https://buy.stripe.com/test_5kA5nK3dG5yy2L6aF8', live: 'https://buy.stripe.com/14k5mXa0N9N13U47sx' } },
  cad: { amount: 7, paymentLink: { dev: 'https://buy.stripe.com/test_3csg2og0sgdc71m14w', live: 'https://buy.stripe.com/aEUg1B1uh6APbmweV0' } },
  aud: { amount: 7, paymentLink: { dev: 'https://buy.stripe.com/test_aEU2bycOg4uugBW14v', live: 'https://buy.stripe.com/6oE6r15Kx2kzgGQbIQ' } },
  gbp: { amount: 5, paymentLink: { dev: 'https://buy.stripe.com/test_eVaeYkg0s1ii2L66oR', live: 'https://buy.stripe.com/28og1B2yl4sH76g6ov' } },
};

function nested(source: Record<string, any>, path: string, fallback: unknown) {
  return path.split('.').reduce<any>((value, part) => value?.[part], source) ?? fallback;
}

function openWithIdentity(url: string, user: Record<string, any>) {
  const separator = url.includes('?') ? '&' : '?';
  window.open(`${url}${separator}prefilled_email=${encodeURIComponent(user.email_address ?? '')}&client_reference_id=${encodeURIComponent(user.user_id ?? '')}`, '_blank', 'noopener,noreferrer');
}

function StatusPanel({ active, inactiveText, children }: { active: boolean; inactiveText: string; children?: React.ReactNode }) {
  return <Box sx={{ bgcolor: colors.slate.dark, p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', borderRadius: 1 }}>
    <Stack direction="row" gap={1} alignItems="center" sx={{ flex: '1 1 300px', color: active ? 'success.main' : 'text.secondary' }}>
      {active ? <Check size={20} /> : <X size={20} />}
      <Typography color="inherit">{active ? 'Supporter' : inactiveText}</Typography>
    </Stack>
    {children}
  </Box>;
}

export function ContributePage() {
  const { data, refresh } = useDashboard();
  const user = data?.user ?? {};
  const currency = String(nested(user.settings ?? {}, 'units.currency', 'usd')).toLowerCase() as Currency;
  const safeCurrency = currency in oneTimeLinks ? currency : 'usd';
  const environment: 'dev' | 'live' = config.environment === 'live' ? 'live' : 'dev';
  const multiplier = safeCurrency === 'usd' || safeCurrency === 'gbp' ? 1 : 1.5;
  const [amount, setAmount] = useState(2 * multiplier);
  const [other, setOther] = useState(5 * multiplier);
  const [custom, setCustom] = useState(false);
  const [interval, setInterval] = useState<Interval>('year');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [connecting, setConnecting] = useState(false);

  const stripeEvents = Object.values(data?.stripe_event ?? {}) as any[];
  // Match the existing eligibility behavior exactly; historical paid invoices
  // currently keep the direct-giving supporter state active in legacy beestat.
  const stripeActive = stripeEvents.some((event) => event.type === 'invoice.paid' && Number(event.data?.period_end ?? 0) * 1000 <= Date.now());
  const patreonConnected = user.patreon_status != null;
  const patreonActive = user.patreon_status?.patron_status === 'active_patron';
  const contributionActive = stripeActive || patreonActive;
  const monthlyAmount = custom ? Math.max(1, Number(other) || 1) : amount;
  const billedAmount = Math.round(monthlyAmount * (interval === 'year' ? 12 : 1) * 100) / 100;
  const money = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurrency.toUpperCase() }), [safeCurrency]);

  const continueToPayment = () => {
    const attributes = { amount: Math.round(billedAmount * 100), currency: safeCurrency, interval, prefilled_email: user.email_address, client_reference_id: user.user_id };
    const url = `${config.apiBase}?resource=stripe_payment_link&method=open&arguments=${encodeURIComponent(JSON.stringify({ attributes }))}&api_key=${encodeURIComponent(config.apiKey)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const connectPatreon = () => {
    setConnecting(true);
    window.open(`${config.apiBase}?resource=patreon&method=authorize&arguments=%7B%7D&api_key=${encodeURIComponent(config.apiKey)}`, '_blank', 'noopener,noreferrer');
  };
  const unlinkPatreon = async () => {
    if (!window.confirm('Unlink your Patreon account from beestat?')) return;
    await apiCall({ resource: 'user', method: 'unlink_patreon_account' });
    await refresh();
  };

  const contributeAction = contributionActive ? undefined : <>
    <Tooltip title="More ways to contribute"><IconButton onClick={(event) => setMenuAnchor(event.currentTarget)}><EllipsisVertical /></IconButton></Tooltip>
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
      <MenuItem onClick={() => { setMenuAnchor(null); openWithIdentity(oneTimeLinks[safeCurrency][environment], user); }}><Gift size={18} /> One-Time Gift</MenuItem>
      <MenuItem component="a" href="https://patreon.com/beestat" target="_blank" onClick={() => setMenuAnchor(null)}><Heart size={18} /> Support on Patreon</MenuItem>
    </Menu>
  </>;

  return <Box sx={{ pb: 2 }}><Grid container spacing={2} alignItems="stretch">
    <Grid size={{ xs: 12, md: 8 }}><DashboardCard title="Contribute" action={contributeAction}>
      {contributionActive ? <>
        <Typography paragraph>Thank you so much for your support! Your contribution goes a long way towards keeping beestat running and enabling me to create a rich and useful application. My hope is that you are able to use beestat to save money and improve the efficiency of your home.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} mb={2}>
          <Button variant="contained" startIcon={<MessageCircle />} href="https://discord.gg/GzWbhD6tSB" target="_blank" sx={{ bgcolor: colors.purple.main, '&:hover': { bgcolor: colors.purple.dark } }}>Join the Private Discord</Button>
          <Button variant="contained" startIcon={<MessageCircle />} href="https://community.beestat.io" target="_blank" sx={{ bgcolor: colors.purple.main, '&:hover': { bgcolor: colors.purple.dark } }}>Join the beestat Community</Button>
        </Stack>
        <Typography paragraph>Looking for a way to contribute more but don&apos;t want to change your recurring support amount?</Typography>
        <Button variant="contained" color="success" startIcon={<Gift />} onClick={() => openWithIdentity(oneTimeLinks[safeCurrency][environment], user)}>Make a One-Time Gift</Button>
      </> : <>
        <Typography paragraph>Beestat is completely free to use and does not run ads or sell your data. If you find this service useful, please consider contributing. Your gift directly supports operating costs and project development.</Typography>
        <Typography mb={1}>I would like to give...</Typography>
        <ToggleButtonGroup exclusive value={custom ? 'other' : amount} onChange={(_, value) => { if (value === null) return; setCustom(value === 'other'); if (value !== 'other') setAmount(Number(value)); }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { borderRadius: '6px!important', border: '1px solid rgba(255,255,255,.12)!important' } }}>
          {[1, 2, 3].map((value) => <ToggleButton key={value} value={value * multiplier} color="success">{money.format(value * multiplier)} / month</ToggleButton>)}
          <ToggleButton value="other" color="success">Other Amount</ToggleButton>
        </ToggleButtonGroup>
        {custom && <TextField sx={{ mt: 1.5, width: 150 }} size="small" type="number" value={other} inputProps={{ min: 1, step: .5 }} onChange={(event) => setOther(Math.max(1, Number(event.target.value)))} InputProps={{ startAdornment: <InputAdornment position="start">{money.formatToParts(1).find((part) => part.type === 'currency')?.value}</InputAdornment> }} />}
        <ToggleButtonGroup exclusive value={interval} onChange={(_, value: Interval | null) => value && setInterval(value)} sx={{ mt: 2 }}>
          <ToggleButton value="year">Give Yearly</ToggleButton><ToggleButton value="month">Give Monthly</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ bgcolor: 'background.default', p: 2, my: 2, borderRadius: 1 }}>Give {money.format(billedAmount)} / {interval} until I cancel.</Box>
        <Box textAlign="right"><Button variant="contained" color="success" size="large" startIcon={<CreditCard />} onClick={continueToPayment}>Continue to Payment</Button></Box>
      </>}
    </DashboardCard></Grid>

    <Grid size={{ xs: 12, md: 4 }}><DashboardCard title="Benefits">
      <Typography paragraph>In addition to satisfaction of supporting a great project, you&apos;ll get:</Typography>
      <List dense sx={{ bgcolor: colors.slate.dark, borderRadius: 1, py: 1 }}>
        {['Early access to new features', 'Private Discord membership', 'More frequent data syncing', 'Removed contribute banner'].map((benefit) => <ListItem key={benefit} sx={{ color: colors.yellow.main }}><ListItemIcon sx={{ minWidth: 34, color: colors.yellow.main }}><Sparkles size={19} /></ListItemIcon><ListItemText primary={benefit} /></ListItem>)}
        <ListItem sx={{ color: 'error.main' }}><ListItemIcon sx={{ minWidth: 34, color: 'error.main' }}><Heart size={19} /></ListItemIcon><ListItemText primary="My unending gratitude" /></ListItem>
      </List>
    </DashboardCard></Grid>

    <Grid size={12}><DashboardCard title="Recurring Contribution Status">
      <Typography paragraph>Use this area to view, update, or cancel your recurring support of beestat. If you have made a one-time direct donation, use the Manage Support button to view payment history.</Typography>
      <Typography fontWeight={600} mb={1}>Direct Giving</Typography>
      <StatusPanel active={stripeActive} inactiveText="Not a recurring supporter (please allow up to an hour for new payments to sync)">
        {stripeEvents.length > 0 && <Button color="error" variant="contained" startIcon={<CreditCard />} href={environment === 'dev' ? 'https://billing.stripe.com/p/login/test_14k8zD2vwb8g6ZO8ww' : 'https://billing.stripe.com/p/login/7sI5kEetRfHP6g8fYY'} target="_blank">Manage Support</Button>}
      </StatusPanel>
      <Typography fontWeight={600} mt={2} mb={1}>Patreon</Typography>
      {patreonConnected ? <StatusPanel active={patreonActive} inactiveText="Not a Supporter">
        <Button color="inherit" startIcon={<Link2Off />} onClick={() => void unlinkPatreon()}>Unlink</Button>
        <Button color="error" variant="contained" startIcon={<Heart />} href="https://patreon.com/beestat" target="_blank">Manage Support</Button>
      </StatusPanel> : <Box sx={{ bgcolor: colors.slate.dark, p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', borderRadius: 1 }}>
        <Stack direction="row" gap={1} alignItems="center" color="text.secondary" sx={{ flex: 1 }}><CircleHelp size={20} /><Typography>Account not connected</Typography></Stack>
        {connecting ? <Button color="error" variant="contained" startIcon={<X />} onClick={() => setConnecting(false)}>Cancel Connection</Button> : <Button color="error" variant="contained" startIcon={<Heart />} onClick={connectPatreon}>Connect Account</Button>}
      </Box>}
      {patreonActive && <Typography mt={1.5} fontStyle="italic" color="text.secondary">Want to switch to direct giving? First cancel your Patreon subscription and unlink your account.</Typography>}
    </DashboardCard></Grid>

    <Grid size={12}><DashboardCard title="Merch!">
      <Typography paragraph>Slap a sticker on your furnace and another on a water bottle to support your favorite thermostat analytics platform! Stickers are high quality, made in the USA, and shipped within 3 business days.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
        <Box sx={{ bgcolor: '#8c9bb1', p: 2, borderRadius: 1, width: { xs: '100%', sm: 'auto' }, textAlign: 'center' }}><Box component="img" src="/img/merchandise/sticker_logo_text.png" alt="beestat wordmark sticker" sx={{ height: 48, maxWidth: '100%' }} /></Box>
        <Box sx={{ bgcolor: '#8c9bb1', p: 2, borderRadius: 1, width: { xs: '100%', sm: 'auto' }, textAlign: 'center' }}><Box component="img" src="/img/merchandise/sticker_logo.png" alt="beestat logo sticker" sx={{ height: 64 }} /></Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}><Button size="large" variant="contained" startIcon={<Sticker />} onClick={() => openWithIdentity(merchandise[safeCurrency].paymentLink[environment], user)}>Buy Sticker 2-Pack&nbsp; {money.format(merchandise[safeCurrency].amount)}</Button></Box>
      </Stack>
    </DashboardCard></Grid>
  </Grid></Box>;
}
