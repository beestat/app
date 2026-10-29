import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { Bell, Bug, CircleAlert, CircleHelp, Heart, Info, Megaphone, RefreshCw, Sparkles, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { useDashboard } from '../state/DashboardContext';

function relativeDate(value: string) {
  const seconds = (new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).getTime() - Date.now()) / 1000;
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [[31_536_000, 'year'], [2_592_000, 'month'], [86_400, 'day'], [3_600, 'hour'], [60, 'minute'], [1, 'second']];
  const [size, unit] = ranges.find(([size]) => Math.abs(seconds) >= size) ?? ranges[ranges.length - 1];
  return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(Math.round(seconds / size), unit);
}

const iconByName = { update: RefreshCw, announcement: Megaphone, campaign: Megaphone, warning: CircleAlert, error: CircleAlert, info: Info, help: CircleHelp, new_releases: Sparkles, bug_report: Bug, build: Wrench, favorite: Heart } as const;

export function AnnouncementsContent() {
  const { data } = useDashboard();
  const items = useMemo(() => Object.values(data?.announcement ?? {}).sort((a, b) => Number(b.announcement_id) - Number(a.announcement_id)), [data?.announcement]);
  return <Box>{!items.length ? <Alert severity="info">No recent announcements! :)</Alert> : items.map((item, index) => { const Icon = iconByName[String(item.icon) as keyof typeof iconByName] ?? Bell; return <Box key={item.announcement_id}>{index > 0 && <Divider sx={{ my: 2 }} />}<Stack direction="row" gap={1} alignItems="center"><Icon size={20} /><Typography variant="h6">{String(item.title)} • {relativeDate(String(item.created_at))}</Typography></Stack><Typography component="div" mt={1} sx={{ '& a': { color: 'primary.light' } }} dangerouslySetInnerHTML={{ __html: String(item.text ?? '') }} /></Box>; })}</Box>;
}
