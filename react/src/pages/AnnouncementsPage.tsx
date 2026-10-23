import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

export function AnnouncementsPage() {
  const { data } = useDashboard();
  const items = useMemo(() => Object.values(data?.announcement ?? {}).sort((a, b) => Number(b.announcement_id) - Number(a.announcement_id)), [data?.announcement]);
  useEffect(() => { if (items[0]?.announcement_id) void apiCall({ resource: 'user', method: 'update_setting', arguments: { key: 'last_read_announcement_id', value: items[0].announcement_id } }); }, [items]);
  return <Box py={2}><DashboardCard title="Announcements">{!items.length ? <Alert severity="info">No recent announcements.</Alert> : items.map((item, index) => <Box key={item.announcement_id}>{index > 0 && <Divider sx={{ my: 2 }} />}<Stack direction="row" gap={1} alignItems="center"><Bell size={20} /><Typography variant="h6">{String(item.title)}</Typography></Stack><Typography variant="caption" color="text.secondary">{new Date(item.created_at).toLocaleString()}</Typography><Typography component="div" mt={1} sx={{ '& a': { color: 'primary.light' } }} dangerouslySetInnerHTML={{ __html: String(item.text ?? '') }} /></Box>)}</DashboardCard></Box>;
}
