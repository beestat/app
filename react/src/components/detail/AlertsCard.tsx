import { Box, Button, IconButton, Menu, MenuItem, Stack, Typography, useTheme } from '@mui/material';
import {
  ArrowLeft, BatteryLow, Bell, BellOff, CalendarClock, CircleDollarSign, Droplets,
  Eye, EyeOff, Fan, Flame, HelpCircle, KeyRound, MessageSquare, MoreVertical,
  RadioTower, Settings2, Snowflake, ThumbsUp, Wifi, WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { apiCall } from '../../api/client';
import type { AlertData } from '../../types';
import { DashboardCard } from '../common/DashboardCard';

function iconFor(code: number): LucideIcon {
  if ([100000, 100001].includes(code)) return Settings2;
  if (code === 611) return KeyRound;
  if ([1000, 1006, 1013].includes(code)) return Snowflake;
  if ([1001, 1003, 1004, 1005, 1009, 1010, 1018, 1022].includes(code)) return Flame;
  if ([1007, 1028, 6301].includes(code)) return WifiOff;
  if ([1029, 6300].includes(code)) return Wifi;
  if ([1002, 1011].includes(code)) return Eye;
  if (code === 1012) return EyeOff;
  if (code === 1017) return Fan;
  if ([1020, 1021, 1024, 1025, 1032, 1033].includes(code)) return Droplets;
  if (code === 1026) return BatteryLow;
  if (code >= 3130 && code <= 3140) return CalendarClock;
  if ([6200, 6201].includes(code)) return CircleDollarSign;
  if (code === 1034) return RadioTower;
  if (code === 7002) return MessageSquare;
  return Bell;
}

function alertDate(value: unknown) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(String(value)));
}

export const AlertsCard = memo(function AlertsCard({ alerts, thermostatId }: { alerts: AlertData[]; thermostatId: number }) {
  const theme = useTheme();
  const colors = theme.palette.colors;
  const [items, setItems] = useState(alerts);
  const [showDismissed, setShowDismissed] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => setItems(alerts), [alerts]);
  const keyFor = (alert: AlertData, index: number) => String(alert.guid ?? alert.alert_id ?? index);
  const visible = items.filter((item) => showDismissed || item.dismissed !== true);
  const active = visible.find((item, index) => keyFor(item, index) === selected);
  const toggle = async (alert: AlertData) => {
    const dismissing = alert.dismissed !== true;
    setItems((current) => current.map((item) => item.guid === alert.guid ? { ...item, dismissed: dismissing } : item));
    if (dismissing && !showDismissed) setSelected(undefined);
    await apiCall({ resource: 'thermostat', method: dismissing ? 'dismiss_alert' : 'restore_alert', arguments: { thermostat_id: thermostatId, guid: alert.guid } });
  };
  const action = active
    ? <IconButton aria-label="Back to alerts" onClick={() => setSelected(undefined)}><ArrowLeft /></IconButton>
    : <><IconButton aria-label="Alerts menu" onClick={(event) => setAnchor(event.currentTarget)}><MoreVertical /></IconButton><Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}><MenuItem onClick={() => { setShowDismissed((value) => !value); setAnchor(null); }}>{showDismissed ? <BellOff size={18} /> : <Bell size={18} />}<Box ml={1}>{showDismissed ? 'Hide dismissed' : 'Show dismissed'}</Box></MenuItem><MenuItem component="a" href="https://doc.beestat.io/dd453829dc7c47019a775130c93bde0c" target="_blank" onClick={() => setAnchor(null)}><HelpCircle size={18} /><Box ml={1}>Help</Box></MenuItem></Menu></>;
  return (
    <DashboardCard title="Alerts" action={action} sx={{ bgcolor: visible.length ? colors.red.main : 'background.paper', color: visible.length ? theme.palette.getContrastText(colors.red.main) : 'text.primary' }}>
      {!visible.length && <Stack sx={{ minHeight: 128 }} alignItems="center" justifyContent="center" textAlign="center" gap={.75}><ThumbsUp size={48} color={colors.slate.light} /><Typography fontWeight={600}>No active alerts</Typography><Typography variant="caption" color="text.secondary">Everything looks good.</Typography></Stack>}
      {!active && visible.map((alert, index) => {
        const Icon = iconFor(Number(alert.code));
        const key = keyFor(alert, index);
        return <Stack key={key} direction="row" gap={1.5} alignItems="center" onClick={() => setSelected(key)} sx={{ mx: -2, px: 2, py: 1.25, cursor: 'pointer', transition: 'background-color 150ms', '&:hover': { bgcolor: colors.red.dark } }}><Icon size={22} /><Typography sx={{ flex: 1 }}>{String(alert.text ?? alert.message ?? 'Thermostat alert')}</Typography></Stack>;
      })}
      {active && <Box>
        <Stack direction="row" gap={1.5} alignItems="center" sx={{ mx: -2, px: 2, py: 1.25, bgcolor: colors.red.dark }}>{(() => { const Icon = iconFor(Number(active.code)); return <Icon size={22} />; })()}<Typography>{String(active.text ?? active.message ?? 'Thermostat alert')}</Typography></Stack>
        <Stack direction="row" my={2}><Box width="50%"><Typography fontWeight={600}>Source</Typography><Typography>{String(active.source ?? 'Thermostat')}</Typography></Box><Box width="50%"><Typography fontWeight={600}>Date</Typography><Typography>{alertDate(active.timestamp ?? active.date)}</Typography></Box></Stack>
        <Typography fontWeight={600}>Details</Typography><Typography>{String(active.details ?? '')}</Typography>
        <Box textAlign="center" mt={2}><Button variant="contained" color="error" startIcon={active.dismissed ? <Bell /> : <BellOff />} onClick={() => void toggle(active)}>{active.dismissed ? 'Restore' : 'Dismiss'}</Button></Box>
      </Box>}
    </DashboardCard>
  );
});
