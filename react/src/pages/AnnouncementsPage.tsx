import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { apiCall } from '../api/client';
import { DashboardCard } from '../components/common/DashboardCard';
import { useDashboard } from '../state/DashboardContext';

function relativeDate(value: string) {
  const seconds = (new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).getTime() - Date.now()) / 1000;
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [[31_536_000, 'year'], [2_592_000, 'month'], [86_400, 'day'], [3_600, 'hour'], [60, 'minute'], [1, 'second']];
  const [size, unit] = ranges.find(([size]) => Math.abs(seconds) >= size) ?? ranges[ranges.length - 1];
  return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(Math.round(seconds / size), unit);
}

export function AnnouncementsPage() {
  const { data } = useDashboard();
  const items = useMemo(() => Object.values(data?.announcement ?? {}).sort((a, b) => Number(b.announcement_id) - Number(a.announcement_id)), [data?.announcement]);
  useEffect(() => {
    const latest = Number(items[0]?.announcement_id ?? 0);
    if (!latest) return;
    void apiCall({ resource: 'user', method: 'update_setting', arguments: { key: 'last_read_announcement_id', value: latest } })
      .then(() => window.dispatchEvent(new CustomEvent('beestat-announcements-read', { detail: latest })))
      .catch(() => {});
  }, [items]);
  return <Box py={2}><DashboardCard title="Announcements">{!items.length ? <Alert severity="info">No recent announcements! :)</Alert> : items.map((item, index) => <Box key={item.announcement_id}>{index > 0 && <Divider sx={{ my: 2 }} />}<Stack direction="row" gap={1} alignItems="center"><Bell size={20} /><Typography variant="h6">{String(item.title)} · {relativeDate(String(item.created_at))}</Typography></Stack><Typography component="div" mt={1} sx={{ '& a': { color: 'primary.light' } }} dangerouslySetInnerHTML={{ __html: String(item.text ?? '') }} /></Box>)}</DashboardCard></Box>;
}
