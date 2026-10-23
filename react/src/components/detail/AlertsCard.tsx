import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Stack, Typography } from '@mui/material';
import { Bell, BellOff, ChevronDown, ThumbsUp } from 'lucide-react';
import { memo, useState } from 'react';
import { apiCall } from '../../api/client';
import type { AlertData } from '../../types';
import { colors } from '../../theme';
import { DashboardCard } from '../common/DashboardCard';

export const AlertsCard = memo(function AlertsCard({ alerts, thermostatId }: { alerts: AlertData[]; thermostatId: number }) {
  const [items, setItems] = useState(alerts);
  const [showDismissed, setShowDismissed] = useState(false);
  const visible = items.filter((item) => showDismissed || item.dismissed !== true);
  const toggle = async (alert: AlertData) => {
    const dismissing = alert.dismissed !== true;
    setItems((current) => current.map((item) => item.guid === alert.guid ? { ...item, dismissed: dismissing } : item));
    await apiCall({ resource: 'thermostat', method: dismissing ? 'dismiss_alert' : 'restore_alert', arguments: { thermostat_id: thermostatId, guid: alert.guid } });
  };
  return (
    <DashboardCard title="Alerts" subheader={visible.length ? `${visible.length} active` : 'Everything looks good'} action={items.some((item) => item.dismissed) ? <Button size="small" onClick={() => setShowDismissed((value) => !value)}>{showDismissed ? 'Hide dismissed' : 'Show dismissed'}</Button> : undefined} sx={{ bgcolor: visible.length ? colors.red.main : 'background.paper' }}>
      {!visible.length && <Box sx={{ minHeight: 170, display: 'grid', placeItems: 'center' }}><ThumbsUp size={72} color={colors.slate.light} /></Box>}
      {visible.map((alert, index) => <Accordion key={String(alert.guid ?? alert.alert_id ?? index)} disableGutters sx={{ bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ChevronDown size={18} />}><Stack direction="row" gap={1} alignItems="center"><Bell size={19} /><Typography>{String(alert.text ?? alert.message ?? 'Thermostat alert')}</Typography></Stack></AccordionSummary>
        <AccordionDetails><Typography variant="body2">{String(alert.details ?? '')}</Typography><Typography variant="caption" color="text.secondary">{String(alert.source ?? '')} {alert.timestamp ? `· ${new Date(String(alert.timestamp)).toLocaleString()}` : ''}</Typography><Box mt={1}><Button size="small" startIcon={alert.dismissed ? <Bell size={16} /> : <BellOff size={16} />} onClick={() => void toggle(alert)}>{alert.dismissed ? 'Restore' : 'Dismiss'}</Button></Box></AccordionDetails>
      </Accordion>)}
    </DashboardCard>
  );
});
